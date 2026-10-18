/**
 * Generate voiceover + SFX untuk KarhutlaReel.
 *
 *   pnpm --filter @pca/motion audio        # live: ElevenLabs TTS /with-timestamps + /sound-generation
 *   pnpm --filter @pca/motion audio:dry    # tanpa API: timing sintetis + SFX sintetis
 *
 * Output: public/karhutla/{vo,sfx}/* dan src/karhutla/generated/voiceover.json.
 * Klip VO di-cache per hash (teks + konteks + voice + setting) agar re-run tidak membakar kredit.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { type CharAlignment, type Script, syntheticAlignment } from "@pca/core";
import { alignmentToSpokenWords, chunkCaptions, mapDisplayWords } from "@pca/pipeline";
import { ElevenLabsSfx, ElevenLabsTts, probe } from "@pca/providers";
import type { BeatAudio, VoiceoverManifest } from "../src/karhutla/manifest";
import { BEATS, type Beat, SFX_PROMPTS, type SfxId, VOICE } from "../src/karhutla/script";
import { synthSfx } from "./synth-sfx";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = join(root, "public");
const manifestFile = join(root, "src/karhutla/generated/voiceover.json");
const args = new Set(process.argv.slice(2));
const dry = args.has("--dry");
const skipSfx = args.has("--no-sfx");

const bare = (t: string) => t.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");

/** Alignment per karakter → kata display ber-timing → chunk caption Bahasa Indonesia. */
function buildCaptions(beat: Beat, alignment: CharAlignment): BeatAudio["captions"] {
  const script: Script = {
    title: beat.id,
    hook: "",
    sentences: [{ display: beat.display, spoken: beat.spoken, claimIds: beat.claimIds }],
    scenes: [],
    postCaption: "",
    hashtags: [],
  };
  const spoken = alignmentToSpokenWords(alignment, script);
  const display = mapDisplayWords(beat.display, spoken, 0);
  const emph = new Set(beat.emphasis.map(bare));
  const words = display.map((w) => ({ text: w.text, startMs: w.startMs, endMs: w.endMs, emphasis: emph.has(bare(w.text)) }));
  return chunkCaptions(words, { maxWords: 4, maxChars: 20, minDurationMs: 400, pauseMs: 250 }).map((c) => ({
    startMs: c.startMs,
    endMs: c.endMs,
    words: c.words,
  }));
}

async function main() {
  mkdirSync(join(publicDir, "karhutla/vo"), { recursive: true });
  mkdirSync(join(publicDir, "karhutla/sfx"), { recursive: true });
  mkdirSync(dirname(manifestFile), { recursive: true });

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!dry && !apiKey) throw new Error("ELEVENLABS_API_KEY kosong — isi .env atau pakai --dry");
  const voiceId = process.env.ELEVENLABS_VOICE_ID || VOICE.voiceId;
  const modelId = process.env.ELEVENLABS_MODEL_ID || VOICE.modelId;

  const tts = new ElevenLabsTts({
    apiKey: apiKey ?? "",
    modelId,
    // language_code hanya dikirim bila diisi: tidak semua model menerimanya.
    languageCode: process.env.ELEVENLABS_LANGUAGE_CODE || undefined,
    voiceSettings: { ...VOICE.settings },
  });
  const sfxApi = new ElevenLabsSfx({ apiKey: apiKey ?? "" });

  const chars = BEATS.reduce((n, b) => n + b.spoken.length, 0);
  console.log(`${dry ? "DRY" : "LIVE"} · voice ${voiceId} · ${modelId} · ${BEATS.length} beat · ${chars} karakter TTS`);

  const beats: BeatAudio[] = [];
  for (const [i, beat] of BEATS.entries()) {
    const previousText = BEATS[i - 1]?.spoken;
    const nextText = BEATS[i + 1]?.spoken;
    if (dry) {
      const alignment = syntheticAlignment(beat.spoken, { msPerChar: 62, msPerSpace: 40, punctPauseMs: 220 });
      const durationMs = Math.round(alignment.character_end_times_seconds.at(-1)! * 1000);
      beats.push({ id: beat.id, file: null, durationMs, captions: buildCaptions(beat, alignment) });
      continue;
    }
    const hash = createHash("sha256")
      .update(JSON.stringify([voiceId, modelId, VOICE.settings, beat.spoken, previousText, nextText]))
      .digest("hex")
      .slice(0, 10);
    const rel = `karhutla/vo/${String(i).padStart(2, "0")}-${beat.id}-${hash}.mp3`;
    const alignFile = join(publicDir, rel.replace(/\.mp3$/, ".alignment.json"));
    let alignment: CharAlignment;
    if (existsSync(join(publicDir, rel)) && existsSync(alignFile)) {
      alignment = JSON.parse(readFileSync(alignFile, "utf8"));
      console.log(`  ✓ cache ${rel}`);
    } else {
      const res = await tts.synthesize({ text: beat.spoken, voiceId, previousText, nextText });
      writeFileSync(join(publicDir, rel), res.audio);
      writeFileSync(alignFile, JSON.stringify(res.alignment));
      alignment = res.alignment;
      console.log(`  ↓ ${rel}`);
    }
    const { durationMs } = await probe(join(publicDir, rel));
    beats.push({ id: beat.id, file: rel, durationMs, captions: buildCaptions(beat, alignment) });
  }

  const sfx: Partial<Record<SfxId, string>> = {};
  if (!skipSfx) {
    for (const [id, p] of Object.entries(SFX_PROMPTS) as [SfxId, (typeof SFX_PROMPTS)[SfxId]][]) {
      if (dry) {
        const rel = `karhutla/sfx/${id}.wav`;
        synthSfx(id, join(publicDir, rel));
        sfx[id] = rel;
        continue;
      }
      const rel = `karhutla/sfx/${id}.mp3`;
      if (!existsSync(join(publicDir, rel))) {
        const res = await sfxApi.generate({ text: p.text, durationSec: p.durationSec, promptInfluence: p.promptInfluence, loop: p.loop });
        writeFileSync(join(publicDir, rel), res.audio);
        console.log(`  ↓ ${rel}`);
      }
      sfx[id] = rel;
    }
  }

  const manifest: VoiceoverManifest = { v: 1, mode: dry ? "dry" : "live", voiceId, modelId, beats, sfx };
  writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
  const totalMs = beats.reduce((n, b) => n + b.durationMs, 0);
  console.log(`→ ${manifestFile} (VO murni ${(totalMs / 1000).toFixed(1)} s)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
