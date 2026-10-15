import type { CharAlignment, DisplayWord, Script, SpokenWord } from "@pca/core";

const toMs = (seconds: number) => Math.round(seconds * 1000);

function splitWords(text: string): string[] {
  return text.trim().split(/\s+/).filter(Boolean);
}

/**
 * Mengelompokkan alignment per karakter (ElevenLabs) menjadi kata. Kata
 * dipetakan ke kalimat berdasarkan jumlah kata `spoken` tiap kalimat, sehingga
 * tetap benar walau ElevenLabs menormalkan spasi.
 */
export function alignmentToSpokenWords(alignment: CharAlignment, script: Script): SpokenWord[] {
  const { characters, character_start_times_seconds: starts, character_end_times_seconds: ends } = alignment;
  if (characters.length !== starts.length || characters.length !== ends.length) {
    throw new Error("alignment tidak konsisten: panjang array berbeda");
  }

  const raw: Omit<SpokenWord, "sentenceIdx">[] = [];
  let current: { text: string; first: number; last: number } | null = null;
  characters.forEach((ch, i) => {
    if (/\s/.test(ch)) {
      if (current) raw.push(finish(current));
      current = null;
      return;
    }
    if (current) {
      current.text += ch;
      current.last = i;
    } else {
      current = { text: ch, first: i, last: i };
    }
  });
  if (current) raw.push(finish(current));

  function finish(w: { text: string; first: number; last: number }) {
    return { text: w.text, startMs: toMs(starts[w.first]!), endMs: toMs(ends[w.last]!), charStart: w.first };
  }

  const counts = script.sentences.map((s) => splitWords(s.spoken).length);
  const expected = counts.reduce((a, b) => a + b, 0);
  if (expected !== raw.length) {
    throw new Error(`jumlah kata alignment (${raw.length}) ≠ jumlah kata spoken script (${expected})`);
  }

  const words: SpokenWord[] = [];
  let k = 0;
  counts.forEach((count, sentenceIdx) => {
    for (let j = 0; j < count; j++) words.push({ ...raw[k++]!, sentenceIdx });
  });
  return words;
}

function normalizeToken(token: string): string {
  return token.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
}

/**
 * Memetakan kata display (yang tampil di caption) ke timing kata spoken.
 * Kata yang sama persis (setelah normalisasi) jadi jangkar via LCS; kata
 * display di antara dua jangkar (mis. "1945" vs "sembilan belas empat puluh
 * lima") dibagi proporsional panjang karakter dalam rentang waktu kata spoken
 * yang tidak cocok.
 */
export function mapDisplayWords(display: string, spoken: SpokenWord[], sentenceIdx: number): DisplayWord[] {
  const d = splitWords(display);
  if (d.length === 0) return [];
  if (spoken.length === 0) throw new Error(`kalimat ${sentenceIdx} tanpa kata spoken`);

  const dn = d.map(normalizeToken);
  const sn = spoken.map((w) => normalizeToken(w.text));

  // LCS di atas token yang sudah dinormalisasi.
  const lcs: number[][] = Array.from({ length: d.length + 1 }, () => new Array<number>(spoken.length + 1).fill(0));
  for (let i = d.length - 1; i >= 0; i--) {
    for (let j = spoken.length - 1; j >= 0; j--) {
      lcs[i]![j] =
        dn[i] && dn[i] === sn[j] ? lcs[i + 1]![j + 1]! + 1 : Math.max(lcs[i + 1]![j]!, lcs[i]![j + 1]!);
    }
  }
  const anchors: [number, number][] = [];
  for (let i = 0, j = 0; i < d.length && j < spoken.length; ) {
    if (dn[i] && dn[i] === sn[j]) {
      anchors.push([i, j]);
      i++;
      j++;
    } else if (lcs[i + 1]![j]! >= lcs[i]![j + 1]!) i++;
    else j++;
  }

  const out: DisplayWord[] = new Array(d.length);
  const sentenceStart = spoken[0]!.startMs;
  const sentenceEnd = spoken[spoken.length - 1]!.endMs;

  const fillGap = (dFrom: number, dTo: number, sFrom: number, sTo: number, prevEnd: number, nextStart: number) => {
    // dFrom..dTo dan sFrom..sTo inklusif; bisa kosong.
    if (dFrom > dTo) return;
    let gapStart: number;
    let gapEnd: number;
    if (sFrom <= sTo) {
      gapStart = spoken[sFrom]!.startMs;
      gapEnd = spoken[sTo]!.endMs;
    } else {
      gapStart = prevEnd;
      gapEnd = Math.max(prevEnd, nextStart);
    }
    const tokens = d.slice(dFrom, dTo + 1);
    const weights = tokens.map((t) => Math.max(1, t.length));
    const total = weights.reduce((a, b) => a + b, 0);
    let acc = 0;
    tokens.forEach((text, k) => {
      const startMs = Math.round(gapStart + ((gapEnd - gapStart) * acc) / total);
      acc += weights[k]!;
      const endMs = Math.round(gapStart + ((gapEnd - gapStart) * acc) / total);
      out[dFrom + k] = { text, startMs, endMs, sentenceIdx };
    });
  };

  let prevD = -1;
  let prevS = -1;
  let prevEnd = sentenceStart;
  for (const [i, j] of anchors) {
    fillGap(prevD + 1, i - 1, prevS + 1, j - 1, prevEnd, spoken[j]!.startMs);
    out[i] = { text: d[i]!, startMs: spoken[j]!.startMs, endMs: spoken[j]!.endMs, sentenceIdx };
    prevD = i;
    prevS = j;
    prevEnd = spoken[j]!.endMs;
  }
  fillGap(prevD + 1, d.length - 1, prevS + 1, spoken.length - 1, prevEnd, sentenceEnd);
  return out;
}

/** Display words untuk seluruh script, berurutan. */
export function buildDisplayWords(script: Script, spoken: SpokenWord[]): DisplayWord[] {
  return script.sentences.flatMap((sentence, idx) =>
    mapDisplayWords(
      sentence.display,
      spoken.filter((w) => w.sentenceIdx === idx),
      idx,
    ),
  );
}
