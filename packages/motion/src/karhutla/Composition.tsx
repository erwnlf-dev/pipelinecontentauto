import type React from "react";
import { AbsoluteFill, type CalculateMetadataFunction, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { Captions } from "../components/Captions";
import { BgMesh, Grade, Grain, SafeZoneGuide, Vignette } from "../components/Layers";
import { ease, sec } from "../lib/anim";
import { useFonts } from "../lib/fonts";
import { FireScene, type FireMood } from "../three/FireScene";
import { AudioLayer } from "./AudioLayer";
import voiceover from "./generated/voiceover.json";
import type { VoiceoverManifest } from "./manifest";
import { CostScene } from "./scenes/CostScene";
import { CtaScene } from "./scenes/CtaScene";
import { HazeScene } from "./scenes/HazeScene";
import { HookScene } from "./scenes/HookScene";
import { PeatScene } from "./scenes/PeatScene";
import { ScaleScene } from "./scenes/ScaleScene";
import type { SceneProps } from "./scenes/common";
import type { SceneId } from "./script";
import { type ReelTiming, computeTiming } from "./timing";

const manifest = voiceover as VoiceoverManifest;

export interface KarhutlaReelProps {
  showSafeZone: boolean;
  [key: string]: unknown;
}

const SCENES: Record<SceneId, React.FC<SceneProps>> = {
  hook: HookScene,
  scale: ScaleScene,
  peat: PeatScene,
  haze: HazeScene,
  cost: CostScene,
  cta: CtaScene,
};

/** Mood global per scene → partikel bara, kabut asap, dan panas latar. */
const MOOD: Record<SceneId, { ember: number; smoke: number; heat: number }> = {
  hook: { ember: 1, smoke: 0.12, heat: 1 },
  scale: { ember: 0.35, smoke: 0.08, heat: 0.5 },
  peat: { ember: 0.7, smoke: 0.22, heat: 0.8 },
  haze: { ember: 0.18, smoke: 0.9, heat: 0.35 },
  cost: { ember: 0.85, smoke: 0.25, heat: 1 },
  cta: { ember: 0.4, smoke: 0.15, heat: 0.55 },
};

function moodAt(frame: number, timing: ReelTiming, fps: number): FireMood & { heat: number } {
  const blend = sec(0.5, fps);
  let cur = MOOD[timing.scenes[0]!.id];
  let mixed = { ...cur };
  for (const s of timing.scenes) {
    if (frame < s.from) break;
    const next = MOOD[s.id];
    const k = ease(frame, [s.from, s.from + blend], [0, 1], "inOut");
    mixed = {
      ember: cur.ember + (next.ember - cur.ember) * k,
      smoke: cur.smoke + (next.smoke - cur.smoke) * k,
      heat: cur.heat + (next.heat - cur.heat) * k,
    };
    cur = next;
  }
  // Ledakan bara tepat di HIT payoff (Rp221 triliun), meluruh expo.
  const hit = timing.beats.find((b) => b.beat.id === "cost-hit");
  const burst = hit ? ease(frame, [hit.from, hit.from + 2], [0, 1], "out") * ease(frame, [hit.from + 2, hit.from + sec(1.4, fps)], [1, 0], "out") : 0;
  return { ...mixed, burst };
}

export const KarhutlaReel: React.FC<KarhutlaReelProps> = ({ showSafeZone }) => {
  useFonts();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const timing = computeTiming(manifest, fps);
  const mood = moodAt(frame, timing, fps);

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* 1 — background gradient mesh */}
      <BgMesh heat={mood.heat} />
      {/* 2 — particle / assets (Three.js) */}
      <FireScene mood={mood} />
      {/* 2+3 — grafik & tipografi per scene */}
      {timing.scenes.map((s) => {
        const Scene = SCENES[s.id];
        return (
          <Sequence key={`${s.id}-${s.from}`} from={s.from} durationInFrames={s.dur} name={s.id}>
            <Scene beats={s.beats} beatDurs={s.beatDurs} dur={s.dur} />
          </Sequence>
        );
      })}
      {/* 3 — subtitle word-level */}
      <Captions timing={timing} />
      {/* 4 — color grade */}
      <Grade />
      {/* 5 — grain + vignette */}
      <Grain />
      <Vignette />
      <AudioLayer manifest={manifest} timing={timing} />
      {showSafeZone ? <SafeZoneGuide /> : null}
    </AbsoluteFill>
  );
};

/** Durasi komposisi = jumlah beat hasil solver (tidak ada dead air / kalimat terpotong). */
export const calculateKarhutlaMetadata: CalculateMetadataFunction<KarhutlaReelProps> = () => {
  const fps = 30;
  return { fps, durationInFrames: computeTiming(manifest, fps).total };
};
