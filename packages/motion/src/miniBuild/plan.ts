/**
 * Rencana build "Warung Mini" — 7 langkah seperti storyboard miniatur ASMR.
 * Semua waktu ditulis sebagai FRAKSI langkah (0..1), jadi satu rencana bisa
 * dirender di tempo storyboard (8 s) atau santai (15 s) tanpa mengubah koreografi.
 */

export type Vec3 = [number, number, number];
export type Pace = "storyboard" | "relaxed";
export type SfxId = "tap" | "click" | "slide" | "sticker" | "pop" | "tink" | "switch" | "chime" | "bed";

/** Detik per langkah. Storyboard: 1 s × 6 + finale 2 s = 8 s. */
export const PACES: Record<Pace, number[]> = {
  storyboard: [1, 1, 1, 1, 1, 1, 2],
  relaxed: [2, 2, 2, 2, 2, 2, 3],
};

export interface CameraShot {
  from: Vec3;
  to: Vec3;
  target: Vec3;
  targetTo?: Vec3;
  fov: number;
}

export interface Step {
  id: string;
  /** Label aksi (komik) yang muncul di momen ASMR. */
  label: string;
  /** Teks HUD kecil. */
  title: string;
  /** Fraksi langkah saat label muncul (biasanya = pendaratan potongan terakhir). */
  labelAt: number;
  camera: CameraShot;
  sfx: { id: SfxId; at: number; volume: number }[];
}

export const STEPS: Step[] = [
  {
    id: "base",
    label: "START!",
    title: "Pondasi",
    labelAt: 0.62,
    camera: { from: [10.5, 5.2, 14.5], to: [9.2, 4.6, 12.8], target: [1.4, 2.6, 2.4], fov: 40 },
    sfx: [{ id: "tap", at: 0.62, volume: 0.9 }],
  },
  {
    id: "walls",
    label: "PAS!",
    title: "Dinding",
    labelAt: 0.9,
    camera: { from: [16.5, 15, 20.5], to: [15, 13.6, 18.6], target: [-0.3, 1.2, -0.4], fov: 40 },
    sfx: [
      { id: "click", at: 0.3, volume: 0.8 },
      { id: "click", at: 0.6, volume: 0.8 },
      { id: "click", at: 0.9, volume: 0.9 },
    ],
  },
  {
    id: "interior",
    label: "SUSUN!",
    title: "Rak & barang",
    labelAt: 0.62,
    camera: { from: [3.6, 24.5, 10], to: [3.0, 22.5, 8.6], target: [0, 1, -1.3], targetTo: [0, 1, -1.5], fov: 40 },
    sfx: [
      { id: "slide", at: 0.26, volume: 0.6 },
      { id: "slide", at: 0.5, volume: 0.6 },
      { id: "pop", at: 0.53, volume: 0.85 },
    ],
  },
  {
    id: "glass",
    label: "KLIK!",
    title: "Kaca & pintu",
    labelAt: 0.88,
    camera: { from: [1.2, 3.4, 19.5], to: [0.6, 3.1, 17.2], target: [0, 2.0, 1.4], fov: 40 },
    sfx: [
      { id: "slide", at: 0.3, volume: 0.75 },
      { id: "slide", at: 0.56, volume: 0.75 },
      { id: "click", at: 0.88, volume: 1.0 },
    ],
  },
  {
    id: "roof",
    label: "RAPI!",
    title: "Atap & papan nama",
    labelAt: 0.92,
    camera: { from: [-6.5, 11.5, 26], to: [-5.4, 10.4, 23.5], target: [0, 4.0, 1.0], fov: 40 },
    sfx: [
      { id: "tap", at: 0.36, volume: 0.7 },
      { id: "click", at: 0.66, volume: 0.6 },
      { id: "sticker", at: 0.72, volume: 0.9 },
    ],
  },
  {
    id: "props",
    label: "TING!",
    title: "Lampu & aksesori",
    labelAt: 0.32,
    camera: { from: [15, 7.5, 27], to: [13.4, 6.8, 24.6], target: [0, 2.5, 2.4], fov: 42 },
    sfx: [
      { id: "tink", at: 0.32, volume: 0.9 },
      { id: "tink", at: 0.58, volume: 0.7 },
      { id: "tap", at: 0.76, volume: 0.5 },
      { id: "tap", at: 0.95, volume: 0.45 },
    ],
  },
  {
    id: "finish",
    label: "WOW!",
    title: "Selesai",
    labelAt: 0.42,
    camera: { from: [0, 10, 36], to: [0, 7.4, 26.5], target: [0, 2.8, 0.5], targetTo: [0, 2.6, 0.8], fov: 40 },
    sfx: [
      { id: "switch", at: 0.12, volume: 0.9 },
      { id: "chime", at: 0.4, volume: 0.7 },
    ],
  },
];

export interface PieceSpec {
  step: number;
  /** Jendela gerak [mulai, mendarat] dalam fraksi langkah. */
  win: [number, number];
  /** Posisi akhir (world). */
  pos: Vec3;
  /** Arah masuk di ruang layar (kanan, atas, ke-kamera). */
  from: Vec3;
  /** Titik jepit pinset relatif `pos`; null = muncul tanpa pinset (pop). */
  grip: Vec3 | null;
}

const W = { h: 0.4, wallH: 4.2 };
const top = W.h; // permukaan atas base plate

export type PieceId =
  | "base" | "wallL" | "wallB" | "wallR" | "shelfA" | "shelfB" | "fridge" | "counter"
  | "glassL" | "glassR" | "door" | "roof" | "sign" | "ac" | "lamp" | "pole" | "bin" | "plant";

/**
 * `from` = arah masuk di ruang layar kamera langkah itu: [kanan, atas, ke-kamera].
 * Besarnya otomatis dihitung agar potongan mulai dari luar frame.
 */
export const PIECES: Record<PieceId, PieceSpec> = {
  base: { step: 0, win: [0.06, 0.62], pos: [0, 0, 0], from: [0.5, 1, 0], grip: [5.8, 0.4, 3.6] },
  wallL: { step: 1, win: [0.04, 0.3], pos: [-4.39, top, -1.3], from: [-0.4, 1, 0], grip: [0, W.wallH, 0] },
  wallB: { step: 1, win: [0.34, 0.6], pos: [0, top, -3.89], from: [0, 1, 0], grip: [0, W.wallH, 0] },
  wallR: { step: 1, win: [0.64, 0.9], pos: [4.39, top, -1.3], from: [0.5, 1, 0], grip: [0, W.wallH, 0] },
  shelfA: { step: 2, win: [0.04, 0.26], pos: [-1.7, top, -1.1], from: [0.4, 1, 0], grip: [0, 2.3, 0] },
  shelfB: { step: 2, win: [0.28, 0.5], pos: [1.5, top, -1.1], from: [0.6, 1, 0], grip: [0, 2.3, 0] },
  fridge: { step: 2, win: [0.1, 0.34], pos: [0, top, -3.35], from: [0, 1, 0], grip: null },
  counter: { step: 2, win: [0.3, 0.52], pos: [3.1, top, 0.35], from: [0.3, 1, 0], grip: null },
  glassL: { step: 3, win: [0.04, 0.3], pos: [-3, top, 1.4], from: [0, 1, 0], grip: [0, 3.6, 0.05] },
  glassR: { step: 3, win: [0.3, 0.56], pos: [3, top, 1.4], from: [0, 1, 0], grip: [0, 3.6, 0.05] },
  door: { step: 3, win: [0.58, 0.88], pos: [0, top, 1.4], from: [0, 1, 0], grip: [0, 3.6, 0.05] },
  roof: { step: 4, win: [0.04, 0.36], pos: [0, top + W.wallH, -1.2], from: [0.2, 1, 0], grip: [3.6, 0.3, 2.4] },
  sign: { step: 4, win: [0.38, 0.66], pos: [0, top + 3.55, 1.58], from: [0.6, 0.6, 0.4], grip: [3.2, 1.3, 0.1] },
  ac: { step: 4, win: [0.5, 0.74], pos: [-2.4, top + W.wallH + 0.3, -2.4], from: [0, 1, 0], grip: null },
  lamp: { step: 5, win: [0.03, 0.32], pos: [5.3, top, 3.6], from: [0.6, 1, 0], grip: [0, 4.4, 0] },
  pole: { step: 5, win: [0.34, 0.58], pos: [-5.2, top, 3.4], from: [-0.3, 1, 0], grip: [0, 5.2, 0] },
  bin: { step: 5, win: [0.6, 0.76], pos: [2.4, top, 2.1], from: [0.5, 1, 0], grip: [0, 0.9, 0] },
  plant: { step: 5, win: [0.78, 0.95], pos: [-3.7, top, 2.1], from: [0.3, 1, 0], grip: [0, 1.1, 0] },
};

/** Produk mini muncul berstagger setelah rak mendarat. */
export const PRODUCTS_WIN = { step: 2, win: [0.5, 0.97] as [number, number] };
/** Gosokan "stiker" pada papan nama setelah menempel. */
export const SIGN_WIPE = { step: 4, win: [0.68, 0.95] as [number, number] };
/** Lampu menyala berurutan di finale: papan nama → interior → lampu jalan. */
export const LIGHTS = { step: 6, at: [0.12, 0.2, 0.28] as const, night: [0.0, 0.16] as [number, number] };

export interface Clock {
  fps: number;
  starts: number[];
  durs: number[];
  total: number;
}

export function makeClock(pace: Pace, fps: number): Clock {
  const durs = PACES[pace].map((s) => Math.round(s * fps));
  const starts: number[] = [];
  let acc = 0;
  for (const d of durs) {
    starts.push(acc);
    acc += d;
  }
  return { fps, starts, durs, total: acc };
}

/** Fraksi langkah → frame absolut. */
export function at(clock: Clock, step: number, frac: number): number {
  return clock.starts[step]! + frac * clock.durs[step]!;
}

/** Langkah aktif pada frame tertentu. */
export function stepAt(clock: Clock, frame: number): number {
  let s = 0;
  clock.starts.forEach((st, i) => {
    if (frame >= st) s = i;
  });
  return s;
}
