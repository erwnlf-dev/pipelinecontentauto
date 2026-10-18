import { useCurrentFrame, useVideoConfig } from "remotion";
import { ease, sec, springIn } from "../../lib/anim";
import { withAlpha } from "../../lib/color";
import { useGsapTimeline } from "../../lib/gsap";
import { theme } from "../../theme";
import { SparkBurst } from "../../components/SparkBurst";
import { Enter, Headline, StatCounter } from "../../components/Type";
import { BeatSlot, Block, Center, type SceneProps } from "./common";

/** Meter antisipasi (GSAP expo.inOut) yang terisi bersama riser sebelum payoff. */
const TensionMeter: React.FC<{ delay: number; fill: number }> = ({ delay, fill }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const g = useGsapTimeline(
    { w: 0 },
    (tl, s) => {
      tl.to(s, { w: 1, duration: fill, ease: theme.gsapEase.inOut }, 0);
    },
    delay,
  );
  const enter = springIn(frame, fps, delay - 4, "snappy");
  return (
    <div style={{ width: 760, opacity: Math.min(1, enter), transform: `scaleX(${0.9 + 0.1 * enter})` }}>
      <div style={{ height: 14, borderRadius: 7, background: theme.colors.line, overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${g.w * 100}%`,
            borderRadius: 7,
            background: `linear-gradient(90deg, ${withAlpha(theme.colors.accent, 0.3)}, ${theme.colors.accent})`,
            boxShadow: `0 0 30px ${withAlpha(theme.colors.accent, 0.6)}`,
          }}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, fontFamily: theme.fonts.mono, fontWeight: 600, fontSize: 24, letterSpacing: "0.12em", color: theme.colors.textDim }}>
        <span>MENGHITUNG</span>
        <span style={{ fontVariantNumeric: "tabular-nums" }}>{Math.round(g.w * 100)}%</span>
      </div>
    </div>
  );
};

/** Body 4 / PAYOFF — (A) pertanyaan + meter riser, (B) Rp221 triliun: animasi terbesar video. */
export const CostScene: React.FC<SceneProps> = ({ beats, beatDurs }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const step = sec(theme.timing.staggerLine, fps);
  const hold = sec(theme.timing.hold, fps);
  const hit = beats[1]!;
  // Push-in pelan sepanjang pertanyaan, lalu screen shake meluruh tepat di HIT.
  const push = ease(frame, [0, hit], [1, 1.05], "inOut");
  const since = frame - hit;
  const shake = since >= 0 ? Math.sin(since * 2.4) * 14 * Math.exp(-since / 5) : 0;
  return (
    <div style={{ position: "absolute", inset: 0, transform: `scale(${since >= 0 ? 1 : push}) translate(${shake}px, ${shake * 0.6}px)` }}>
      <BeatSlot from={beats[0]!} dur={beatDurs[0]!}>
        <Block top={430} gap={50}>
          <Headline lines={[{ text: "Berapa" }, { text: "kerugiannya?" }]} delay={2} size={98} />
          <TensionMeter delay={2 + step * 2 + hold} fill={Math.max(0.6, (beatDurs[0]! - (2 + step * 2 + hold)) / fps)} />
        </Block>
      </BeatSlot>

      <BeatSlot from={hit} dur={beatDurs[1]!}>
        <Center top={150}>
          <SparkBurst delay={0} />
        </Center>
        <Block top={430} gap={0}>
          <StatCounter value={221} prefix="Rp" delay={0} size={300} />
        </Block>
        <Block top={760} gap={22}>
          <Headline lines={[{ text: "triliun" }]} delay={step} size={theme.type.h1} />
          <Enter delay={step * 2 + hold} preset="snappy" rise={26}>
            <div style={{ fontFamily: theme.fonts.mono, fontWeight: 600, fontSize: 30, letterSpacing: "0.08em", color: theme.colors.textDim, textAlign: "center" }}>
              ≈ US$16,1 MILIAR · 1,9% PDB
            </div>
          </Enter>
          <Enter delay={step * 3 + hold} preset="snappy" rise={20}>
            <div style={{ fontFamily: theme.fonts.body, fontWeight: 500, fontSize: 28, color: withAlpha(theme.colors.textDim, 0.8) }}>Sumber: Bank Dunia (2016)</div>
          </Enter>
        </Block>
      </BeatSlot>
    </div>
  );
};
