import { describe, expect, it } from "vitest";
import { assertTransition, canTransition, downstreamOf, runnableStages } from "../src";

describe("stage graph", () => {
  it("re-run SCRIPT meng-invalidate semua stage hilir", () => {
    expect(downstreamOf("SCRIPT")).toEqual(["VOICEOVER", "FOOTAGE", "EDIT", "RENDER", "QA", "PUBLISH"]);
  });

  it("re-run VOICEOVER tidak menyentuh FOOTAGE", () => {
    expect(downstreamOf("VOICEOVER")).not.toContain("FOOTAGE");
    expect(downstreamOf("VOICEOVER")).toEqual(["EDIT", "RENDER", "QA", "PUBLISH"]);
  });

  it("VOICEOVER dan FOOTAGE bisa jalan paralel setelah SCRIPT", () => {
    expect(runnableStages(new Set(["IDEATE", "FACTCHECK", "SCRIPT"]))).toEqual(["VOICEOVER", "FOOTAGE"]);
  });
});

describe("status video", () => {
  it("hanya video yang sudah di-approve yang boleh dipublish", () => {
    expect(canTransition("approved", "publishing")).toBe(true);
    expect(canTransition("awaiting_approval", "publishing")).toBe(false);
    expect(() => assertTransition("running", "published")).toThrow();
  });

  it("render ulang setelah approve kembali ke running", () => {
    expect(canTransition("approved", "running")).toBe(true);
  });
});
