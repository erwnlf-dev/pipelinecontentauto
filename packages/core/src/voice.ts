import { z } from "zod";

/** Alignment per karakter seperti dikembalikan ElevenLabs `/with-timestamps`. */
export const CharAlignmentSchema = z.object({
  characters: z.array(z.string()),
  character_start_times_seconds: z.array(z.number()),
  character_end_times_seconds: z.array(z.number()),
});
export type CharAlignment = z.infer<typeof CharAlignmentSchema>;

/** Kata yang diucapkan TTS (bentuk spoken) beserta posisinya di teks TTS. */
export interface SpokenWord {
  text: string;
  startMs: number;
  endMs: number;
  /** Offset karakter pertama kata di teks yang dikirim ke TTS. */
  charStart: number;
  sentenceIdx: number;
}

/** Kata dalam bentuk display (yang tampil di caption) dengan timing. */
export interface DisplayWord {
  text: string;
  startMs: number;
  endMs: number;
  sentenceIdx: number;
}

export interface Voiceover {
  assetId: string;
  durationMs: number;
  spokenWords: SpokenWord[];
  displayWords: DisplayWord[];
}

/**
 * Alignment sintetis (tanpa TTS sungguhan) untuk dry-run dan test: tiap
 * karakter `msPerChar`, spasi `msPerSpace`, ditambah jeda setelah tanda baca.
 */
export function syntheticAlignment(
  text: string,
  opts: { msPerChar?: number; msPerSpace?: number; punctPauseMs?: number } = {},
): CharAlignment {
  const msPerChar = opts.msPerChar ?? 65;
  const msPerSpace = opts.msPerSpace ?? 40;
  const punctPauseMs = opts.punctPauseMs ?? 250;
  const characters: string[] = [];
  const starts: number[] = [];
  const ends: number[] = [];
  let t = 0;
  for (const ch of text) {
    const dur = /\s/.test(ch) ? msPerSpace : msPerChar;
    characters.push(ch);
    starts.push(t / 1000);
    t += dur;
    ends.push(t / 1000);
    if (/[.,!?;:]/.test(ch)) t += punctPauseMs;
  }
  return { characters, character_start_times_seconds: starts, character_end_times_seconds: ends };
}
