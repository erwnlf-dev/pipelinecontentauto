import {
  type AudioTrack,
  type DisplayWord,
  type EditPlan,
  type Overlay,
  type Script,
  type Timeline,
  type TimelineAsset,
  type TimelineLimits,
  type VideoSegment,
  DEFAULT_TIMELINE_LIMITS,
  TimelineValidationError,
  validateTimeline,
} from "@pca/core";
import { type ChunkOptions, DEFAULT_CHUNK_OPTIONS, chunkCaptions } from "./captions/chunk-id";

export interface CompileInput {
  script: Script;
  voice: { assetId: string; durationMs: number; words: DisplayWord[] };
  /** Semua asset yang boleh dipakai, termasuk voice dan musik. */
  assets: Record<string, TimelineAsset>;
  plan: EditPlan;
  music?: { assetId: string; gainDb?: number; duckDb?: number } | null;
}

export interface CompileOptions {
  fps: number;
  width: number;
  height: number;
  /** Jeda setelah kata terakhir sebelum video selesai. */
  tailMs: number;
  transitionMs: number;
  /** Jeda antar kata yang masih dianggap satu rentang bicara (untuk ducking). */
  speechGapMs: number;
  limits: TimelineLimits;
  chunk: ChunkOptions;
}

export const DEFAULT_COMPILE_OPTIONS: CompileOptions = {
  fps: 30,
  width: 1080,
  height: 1920,
  tailMs: 700,
  transitionMs: 300,
  speechGapMs: 400,
  limits: DEFAULT_TIMELINE_LIMITS,
  chunk: DEFAULT_CHUNK_OPTIONS,
};

/**
 * Membangun Timeline lengkap dari keputusan kreatif Claude (EditPlan) dan data
 * deterministik (script, word timings, asset). Semua aritmetika waktu ada di
 * sini; hasilnya divalidasi dan dilempar `TimelineValidationError` bila salah.
 */
export function compileTimeline(input: CompileInput, options: Partial<CompileOptions> = {}): Timeline {
  const o = { ...DEFAULT_COMPILE_OPTIONS, ...options };
  const { script, voice, assets, plan } = input;
  const words = voice.words;
  if (words.length === 0) throw new Error("voice over tanpa kata");

  const lastWordEnd = words[words.length - 1]!.endMs;
  const durationMs = Math.max(voice.durationMs, lastWordEnd) + o.tailMs;

  // Batas scene dari kata pertama kalimat pertamanya; scene pertama mulai di 0.
  const sceneStarts = script.scenes.map((scene, i) => {
    if (i === 0) return 0;
    const first = words.find((w) => w.sentenceIdx === scene.fromSentence);
    if (!first) throw new Error(`tidak ada kata untuk kalimat ${scene.fromSentence} (scene ${scene.id})`);
    return first.startMs;
  });

  const planById = new Map(plan.scenes.map((s) => [s.sceneId, s]));
  const video: VideoSegment[] = script.scenes.map((scene, i) => {
    const startMs = sceneStarts[i]!;
    const endMs = i + 1 < script.scenes.length ? sceneStarts[i + 1]! : durationMs;
    const decision = planById.get(scene.id);
    if (!decision) throw new Error(`EditPlan tidak punya keputusan untuk scene ${scene.id}`);
    const asset = assets[decision.assetId];
    if (!asset) throw new Error(`EditPlan memakai asset tidak dikenal: ${decision.assetId}`);

    let rate = 1;
    let hold = false;
    let sourceInMs = 0;
    if (asset.kind === "video") {
      const clipMs = asset.durationMs ?? 0;
      sourceInMs = Math.max(0, Math.min(decision.sourceInMs, Math.max(0, clipMs - 1000)));
      const available = clipMs - sourceInMs;
      const needed = endMs - startMs;
      if (available < needed) {
        rate = Math.max(o.limits.minRate, Math.floor((available / needed) * 1000) / 1000);
        hold = available < needed * rate;
      }
    }
    return {
      startMs,
      endMs,
      assetId: decision.assetId,
      sourceInMs,
      rate,
      hold,
      // Ken Burns hanya untuk gambar; klip video sudah punya gerakan sendiri.
      motion: asset.kind === "video" ? "none" : decision.motion,
      focus: { x: clamp01(decision.focus.x), y: clamp01(decision.focus.y) },
      transitionIn: {
        type: i === 0 ? "cut" : decision.transitionIn,
        ms: i === 0 || decision.transitionIn === "cut" ? 0 : o.transitionMs,
      },
    };
  });

  const audio: AudioTrack[] = [
    {
      startMs: 0,
      endMs: Math.min(voice.durationMs, durationMs),
      assetId: voice.assetId,
      role: "voice",
      gainDb: 0,
      loop: false,
    },
  ];
  if (input.music) {
    audio.push({
      startMs: 0,
      endMs: durationMs,
      assetId: input.music.assetId,
      role: "music",
      gainDb: input.music.gainDb ?? -16,
      duckDb: input.music.duckDb ?? -8,
      loop: true,
    });
  }

  const emphasis = new Set(plan.emphasisWordIdx);
  const captions = chunkCaptions(
    words.map((w, idx) => ({ text: w.text, startMs: w.startMs, endMs: w.endMs, emphasis: emphasis.has(idx) })),
    o.chunk,
  );
  const lastCaption = captions[captions.length - 1];
  if (lastCaption && lastCaption.endMs > durationMs) lastCaption.endMs = durationMs;

  const hookEnd = clampInt(plan.hook.endMs, 1000, Math.min(4000, durationMs));
  const overlays: Overlay[] = [];
  if (plan.hook.text.trim()) overlays.push({ startMs: 0, endMs: hookEnd, text: plan.hook.text.trim(), slot: "top" });
  video.forEach((seg, i) => {
    const text = planById.get(script.scenes[i]!.id)?.overlay?.trim();
    if (!text) return;
    const startMs = Math.max(seg.startMs, hookEnd);
    if (seg.endMs - startMs >= 800) overlays.push({ startMs, endMs: seg.endMs, text, slot: "top" });
  });

  const timeline: Timeline = {
    v: 1,
    fps: o.fps,
    w: o.width,
    h: o.height,
    durationMs,
    assets,
    video,
    audio,
    captions,
    overlays,
    speech: speechSpans(words, o.speechGapMs),
  };

  const issues = validateTimeline(timeline, o.limits);
  if (issues.length) throw new TimelineValidationError(issues);
  return timeline;
}

function speechSpans(words: DisplayWord[], gapMs: number): { startMs: number; endMs: number }[] {
  const spans: { startMs: number; endMs: number }[] = [];
  for (const w of words) {
    const last = spans[spans.length - 1];
    if (last && w.startMs - last.endMs <= gapMs) last.endMs = Math.max(last.endMs, w.endMs);
    else spans.push({ startMs: w.startMs, endMs: w.endMs });
  }
  return spans;
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const clampInt = (n: number, min: number, max: number) => Math.round(Math.min(max, Math.max(min, n)));
