import { useMemo } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { breathe, ease, entrance, sec } from "../lib/anim";
import { withAlpha } from "../lib/color";
import { BALI, fitProjection, smoothPath } from "../lib/geo";
import { theme } from "../theme";

const W = 190;
const H = 116;

/** 4,5 siluet Pulau Bali yang "terbakar" satu per satu — perbandingan luas 2,6 juta ha. */
export const BaliTiles: React.FC<{ delay: number; count?: number }> = ({ delay, count = 4.5 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const step = Math.round(theme.timing.staggerLine * fps);
  const path = useMemo(() => {
    const proj = fitProjection(BALI, W, H, 10);
    return smoothPath(BALI.map(proj.project));
  }, []);
  const tiles = Array.from({ length: Math.ceil(count) }, (_, i) => Math.min(1, count - i));
  const b = breathe(frame);

  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 14 }}>
      {tiles.map((part, i) => {
        const d = delay + i * step;
        // Bakar: gradien isi bergerak naik setelah tile mendarat + hold.
        const burn = ease(frame, [d + sec(0.25, fps), d + sec(0.9, fps)], [0, 1]);
        return (
          <div key={i} style={{ ...entrance(frame, fps, d, { preset: "snappy", rise: 40 }), width: W, height: H + 34 }}>
            <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible", transform: `translateY(${b.y * (i % 2 ? 1 : -1)}px)` }}>
              <defs>
                <linearGradient id={`burn-${i}`} x1="0" y1="1" x2="0" y2="0">
                  <stop offset={0} stopColor={theme.colors.accent} stopOpacity={0.85} />
                  <stop offset={burn} stopColor={theme.colors.accent} stopOpacity={0.55} />
                  <stop offset={Math.min(1, burn + 0.02)} stopColor={theme.colors.peat} stopOpacity={0.9} />
                  <stop offset={1} stopColor={theme.colors.peat} stopOpacity={0.9} />
                </linearGradient>
                <clipPath id={`half-${i}`}>
                  <rect x={0} y={0} width={W * part} height={H} />
                </clipPath>
              </defs>
              {part < 1 ? <path d={path} fill="none" stroke={theme.colors.line} strokeWidth={2} strokeDasharray="6 8" /> : null}
              <path
                d={path}
                clipPath={`url(#half-${i})`}
                fill={`url(#burn-${i})`}
                stroke={withAlpha(theme.colors.text, 0.5)}
                strokeWidth={2}
              />
            </svg>
            <div
              style={{
                marginTop: 8,
                textAlign: "center",
                fontFamily: theme.fonts.mono,
                fontWeight: 600,
                fontSize: 18,
                letterSpacing: "0.14em",
                color: theme.colors.textDim,
              }}
            >
              {part < 1 ? "½ BALI" : `BALI ${i + 1}`}
            </div>
          </div>
        );
      })}
    </div>
  );
};
