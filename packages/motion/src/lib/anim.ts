import type React from "react";
import { interpolate, spring } from "remotion";
import { theme } from "../theme";

type SpringPreset = keyof typeof theme.spring;
type EasePreset = keyof typeof theme.ease;

const CLAMP = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Detik → frame. Semua timing diturunkan dari fps (aturan #8). */
export const sec = (s: number, fps: number) => Math.round(s * fps);

/** interpolate yang SELALU ber-easing dan clamped (aturan #1). */
export function ease(frame: number, range: [number, number], out: [number, number], preset: EasePreset = "out"): number {
  return interpolate(frame, range, out, { easing: theme.ease[preset], ...CLAMP });
}

/** Progress spring 0→1, di-clamp agar overshoot tidak menembus nilai akhir opacity. */
export function springIn(frame: number, fps: number, delay: number, preset: SpringPreset = "smooth", durationInFrames?: number): number {
  return spring({ frame: frame - delay, fps, config: theme.spring[preset], durationInFrames });
}

/**
 * Entrance 3 properti: opacity + translateY + scale bersamaan (aturan #2).
 * `delay` dalam frame; pakai stagger 4–6 frame antar baris/kartu.
 */
export function entrance(
  frame: number,
  fps: number,
  delay: number,
  opts: { preset?: SpringPreset; rise?: number; from?: number } = {},
): React.CSSProperties {
  const p = springIn(frame, fps, delay, opts.preset ?? "smooth");
  const rise = opts.rise ?? 48;
  const from = opts.from ?? 0.92;
  return {
    opacity: Math.min(1, Math.max(0, p)),
    transform: `translateY(${interpolate(p, [0, 1], [rise, 0])}px) scale(${interpolate(p, [0, 1], [from, 1])})`,
  };
}

/** Exit lebih cepat dari entrance (~10 frame), easing `in`. Mengembalikan opacity, y, dan blur. */
export function exitAt(frame: number, fps: number, end: number) {
  const len = sec(theme.timing.exit, fps);
  const p = ease(frame, [end - len, end], [0, 1], "in");
  return { opacity: 1 - p, y: -42 * p, scale: 1 + 0.06 * p, blur: 10 * p };
}

/** Micro-motion untuk elemen yang tampil >2 detik (aturan #7). */
export function breathe(frame: number, phase = 0) {
  return {
    scale: 1 + Math.sin(frame / 22 + phase) * 0.012,
    y: Math.sin(frame / 30 + phase) * 4,
    rot: Math.sin(frame / 41 + phase) * 0.6,
  };
}

/** Format angka gaya Indonesia: desimal koma, ribuan titik. */
export function formatId(value: number, decimals: number): string {
  return value.toLocaleString("id-ID", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
