import { describe, expect, it } from "vitest";
import { type CaptionWordInput, chunkCaptions } from "../src";

function words(text: string, msPerWord = 300, gapMs = 0): CaptionWordInput[] {
  let t = 0;
  return text.split(" ").map((w) => {
    const out = { text: w, startMs: t, endMs: t + msPerWord, emphasis: false };
    t += msPerWord + gapMs;
    return out;
  });
}

const texts = (caps: ReturnType<typeof chunkCaptions>) => caps.map((c) => c.words.map((w) => w.text).join(" "));

describe("chunkCaptions (Bahasa Indonesia)", () => {
  it("tidak mengakhiri chunk dengan preposisi/konjungsi", () => {
    const caps = chunkCaptions(words("pigmen ini berasal dari udang kecil yang hidup di danau asin"));
    for (const c of texts(caps)) {
      expect(c).not.toMatch(/\b(di|ke|dari|yang|dan|untuk|dengan|pada)$/);
    }
  });

  it("memutus di tanda baca", () => {
    const caps = chunkCaptions(words("Tahukah kamu, flamingo lahir abu-abu?"));
    expect(texts(caps)[0]).toBe("Tahukah kamu,");
  });

  it("menjaga angka dan satuan tetap utuh", () => {
    const caps = chunkCaptions(words("populasinya mencapai lebih dari 300 juta ekor di dunia"));
    expect(texts(caps).some((c) => c.includes("300 juta"))).toBe(true);
  });

  it("menjaga kata ulang berhyphen sebagai satu token", () => {
    const caps = chunkCaptions(words("anak-anak flamingo berwarna abu-abu"));
    const all = texts(caps).join(" | ");
    expect(all).toContain("anak-anak");
    expect(all).toContain("abu-abu");
  });

  it("menghormati maxWords dan maxChars", () => {
    const caps = chunkCaptions(words("satu dua tiga empat lima enam tujuh delapan sembilan sepuluh sebelas"));
    for (const c of caps) {
      expect(c.words.length).toBeLessThanOrEqual(4);
      expect(c.words.map((w) => w.text).join(" ").length).toBeLessThanOrEqual(18);
    }
  });

  it("memutus pada jeda panjang", () => {
    const ws = words("halo semua", 300);
    ws[1]!.startMs += 600;
    ws[1]!.endMs += 600;
    expect(chunkCaptions(ws)).toHaveLength(2);
  });

  it("chunk tidak saling tumpang tindih dan tampil minimal 0.4 detik bila ada ruang", () => {
    const caps = chunkCaptions(words("ini adalah contoh kalimat panjang yang akan dipecah jadi beberapa bagian kecil", 250, 400));
    caps.forEach((c, i) => {
      expect(c.endMs).toBeGreaterThan(c.startMs);
      if (i > 0) expect(c.startMs).toBeGreaterThanOrEqual(caps[i - 1]!.endMs);
      const next = caps[i + 1];
      if (!next || next.startMs - c.startMs >= 400) expect(c.endMs - c.startMs).toBeGreaterThanOrEqual(400);
    });
  });

  it("menyimpan flag emphasis per kata", () => {
    const ws = words("fakta paling unik");
    ws[2]!.emphasis = true;
    expect(chunkCaptions(ws)[0]!.words[2]!.emphasis).toBe(true);
  });
});
