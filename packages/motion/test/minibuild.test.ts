import { describe, expect, it } from "vitest";
import { placement, tweezersAt } from "../src/miniBuild/anim3d";
import { PACES, PIECES, type PieceId, STEPS, at, makeClock, stepAt } from "../src/miniBuild/plan";
import { SFX_PROMPTS } from "../src/miniBuild/sfx";

describe("MiniBuild plan", () => {
  it("tempo storyboard = 8 detik / 7 langkah, tempo santai = 15 detik", () => {
    expect(makeClock("storyboard", 30).total).toBe(240);
    expect(makeClock("relaxed", 30).total).toBe(450);
    expect(STEPS).toHaveLength(7);
    expect(PACES.storyboard).toHaveLength(STEPS.length);
    expect(PACES.relaxed).toHaveLength(STEPS.length);
  });

  it("langkah aktif mengikuti grid frame", () => {
    const c = makeClock("storyboard", 30);
    expect(stepAt(c, 0)).toBe(0);
    expect(stepAt(c, 29)).toBe(0);
    expect(stepAt(c, 30)).toBe(1);
    expect(stepAt(c, 239)).toBe(6);
    expect(at(c, 6, 0.5)).toBe(210);
  });

  it("potongan berpinset dalam satu langkah tidak tumpang tindih (pinset hanya satu)", () => {
    const ids = Object.keys(PIECES) as PieceId[];
    for (let s = 0; s < STEPS.length; s++) {
      const grabs = ids.filter((id) => PIECES[id].step === s && PIECES[id].grip).sort((a, b) => PIECES[a].win[0] - PIECES[b].win[0]);
      for (let i = 1; i < grabs.length; i++) {
        expect(PIECES[grabs[i]!].win[0], `${grabs[i]} mulai sebelum ${grabs[i - 1]} mendarat`).toBeGreaterThanOrEqual(PIECES[grabs[i - 1]!].win[1]);
      }
    }
  });

  it("potongan mendarat tepat di posisi akhir dan tersembunyi sebelum gilirannya", () => {
    const c = makeClock("storyboard", 30);
    for (const id of Object.keys(PIECES) as PieceId[]) {
      const spec = PIECES[id];
      const before = placement(c, at(c, spec.step, spec.win[0]) - 1, spec);
      const after = placement(c, at(c, spec.step, spec.win[1]) + 12, spec);
      expect(before.visible).toBe(false);
      after.pos.forEach((v, i) => expect(v).toBeCloseTo(spec.pos[i]!, 6));
    }
  });

  it("setiap cue SFX punya prompt ElevenLabs", () => {
    for (const st of STEPS) for (const cue of st.sfx) expect(SFX_PROMPTS[cue.id]).toBeDefined();
  });
});

describe("MiniBuild render path", () => {
  it.each(["storyboard", "relaxed"] as const)("pinset & penempatan aman di setiap frame (tempo %s)", (pace) => {
    const c = makeClock(pace, 30);
    for (let f = 0; f < c.total; f++) {
      const t = tweezersAt(c, f);
      if (t) {
        expect(t.tip.every(Number.isFinite), `frame ${f}`).toBe(true);
        expect(t.open).toBeGreaterThanOrEqual(0);
        expect(t.open).toBeLessThanOrEqual(1);
      }
      for (const id of Object.keys(PIECES) as PieceId[]) placement(c, f, PIECES[id]);
    }
  });
});
