import { syntheticAlignment } from "@pca/core";
import { describe, expect, it } from "vitest";
import { DEMO_SCRIPT, alignmentToSpokenWords, mapDisplayWords } from "../src";
import { oneSentenceScript, wordsFor } from "./helpers";

describe("alignmentToSpokenWords", () => {
  it("mengelompokkan karakter jadi kata dan memetakan ke kalimat", () => {
    const { spoken } = wordsFor(DEMO_SCRIPT);
    const expected = DEMO_SCRIPT.sentences.reduce((n, s) => n + s.spoken.split(/\s+/).length, 0);
    expect(spoken).toHaveLength(expected);
    expect(spoken[0]).toMatchObject({ text: "Tahukah", sentenceIdx: 0, startMs: 0, charStart: 0 });
    expect(spoken.at(-1)).toMatchObject({ text: "berikutnya!", sentenceIdx: DEMO_SCRIPT.sentences.length - 1 });
    for (let i = 1; i < spoken.length; i++) {
      expect(spoken[i]!.startMs).toBeGreaterThanOrEqual(spoken[i - 1]!.endMs);
    }
  });

  it("gagal keras bila jumlah kata tidak cocok dengan script", () => {
    const script = oneSentenceScript("Halo dunia", "Halo dunia");
    expect(() => alignmentToSpokenWords(syntheticAlignment("Halo dunia ini"), script)).toThrow(/jumlah kata/);
  });

  it("menolak array alignment yang panjangnya berbeda", () => {
    const script = oneSentenceScript("Halo", "Halo");
    const bad = { ...syntheticAlignment("Halo"), character_end_times_seconds: [0.1] };
    expect(() => alignmentToSpokenWords(bad, script)).toThrow(/tidak konsisten/);
  });
});

describe("mapDisplayWords", () => {
  it("angka di display mengambil rentang waktu kata-kata yang diucapkan", () => {
    const script = oneSentenceScript(
      "Tahun 1945, Indonesia merdeka.",
      "Tahun sembilan belas empat puluh lima, Indonesia merdeka.",
    );
    const spoken = alignmentToSpokenWords(syntheticAlignment(script.sentences[0]!.spoken), script);
    const display = mapDisplayWords(script.sentences[0]!.display, spoken, 0);

    expect(display.map((w) => w.text)).toEqual(["Tahun", "1945,", "Indonesia", "merdeka."]);
    expect(display[0]).toMatchObject({ startMs: spoken[0]!.startMs, endMs: spoken[0]!.endMs });
    expect(display[1]).toMatchObject({ startMs: spoken[1]!.startMs, endMs: spoken[5]!.endMs });
    expect(display[2]).toMatchObject({ startMs: spoken[6]!.startMs, endMs: spoken[6]!.endMs });
  });

  it("membagi beberapa kata display tanpa jangkar secara proporsional", () => {
    const script = oneSentenceScript("Sekitar 70% wilayahnya laut.", "Sekitar tujuh puluh persen wilayahnya laut.");
    const spoken = alignmentToSpokenWords(syntheticAlignment(script.sentences[0]!.spoken), script);
    const display = mapDisplayWords(script.sentences[0]!.display, spoken, 0);
    expect(display[1]).toMatchObject({ text: "70%", startMs: spoken[1]!.startMs, endMs: spoken[3]!.endMs });
    expect(display.every((w, i) => i === 0 || w.startMs >= display[i - 1]!.endMs)).toBe(true);
  });

  it("menangani display yang lebih panjang dari spoken", () => {
    const script = oneSentenceScript("Ini fakta super unik", "Ini fakta");
    const spoken = alignmentToSpokenWords(syntheticAlignment("Ini fakta"), script);
    const display = mapDisplayWords("Ini fakta super unik", spoken, 0);
    expect(display).toHaveLength(4);
    expect(display.every((w) => w.endMs >= w.startMs)).toBe(true);
    expect(display.at(-1)!.endMs).toBe(spoken.at(-1)!.endMs);
  });

  it("demo: '3 tahun' dipetakan dari 'tiga tahun'", () => {
    const { display } = wordsFor(DEMO_SCRIPT);
    const three = display.find((w) => w.text === "3");
    expect(three).toBeDefined();
    expect(three!.endMs).toBeGreaterThan(three!.startMs);
  });
});
