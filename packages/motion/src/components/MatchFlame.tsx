import { useCurrentFrame, useVideoConfig } from "remotion";
import { sec, springIn } from "../lib/anim";
import { withAlpha } from "../lib/color";
import { theme } from "../theme";

/** Korek api yang menyala — metafora "dipicu ulah manusia". Api berkedip (sinus) setelah menyala. */
export const MatchFlame: React.FC<{ delay: number; scale?: number }> = ({ delay, scale = 1 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const stick = springIn(frame, fps, delay, "smooth");
  const ignite = springIn(frame, fps, delay + sec(0.45, fps), "bouncy");
  const f1 = 1 + Math.sin(frame / 3.1) * 0.06 + Math.sin(frame / 1.7) * 0.03;
  const sway = Math.sin(frame / 6) * 3;
  return (
    <svg
      width={260 * scale}
      height={520 * scale}
      viewBox="0 0 260 520"
      style={{ overflow: "visible", transform: `translateY(${(1 - stick) * 120}px) rotate(${-14 + (1 - stick) * -20}deg)`, opacity: Math.min(1, stick * 1.4) }}
    >
      <defs>
        <radialGradient id="flame-core" cx="50%" cy="70%" r="60%">
          <stop offset="0" stopColor={theme.colors.text} />
          <stop offset="0.35" stopColor={theme.colors.accent} />
          <stop offset="1" stopColor={theme.colors.accent} stopOpacity={0} />
        </radialGradient>
      </defs>
      <rect x={118} y={190} width={24} height={320} rx={8} fill={withAlpha(theme.colors.text, 0.82)} />
      <ellipse cx={130} cy={186} rx={26} ry={34} fill={theme.colors.peat} />
      <g transform={`translate(130 170) scale(${ignite * f1}) rotate(${sway}) translate(-130 -170)`}>
        <circle cx={130} cy={110} r={140} fill={withAlpha(theme.colors.accent, 0.14)} />
        <path d="M130 10 C175 70 185 120 168 160 C158 182 145 190 130 190 C115 190 100 182 92 160 C76 120 88 70 130 10 Z" fill="url(#flame-core)" />
        <path d="M130 80 C150 110 152 140 144 160 C140 170 136 176 130 176 C124 176 118 170 116 160 C110 140 112 110 130 80 Z" fill={theme.colors.text} opacity={0.85} />
      </g>
    </svg>
  );
};
