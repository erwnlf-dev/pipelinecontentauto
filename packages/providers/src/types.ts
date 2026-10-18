import type { CharAlignment } from "@pca/core";

export interface TtsResult {
  audio: Buffer;
  /** Ekstensi file audio, mis. "mp3" atau "wav". */
  format: "mp3" | "wav";
  alignment: CharAlignment;
  characters: number;
}

export interface TtsInput {
  text: string;
  voiceId: string;
  /** Teks sebelum/sesudah klip ini — menjaga intonasi saat script dipecah per kalimat. */
  previousText?: string;
  nextText?: string;
}

export interface TtsProvider {
  readonly sku: string;
  synthesize(input: TtsInput): Promise<TtsResult>;
}

export interface ImageResult {
  data: Buffer;
  format: "png" | "jpg";
}

export interface ImageProvider {
  readonly sku: string;
  generate(input: { prompt: string; aspectRatio: "9:16" }): Promise<ImageResult>;
}

export type VideoJobState =
  | { state: "running" }
  | { state: "succeeded"; video: Buffer }
  | { state: "failed"; reason: string; /** true bila ditolak safety filter: jangan retry dengan prompt sama. */ safety: boolean };

/**
 * Generasi video async: `submit` mengembalikan id job yang disimpan di DB
 * (`assets.provider_job_id`); retry harus melanjutkan `poll`, bukan submit ulang.
 */
export interface VideoProvider {
  readonly sku: string;
  submit(input: { prompt: string; aspectRatio: "9:16"; durationSec: number; referenceImage?: Buffer }): Promise<{ jobId: string }>;
  poll(jobId: string): Promise<VideoJobState>;
}

export interface SoundEffectProvider {
  readonly sku: string;
  generate(input: { text: string; durationSec?: number; promptInfluence?: number; loop?: boolean }): Promise<{ audio: Buffer; format: "mp3" }>;
}
