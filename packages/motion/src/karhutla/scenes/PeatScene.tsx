import { useVideoConfig } from "remotion";
import { sec } from "../../lib/anim";
import { theme } from "../../theme";
import { FloatingCard } from "../../components/FloatingCard";
import { PeatSection } from "../../components/PeatSection";
import { Headline } from "../../components/Type";
import { BeatSlot, Block, Center, Exit, type SceneProps } from "./common";

/** Body 2 — gambut: (A) pohon hangus, (B) bara menjalar di bawah tanah, (C) kartu "berminggu-minggu". */
export const PeatScene: React.FC<SceneProps> = ({ beats, beatDurs, dur }) => {
  const { fps } = useVideoConfig();
  const step = sec(theme.timing.staggerLine, fps);
  return (
    <>
      {/* Penampang bertahan lintas beat (asset layer scene), dikendalikan timeline GSAP. */}
      <Exit end={dur}>
        <Center top={560}>
          <PeatSection delay={0} diveAt={beats[1]! / fps} dimAt={beats[2]! / fps} />
        </Center>
      </Exit>

      <BeatSlot from={beats[0]!} dur={beatDurs[0]!}>
        <Block top={300}>
          <Headline lines={[{ text: "Bukan cuma" }, { text: "pohon", hero: true }]} delay={2} size={106} />
        </Block>
      </BeatSlot>

      <BeatSlot from={beats[1]!} dur={beatDurs[1]!}>
        <Block top={300}>
          <Headline lines={[{ text: "Bara di" }, { text: "bawah tanah", hero: true }]} delay={2} size={theme.type.h2 + 14} />
        </Block>
      </BeatSlot>

      <BeatSlot from={beats[2]!} dur={beatDurs[2]!}>
        <Block top={330} gap={26}>
          <FloatingCard delay={2} title="Permukaan" sub="Tampak sudah padam" tilt={-6} phase={0} />
          <FloatingCard delay={2 + step} title="Bawah tanah" sub="Bara tetap membara" tilt={5} phase={1.4} />
          <FloatingCard delay={2 + step * 2} title="Berminggu-minggu" sub="Sulit dipadamkan" tilt={-3} phase={2.6} />
        </Block>
      </BeatSlot>
    </>
  );
};
