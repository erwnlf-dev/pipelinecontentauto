import { z } from "zod";

/**
 * Satu kalimat narasi. `display` tampil di caption, `spoken` dikirim ke TTS
 * (angka/singkatan ditulis seperti diucapkan), `claimIds` menunjuk klaim
 * terverifikasi di FactSheet. Kalimat non-faktual (pertanyaan hook, CTA)
 * memakai `claimIds: []`.
 */
export const SentenceSchema = z.object({
  display: z.string(),
  spoken: z.string(),
  claimIds: z.array(z.string()),
});
export type Sentence = z.infer<typeof SentenceSchema>;

/**
 * Scene = rentang kalimat yang berurutan (inklusif). Batas waktunya diambil
 * dari word timings voice over, bukan diperkirakan oleh LLM.
 */
export const SceneSchema = z.object({
  id: z.string(),
  fromSentence: z.number().int(),
  toSentence: z.number().int(),
  /** Prompt visual dalam bahasa Inggris untuk model gambar/video. */
  visualPrompt: z.string(),
  assetType: z.enum(["video", "image"]),
  onScreenText: z.string().nullable(),
});
export type Scene = z.infer<typeof SceneSchema>;

/**
 * Output stage SCRIPT. Schema ini sengaja tanpa constraint min/max agar bisa
 * dipakai langsung sebagai structured output; aturan semantik dicek oleh
 * `validateScript`.
 */
export const ScriptSchema = z.object({
  title: z.string(),
  hook: z.string(),
  sentences: z.array(SentenceSchema),
  scenes: z.array(SceneSchema),
  postCaption: z.string(),
  hashtags: z.array(z.string()),
});
export type Script = z.infer<typeof ScriptSchema>;

export interface ScriptRules {
  minWords: number;
  maxWords: number;
  maxVideoScenes: number;
}

export const DEFAULT_SCRIPT_RULES: ScriptRules = {
  minWords: 75,
  maxWords: 150,
  maxVideoScenes: 3,
};

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Mengembalikan daftar pelanggaran; array kosong berarti valid. */
export function validateScript(script: Script, rules: ScriptRules = DEFAULT_SCRIPT_RULES): string[] {
  const errors: string[] = [];
  const n = script.sentences.length;
  if (n < 3) errors.push(`script butuh minimal 3 kalimat, dapat ${n}`);

  const words = script.sentences.reduce((sum, s) => sum + countWords(s.spoken), 0);
  if (words < rules.minWords || words > rules.maxWords) {
    errors.push(`jumlah kata (spoken) ${words} di luar rentang ${rules.minWords}-${rules.maxWords}`);
  }

  script.sentences.forEach((s, i) => {
    if (!s.display.trim() || !s.spoken.trim()) errors.push(`kalimat ${i} kosong`);
  });

  if (script.scenes.length < 2) errors.push("butuh minimal 2 scene");
  let expected = 0;
  const ids = new Set<string>();
  for (const scene of script.scenes) {
    if (ids.has(scene.id)) errors.push(`scene id duplikat: ${scene.id}`);
    ids.add(scene.id);
    if (scene.fromSentence !== expected) {
      errors.push(`scene ${scene.id} harus mulai di kalimat ${expected}, bukan ${scene.fromSentence}`);
    }
    if (scene.toSentence < scene.fromSentence) {
      errors.push(`scene ${scene.id} punya rentang kalimat terbalik`);
    }
    expected = scene.toSentence + 1;
  }
  if (n > 0 && expected !== n) errors.push(`scene tidak menutup semua kalimat (berhenti di ${expected}, total ${n})`);

  const videoScenes = script.scenes.filter((s) => s.assetType === "video").length;
  if (videoScenes > rules.maxVideoScenes) {
    errors.push(`scene video ${videoScenes} melebihi batas ${rules.maxVideoScenes}`);
  }
  return errors;
}

/** Teks lengkap yang dikirim ke TTS, plus offset karakter awal tiap kalimat. */
export function spokenText(script: Script): { text: string; sentenceOffsets: number[] } {
  const sentenceOffsets: number[] = [];
  let text = "";
  for (const s of script.sentences) {
    if (text) text += " ";
    sentenceOffsets.push(text.length);
    text += s.spoken.trim();
  }
  return { text, sentenceOffsets };
}
