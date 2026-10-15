import { randomUUID } from "node:crypto";
import type { Stage } from "@pca/core";

export interface Price {
  sku: string;
  unit: string;
  usdPerUnit: number;
  /** false = angka dari sumber sekunder; cocokkan dengan tagihan asli. */
  verified: boolean;
}

/**
 * Tabel harga default (Okt 2026). Nanti dipindah ke tabel `price_table`
 * dengan `effective_from` agar perubahan harga tidak mengubah histori.
 */
export const DEFAULT_PRICES: Record<string, Price> = Object.fromEntries(
  (
    [
      { sku: "anthropic:claude-opus-5-5:input", unit: "token", usdPerUnit: 4 / 1e6, verified: true },
      { sku: "anthropic:claude-opus-5-5:output", unit: "token", usdPerUnit: 20 / 1e6, verified: true },
      { sku: "anthropic:claude-opus-5-5:cache_read", unit: "token", usdPerUnit: 0.2 / 1e6, verified: true },
      { sku: "anthropic:claude-opus-5:input", unit: "token", usdPerUnit: 5 / 1e6, verified: true },
      { sku: "anthropic:claude-opus-5:output", unit: "token", usdPerUnit: 25 / 1e6, verified: true },
      { sku: "anthropic:claude-opus-4-8:input", unit: "token", usdPerUnit: 5 / 1e6, verified: true },
      { sku: "anthropic:claude-opus-4-8:output", unit: "token", usdPerUnit: 25 / 1e6, verified: true },
      { sku: "anthropic:web_search", unit: "search", usdPerUnit: 10 / 1000, verified: false },
      { sku: "google:gemini-omni-1.1-flash:720p", unit: "second", usdPerUnit: 0.1, verified: true },
      { sku: "google:gemini-omni-1.1-flash:360p", unit: "second", usdPerUnit: 0.03, verified: false },
      { sku: "google:gemini-omni-1.1-flash:1080p", unit: "second", usdPerUnit: 0.15, verified: false },
      { sku: "google:veo-3.1-lite:720p", unit: "second", usdPerUnit: 0.05, verified: false },
      { sku: "google:image", unit: "image", usdPerUnit: 0.04, verified: false },
      { sku: "elevenlabs:tts", unit: "character", usdPerUnit: 0.08 / 1000, verified: false },
      { sku: "stub", unit: "call", usdPerUnit: 0, verified: true },
    ] satisfies Price[]
  ).map((p) => [p.sku, p]),
);

export interface LedgerEntry {
  id: string;
  videoId: string;
  stage: Stage;
  sku: string;
  units: number;
  usd: number;
  kind: "reserve" | "actual";
  /** Tanggal UTC (YYYY-MM-DD) untuk cap harian. */
  day: string;
  /** Untuk entry reserve: true setelah direkonsiliasi dengan biaya aktual. */
  settled: boolean;
}

export interface LedgerStore {
  add(entry: LedgerEntry): void;
  update(id: string, patch: Partial<LedgerEntry>): void;
  list(): readonly LedgerEntry[];
}

export class InMemoryLedger implements LedgerStore {
  private entries: LedgerEntry[] = [];
  add(entry: LedgerEntry) {
    this.entries.push(entry);
  }
  update(id: string, patch: Partial<LedgerEntry>) {
    const e = this.entries.find((x) => x.id === id);
    if (e) Object.assign(e, patch);
  }
  list() {
    return this.entries;
  }
}

export interface BudgetLimits {
  perVideoUsd: number;
  perDayUsd: number;
  /** Global kill switch: tolak semua reserve. */
  killSwitch: boolean;
}

export class BudgetExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BudgetExceededError";
  }
}

export interface Reservation {
  id: string;
  videoId: string;
  stage: Stage;
  sku: string;
  units: number;
  usd: number;
}

/**
 * Reserve biaya sebelum memanggil provider mahal, lalu settle dengan biaya
 * aktual. Reserve yang belum di-settle tetap dihitung, sehingga job paralel
 * tidak bisa bersama-sama melewati cap.
 */
export class BudgetGuard {
  constructor(
    private readonly ledger: LedgerStore,
    private readonly limits: BudgetLimits,
    private readonly prices: Record<string, Price> = DEFAULT_PRICES,
    private readonly now: () => Date = () => new Date(),
  ) {}

  price(sku: string): Price {
    const p = this.prices[sku];
    if (!p) throw new Error(`harga untuk sku "${sku}" belum ada di tabel harga`);
    return p;
  }

  estimate(sku: string, units: number): number {
    return this.price(sku).usdPerUnit * units;
  }

  /** Total biaya (aktual + reserve terbuka) untuk satu video atau satu hari. */
  committed(filter: { videoId?: string; day?: string }): number {
    return this.ledger
      .list()
      .filter((e) => (filter.videoId ? e.videoId === filter.videoId : true))
      .filter((e) => (filter.day ? e.day === filter.day : true))
      .filter((e) => e.kind === "actual" || !e.settled)
      .reduce((sum, e) => sum + e.usd, 0);
  }

  reserve(req: { videoId: string; stage: Stage; sku: string; units: number }): Reservation {
    if (this.limits.killSwitch) throw new BudgetExceededError("kill switch aktif: semua pemakaian provider berbayar ditolak");
    const usd = this.estimate(req.sku, req.units);
    const day = this.today();
    const videoTotal = this.committed({ videoId: req.videoId }) + usd;
    if (videoTotal > this.limits.perVideoUsd) {
      throw new BudgetExceededError(
        `cap per video terlampaui: ${videoTotal.toFixed(2)} > ${this.limits.perVideoUsd.toFixed(2)} USD (${req.stage}/${req.sku})`,
      );
    }
    const dayTotal = this.committed({ day }) + usd;
    if (dayTotal > this.limits.perDayUsd) {
      throw new BudgetExceededError(
        `cap harian terlampaui: ${dayTotal.toFixed(2)} > ${this.limits.perDayUsd.toFixed(2)} USD (${req.stage}/${req.sku})`,
      );
    }
    const id = randomUUID();
    this.ledger.add({ id, ...req, usd, kind: "reserve", day, settled: false });
    return { id, ...req, usd };
  }

  /** Catat biaya aktual dan tutup reserve. `actualUnits = 0` untuk job yang gagal tanpa biaya. */
  settle(reservation: Reservation, actualUnits: number, sku: string = reservation.sku): number {
    this.ledger.update(reservation.id, { settled: true });
    const usd = this.estimate(sku, actualUnits);
    this.ledger.add({
      id: randomUUID(),
      videoId: reservation.videoId,
      stage: reservation.stage,
      sku,
      units: actualUnits,
      usd,
      kind: "actual",
      day: this.today(),
      settled: true,
    });
    return usd;
  }

  /** Catat biaya yang tidak di-reserve sebelumnya (mis. token Claude yang baru diketahui setelah call). */
  record(entry: { videoId: string; stage: Stage; sku: string; units: number }): number {
    const usd = this.estimate(entry.sku, entry.units);
    this.ledger.add({ id: randomUUID(), ...entry, usd, kind: "actual", day: this.today(), settled: true });
    return usd;
  }

  private today(): string {
    return this.now().toISOString().slice(0, 10);
  }
}
