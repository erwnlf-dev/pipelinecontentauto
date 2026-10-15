import { describe, expect, it } from "vitest";
import { BudgetExceededError, BudgetGuard, InMemoryLedger } from "../src";

const fixedNow = () => new Date("2026-10-15T08:00:00Z");

describe("BudgetGuard", () => {
  it("menolak reserve yang melewati cap per video", () => {
    const guard = new BudgetGuard(new InMemoryLedger(), { perVideoUsd: 3, perDayUsd: 100, killSwitch: false }, undefined, fixedNow);
    guard.reserve({ videoId: "v1", stage: "FOOTAGE", sku: "google:gemini-omni-1.1-flash:720p", units: 20 }); // $2
    expect(() =>
      guard.reserve({ videoId: "v1", stage: "FOOTAGE", sku: "google:gemini-omni-1.1-flash:720p", units: 15 }),
    ).toThrow(BudgetExceededError);
    // Video lain masih boleh.
    expect(() =>
      guard.reserve({ videoId: "v2", stage: "FOOTAGE", sku: "google:gemini-omni-1.1-flash:720p", units: 15 }),
    ).not.toThrow();
  });

  it("menolak reserve yang melewati cap harian lintas video", () => {
    const guard = new BudgetGuard(new InMemoryLedger(), { perVideoUsd: 10, perDayUsd: 5, killSwitch: false }, undefined, fixedNow);
    guard.reserve({ videoId: "a", stage: "FOOTAGE", sku: "google:gemini-omni-1.1-flash:720p", units: 30 });
    expect(() =>
      guard.reserve({ videoId: "b", stage: "FOOTAGE", sku: "google:gemini-omni-1.1-flash:720p", units: 30 }),
    ).toThrow(/cap harian/);
  });

  it("settle mengganti reserve dengan biaya aktual", () => {
    const ledger = new InMemoryLedger();
    const guard = new BudgetGuard(ledger, { perVideoUsd: 10, perDayUsd: 10, killSwitch: false }, undefined, fixedNow);
    const r = guard.reserve({ videoId: "v", stage: "FOOTAGE", sku: "google:gemini-omni-1.1-flash:720p", units: 30 });
    expect(guard.committed({ videoId: "v" })).toBeCloseTo(3);
    guard.settle(r, 10);
    expect(guard.committed({ videoId: "v" })).toBeCloseTo(1);
    expect(ledger.list().filter((e) => e.kind === "actual")).toHaveLength(1);
  });

  it("kill switch menolak semua reserve", () => {
    const guard = new BudgetGuard(new InMemoryLedger(), { perVideoUsd: 10, perDayUsd: 10, killSwitch: true });
    expect(() => guard.reserve({ videoId: "v", stage: "SCRIPT", sku: "stub", units: 1 })).toThrow(/kill switch/);
  });

  it("sku tanpa harga ditolak, bukan dianggap gratis", () => {
    const guard = new BudgetGuard(new InMemoryLedger(), { perVideoUsd: 10, perDayUsd: 10, killSwitch: false });
    expect(() => guard.reserve({ videoId: "v", stage: "SCRIPT", sku: "unknown:sku", units: 1 })).toThrow(/belum ada/);
  });
});
