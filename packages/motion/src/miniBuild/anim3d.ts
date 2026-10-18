import { interpolate } from "remotion";
import { buildTheme } from "./theme";
import { type CameraShot, type Clock, PIECES, type PieceId, type PieceSpec, STEPS, type Vec3, at, stepAt } from "./plan";

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

/**
 * Easing helper yang aman untuk range sempit: di tempo 8 s jeda antar potongan bisa < 1 frame
 * (mis. [68.8, 68.4]) — interpolate() akan melempar error, jadi range terbalik/kosong = lompat.
 */
function safe(easing: (t: number) => number) {
  return (frame: number, range: [number, number], out: [number, number]) =>
    range[1] - range[0] < 1e-6 ? (frame >= range[1] ? out[1] : out[0]) : interpolate(frame, range, out, { easing, ...CLAMP });
}
export const easeIO = safe(buildTheme.ease.inOut);
export const easeOut = safe(buildTheme.ease.out);
export const easeIn = safe(buildTheme.ease.in);

const GRAB_IDS = (Object.keys(PIECES) as PieceId[]).filter((id) => PIECES[id].grip);

/**
 * Posisi ujung pinset + bukaan (0 = menjepit, 1 = terbuka) pada frame ini, atau null
 * bila langkah ini tanpa pinset. Pinset menjepit grip selama potongan dibawa, membuka
 * saat dilepas, pindah ke potongan berikutnya (yang mulai di luar frame), lalu keluar.
 */
export function tweezersAt(clock: Clock, frame: number): { tip: Vec3; open: number } | null {
  const step = stepAt(clock, frame);
  const grabs = GRAB_IDS.filter((id) => PIECES[id].step === step).sort((a, b) => PIECES[a].win[0] - PIECES[b].win[0]);
  if (grabs.length === 0) return null;
  const gripAt = (id: PieceId, f: number): Vec3 => add(placement(clock, f, PIECES[id]).pos, PIECES[id].grip!);
  const pls = grabs.map((id) => placement(clock, frame, PIECES[id]));
  const first = pls[0]!;
  if (frame < first.f0) return { tip: gripAt(grabs[0]!, first.f0), open: 0 };

  const k = pls.findIndex((p, i) => frame >= p.f0 && (i === pls.length - 1 || frame < pls[i + 1]!.f0));
  const pl = pls[k]!;
  const id = grabs[k]!;
  if (frame <= pl.f1) return { tip: gripAt(id, frame), open: 0 };

  const landed = gripAt(id, pl.f1);
  const open = easeOut(frame, [pl.f1, pl.f1 + 3], [0, 1]);
  const next = pls[k + 1];
  if (next) return { tip: lerp3(landed, gripAt(grabs[k + 1]!, next.f0), easeIO(frame, [pl.f1 + 1, next.f0], [0, 1])), open };
  const exit = add(landed, screenOffset(cameraAt(clock, frame), landed, [0.6, 1, 0.2]));
  return { tip: lerp3(landed, exit, easeIn(frame, [pl.f1 + 2, pl.f1 + 2 + clock.fps * 0.3], [0, 1])), open };
}
