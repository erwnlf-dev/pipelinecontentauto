import { useCurrentFrame, useVideoConfig } from "remotion";
import { ease, sec, springIn } from "../lib/anim";
import { withAlpha } from "../lib/color";
import { theme } from "../theme";

/** Sinar radial berstagger di belakang angka payoff (motion-patterns §10), lalu memudar pelan. */
export const SparkBurst: React.FC<{ delay: number; size?: number; rays?: number }> = ({ delay, size = 980, rays = 18 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const spin = ease(frame, [delay, delay + sec(3, fps)], [-30, 12], "out");
  const settle = ease(frame, [delay + sec(0.6, fps), delay + sec(1.6, fps)], [1, 0.35], "inOut");
  return (
    <div style={{ position: "relative", width: size, height: size, transform: `rotate(${spin}deg)`, opacity: settle }}>
      {Array.from({ length: rays }).map((_, i) => {
        const p = springIn(frame, fps, delay + i * 1.2, "snappy");
        const long = i % 2 === 0 ? 0.48 : 0.34;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: 10,
              height: size * long * p,
              borderRadius: 10,
              transformOrigin: "50% 0%",
              transform: `translateX(-50%) rotate(${(360 / rays) * i}deg) translateY(${size * 0.16}px)`,
              background: `linear-gradient(180deg, ${withAlpha(theme.colors.accent, 0.9)}, ${withAlpha(theme.colors.accent, 0)})`,
            }}
          />
        );
      })}
    </div>
  );
};
