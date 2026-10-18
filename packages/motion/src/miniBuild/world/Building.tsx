import { easeIO } from "../anim3d";
import { at, SIGN_WIPE } from "../plan";
import { buildTheme } from "../theme";
import type { WorldCtx } from "./context";
import { Piece } from "./Piece";

const H = buildTheme.world.wallH;
const T = buildTheme.world.wallT;
const GLASS_H = 2.9;

/** Panel kaca berbingkai teal; `poster` = indeks poster promo yang ditempel. */
const GlassPanel: React.FC<{ ctx: WorldCtx; width: number; poster?: number; door?: boolean }> = ({ ctx, width, poster, door }) => {
  const m = ctx.mat;
  const f = 0.12;
  return (
    <group>
      {/* Bingkai */}
      <mesh position={[0, f / 2, 0]} castShadow material={m.trim}>
        <boxGeometry args={[width, f, f]} />
      </mesh>
      <mesh position={[0, GLASS_H - f / 2, 0]} castShadow material={m.trim}>
        <boxGeometry args={[width, f, f]} />
      </mesh>
      {[-width / 2 + f / 2, width / 2 - f / 2, ...(door ? [0] : [])].map((x) => (
        <mesh key={x} position={[x, GLASS_H / 2, 0]} castShadow material={m.trim}>
          <boxGeometry args={[f, GLASS_H, f]} />
        </mesh>
      ))}
      {!door ? (
        <mesh position={[0, 1.0, 0]} material={m.trim}>
          <boxGeometry args={[width, 0.07, 0.08]} />
        </mesh>
      ) : null}
      {/* Kaca */}
      <mesh position={[0, GLASS_H / 2, 0]} material={m.glass} renderOrder={5}>
        <boxGeometry args={[width - f, GLASS_H - f, 0.03]} />
      </mesh>
      {door ? (
        <>
          {[-0.18, 0.18].map((x) => (
            <mesh key={x} position={[x, 1.35, 0.08]} material={m.metal}>
              <boxGeometry args={[0.05, 0.7, 0.05]} />
            </mesh>
          ))}
        </>
      ) : null}
      {poster !== undefined ? (
        <>
          <mesh position={[-width / 4, 1.75, 0.03]} material={m.posters[poster]!}>
            <planeGeometry args={[0.62, 0.86]} />
          </mesh>
          <mesh position={[width / 4, 1.75, 0.03]} material={m.posters[(poster + 1) % m.posters.length]!}>
            <planeGeometry args={[0.62, 0.86]} />
          </mesh>
        </>
      ) : null}
    </group>
  );
};

/** Gosokan stiker: kartu plastik + kilau menyapu papan nama setelah menempel. */
const SignWipe: React.FC<{ ctx: WorldCtx }> = ({ ctx }) => {
  const f0 = at(ctx.clock, SIGN_WIPE.step, SIGN_WIPE.win[0]);
  const f1 = at(ctx.clock, SIGN_WIPE.step, SIGN_WIPE.win[1]);
  if (ctx.frame < f0 || ctx.frame > f1 + 2) return null;
  const x = easeIO(ctx.frame, [f0, f1], [-4.6, 4.6]);
  return (
    <group position={[x, 0, 0.16]}>
      <mesh rotation={[0, 0, -0.35]} material={ctx.mat.glass}>
        <boxGeometry args={[0.9, 1.6, 0.04]} />
      </mesh>
      <mesh material={ctx.mat.glowPanel}>
        <planeGeometry args={[0.18, 1.2]} />
      </mesh>
    </group>
  );
};

/** Dinding (langkah 2), kaca & pintu (langkah 4), atap + papan nama + AC (langkah 5). */
export const Building: React.FC<{ ctx: WorldCtx }> = ({ ctx }) => {
  const m = ctx.mat;
  const sideD = 5.4;
  return (
    <>
      <Piece id="wallL" ctx={ctx}>
        <mesh position={[0, H / 2, 0]} castShadow receiveShadow material={m.wall}>
          <boxGeometry args={[T, H, sideD]} />
        </mesh>
        <mesh position={[-T / 2 - 0.01, 0.2, 0]} material={m.trim}>
          <boxGeometry args={[0.03, 0.4, sideD]} />
        </mesh>
      </Piece>
      <Piece id="wallB" ctx={ctx}>
        <mesh position={[0, H / 2, 0]} castShadow receiveShadow material={m.wall}>
          <boxGeometry args={[9, H, T]} />
        </mesh>
      </Piece>
      <Piece id="wallR" ctx={ctx}>
        <mesh position={[0, H / 2, 0]} castShadow receiveShadow material={m.wall}>
          <boxGeometry args={[T, H, sideD]} />
        </mesh>
        <mesh position={[T / 2 + 0.01, 0.2, 0]} material={m.trim}>
          <boxGeometry args={[0.03, 0.4, sideD]} />
        </mesh>
        {/* Jendela samping kecil */}
        <mesh position={[T / 2 + 0.02, 2.4, -1.2]} material={m.trim}>
          <boxGeometry args={[0.04, 1.2, 1.5]} />
        </mesh>
        <mesh position={[T / 2 + 0.05, 2.4, -1.2]} material={m.glass}>
          <boxGeometry args={[0.02, 1.0, 1.3]} />
        </mesh>
      </Piece>

      <Piece id="glassL" ctx={ctx}>
        <GlassPanel ctx={ctx} width={3} poster={0} />
      </Piece>
      <Piece id="glassR" ctx={ctx}>
        <GlassPanel ctx={ctx} width={3} poster={1} />
      </Piece>
      <Piece id="door" ctx={ctx}>
        <GlassPanel ctx={ctx} width={3} door />
      </Piece>

      <Piece id="roof" ctx={ctx}>
        <mesh position={[0, 0.15, 0]} castShadow receiveShadow material={m.wall}>
          <boxGeometry args={[9.8, 0.3, 6.0]} />
        </mesh>
        <mesh position={[0, 0.34, 0]} castShadow material={m.trim}>
          <boxGeometry args={[9.9, 0.08, 6.1]} />
        </mesh>
        {/* Panel lampu plafon (menyala di finale) */}
        {[-2.2, 0, 2.2].map((x) => (
          <mesh key={x} position={[x, -0.01, -0.6]} rotation={[Math.PI / 2, 0, 0]} material={m.glowPanel}>
            <planeGeometry args={[1.4, 0.35]} />
          </mesh>
        ))}
      </Piece>
      <Piece id="sign" ctx={ctx}>
        <mesh castShadow material={[m.trim, m.trim, m.trim, m.trim, m.sign, m.trim]}>
          <boxGeometry args={[9.8, 1.3, 0.18]} />
        </mesh>
        <SignWipe ctx={ctx} />
      </Piece>
      <Piece id="ac" ctx={ctx}>
        <mesh position={[0, 0.45, 0]} castShadow material={m.metal}>
          <boxGeometry args={[1.6, 0.9, 1.1]} />
        </mesh>
        {[-0.3, -0.15, 0, 0.15, 0.3].map((y) => (
          <mesh key={y} position={[0, 0.45 + y, 0.56]} material={m.metalDark}>
            <boxGeometry args={[1.4, 0.04, 0.02]} />
          </mesh>
        ))}
      </Piece>
    </>
  );
};
