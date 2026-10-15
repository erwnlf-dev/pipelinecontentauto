import { describe, expect, it } from "vitest";
import { type Script, spokenText, validateScript } from "../src";
import { DEMO_SCRIPT } from "../../pipeline/src/demo";

describe("validateScript", () => {
  it("menerima script demo", () => {
    expect(validateScript(DEMO_SCRIPT)).toEqual([]);
  });

  it("menolak scene yang tidak berurutan atau tidak menutup semua kalimat", () => {
    const broken: Script = {
      ...DEMO_SCRIPT,
      scenes: [
        { ...DEMO_SCRIPT.scenes[0]!, fromSentence: 0, toSentence: 1 },
        { ...DEMO_SCRIPT.scenes[1]!, fromSentence: 3, toSentence: 4 },
      ],
    };
    const errors = validateScript(broken);
    expect(errors.some((e) => e.includes("harus mulai di kalimat 2"))).toBe(true);
    expect(errors.some((e) => e.includes("tidak menutup semua kalimat"))).toBe(true);
  });

  it("membatasi jumlah scene video", () => {
    const tooManyVideos: Script = {
      ...DEMO_SCRIPT,
      scenes: DEMO_SCRIPT.scenes.map((s) => ({ ...s, assetType: "video" as const })),
    };
    expect(validateScript(tooManyVideos, { minWords: 0, maxWords: 999, maxVideoScenes: 2 })).toEqual([
      "scene video 4 melebihi batas 2",
    ]);
  });
});

describe("spokenText", () => {
  it("menggabungkan kalimat spoken dengan offset yang benar", () => {
    const { text, sentenceOffsets } = spokenText(DEMO_SCRIPT);
    DEMO_SCRIPT.sentences.forEach((s, i) => {
      expect(text.slice(sentenceOffsets[i]!, sentenceOffsets[i]! + s.spoken.length)).toBe(s.spoken);
    });
  });
});
