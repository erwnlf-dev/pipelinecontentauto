import { describe, expect, it } from "vitest";
import type { VoiceoverManifest } from "../src/karhutla/manifest";
import { BEATS } from "../src/karhutla/script";
import { VO_LEAD_FRAMES, VO_TAIL_FRAMES, computeTiming } from "../src/karhutla/timing";

const manifest = (durationMs: (i: number) => number): VoiceoverManifest => ({
  v: 1,
  mode: "dry",
  voiceId: "v",
  modelId: "m",
  sfx: {},
  beats: BEATS.map((b, i) => ({ id: b.id, file: null, durationMs: durationMs(i), captions: [] })),
});

describe("computeTiming", () => {
  it("memakai minSec bila VO pendek dan beat bersambung tanpa celah", () => {
    const t = computeTiming(manifest(() => 500), 30);
    let cursor = 0;
    t.beats.forEach((b, i) => {
      expect(b.from).toBe(cursor);
      expect(b.dur).toBe(Math.round(BEATS[i]!.minSec * 30));
      cursor += b.dur;
    });
    expect(t.total).toBe(cursor);
    expect(t.scenes.map((s) => s.id)).toEqual(["hook", "scale", "peat", "haze", "cost", "cta"]);
    expect(t.scenes.reduce((n, s) => n + s.dur, 0)).toBe(t.total);
  });

  it("memperpanjang beat agar kalimat VO tidak terpotong", () => {
    const t = computeTiming(manifest((i) => (i === 2 ? 5000 : 1000)), 30);
    const radar = t.beats[2]!;
    expect(radar.dur).toBe(VO_LEAD_FRAMES + 150 + VO_TAIL_FRAMES);
    expect(radar.voFrom).toBe(radar.from + VO_LEAD_FRAMES);
    expect(t.scenes[1]!.beats).toEqual([0, t.beats[1]!.dur]);
  });

  it("menolak manifest yang kehilangan beat", () => {
    const m = manifest(() => 1000);
    m.beats.pop();
    expect(() => computeTiming(m, 30)).toThrow(/cta-share/);
  });

  it("durasi reel tetap di rentang 30–35 detik untuk VO ±2,3 detik per kalimat", () => {
    const t = computeTiming(manifest(() => 2300), 30);
    expect(t.total / 30).toBeGreaterThanOrEqual(30);
    expect(t.total / 30).toBeLessThanOrEqual(35);
  });
});
