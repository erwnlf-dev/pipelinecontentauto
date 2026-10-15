import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import {
  type DisplayWord,
  type EditPlan,
  type FactSheet,
  type Script,
  type Stage,
  type TimelineAsset,
  DEFAULT_SCRIPT_RULES,
  DEFAULT_TIMELINE_LIMITS,
  TimelineValidationError,
  spokenText,
  validateScript,
} from "@pca/core";
import {
  BudgetGuard,
  DEFAULT_COMPILE_OPTIONS,
  DEFAULT_PRICES,
  DEMO_FACTSHEET,
  DEMO_SCRIPT,
  InMemoryLedger,
  alignmentToSpokenWords,
  buildDisplayWords,
  checkScriptClaims,
  compileTimeline,
  defaultEditPlan,
  evaluateClaim,
  screenTopic,
} from "@pca/pipeline";
import {
  type ClaudeUsage,
  type PillarStyle,
  type SceneKeyframe,
  extractKeyframe,
  fetchPageText,
  loudnorm,
  measureLoudness,
  normalizeClip,
  probe,
} from "@pca/providers";
import { renderTimeline } from "@pca/video/render";
import { type Mode, type Providers, budgetFromEnv, providersFor } from "./config";

export interface RunOptions {
  topic: string;
  mode: Mode;
  outRoot: string;
  withVideo: boolean;
  maxVideoScenes: number;
  pillar: PillarStyle;
  musicFile?: string;
  /** Lewati penyaring topik sensitif (tetap tercatat di factsheet). */
  force?: boolean;
  log?: (msg: string) => void;
}

export interface QaReport {
  passed: boolean;
  checks: { name: string; ok: boolean; detail: string }[];
}

export interface RunSummary {
  videoId: string;
  dir: string;
  finalFile: string;
  qa: QaReport;
  costUsd: number;
}

const sleep = (ms: number) => new Promise((ok) => setTimeout(ok, ms));
const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "video";

/**
 * Menjalankan seluruh pipeline untuk satu topik di disk lokal (Fase 1). Setiap
 * stage menulis artifact JSON ke direktori video sehingga hasilnya bisa
 * diperiksa; versi produksi memindahkan ini ke Postgres + pg-boss.
 */
export async function runLocal(o: RunOptions): Promise<RunSummary> {
  const log = o.log ?? ((m: string) => console.log(m));
  const p = providersFor(o.mode, { withVideo: o.withVideo });
  const videoId = `${slug(o.topic)}-${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}`;
  const dir = join(o.outRoot, videoId);
  const assetDir = join(dir, "assets");
  await mkdir(join(assetDir, "keyframes"), { recursive: true });

  const ledger = new InMemoryLedger();
  const budget = new BudgetGuard(ledger, budgetFromEnv());
  const save = (name: string, data: unknown) => writeFile(join(dir, name), JSON.stringify(data, null, 2));
  const recordClaude = (stage: Stage, usage: ClaudeUsage[]) => {
    for (const u of usage) {
      const known = `anthropic:${u.model}:input` in DEFAULT_PRICES;
      if (!known) log(`  ! harga model ${u.model} belum ada di tabel; dicatat dengan harga Opus 5.5`);
      const prefix = known ? `anthropic:${u.model}` : "anthropic:claude-opus-5-5";
      // Cache write ditagih 1.25x input; cache read pakai sku terpisah.
      budget.record({ videoId, stage, sku: `${prefix}:input`, units: u.inputTokens + u.cacheWriteTokens * 1.25 });
      budget.record({ videoId, stage, sku: `${prefix}:output`, units: u.outputTokens });
      budget.record({ videoId, stage, sku: "anthropic:claude-opus-5-5:cache_read", units: u.cacheReadTokens });
      if (u.webSearches) budget.record({ videoId, stage, sku: "anthropic:web_search", units: u.webSearches });
    }
  };

  log(`▶ ${videoId} (mode ${o.mode})`);

  // FACTCHECK ---------------------------------------------------------------
  const flags = screenTopic(o.topic);
  if (flags.length && !o.force) throw new Error(`topik ditandai sensitif (${flags.join(", ")}); pakai --force bila sudah direview`);
  const facts = p.claude ? await factCheck(p, o.topic, recordClaude, log) : DEMO_FACTSHEET;
  await save("factsheet.json", facts);
  const verifiedCount = facts.claims.filter((c) => c.status === "verified").length;
  log(`✓ FACTCHECK: ${verifiedCount}/${facts.claims.length} klaim terverifikasi`);
  if (verifiedCount < 3) throw new Error("klaim terverifikasi kurang dari 3; topik tidak layak dilanjutkan");

  // SCRIPT ------------------------------------------------------------------
  const rules = { ...DEFAULT_SCRIPT_RULES, maxVideoScenes: o.withVideo ? o.maxVideoScenes : 0 };
  let script: Script;
  if (p.claude) {
    const res = await p.claude.writeScript(
      { topic: o.topic, facts, pillar: o.pillar, maxVideoScenes: rules.maxVideoScenes },
      (s) => [...validateScript(s, rules), ...checkScriptClaims(s, facts)],
    );
    recordClaude("SCRIPT", res.usage);
    script = res.data;
  } else {
    script = o.withVideo
      ? { ...DEMO_SCRIPT, scenes: DEMO_SCRIPT.scenes.map((s, i) => (i === 1 ? { ...s, assetType: "video" as const } : s)) }
      : DEMO_SCRIPT;
  }
  await save("script.json", script);
  log(`✓ SCRIPT: "${script.title}" — ${script.sentences.length} kalimat, ${script.scenes.length} scene`);

  // VOICEOVER ---------------------------------------------------------------
  const { text } = spokenText(script);
  const ttsReservation = budget.reserve({ videoId, stage: "VOICEOVER", sku: p.tts.sku, units: text.length });
  const tts = await p.tts.synthesize({ text, voiceId: p.voiceId });
  budget.settle(ttsReservation, tts.characters);
  const voiceKey = `voice.${tts.format}`;
  await writeFile(join(assetDir, voiceKey), tts.audio);
  const spoken = alignmentToSpokenWords(tts.alignment, script);
  const words = buildDisplayWords(script, spoken);
  const voiceDurationMs = Math.max((await probe(join(assetDir, voiceKey))).durationMs, spoken.at(-1)!.endMs);
  const totalMs = voiceDurationMs + DEFAULT_COMPILE_OPTIONS.tailMs;
  await save("voice.json", { durationMs: voiceDurationMs, spoken, display: words });
  log(`✓ VOICEOVER: ${(voiceDurationMs / 1000).toFixed(1)} detik, ${words.length} kata`);
  if (totalMs < DEFAULT_TIMELINE_LIMITS.minDurationMs || totalMs > DEFAULT_TIMELINE_LIMITS.maxDurationMs) {
    throw new Error(`durasi voice over ${(totalMs / 1000).toFixed(1)} detik di luar 30–60 detik; revisi panjang script`);
  }

  // FOOTAGE -----------------------------------------------------------------
  const assets: Record<string, TimelineAsset> = { voice: { key: voiceKey, kind: "audio", durationMs: voiceDurationMs } };
  const sceneAssets: Record<string, string> = {};
  const keyframes: SceneKeyframe[] = [];
  const spans = sceneSpans(script, words, totalMs);
  for (const [i, scene] of script.scenes.entries()) {
    const spanMs = spans[i]!.endMs - spans[i]!.startMs;
    let assetId: string | null = null;
    if (scene.assetType === "video" && p.video) {
      assetId = await generateClip(p, budget, videoId, scene.id, scene.visualPrompt, spanMs, assetDir, assets, log);
    }
    if (!assetId) {
      assetId = `img-${scene.id}`;
      const r = budget.reserve({ videoId, stage: "FOOTAGE", sku: p.image.sku, units: 1 });
      const img = await p.image.generate({ prompt: scene.visualPrompt, aspectRatio: "9:16" });
      budget.settle(r, 1);
      const key = `${assetId}.${img.format}`;
      await writeFile(join(assetDir, key), img.data);
      assets[assetId] = { key, kind: "image" };
    }
    sceneAssets[scene.id] = assetId;
    const asset = assets[assetId]!;
    const kfFile = join(assetDir, "keyframes", `${scene.id}.jpg`);
    await extractKeyframe(join(assetDir, asset.key), kfFile, asset.kind === "video" ? Math.min(1, (asset.durationMs ?? 0) / 2000) : 0);
    keyframes.push({ sceneId: scene.id, assetId, kind: asset.kind === "video" ? "video" : "image", durationMs: asset.durationMs, keyframe: await readFile(kfFile) });
    log(`✓ FOOTAGE ${scene.id}: ${asset.kind} ${asset.key}`);
  }
  let music: { assetId: string } | null = null;
  if (o.musicFile) {
    const key = `music${extname(o.musicFile) || ".mp3"}`;
    await copyFile(o.musicFile, join(assetDir, key));
    assets.music = { key, kind: "audio", durationMs: (await probe(join(assetDir, key))).durationMs };
    music = { assetId: "music" };
  }

  // EDIT --------------------------------------------------------------------
  const compileWith = (plan: EditPlan) =>
    compileTimeline({ script, voice: { assetId: "voice", durationMs: voiceDurationMs, words }, assets, plan, music });
  let plan: EditPlan;
  if (p.claude) {
    const res = await p.claude.planEdit({ script, words, scenes: keyframes }, (candidate) => {
      try {
        compileWith(candidate);
        return [];
      } catch (e) {
        return e instanceof TimelineValidationError ? e.issues : [(e as Error).message];
      }
    });
    recordClaude("EDIT", res.usage);
    plan = res.data;
  } else {
    plan = defaultEditPlan(script, sceneAssets, words);
  }
  await save("editplan.json", plan);
  log("✓ EDIT: EditPlan siap");

  // RENDER ------------------------------------------------------------------
  const timeline = compileWith(plan);
  await save("timeline.json", timeline);
  const rawFile = join(dir, "render-raw.mp4");
  const finalFile = join(dir, "final.mp4");
  let lastPct = -1;
  await renderTimeline({
    timeline,
    assetDir,
    outFile: rawFile,
    onProgress: (pr) => {
      const pct = Math.floor(pr * 10) * 10;
      if (pct !== lastPct) log(`  render ${pct}%`);
      lastPct = pct;
    },
  });
  await loudnorm(rawFile, finalFile);
  log(`✓ RENDER: ${finalFile}`);

  // QA ----------------------------------------------------------------------
  const qa = await qaCheck(finalFile);
  await save("qa.json", qa);
  const costUsd = budget.committed({ videoId });
  await save("cost-ledger.json", { totalUsd: costUsd, entries: ledger.list() });
  log(`${qa.passed ? "✓" : "✗"} QA: ${qa.checks.map((c) => `${c.ok ? "ok" : "GAGAL"} ${c.name} (${c.detail})`).join(", ")}`);
  log(`Σ biaya tercatat: US$${costUsd.toFixed(3)}`);
  return { videoId, dir, finalFile, qa, costUsd };
}

async function factCheck(
  p: Providers,
  topic: string,
  recordClaude: (stage: Stage, usage: ClaudeUsage[]) => void,
  log: (m: string) => void,
): Promise<FactSheet> {
  const claude = p.claude!;
  log("… FACTCHECK: riset dengan web search");
  const research = await claude.research({ topic });
  recordClaude("FACTCHECK", research.usage);
  const extracted = await claude.extractResearch(research.data);
  recordClaude("FACTCHECK", extracted.usage);

  const urls = new Set(extracted.data.claims.flatMap((c) => [...c.supporting, ...c.refuting].map((s) => s.url)));
  const pages = new Map<string, string | null>();
  await Promise.all([...urls].map(async (url) => pages.set(url, await fetchPageText(url))));
  return { topic, claims: extracted.data.claims.map((c) => evaluateClaim(c, pages)) };
}

async function generateClip(
  p: Providers,
  budget: BudgetGuard,
  videoId: string,
  sceneId: string,
  prompt: string,
  spanMs: number,
  assetDir: string,
  assets: Record<string, TimelineAsset>,
  log: (m: string) => void,
): Promise<string | null> {
  const video = p.video!;
  const durationSec = Math.min(10, Math.max(3, Math.ceil(spanMs / 1000)));
  const r = budget.reserve({ videoId, stage: "FOOTAGE", sku: video.sku, units: durationSec });
  try {
    const { jobId } = await video.submit({ prompt, aspectRatio: "9:16", durationSec });
    log(`  … ${sceneId}: video job ${jobId}`);
    const deadline = Date.now() + 15 * 60_000;
    let interval = 5_000;
    while (Date.now() < deadline) {
      const state = await video.poll(jobId);
      if (state.state === "succeeded") {
        const rawPath = join(assetDir, `raw-${sceneId}.mp4`);
        const key = `clip-${sceneId}.mp4`;
        await writeFile(rawPath, state.video);
        await normalizeClip(rawPath, join(assetDir, key));
        const assetId = `clip-${sceneId}`;
        assets[assetId] = { key, kind: "video", durationMs: (await probe(join(assetDir, key))).durationMs };
        budget.settle(r, durationSec);
        return assetId;
      }
      if (state.state === "failed") {
        log(`  ! ${sceneId}: generate video gagal (${state.reason})${state.safety ? " [safety]" : ""}; fallback ke gambar`);
        budget.settle(r, 0);
        return null;
      }
      await sleep(interval);
      interval = Math.min(60_000, interval * 2);
    }
    log(`  ! ${sceneId}: timeout generate video; fallback ke gambar`);
    // Biaya job yang timeout belum pasti; anggap terpakai agar cap tetap konservatif.
    budget.settle(r, durationSec);
    return null;
  } catch (e) {
    budget.settle(r, 0);
    log(`  ! ${sceneId}: ${(e as Error).message}; fallback ke gambar`);
    return null;
  }
}

function sceneSpans(script: Script, words: DisplayWord[], totalMs: number) {
  const starts = script.scenes.map((scene, i) =>
    i === 0 ? 0 : (words.find((w) => w.sentenceIdx === scene.fromSentence)?.startMs ?? 0),
  );
  return starts.map((startMs, i) => ({ startMs, endMs: starts[i + 1] ?? totalMs }));
}

async function qaCheck(file: string): Promise<QaReport> {
  const info = await probe(file);
  const lufs = await measureLoudness(file);
  const checks = [
    { name: "resolusi", ok: info.width === 1080 && info.height === 1920, detail: `${info.width}x${info.height}` },
    { name: "fps", ok: info.fps !== null && Math.abs(info.fps - 30) < 0.5, detail: String(info.fps) },
    {
      name: "durasi",
      ok: info.durationMs >= DEFAULT_TIMELINE_LIMITS.minDurationMs && info.durationMs <= DEFAULT_TIMELINE_LIMITS.maxDurationMs + 500,
      detail: `${(info.durationMs / 1000).toFixed(1)}s`,
    },
    { name: "codec", ok: info.videoCodec === "h264" && info.audioCodec === "aac", detail: `${info.videoCodec}/${info.audioCodec}` },
    { name: "ukuran", ok: info.sizeBytes < 250 * 1024 * 1024, detail: `${(info.sizeBytes / 1024 / 1024).toFixed(1)}MB` },
    { name: "loudness", ok: Math.abs(lufs + 14) <= 2, detail: `${lufs.toFixed(1)} LUFS` },
  ];
  return { passed: checks.every((c) => c.ok), checks };
}
