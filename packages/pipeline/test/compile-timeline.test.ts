import { type TimelineAsset, TimelineValidationError, validateTimeline } from "@pca/core";
import { describe, expect, it } from "vitest";
import { DEMO_SCRIPT, compileTimeline, defaultEditPlan } from "../src";
import { wordsFor } from "./helpers";

function demoInput() {
  const { display, durationMs } = wordsFor(DEMO_SCRIPT);
  const assets: Record<string, TimelineAsset> = {
    voice: { key: "voice.mp3", kind: "audio", durationMs },
    music: { key: "music.mp3", kind: "audio", durationMs: 20_000 },
  };
  const sceneAssets: Record<string, string> = {};
  for (const scene of DEMO_SCRIPT.scenes) {
    assets[`img-${scene.id}`] = { key: `${scene.id}.png`, kind: "image" };
    sceneAssets[scene.id] = `img-${scene.id}`;
  }
  const plan = defaultEditPlan(DEMO_SCRIPT, sceneAssets, display);
  return { display, durationMs, assets, plan };
}

describe("compileTimeline", () => {
  it("membangun timeline valid dari script demo", () => {
    const { display, durationMs, assets, plan } = demoInput();
    const t = compileTimeline({
      script: DEMO_SCRIPT,
      voice: { assetId: "voice", durationMs, words: display },
      assets,
      plan,
      music: { assetId: "music" },
    });

    expect(validateTimeline(t)).toEqual([]);
    expect(t.durationMs).toBe(durationMs + 700);
    expect(t.video).toHaveLength(DEMO_SCRIPT.scenes.length);
    expect(t.video[0]!.startMs).toBe(0);
    expect(t.video.at(-1)!.endMs).toBe(t.durationMs);
    expect(t.video[0]!.transitionIn).toEqual({ type: "cut", ms: 0 });

    // Scene 2 mulai tepat di kata pertama kalimat 2.
    const firstWordOfScene2 = display.find((w) => w.sentenceIdx === DEMO_SCRIPT.scenes[1]!.fromSentence)!;
    expect(t.video[1]!.startMs).toBe(firstWordOfScene2.startMs);

    expect(t.audio.map((a) => a.role)).toEqual(["voice", "music"]);
    expect(t.audio[1]).toMatchObject({ loop: true, gainDb: -16, duckDb: -8 });
    expect(t.overlays[0]).toMatchObject({ slot: "top", text: DEMO_SCRIPT.hook, startMs: 0 });
    expect(t.speech.length).toBeGreaterThan(0);

    const captionWords = t.captions.flatMap((c) => c.words.map((w) => w.text));
    expect(captionWords).toEqual(display.map((w) => w.text));
    expect(t.captions.flatMap((c) => c.words).filter((w) => w.emphasis).map((w) => w.text)).toEqual(["3"]);
  });

  it("memperlambat klip video yang sedikit kurang panjang, lalu hold bila tetap kurang", () => {
    const { display, durationMs, assets, plan } = demoInput();
    const scene = DEMO_SCRIPT.scenes[1]!;
    assets["clip"] = { key: "clip.mp4", kind: "video", durationMs: 1000 };
    const p = { ...plan, scenes: plan.scenes.map((s) => (s.sceneId === scene.id ? { ...s, assetId: "clip" } : s)) };
    const t = compileTimeline({ script: DEMO_SCRIPT, voice: { assetId: "voice", durationMs, words: display }, assets, plan: p });
    const seg = t.video[1]!;
    expect(seg.rate).toBe(0.8);
    expect(seg.hold).toBe(true);
    expect(seg.motion).toBe("none");

    assets["clip"] = { key: "clip.mp4", kind: "video", durationMs: Math.ceil((seg.endMs - seg.startMs) * 0.9) };
    const t2 = compileTimeline({ script: DEMO_SCRIPT, voice: { assetId: "voice", durationMs, words: display }, assets, plan: p });
    expect(t2.video[1]!.rate).toBeGreaterThanOrEqual(0.8);
    expect(t2.video[1]!.rate).toBeLessThan(1);
    expect(t2.video[1]!.hold).toBe(false);
  });

  it("gagal bila EditPlan memakai asset yang tidak ada", () => {
    const { display, durationMs, assets, plan } = demoInput();
    const p = { ...plan, scenes: plan.scenes.map((s, i) => (i === 0 ? { ...s, assetId: "nope" } : s)) };
    expect(() =>
      compileTimeline({ script: DEMO_SCRIPT, voice: { assetId: "voice", durationMs, words: display }, assets, plan: p }),
    ).toThrow(/asset tidak dikenal/);
  });

  it("gagal validasi bila durasi di luar 30–60 detik", () => {
    const { display, durationMs, assets, plan } = demoInput();
    expect(() =>
      compileTimeline(
        { script: DEMO_SCRIPT, voice: { assetId: "voice", durationMs, words: display }, assets, plan },
        { limits: { minDurationMs: 0, maxDurationMs: 5_000, minRate: 0.8 } },
      ),
    ).toThrow(TimelineValidationError);
  });
});

describe("validateTimeline", () => {
  it("mendeteksi gap antar segmen video", () => {
    const { display, durationMs, assets, plan } = demoInput();
    const t = compileTimeline({ script: DEMO_SCRIPT, voice: { assetId: "voice", durationMs, words: display }, assets, plan });
    t.video[1]!.startMs += 100;
    expect(validateTimeline(t).some((e) => e.includes("gap/overlap"))).toBe(true);
  });
});
