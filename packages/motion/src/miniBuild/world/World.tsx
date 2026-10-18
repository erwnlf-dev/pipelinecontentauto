import { ThreeCanvas } from "@remotion/three";
import { useMemo } from "react";
import { useVideoConfig } from "remotion";
import type { Clock } from "../plan";
import { Building } from "./Building";
import { createMaterials, type Lights, type WorldCtx } from "./context";
import { Ground } from "./Ground";
import { Interior } from "./Interior";
import { Props } from "./Props";
import { Rig } from "./Rig";
import { Tweezers } from "./Tweezers";

/** Layer 2 — diorama 3D. Semua state diturunkan dari `frame` (render paralel aman). */
export const World: React.FC<{ frame: number; clock: Clock; night: number; lights: Lights }> = ({ frame, clock, night, lights }) => {
  const { width, height } = useVideoConfig();
  const mat = useMemo(createMaterials, []);
  mat.sign.emissiveIntensity = lights.sign * 0.9;
  mat.lightbox.emissiveIntensity = lights.sign * 1.1;
  mat.glowPanel.emissiveIntensity = lights.interior * 2.2;
  mat.fridgeGlow.emissiveIntensity = lights.interior * 1.4;
  mat.bulb.emissiveIntensity = lights.lamp * 4;
  const ctx: WorldCtx = { frame, clock, night, lights, mat };
  return (
    <ThreeCanvas
      width={width}
      height={height}
      shadows
      camera={{ position: [8, 6, 12], fov: 36 }}
      gl={{ antialias: true, alpha: true }}
      style={{ position: "absolute", inset: 0 }}
    >
      <Rig ctx={ctx} />
      <Ground ctx={ctx} />
      <Building ctx={ctx} />
      <Interior ctx={ctx} />
      <Props ctx={ctx} />
      <Tweezers ctx={ctx} />
    </ThreeCanvas>
  );
};
