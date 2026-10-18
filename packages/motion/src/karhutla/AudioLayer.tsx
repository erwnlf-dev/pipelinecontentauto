import { Audio, Sequence, interpolate, staticFile, useVideoConfig } from "remotion";
import { sec } from "../lib/anim";
import { theme } from "../theme";
import type { VoiceoverManifest } from "./manifest";
import type { ReelTiming } from "./timing";

const BED = { drone: 0.22, droneDucked: 0.09, crackle: 0.14 };

/**
 * VO per beat (ElevenLabs, ditempatkan di grid beat), SFX cue per beat
 * (whoosh mendahului cut 2–3 frame, impact tepat di cut), dan bed ambience
 * yang di-duck di bawah narasi.
 */
export const AudioLayer: React.FC<{ manifest: VoiceoverManifest; timing: ReelTiming }> = ({ manifest, timing }) => {
  const { fps } = useVideoConfig();
  const sfx = manifest.sfx;
  const voWindows = timing.beats.map((b) => [b.voFrom, b.voFrom + Math.ceil((b.audio.durationMs * fps) / 1000)] as const);
  const ramp = sec(0.2, fps);

  // 0..1 seberapa "di dalam" narasi pada frame f (ramp halus ber-easing).
  const speech = (f: number) =>
    voWindows.reduce((lvl, [a, b]) => {
      const inner = Math.min(f - (a - ramp), b + ramp - f);
      return Math.max(lvl, interpolate(inner, [0, ramp], [0, 1], { easing: theme.ease.inOut, extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
    }, 0);

  const fadeOut = (f: number) =>
    interpolate(f, [timing.total - sec(1, fps), timing.total], [1, 0], { easing: theme.ease.in, extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <>
      {sfx.drone ? (
        <Audio src={staticFile(sfx.drone)} loop volume={(f) => (BED.drone - (BED.drone - BED.droneDucked) * speech(f)) * fadeOut(f)} />
      ) : null}
      {sfx.crackle ? <Audio src={staticFile(sfx.crackle)} loop volume={(f) => BED.crackle * fadeOut(f)} /> : null}

      {timing.beats.map((b) =>
        b.audio.file ? (
          <Sequence key={`vo-${b.beat.id}`} from={b.voFrom} layout="none">
            <Audio src={staticFile(b.audio.file)} volume={1} />
          </Sequence>
        ) : null,
      )}

      {timing.beats.flatMap((b) =>
        b.beat.sfx.map((cue, i) => {
          const file = sfx[cue.id];
          if (!file) return null;
          // SFX mendahului visual `sfxLead` (whoosh) — offset negatif di script = sebelum cut.
          const lead = cue.id === "whoosh" ? sec(theme.timing.sfxLead, fps) : 0;
          const from = Math.max(0, b.from + sec(cue.at, fps) - lead);
          return (
            <Sequence key={`sfx-${b.beat.id}-${i}`} from={from} layout="none">
              <Audio src={staticFile(file)} volume={cue.volume} />
            </Sequence>
          );
        }),
      )}
    </>
  );
};
