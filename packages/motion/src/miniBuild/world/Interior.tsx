import { useMemo } from "react";
import * as THREE from "three";
import { popScale } from "../anim3d";
import { at, PIECES, PRODUCTS_WIN } from "../plan";
import { rng } from "../../lib/rng";
import { buildTheme } from "../theme";
import type { WorldCtx } from "./context";
import { Piece } from "./Piece";

const SHELF = { w: 2.6, h: 2.3, d: 0.9, levels: [0.25, 0.8, 1.35, 1.9] };
const FRIDGE = { w: 4.2, h: 2.8, d: 0.75 };

/** Gondola dua sisi: alas, panel tengah, 4 papan rak. */
const Gondola: React.FC<{ ctx: WorldCtx }> = ({ ctx }) => {
  const m = ctx.mat;
  return (
    <group>
      <mesh position={[0, 0.1, 0]} castShadow receiveShadow material={m.trim}>
        <boxGeometry args={[SHELF.w, 0.2, SHELF.d]} />
      </mesh>
      <mesh position={[0, SHELF.h / 2, 0]} castShadow material={m.wall}>
        <boxGeometry args={[SHELF.w, SHELF.h, 0.08]} />
      </mesh>
      {SHELF.levels.slice(1).map((y) => (
        <mesh key={y} position={[0, y - 0.03, 0]} castShadow receiveShadow material={m.metal}>
          <boxGeometry args={[SHELF.w, 0.05, SHELF.d]} />
        </mesh>
      ))}
      {[-SHELF.w / 2, SHELF.w / 2].map((x) => (
        <mesh key={x} position={[x, SHELF.h / 2, 0]} castShadow material={m.metalDark}>
          <boxGeometry args={[0.06, SHELF.h, SHELF.d]} />
        </mesh>
      ))}
    </group>
  );
};

interface Item {
  pos: THREE.Vector3;
  size: THREE.Vector3;
  color: THREE.Color;
  order: number;
}

/** Tata letak produk & botol (deterministik), diurutkan supaya pop-in merambat rapi. */
function layout(): { boxes: Item[]; bottles: Item[] } {
  const r = rng(77);
  const palette = buildTheme.products;
  const boxes: Item[] = [];
  for (const id of ["shelfA", "shelfB"] as const) {
    const [sx, sy, sz] = PIECES[id].pos;
    SHELF.levels.forEach((y, li) => {
      for (const side of [-1, 1]) {
        let x = -SHELF.w / 2 + 0.12;
        while (x < SHELF.w / 2 - 0.3) {
          const w = 0.24 + r() * 0.16;
          const h = 0.3 + r() * 0.18;
          boxes.push({
            pos: new THREE.Vector3(sx + x + w / 2, sy + y + h / 2, sz + side * 0.24),
            size: new THREE.Vector3(w, h, 0.32),
            color: new THREE.Color(palette[Math.floor(r() * palette.length)]!),
            order: li * 10 + (x + SHELF.w / 2) + (id === "shelfB" ? 0.5 : 0),
          });
          x += w + 0.04;
        }
      }
    });
  }
  const bottles: Item[] = [];
  const [fx, fy, fz] = PIECES.fridge.pos;
  [0.35, 1.15, 1.95].forEach((y, li) => {
    for (let i = 0; i < 16; i++) {
      bottles.push({
        pos: new THREE.Vector3(fx - FRIDGE.w / 2 + 0.3 + i * 0.24, fy + y + 0.3, fz + 0.05),
        size: new THREE.Vector3(0.09, 0.6, 0.09),
        color: new THREE.Color(palette[Math.floor(r() * palette.length)]!),
        order: li * 10 + i * 0.25,
      });
    }
  });
  const sort = (a: Item, b: Item) => a.order - b.order;
  return { boxes: boxes.sort(sort), bottles: bottles.sort(sort) };
}

const tmp = new THREE.Object3D();

/** InstancedMesh yang di-update per frame: tiap item pop-in (pegas) berstagger. */
const PopInstances: React.FC<{ ctx: WorldCtx; items: Item[]; geometry: THREE.BufferGeometry; material: THREE.Material; offset: number }> = ({
  ctx,
  items,
  geometry,
  material,
  offset,
}) => {
  const mesh = useMemo(() => {
    const im = new THREE.InstancedMesh(geometry, material, items.length);
    items.forEach((it, i) => im.setColorAt(i, it.color));
    im.castShadow = true;
    im.receiveShadow = true;
    return im;
  }, [geometry, material, items]);
  const f0 = at(ctx.clock, PRODUCTS_WIN.step, PRODUCTS_WIN.win[0]);
  const f1 = at(ctx.clock, PRODUCTS_WIN.step, PRODUCTS_WIN.win[1]);
  items.forEach((it, i) => {
    const k = (i / items.length) * 0.85 + offset;
    const s = Math.max(0, popScale(ctx.frame, f0 + (f1 - f0) * k, ctx.clock.fps));
    tmp.position.copy(it.pos);
    tmp.position.y += (1 - Math.min(1, s)) * 0.35;
    tmp.scale.set(it.size.x * s, it.size.y * s, it.size.z * s);
    tmp.updateMatrix();
    mesh.setMatrixAt(i, tmp.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.count = ctx.frame >= f0 ? items.length : 0;
  return <primitive object={mesh} />;
};

/** Rak, kulkas, kasir (langkah 3) + produk & botol yang pop-in berurutan. */
export const Interior: React.FC<{ ctx: WorldCtx }> = ({ ctx }) => {
  const m = ctx.mat;
  const { boxes, bottles } = useMemo(layout, []);
  const box = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const cyl = useMemo(() => new THREE.CylinderGeometry(0.5, 0.5, 1, 10), []);
  return (
    <>
      <Piece id="shelfA" ctx={ctx}>
        <Gondola ctx={ctx} />
      </Piece>
      <Piece id="shelfB" ctx={ctx}>
        <Gondola ctx={ctx} />
      </Piece>
      <Piece id="fridge" ctx={ctx}>
        <mesh position={[0, FRIDGE.h / 2, 0]} castShadow receiveShadow material={m.metal}>
          <boxGeometry args={[FRIDGE.w, FRIDGE.h, FRIDGE.d]} />
        </mesh>
        <mesh position={[0, FRIDGE.h / 2 + 0.05, FRIDGE.d / 2 - 0.4]} material={m.fridgeGlow}>
          <planeGeometry args={[FRIDGE.w - 0.3, FRIDGE.h - 0.4]} />
        </mesh>
        {[-1.4, 0, 1.4].map((x) => (
          <mesh key={x} position={[x, FRIDGE.h / 2, FRIDGE.d / 2 + 0.02]} material={m.glass} renderOrder={5}>
            <boxGeometry args={[1.35, FRIDGE.h - 0.25, 0.03]} />
          </mesh>
        ))}
      </Piece>
      <Piece id="counter" ctx={ctx}>
        <mesh position={[0, 0.5, 0]} castShadow receiveShadow material={m.wall}>
          <boxGeometry args={[1.8, 1.0, 0.8]} />
        </mesh>
        <mesh position={[0, 0.5, 0.41]} material={m.trim}>
          <boxGeometry args={[1.8, 0.8, 0.02]} />
        </mesh>
        <mesh position={[0.3, 1.15, 0]} castShadow material={m.rubber}>
          <boxGeometry args={[0.6, 0.3, 0.45]} />
        </mesh>
        <mesh position={[0.3, 1.45, -0.1]} rotation={[-0.4, 0, 0]} material={m.fridgeGlow}>
          <boxGeometry args={[0.5, 0.32, 0.04]} />
        </mesh>
      </Piece>
      <PopInstances ctx={ctx} items={boxes} geometry={box} material={m.product} offset={0} />
      <PopInstances ctx={ctx} items={bottles} geometry={cyl} material={m.bottle} offset={0.1} />
    </>
  );
};
