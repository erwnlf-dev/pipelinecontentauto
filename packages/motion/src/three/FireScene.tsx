import { ThreeCanvas } from "@remotion/three";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { EmberField } from "./EmberField";
import { SmokeVeil } from "./SmokeVeil";

export interface FireMood {
  ember: number;
  smoke: number;
  burst: number;
}

/** Layer 2 (assets) global: satu konteks WebGL untuk bara + asap sepanjang video. */
export const FireScene: React.FC<{ mood: FireMood }> = ({ mood }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;
  return (
    <ThreeCanvas
      width={width}
      height={height}
      camera={{ position: [0, 0, 8], fov: 50, near: 0.1, far: 50 }}
      gl={{ antialias: true, alpha: true, premultipliedAlpha: true }}
      style={{ position: "absolute", inset: 0 }}
    >
      <EmberField time={t} intensity={mood.ember} burst={mood.burst} />
      <SmokeVeil time={t} density={mood.smoke} aspect={width / height} />
    </ThreeCanvas>
  );
};
