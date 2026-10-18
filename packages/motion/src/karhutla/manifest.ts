/** Output `scripts/elevenlabs.ts` → `generated/voiceover.json`; dibaca komposisi saat bundle. */
export interface CaptionWord {
  text: string;
  /** ms relatif awal klip VO beat ini. */
  startMs: number;
  endMs: number;
  emphasis: boolean;
}

export interface CaptionChunk {
  startMs: number;
  endMs: number;
  words: CaptionWord[];
}

export interface BeatAudio {
  id: string;
  /** Path relatif `public/`, atau null bila VO belum digenerate (mode dry). */
  file: string | null;
  durationMs: number;
  captions: CaptionChunk[];
}

export interface VoiceoverManifest {
  v: 1;
  mode: "live" | "dry";
  voiceId: string;
  modelId: string;
  beats: BeatAudio[];
  /** Path relatif `public/` per SFX id; key yang tidak ada = SFX tidak dimainkan. */
  sfx: Partial<Record<string, string>>;
}
