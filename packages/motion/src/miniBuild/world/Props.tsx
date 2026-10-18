import type { WorldCtx } from "./context";
import { LandingRing, Piece } from "./Piece";

/** Lampu jalan + rambu P, tiang lightbox, tempat sampah, pot tanaman (langkah 6). */
export const Props: React.FC<{ ctx: WorldCtx }> = ({ ctx }) => {
  const m = ctx.mat;
  return (
    <>
      <Piece id="lamp" ctx={ctx}>
        <mesh position={[0, 0.06, 0]} castShadow material={m.metalDark}>
          <cylinderGeometry args={[0.22, 0.26, 0.12, 20]} />
        </mesh>
        <mesh position={[0, 2.25, 0]} castShadow material={m.metalDark}>
          <cylinderGeometry args={[0.07, 0.09, 4.5, 14]} />
        </mesh>
        <mesh position={[-0.45, 4.45, 0]} castShadow material={m.metalDark}>
          <boxGeometry args={[0.95, 0.07, 0.07]} />
        </mesh>
        <mesh position={[-0.9, 4.3, 0]} castShadow material={m.metalDark}>
          <coneGeometry args={[0.32, 0.32, 20, 1, true]} />
        </mesh>
        <mesh position={[-0.9, 4.18, 0]} material={m.bulb}>
          <sphereGeometry args={[0.13, 16, 12]} />
        </mesh>
        <pointLight position={[-0.9, 4.0, 0]} color="#FFD9A0" intensity={ctx.lights.lamp * 22} distance={9} decay={2} />
        {/* Rambu parkir */}
        <mesh position={[-0.7, 0.75, -0.5]} castShadow material={m.metal}>
          <cylinderGeometry args={[0.035, 0.035, 1.5, 8]} />
        </mesh>
        <mesh position={[-0.7, 1.55, -0.47]} castShadow material={m.parking}>
          <boxGeometry args={[0.5, 0.5, 0.03]} />
        </mesh>
      </Piece>
      <LandingRing id="lamp" ctx={ctx} radius={0.9} y={0.03} />

      <Piece id="pole" ctx={ctx}>
        <mesh position={[0, 2.6, 0]} castShadow material={m.metal}>
          <cylinderGeometry args={[0.09, 0.11, 5.2, 14]} />
        </mesh>
        <mesh position={[0, 5.55, 0]} castShadow material={[m.trim, m.trim, m.trim, m.trim, m.lightbox, m.lightbox]}>
          <boxGeometry args={[1.8, 1.35, 0.3]} />
        </mesh>
      </Piece>
      <LandingRing id="pole" ctx={ctx} radius={0.8} y={0.03} />

      <Piece id="bin" ctx={ctx}>
        <mesh position={[0, 0.4, 0]} castShadow receiveShadow material={m.bin}>
          <cylinderGeometry args={[0.32, 0.27, 0.8, 18]} />
        </mesh>
        <mesh position={[0, 0.84, 0]} castShadow material={m.rubber}>
          <cylinderGeometry args={[0.35, 0.35, 0.08, 18]} />
        </mesh>
      </Piece>
      <LandingRing id="bin" ctx={ctx} radius={0.6} y={0.03} />

      <Piece id="plant" ctx={ctx}>
        <mesh position={[0, 0.28, 0]} castShadow receiveShadow material={m.pot}>
          <cylinderGeometry args={[0.32, 0.24, 0.56, 18]} />
        </mesh>
        {[
          [0, 0.85, 0, 0.32],
          [0.2, 0.75, 0.12, 0.24],
          [-0.2, 0.78, -0.08, 0.26],
          [0.05, 1.08, -0.1, 0.22],
          [-0.12, 0.98, 0.16, 0.2],
        ].map(([x, y, z, r], i) => (
          <mesh key={i} position={[x!, y!, z!]} castShadow material={m.leaf}>
            <icosahedronGeometry args={[r!, 1]} />
          </mesh>
        ))}
      </Piece>
      <LandingRing id="plant" ctx={ctx} radius={0.6} y={0.03} />
    </>
  );
};
