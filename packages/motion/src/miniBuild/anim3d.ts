import { interpolate } from "remotion";
import { buildTheme } from "./theme";
import { type CameraShot, type Clock, type PieceSpec, STEPS, type Vec3, at, stepAt } from "./plan";

const CLAMP = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
export const len = (a: Vec3) => Math.hypot(a[0], a[1], a[2]);
export const norm = (a: Vec3): Vec3 => mul(a, 1 / (len(a) || 1));
export const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => add(a, mul(sub(b, a), t));

export interface CameraState {
  pos: Vec3;
  target: Vec3;
  fov: number;
  forward: Vec3;
  right: Vec3;
  up: Vec3;
}

function basis(pos: Vec3, target: Vec3, fov: number): CameraState {
  const forward = norm(sub(target, pos));
  const right = norm(cross(forward, [0, 1, 0]));
  const up = cross(right, forward);
  return { pos, target, fov, forward, right, up };
}

/**
 * Kamera per langkah: cut keras antar langkah (seperti storyboard), drift pelan
 * ber-easing di dalam langkah, plus "punch" FOV kecil saat cut (HIT).
 */
export function cameraAt(clock: Clock, frame: number): CameraState {
  const s = stepAt(clock, frame);
  const shot: CameraShot = STEPS[s]!.camera;
  const f0 = clock.starts[s]!;
  const f1 = f0 + clock.durs[s]!;
  const t = interpolate(frame, [f0, f1], [0, 1], { easing: buildTheme.ease.inOut, ...CLAMP });
  const punch = interpolate(frame, [f0, f0 + 6], [1.06, 1], { easing: buildTheme.ease.out, ...CLAMP });
  return basis(lerp3(shot.from, shot.to, t), lerp3(shot.target, shot.targetTo ?? shot.target, t), shot.fov * punch);
}

/** Kamera milik langkah tertentu (dipakai untuk menghitung arah masuk potongan). */
export function stepCamera(clock: Clock, step: number, frame: number): CameraState {
  const f = Math.min(Math.max(frame, clock.starts[step]!), clock.starts[step]! + clock.durs[step]! - 1);
  return cameraAt(clock, f);
}

/** Offset world dari arah layar (kanan, atas, ke-kamera), cukup jauh agar mulai di luar frame. */
export function screenOffset(cam: CameraState, at: Vec3, dir: Vec3, scale = 1.35): Vec3 {
  const depth = len(sub(at, cam.pos));
  const halfH = depth * Math.tan(((cam.fov / 2) * Math.PI) / 180);
  const d = norm(add(add(mul(cam.right, dir[0]), mul(cam.up, dir[1])), mul(mul(cam.forward, -1), dir[2])));
  return mul(d, halfH * 2 * scale);
}

export interface Placement {
  visible: boolean;
  /** Progres gerak 0..1 (easing `place`). */
  p: number;
  landed: boolean;
  /** Frame sejak mendarat (negatif = belum). */
  since: number;
  pos: Vec3;
  /** Skala Y saat "settle" setelah mendarat (squash halus yang meluruh). */
  squash: number;
  f0: number;
  f1: number;
}

/** Posisi potongan pada frame ini: masuk dari luar frame, mendarat presisi, lalu settle. */
export function placement(clock: Clock, frame: number, spec: PieceSpec): Placement {
  const f0 = at(clock, spec.step, spec.win[0]);
  const f1 = at(clock, spec.step, spec.win[1]);
  const p = interpolate(frame, [f0, f1], [0, 1], { easing: buildTheme.ease.place, ...CLAMP });
  const cam = stepCamera(clock, spec.step, frame);
  const offset = screenOffset(cam, spec.pos, spec.from);
  const since = frame - f1;
  const bump = since >= 0 ? Math.exp(-since / 3.2) * Math.sin(since * 1.15) : 0;
  return {
    visible: frame >= f0,
    p,
    landed: since >= 0,
    since,
    pos: add(spec.pos, mul(offset, 1 - p)),
    squash: 1 - 0.05 * bump,
    f0,
    f1,
  };
}

/** Pop-in berstagger (produk, botol): 0→1 dengan overshoot kecil, deterministik per indeks. */
export function popScale(frame: number, start: number, fps: number): number {
  if (frame < start) return 0;
  const t = (frame - start) / fps;
  // Respons pegas teredam analitik (ζ≈0.5): naik cepat, overshoot ±10%, settle.
  const w = 26;
  const z = 0.5;
  const wd = w * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + ((z * w) / wd) * Math.sin(wd * t));
}

export const easeIO = (frame: number, range: [number, number], out: [number, number]) =>
  interpolate(frame, range, out, { easing: buildTheme.ease.inOut, ...CLAMP });
export const easeOut = (frame: number, range: [number, number], out: [number, number]) =>
  interpolate(frame, range, out, { easing: buildTheme.ease.out, ...CLAMP });
export const easeIn = (frame: number, range: [number, number], out: [number, number]) =>
  interpolate(frame, range, out, { easing: buildTheme.ease.in, ...CLAMP });
