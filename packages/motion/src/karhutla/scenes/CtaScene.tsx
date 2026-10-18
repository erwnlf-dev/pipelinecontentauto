import { useCurrentFrame, useVideoConfig } from "remotion";
import { breathe, sec, springIn } from "../../lib/anim";
import { withAlpha } from "../../lib/color";
import { theme } from "../../theme";
import { BookmarkIcon, ShareIcon } from "../../components/Icons";
import { MatchFlame } from "../../components/MatchFlame";
import { Enter, Headline } from "../../components/Type";
import { BeatSlot, Block, Center, type SceneProps } from "./common";

/** Tombol CTA: satu-satunya elemen hero + glow di frame-nya, bernapas pelan. */
const CtaPill: React.FC<{ delay: number }> = ({ delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = springIn(frame, fps, delay, "bouncy");
  const b = breathe(frame);
  const glow = 0.45 + 0.15 * Math.sin(frame / 10);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 22,
        padding: "30px 64px",
        borderRadius: 999,
        background: theme.colors.primary,
        color: theme.colors.bg,
        fontFamily: theme.fonts.display,
        ...theme.type.hero,
        fontSize: 72,
        textTransform: "uppercase",
        opacity: Math.min(1, p * 1.3),
        transform: `translateY(${(1 - p) * 60}px) scale(${(0.8 + 0.2 * p) * b.scale})`,
        boxShadow: `0 0 60px ${withAlpha(theme.colors.primary, glow)}, 0 0 120px ${withAlpha(theme.colors.primary, glow / 2)}`,
      }}
    >
      <ShareIcon />
      Bagikan
    </div>
  );
};

/** CTA — (A) "dipicu ulah manusia" + korek api, (B) tombol Bagikan + Simpan. */
export const CtaScene: React.FC<SceneProps> = ({ beats, beatDurs }) => {
  const { fps } = useVideoConfig();
  const step = sec(theme.timing.staggerLine, fps);
  const hold = sec(theme.timing.hold, fps);
  return (
    <>
      <BeatSlot from={beats[0]!} dur={beatDurs[0]!}>
        <Block top={300}>
          <Headline lines={[{ text: "Hampir semua" }, { text: "dipicu" }, { text: "manusia", hero: true }]} delay={2} size={theme.type.h2 + 16} />
        </Block>
        <Center top={640}>
          <MatchFlame delay={2 + step * 2 + hold} scale={0.82} />
        </Center>
      </BeatSlot>

      <BeatSlot from={beats[1]!} dur={beatDurs[1]!}>
        <Block top={420} gap={40}>
          <Headline lines={[{ text: "Biar musim asap" }, { text: "tak terulang" }]} delay={2} size={theme.type.h2} />
          <div style={{ height: 30 }} />
          <CtaPill delay={2 + step * 2 + hold} />
          <Enter delay={2 + step * 3 + hold} preset="snappy" rise={24}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                padding: "18px 40px",
                borderRadius: 999,
                border: `2px solid ${theme.colors.line}`,
                fontFamily: theme.fonts.body,
                fontWeight: 600,
                fontSize: 38,
                color: theme.colors.text,
              }}
            >
              <BookmarkIcon />
              Simpan untuk nanti
            </div>
          </Enter>
        </Block>
      </BeatSlot>
    </>
  );
};
