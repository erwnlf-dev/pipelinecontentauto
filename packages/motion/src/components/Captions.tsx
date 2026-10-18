import { useCurrentFrame, useVideoConfig } from "remotion";
import { ease, springIn } from "../lib/anim";
import { withAlpha } from "../lib/color";
import { theme } from "../theme";
import type { ReelTiming } from "../karhutla/timing";

const TOP = 1085; // pita caption: y 1085–1245, di dalam safe zone (≤ 1250)

/**
 * Subtitle word-level dari alignment ElevenLabs `/with-timestamps`.
 * Chunk masuk dengan pop 3 properti; kata aktif membesar + warna aksen;
 * kata penekanan tetap beraksen setelah diucapkan.
 */
export const Captions: React.FC<{ timing: ReelTiming }> = ({ timing }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const bt = timing.beats.find((b) => frame >= b.from && frame < b.from + b.dur);
  if (!bt) return null;
  const ms = ((frame - bt.voFrom) / fps) * 1000;
  const chunks = bt.audio.captions;
  // Chunk terakhir yang sudah mulai; tetap tampil sampai chunk berikutnya / akhir beat.
  let idx = -1;
  chunks.forEach((c, i) => {
    if (ms >= c.startMs - 40) idx = i;
  });
  const chunk = chunks[idx];
  if (!chunk) return null;

  const startFrame = bt.voFrom + Math.round(((chunk.startMs - 40) * fps) / 1000);
  const p = springIn(frame, fps, startFrame, "snappy");
  const beatEnd = bt.from + bt.dur;
  const out = ease(frame, [beatEnd - 5, beatEnd], [1, 0], "in");

  return (
    <div
      style={{
        position: "absolute",
        left: theme.safe.side,
        right: theme.safe.side,
        top: TOP,
        height: theme.safe.bottom - TOP,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: Math.min(1, p) * (idx === chunks.length - 1 ? out : 1),
        transform: `translateY(${(1 - p) * 26}px) scale(${0.9 + 0.1 * p})`,
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          columnGap: 18,
          rowGap: 4,
          padding: "14px 30px",
          borderRadius: 24,
          background: withAlpha(theme.colors.bg, 0.5),
          fontFamily: theme.fonts.display,
          fontWeight: 800,
          fontSize: 64,
          lineHeight: 1.12,
          letterSpacing: "-0.01em",
        }}
      >
        {chunk.words.map((w, i) => {
          const active = ms >= w.startMs && ms < w.endMs + 60;
          const spoken = ms >= w.startMs;
          const pop = springIn(frame, fps, bt.voFrom + Math.round((w.startMs * fps) / 1000), "snappy");
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                color: active || (w.emphasis && spoken) ? theme.colors.accent : spoken ? theme.colors.text : withAlpha(theme.colors.text, 0.55),
                transform: `scale(${active ? 1 + 0.07 * Math.min(1, pop) : 1})`,
                textShadow: `0 6px 20px ${theme.colors.shadow}`,
              }}
            >
              {w.text}
            </span>
          );
        })}
      </div>
    </div>
  );
};
