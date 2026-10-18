import { useVideoConfig } from "remotion";
import { sec } from "../../lib/anim";
import { theme } from "../../theme";
import { BaliTiles } from "../../components/BaliTiles";
import { RadarScan } from "../../components/RadarScan";
import { Enter, Headline, Kicker, StatCounter } from "../../components/Type";
import { BeatSlot, Block, Center, type SceneProps } from "./common";

/** Body 1 — skala: (A) 4,5× Pulau Bali, (B) radar satelit titik api. */
export const ScaleScene: React.FC<SceneProps> = ({ beats, beatDurs }) => {
  const { fps } = useVideoConfig();
  const step = sec(theme.timing.staggerLine, fps);
  const hold = sec(theme.timing.hold, fps);
  return (
    <>
      <BeatSlot from={beats[0]!} dur={beatDurs[0]!}>
        <Block top={300} gap={0}>
          <Kicker text="Perbandingan luas" delay={0} />
        </Block>
        <Block top={360} gap={0}>
          <StatCounter value={4.5} decimals={1} suffix="×" delay={2} size={220} />
        </Block>
        <Block top={610} gap={16}>
          <Headline lines={[{ text: "luas Pulau Bali" }]} delay={2 + step} size={theme.type.h2} />
          <Enter delay={2 + step * 2} preset="snappy" rise={24}>
            <div style={{ fontFamily: theme.fonts.mono, fontWeight: 600, fontSize: theme.type.label, letterSpacing: "0.1em", color: theme.colors.textDim }}>
              ≈ 26.000 KM² TERBAKAR
            </div>
          </Enter>
        </Block>
        <Center top={820}>
          {/* Tile mendarat setelah headline + hold → build. */}
          <BaliTiles delay={2 + step * 2 + hold} />
        </Center>
      </BeatSlot>

      <BeatSlot from={beats[1]!} dur={beatDurs[1]!}>
        <Block top={295} gap={0}>
          <Kicker text="Pantauan satelit · 2015" delay={0} />
        </Block>
        <Center top={345}>
          <RadarScan delay={step} />
        </Center>
        <Block top={980} gap={0}>
          <Enter delay={sec(1.4, fps)} preset="snappy" rise={30}>
            <div
              style={{
                fontFamily: theme.fonts.display,
                ...theme.type.hero,
                fontWeight: 800,
                fontSize: 64,
                color: theme.colors.text,
                textTransform: "uppercase",
              }}
            >
              Ribuan titik api
            </div>
          </Enter>
        </Block>
      </BeatSlot>
    </>
  );
};
