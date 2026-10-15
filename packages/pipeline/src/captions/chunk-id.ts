import type { Caption } from "@pca/core";

export interface CaptionWordInput {
  text: string;
  startMs: number;
  endMs: number;
  emphasis: boolean;
}

export interface ChunkOptions {
  maxWords: number;
  /** Maksimum karakter per chunk (satu baris caption). */
  maxChars: number;
  minDurationMs: number;
  /** Jeda antar kata yang memaksa chunk baru. */
  pauseMs: number;
}

export const DEFAULT_CHUNK_OPTIONS: ChunkOptions = {
  maxWords: 4,
  maxChars: 18,
  minDurationMs: 400,
  pauseMs: 250,
};

/**
 * Preposisi/konjungsi yang tidak boleh berada di akhir chunk (harus menempel ke
 * kata berikutnya). "ini"/"itu" sengaja tidak dimasukkan karena justru wajar
 * menutup frasa ("hal ini").
 */
const HARD_TRAILING = new Set([
  "di", "ke", "dari", "yang", "dan", "untuk", "dengan", "pada", "si", "sang", "para",
  "oleh", "bagi", "atau", "tetapi", "tapi", "karena", "sebagai", "dalam",
]);

/** Satuan/besaran yang harus menempel dengan angka sebelumnya ("300 juta"). */
const UNITS = new Set([
  "ribu", "juta", "miliar", "milyar", "triliun", "persen", "%", "km", "m", "cm", "mm", "kg",
  "gram", "ton", "liter", "meter", "kilometer", "derajat", "°c", "tahun", "abad", "hari",
  "jam", "menit", "detik", "kali", "x",
]);

const bare = (t: string) => t.toLowerCase().replace(/[^\p{L}\p{N}%°]+/gu, "");
const endsWithPunct = (t: string) => /[.,!?;:…]["')\]]?$/.test(t);
const hasDigit = (t: string) => /\d/.test(t);

function chunkChars(words: CaptionWordInput[]): number {
  return words.reduce((n, w) => n + w.text.length, 0) + Math.max(0, words.length - 1);
}

/**
 * Memecah display words menjadi chunk caption Bahasa Indonesia:
 * 1–4 kata, ≤ maxChars per chunk, putus di tanda baca atau jeda panjang,
 * tidak diakhiri preposisi/konjungsi, dan angka + satuan tetap utuh.
 */
export function chunkCaptions(words: CaptionWordInput[], opts: ChunkOptions = DEFAULT_CHUNK_OPTIONS): Caption[] {
  const groups: CaptionWordInput[][] = [];
  let cur: CaptionWordInput[] = [];

  const flush = () => {
    if (cur.length === 0) return;
    // Pindahkan preposisi/konjungsi di ujung chunk ke chunk berikutnya.
    const carry: CaptionWordInput[] = [];
    while (cur.length > 1 && HARD_TRAILING.has(bare(cur[cur.length - 1]!.text))) {
      carry.unshift(cur.pop()!);
    }
    groups.push(cur);
    cur = carry;
  };

  for (const w of words) {
    const prev = cur[cur.length - 1];
    if (prev) {
      const keepTogether = hasDigit(prev.text) && UNITS.has(bare(w.text)) && !endsWithPunct(prev.text);
      const mustBreak =
        endsWithPunct(prev.text) ||
        w.startMs - prev.endMs > opts.pauseMs ||
        cur.length >= opts.maxWords ||
        chunkChars([...cur, w]) > opts.maxChars;
      if (mustBreak && !(keepTogether && chunkChars([...cur, w]) <= opts.maxChars + 8)) {
        flush();
      }
    }
    cur.push(w);
  }
  flush();
  // flush terakhir bisa menyisakan carry (kata fungsi di akhir kalimat terakhir).
  if (cur.length) groups.push(cur);

  const merged = mergeShortGroups(groups, opts);

  return merged.map((g, i) => {
    const startMs = g[0]!.startMs;
    const next = merged[i + 1];
    const lastEnd = g[g.length - 1]!.endMs;
    let endMs = Math.max(lastEnd, startMs + opts.minDurationMs);
    if (next) {
      const nextStart = next[0]!.startMs;
      // Tutup celah kecil supaya caption tidak berkedip, tapi jangan menimpa chunk berikutnya.
      if (nextStart - endMs < opts.pauseMs) endMs = nextStart;
      endMs = Math.min(endMs, nextStart);
    }
    return {
      startMs,
      endMs: Math.max(endMs, startMs + 1),
      words: g.map((w) => ({ startMs: w.startMs, endMs: w.endMs, text: w.text, emphasis: w.emphasis })),
    };
  });
}

/** Gabungkan chunk yang terlalu singkat dengan tetangganya bila masih muat. */
function mergeShortGroups(groups: CaptionWordInput[][], opts: ChunkOptions): CaptionWordInput[][] {
  const out: CaptionWordInput[][] = [];
  for (const g of groups) {
    const prev = out[out.length - 1];
    const duration = g[g.length - 1]!.endMs - g[0]!.startMs;
    if (
      prev &&
      duration < opts.minDurationMs &&
      !endsWithPunct(prev[prev.length - 1]!.text) &&
      g[0]!.startMs - prev[prev.length - 1]!.endMs <= opts.pauseMs &&
      prev.length + g.length <= opts.maxWords &&
      chunkChars([...prev, ...g]) <= opts.maxChars
    ) {
      prev.push(...g);
    } else {
      out.push([...g]);
    }
  }
  return out;
}
