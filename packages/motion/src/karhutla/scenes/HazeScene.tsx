import { useCurrentFrame, useVideoConfig } from "remotion";
import { sec, springIn } from "../../lib/anim";
import { withAlpha } from "../../lib/color";
import { theme } from "../../theme";
import { FloatingCard } from "../../components/FloatingCard";
import { PlaneIcon, SchoolIcon } from "../../components/Icons";
import { Enter, Kicker, StatCounter } from "../../components/Type";
import { BeatSlot, Block, Center, type SceneProps } from "./common";

/** Cincin napas di belakang angka ISPA — berstagger 6 frame, membesar & memudar. */
const BreathRings: React.FC<{ delay: number }> = ({ delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ position: "relative", width: 900, height: 900 }}>
      {[0, 1, 2].map((i) => {
        const p = springIn(frame, fps, delay + i * 6, "smooth");
        const breath = 1 + Math.sin(frame / 18 + i) * 0.03;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              inset: 150 - i * 75,
              borderRadius: "50%",
              border: `2px solid ${withAlpha(theme.colors.accent, 0.35 - i * 0.09)}`,
              transform: `scale(${(0.6 + 0.4 * p) * breath})`,
              opacity: Math.min(1, p),
            }}
          />
        );
      })}
    </div>
  );
};

/** Body 3 — kabut asap: (A) kartu 3D sekolah & bandara, (B) counter 500.000+ ISPA. */
export const HazeScene: React.FC<SceneProps> = ({ beats, beatDurs }) => {
  const { fps } = useVideoConfig();
  const step = sec(theme.timing.staggerLine, fps);
  const hold = sec(theme.timing.hold, fps);
  return (
    <>
      <BeatSlot from={beats[0]!} dur={beatDurs[0]!}>
        <Block top={300} gap={34}>
          <Kicker text="Kabut asap · Sep–Okt 2015" delay={0} />
          <FloatingCard delay={step} icon={<SchoolIcon />} title="Sekolah diliburkan" sub="Siswa belajar dari rumah" tilt={-7} />
          <FloatingCard delay={step * 2} icon={<PlaneIcon />} title="Bandara lumpuh" sub="Penerbangan dibatalkan" tilt={6} phase={1.7} />
        </Block>
      </BeatSlot>

      <BeatSlot from={beats[1]!} dur={beatDurs[1]!}>
        <Center top={240}>
          <BreathRings delay={2} />
        </Center>
        <Block top={480} gap={10}>
          <StatCounter value={500000} delay={2} size={176} suffix="+" />
        </Block>
        <Block top={760} gap={18}>
          <Enter delay={2 + step} preset="smooth" rise={40}>
            <div style={{ fontFamily: theme.fonts.display, ...theme.type.hero, fontWeight: 800, fontSize: 74, color: theme.colors.text, textTransform: "uppercase", textAlign: "center" }}>
              warga terkena ISPA
            </div>
          </Enter>
          <Enter delay={2 + step * 2 + hold} preset="snappy" rise={24}>
            <div style={{ fontFamily: theme.fonts.mono, fontWeight: 600, fontSize: 28, letterSpacing: "0.1em", color: theme.colors.textDim, textAlign: "center" }}>
              INFEKSI SALURAN PERNAPASAN AKUT · BNPB
            </div>
          </Enter>
        </Block>
      </BeatSlot>
    </>
  );
};
