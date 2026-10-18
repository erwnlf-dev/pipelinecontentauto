import { useCurrentFrame, useVideoConfig } from "remotion";
import { breathe, sec } from "../../lib/anim";
import { theme } from "../../theme";
import { BurnLine, Enter, Headline, Kicker, StatCounter } from "../../components/Type";
import { BeatSlot, Block, type SceneProps } from "./common";

/**
 * HOOK 0–3 s. HIT di frame 2 (gerak < 15 frame): counter 2,6 meledak naik →
 * hold diam ±18 frame → build (garis bara + konteks).
 */
export const HookScene: React.FC<SceneProps> = ({ beats, beatDurs }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const hold = sec(theme.timing.hold, fps);
  const build = sec(0.55, fps) + hold;
  const b = breathe(frame);
  return (
    <BeatSlot from={beats[0]!} dur={beatDurs[0]!}>
      <Block top={300} gap={0}>
        <Kicker text="Karhutla 2015" delay={2} />
      </Block>
      <Block top={430} gap={0} style={{ transform: `scale(${b.scale}) translateY(${b.y}px)` }}>
        <StatCounter value={2.6} decimals={1} delay={2} size={330} />
      </Block>
      <Block top={800} gap={26}>
        <Headline lines={[{ text: "juta hektare" }]} delay={2 + sec(theme.timing.staggerLine, fps)} size={theme.type.h2 + 10} />
        <BurnLine delay={build} width={560} />
        <Enter delay={build + sec(theme.timing.staggerLine, fps)} preset="snappy" rise={30}>
          <div style={{ fontFamily: theme.fonts.body, fontWeight: 600, fontSize: theme.type.body, color: theme.colors.textDim, textAlign: "center" }}>
            Hutan &amp; lahan · Kalimantan–Sumatra
          </div>
        </Enter>
      </Block>
    </BeatSlot>
  );
};
