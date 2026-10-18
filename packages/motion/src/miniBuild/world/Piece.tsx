import type React from "react";
import { useMemo } from "react";
import { placement } from "../anim3d";
import { PIECES, type PieceId } from "../plan";
import type { WorldCtx } from "./context";

/**
 * Wrapper potongan: tersembunyi sebelum gilirannya, masuk dari luar frame,
 * mendarat presisi, lalu squash halus yang meluruh (origin grup = alas potongan).
 */
export const Piece: React.FC<{ id: PieceId; ctx: WorldCtx; children: React.ReactNode }> = ({ id, ctx, children }) => {
  const pl = placement(ctx.clock, ctx.frame, PIECES[id]);
  if (!pl.visible) return null;
  const wide = 1 + (1 - pl.squash) * 0.5;
  return (
    <group position={pl.pos} scale={[wide, pl.squash, wide]}>
      {children}
    </group>
  );
};

/** Riak debu/cincin saat potongan menyentuh permukaan. */
export const LandingRing: React.FC<{ id: PieceId; ctx: WorldCtx; radius: number; y?: number }> = ({ id, ctx, radius, y = 0.02 }) => {
  const mat = useMemo(() => ctx.mat.ring.clone(), [ctx.mat]);
  const pl = placement(ctx.clock, ctx.frame, PIECES[id]);
  const life = ctx.clock.fps * 0.4;
  if (!pl.landed || pl.since > life) return null;
  const k = pl.since / life;
  const grow = 1 - Math.pow(1 - k, 3); // easeOutCubic
  const spec = PIECES[id];
  mat.opacity = 0.45 * (1 - k) * (1 - k);
  return (
    <mesh position={[spec.pos[0], spec.pos[1] + y, spec.pos[2]]} rotation={[-Math.PI / 2, 0, 0]} scale={radius * (0.7 + 0.8 * grow)} material={mat}>
      <ringGeometry args={[0.86, 1, 64]} />
    </mesh>
  );
};
