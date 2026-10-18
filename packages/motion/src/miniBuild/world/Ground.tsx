import { buildTheme } from "../theme";
import type { WorldCtx } from "./context";
import { LandingRing, Piece } from "./Piece";

const B = buildTheme.world.base;

/** Cutting mat (selalu ada) + base plate beton (langkah 1) dengan stopper parkir. */
export const Ground: React.FC<{ ctx: WorldCtx }> = ({ ctx }) => {
  const m = ctx.mat;
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={m.mat}>
        <planeGeometry args={[220, 220]} />
      </mesh>
      <Piece id="base" ctx={ctx}>
        {/* Urutan material BoxGeometry: +x, -x, +y, -y, +z, -z */}
        <mesh position={[0, B.h / 2, 0]} castShadow receiveShadow material={[m.baseSide, m.baseSide, m.baseTop, m.baseSide, m.baseSide, m.baseSide]}>
          <boxGeometry args={[B.w, B.h, B.d]} />
        </mesh>
        {[-2.8, 0, 2.8].map((x) => (
          <mesh key={x} position={[x, B.h + 0.09, 3.75]} castShadow receiveShadow material={m.hazard}>
            <boxGeometry args={[1.5, 0.18, 0.26]} />
          </mesh>
        ))}
      </Piece>
      <LandingRing id="base" ctx={ctx} radius={8} />
    </>
  );
};
