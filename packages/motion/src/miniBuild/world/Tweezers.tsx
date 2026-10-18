import { useMemo } from "react";
import * as THREE from "three";
import { add, cameraAt, cross, easeIn, easeIO, easeOut, lerp3, mul, norm, placement, screenOffset } from "../anim3d";
import { PIECES, type PieceId, type Vec3, stepAt } from "../plan";
import type { WorldCtx } from "./context";

const LEN = 9;
const IDS = Object.keys(PIECES) as PieceId[];

/**
 * Pinset "tangan kanan": selalu masuk dari kanan-atas layar, menjepit titik grip
 * potongan selama dibawa, membuka saat dilepas, lalu keluar frame (lebih cepat dari masuk).
 */
export const Tweezers: React.FC<{ ctx: WorldCtx }> = ({ ctx }) => {
  const { frame, clock } = ctx;
  const quat = useMemo(() => new THREE.Quaternion(), []);
  const mtx = useMemo(() => new THREE.Matrix4(), []);
  const step = stepAt(clock, frame);
  const grabs = IDS.filter((id) => PIECES[id].step === step && PIECES[id].grip).sort((a, b) => PIECES[a].win[0] - PIECES[b].win[0]);
  if (grabs.length === 0) return null;

  const gripAt = (id: PieceId, f: number): Vec3 => add(placement(clock, f, PIECES[id]).pos, PIECES[id].grip!);
  const cam = cameraAt(clock, frame);
  const pls = grabs.map((id) => placement(clock, frame, PIECES[id]));

  let tip: Vec3;
  let open = 0;
  const first = pls[0]!;
  if (frame < first.f0) {
    tip = gripAt(grabs[0]!, first.f0);
  } else {
    const k = pls.findIndex((p, i) => frame >= p.f0 && (i === pls.length - 1 || frame < pls[i + 1]!.f0));
    const pl = pls[k]!;
    const id = grabs[k]!;
    if (frame <= pl.f1) {
      tip = gripAt(id, frame);
    } else {
      const landed = gripAt(id, pl.f1);
      open = easeOut(frame, [pl.f1, pl.f1 + 3], [0, 1]);
      const next = pls[k + 1];
      if (next) {
        tip = lerp3(landed, gripAt(grabs[k + 1]!, next.f0), easeIO(frame, [pl.f1 + 1, next.f0], [0, 1]));
      } else {
        const exit = add(landed, screenOffset(cam, landed, [0.6, 1, 0.2]));
        tip = lerp3(landed, exit, easeIn(frame, [pl.f1 + 2, pl.f1 + 2 + clock.fps * 0.3], [0, 1]));
      }
    }
  }

  // Orientasi: badan pinset mengarah ke kanan-atas layar, sedikit condong ke kamera.
  const y = norm(add(add(mul(cam.up, 0.8), mul(cam.right, 0.55)), mul(cam.forward, -0.4)));
  const x = norm(cross(y, mul(cam.forward, -1)));
  const z = cross(x, y);
  mtx.makeBasis(new THREE.Vector3(...x), new THREE.Vector3(...y), new THREE.Vector3(...z));
  quat.setFromRotationMatrix(mtx);
  const gap = 0.05 + open * 0.34;
  // Siluet pinset: ujung rapat → badan melebar → menyatu lagi di pangkal.
  const bow = 0.42 + open * 0.12;
  const segs = (side: number) => {
    const pts: [number, number][] = [
      [(side * gap) / 2, 0],
      [side * bow, LEN * 0.68],
      [side * 0.12, LEN],
    ];
    return pts.slice(0, -1).map((p0, i) => {
      const p1 = pts[i + 1]!;
      const dx = p1[0] - p0[0];
      const dy = p1[1] - p0[1];
      return { x: (p0[0] + p1[0]) / 2, y: (p0[1] + p1[1]) / 2, len: Math.hypot(dx, dy), rot: -Math.atan2(dx, dy), w: i === 0 ? 0.2 : 0.26 };
    });
  };

  return (
    <group position={tip} quaternion={quat}>
      {[-1, 1].map((side) => (
        <group key={side}>
          {segs(side).map((g, i) => (
            <mesh key={i} position={[g.x, g.y, 0]} rotation={[0, 0, g.rot]} castShadow material={ctx.mat.metal}>
              <boxGeometry args={[g.w, g.len, 0.07]} />
            </mesh>
          ))}
          {/* Grip bergerigi di bagian tengah */}
          <mesh position={[side * (bow * 0.82), LEN * 0.56, 0.045]} rotation={[0, 0, -Math.atan2(side * bow, LEN * 0.68)]} material={ctx.mat.rubber}>
            <boxGeometry args={[0.2, 1.6, 0.02]} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, LEN, 0]} castShadow material={ctx.mat.metal}>
        <boxGeometry args={[0.36, 0.3, 0.09]} />
      </mesh>
    </group>
  );
};
