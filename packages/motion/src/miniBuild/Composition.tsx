import type React from "react";
import { AbsoluteFill, type CalculateMetadataFunction, useCurrentFrame, useVideoConfig } from "remotion";
import { Grain, SafeZoneGuide, Vignette } from "../components/Layers";
import { withAlpha } from "../lib/color";
import { useFonts } from "../lib/fonts";
import { easeIO, popScale } from "./anim3d";
import { AudioLayer, type SfxManifest } from "./AudioLayer";
import sfxManifest from "./generated/sfx.json";
import { Overlay } from "./Overlay";
import { at, type Clock, LIGHTS, makeClock, type Pace } from "./plan";
import { buildTheme } from "./theme";
import type { Lights } from "./world/context";
import { World } from "./world/World";

const C = buildTheme.colors;
const manifest = sfxManifest as SfxManifest;

export interface MiniBuildProps {
  pace: Pace;
  showSafeZone: boolean;
  [key: string]: unknown;
}

/** Layer 1 — latar studio: gradient + bokeh hangat yang melayang pelan. */
const Backdrop: React.FC<{ night: number }> = ({ night }) => {
  const frame = useCurrentFrame();
  const bokeh = [
    { x: 160, y: 260, r: 120, c: C.warmLight },
    { x: 860, y: 180, r: 160, c: C.warmLight },
    { x: 640, y: 420, r: 80, c: C.glass },
    { x: 300, y: 520, r: 60, c: C.signRed },
  ];
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 30%, ${C.bg} 0%, ${C.bgNight} 100%)` }}>
      {bokeh.map((b, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: b.x - b.r + Math.sin(frame / 40 + i) * 12,
            top: b.y - b.r + Math.cos(frame / 50 + i) * 8,
            width: b.r * 2,
            height: b.r * 2,
            borderRadius: "50%",
            filter: "blur(30px)",
            background: withAlpha(b.c, 0.1 + 0.18 * night),
          }}
        />
      ))}
    </AbsoluteFill>
  );
};

/** Layer 4 — grade hangat; sedikit lebih biru-dingin di finale malam. */
const Grade: React.FC<{ night: number }> = ({ night }) => (
  <AbsoluteFill style={{ pointerEvents: "none" }}>
    <AbsoluteFill style={{ backgroundColor: C.warmLight, mixBlendMode: "soft-light", opacity: 0.16 * (1 - night) }} />
    <AbsoluteFill style={{ backgroundColor: "#3A5DB8", mixBlendMode: "soft-light", opacity: 0.18 * night }} />
    <AbsoluteFill style={{ background: `linear-gradient(180deg, ${withAlpha(C.bgNight, 0.45)} 0%, transparent 24%, transparent 68%, ${withAlpha(C.bgNight, 0.5)} 100%)` }} />
  </AbsoluteFill>
);

/** Lampu menyala dengan kedip singkat (pola deterministik) lalu stabil. */
function lightOn(frame: number, start: number, fps: number): number {
  if (frame < start) return 0;
  const k = frame - start;
  const flicker = [0.7, 0.15, 1, 0.5][k] ?? 1;
  return Math.min(1, popScale(frame, start, fps)) * flicker;
}

export function lightsAt(clock: Clock, frame: number): { night: number; lights: Lights } {
  const night = easeIO(frame, [at(clock, LIGHTS.step, LIGHTS.night[0]), at(clock, LIGHTS.step, LIGHTS.night[1])], [0, 1]);
  const [a, b, c] = LIGHTS.at.map((f) => Math.round(at(clock, LIGHTS.step, f)));
  return { night, lights: { sign: lightOn(frame, a!, clock.fps), interior: lightOn(frame, b!, clock.fps), lamp: lightOn(frame, c!, clock.fps) } };
}

export const MiniBuildReel: React.FC<MiniBuildProps> = ({ pace, showSafeZone }) => {
  const ready = useFonts();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const clock = makeClock(pace, fps);
  const { night, lights } = lightsAt(clock, frame);
  return (
    <AbsoluteFill style={{ backgroundColor: C.bgNight }}>
      {/* 1 — latar */}
      <Backdrop night={night} />
      {/* 2 — diorama 3D (dimount setelah font siap: teks papan nama digambar ke canvas) */}
      {ready ? <World frame={frame} clock={clock} night={night} lights={lights} /> : null}
      {/* 3 — tipografi */}
      <Overlay clock={clock} />
      {/* 4 — grade */}
      <Grade night={night} />
      {/* 5 — grain + vignette */}
      <Grain />
      <Vignette />
      <AudioLayer manifest={manifest} clock={clock} />
      {showSafeZone ? <SafeZoneGuide /> : null}
    </AbsoluteFill>
  );
};

export const calculateMiniBuildMetadata: CalculateMetadataFunction<MiniBuildProps> = ({ props }) => ({
  fps: 30,
  durationInFrames: makeClock(props.pace, 30).total,
});
