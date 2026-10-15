import { z } from "zod";
import { FocusSchema, MotionSchema, TransitionSchema } from "./edit-plan";

const span = {
  startMs: z.number().int(),
  endMs: z.number().int(),
};

export const TimelineAssetSchema = z.object({
  /** Path lokal atau key object storage; di-resolve ke URL saat render. */
  key: z.string(),
  kind: z.enum(["video", "image", "audio"]),
  durationMs: z.number().int().optional(),
});
export type TimelineAsset = z.infer<typeof TimelineAssetSchema>;

export const VideoSegmentSchema = z.object({
  ...span,
  assetId: z.string(),
  sourceInMs: z.number().int(),
  /** Kecepatan putar klip; < 1 berarti diperlambat. */
  rate: z.number(),
  /** Tahan frame terakhir bila klip habis sebelum segmen selesai. */
  hold: z.boolean(),
  motion: MotionSchema,
  focus: FocusSchema,
  transitionIn: z.object({ type: TransitionSchema, ms: z.number().int() }),
});
export type VideoSegment = z.infer<typeof VideoSegmentSchema>;

export const AudioTrackSchema = z.object({
  ...span,
  assetId: z.string(),
  role: z.enum(["voice", "music"]),
  gainDb: z.number(),
  /** Pengurangan gain saat ada suara narasi (khusus musik). */
  duckDb: z.number().optional(),
  loop: z.boolean(),
});
export type AudioTrack = z.infer<typeof AudioTrackSchema>;

export const CaptionWordSchema = z.object({ ...span, text: z.string(), emphasis: z.boolean() });
export const CaptionSchema = z.object({ ...span, words: z.array(CaptionWordSchema) });
export type Caption = z.infer<typeof CaptionSchema>;

export const OverlaySchema = z.object({ ...span, text: z.string(), slot: z.enum(["top", "center"]) });
export type Overlay = z.infer<typeof OverlaySchema>;

export const TimelineSchema = z.object({
  v: z.literal(1),
  fps: z.number().int(),
  w: z.number().int(),
  h: z.number().int(),
  durationMs: z.number().int(),
  assets: z.record(z.string(), TimelineAssetSchema),
  video: z.array(VideoSegmentSchema),
  audio: z.array(AudioTrackSchema),
  captions: z.array(CaptionSchema),
  overlays: z.array(OverlaySchema),
  /** Rentang waktu narasi aktif, dipakai untuk ducking musik. */
  speech: z.array(z.object(span)),
});
export type Timeline = z.infer<typeof TimelineSchema>;

export interface TimelineLimits {
  minDurationMs: number;
  maxDurationMs: number;
  minRate: number;
}

export const DEFAULT_TIMELINE_LIMITS: TimelineLimits = {
  minDurationMs: 30_000,
  maxDurationMs: 60_000,
  minRate: 0.8,
};

/**
 * Konversi ms → frame dari posisi absolut. Durasi segmen dihitung sebagai
 * `msToFrame(end) - msToFrame(start)` agar error pembulatan tidak menumpuk.
 */
export function msToFrame(ms: number, fps: number): number {
  return Math.round((ms * fps) / 1000);
}

/** Mengembalikan daftar pelanggaran; array kosong berarti timeline valid. */
export function validateTimeline(t: Timeline, limits: TimelineLimits = DEFAULT_TIMELINE_LIMITS): string[] {
  const errors: string[] = [];
  const parsed = TimelineSchema.safeParse(t);
  if (!parsed.success) return parsed.error.issues.map((i) => `schema: ${i.path.join(".")} ${i.message}`);

  if (t.durationMs < limits.minDurationMs || t.durationMs > limits.maxDurationMs) {
    errors.push(`durasi ${t.durationMs}ms di luar ${limits.minDurationMs}-${limits.maxDurationMs}ms`);
  }

  // Segmen video harus menutup 0..durationMs tanpa gap/overlap.
  let cursor = 0;
  t.video.forEach((seg, i) => {
    if (seg.startMs !== cursor) errors.push(`video[${i}] mulai ${seg.startMs}ms, seharusnya ${cursor}ms (gap/overlap)`);
    if (seg.endMs <= seg.startMs) errors.push(`video[${i}] durasi tidak positif`);
    cursor = seg.endMs;

    const asset = t.assets[seg.assetId];
    if (!asset) {
      errors.push(`video[${i}] memakai asset tidak dikenal: ${seg.assetId}`);
      return;
    }
    if (asset.kind === "audio") errors.push(`video[${i}] memakai asset audio`);
    if (asset.kind === "video") {
      if (seg.rate < limits.minRate) errors.push(`video[${i}] rate ${seg.rate} < ${limits.minRate}`);
      if (asset.durationMs === undefined) {
        errors.push(`asset video ${seg.assetId} tanpa durationMs`);
      } else if (!seg.hold) {
        const consumed = seg.sourceInMs + (seg.endMs - seg.startMs) * seg.rate;
        if (consumed > asset.durationMs + 1) {
          errors.push(`video[${i}] butuh ${Math.round(consumed)}ms dari klip ${asset.durationMs}ms (set hold atau pilih klip lain)`);
        }
      }
    }
    if (seg.focus.x < 0 || seg.focus.x > 1 || seg.focus.y < 0 || seg.focus.y > 1) {
      errors.push(`video[${i}] focus di luar 0..1`);
    }
  });
  if (t.video.length === 0) errors.push("timeline tanpa segmen video");
  else if (cursor !== t.durationMs) errors.push(`segmen video berakhir di ${cursor}ms, durasi ${t.durationMs}ms`);

  t.audio.forEach((a, i) => {
    if (!t.assets[a.assetId]) errors.push(`audio[${i}] memakai asset tidak dikenal: ${a.assetId}`);
    if (a.startMs < 0 || a.endMs > t.durationMs || a.endMs <= a.startMs) errors.push(`audio[${i}] di luar durasi video`);
  });
  if (!t.audio.some((a) => a.role === "voice")) errors.push("timeline tanpa track voice over");

  let prevEnd = 0;
  t.captions.forEach((c, i) => {
    if (c.startMs < prevEnd) errors.push(`caption[${i}] tumpang tindih dengan caption sebelumnya`);
    if (c.endMs <= c.startMs) errors.push(`caption[${i}] durasi tidak positif`);
    if (c.endMs > t.durationMs) errors.push(`caption[${i}] melewati durasi video`);
    if (c.words.length === 0) errors.push(`caption[${i}] tanpa kata`);
    prevEnd = c.endMs;
  });

  t.overlays.forEach((o, i) => {
    if (o.startMs < 0 || o.endMs > t.durationMs || o.endMs <= o.startMs) errors.push(`overlay[${i}] di luar durasi video`);
  });
  return errors;
}

export class TimelineValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super(`timeline tidak valid:\n- ${issues.join("\n- ")}`);
    this.name = "TimelineValidationError";
  }
}
