import { Audio, Sequence, interpolate, staticFile, useVideoConfig } from "remotion";
import { buildTheme } from "./theme";
import { at, type Clock, STEPS } from "./plan";

export interface SfxManifest {
  v: 1;
  mode: "live" | "dry";
  sfx: Partial<Record<string, string>>;
}

const LEAD = 2; // SFX mendahului visual 2 frame — terasa sinkron, bukan telat.

/** SFX ASMR per momen aksi + bed lembut sepanjang video (fade in/out ber-easing). */
export const AudioLayer: React.FC<{ manifest: SfxManifest; clock: Clock }> = ({ manifest, clock }) => {
  const { fps } = useVideoConfig();
  const sfx = manifest.sfx;
  const bedVol = (f: number) =>
    0.32 *
    interpolate(f, [0, fps * 0.4], [0, 1], { easing: buildTheme.ease.out, extrapolateLeft: "clamp", extrapolateRight: "clamp" }) *
    interpolate(f, [clock.total - fps * 0.6, clock.total], [1, 0], { easing: buildTheme.ease.in, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <>
      {sfx.bed ? <Audio src={staticFile(sfx.bed)} loop volume={bedVol} /> : null}
      {STEPS.flatMap((st, i) =>
        st.sfx.map((cue, j) => {
          const file = sfx[cue.id];
          if (!file) return null;
          return (
            <Sequence key={`${st.id}-${j}`} from={Math.max(0, Math.round(at(clock, i, cue.at)) - LEAD)} layout="none">
              <Audio src={staticFile(file)} volume={cue.volume} />
            </Sequence>
          );
        }),
      )}
    </>
  );
};
