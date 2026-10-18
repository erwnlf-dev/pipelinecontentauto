import { useThree } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { cameraAt } from "../anim3d";
import { buildTheme } from "../theme";
import type { WorldCtx } from "./context";

const C = buildTheme.colors;
const day = new THREE.Color(C.bg);
const night = new THREE.Color(C.bgNight);

/** Kamera, fog, environment map, dan lampu global (siang studio → malam). */
export const Rig: React.FC<{ ctx: WorldCtx }> = ({ ctx }) => {
  const { camera, scene, gl } = useThree();
  useMemo(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.fog = new THREE.Fog(C.bg, 46, 120);
  }, [gl, scene]);

  const cam = cameraAt(ctx.clock, ctx.frame);
  const pc = camera as THREE.PerspectiveCamera;
  pc.position.set(...cam.pos);
  pc.fov = cam.fov;
  pc.near = 0.1;
  pc.far = 260;
  pc.lookAt(...cam.target);
  pc.updateProjectionMatrix();

  const n = ctx.night;
  (scene.fog as THREE.Fog).color.copy(day).lerp(night, n);
  scene.environmentIntensity = 0.32 * (1 - 0.75 * n);

  return (
    <>
      <hemisphereLight args={["#FFF4E6", C.mat, 0.55 * (1 - 0.9 * n)]} />
      <directionalLight
        position={[-8, 15, 10]}
        intensity={1.7 * (1 - 0.94 * n)}
        color="#FFF1DE"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-camera-near={1}
        shadow-camera-far={40}
      />
      {/* Interior & cahaya papan nama — menyala di finale. */}
      <pointLight position={[0, 3.6, -1]} color={C.warmLight} intensity={ctx.lights.interior * 45} distance={12} decay={2} />
      <pointLight position={[0, 3.6, 3.4]} color="#FFF0D8" intensity={ctx.lights.sign * 14} distance={9} decay={2} />
    </>
  );
};
