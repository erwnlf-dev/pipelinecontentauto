import { useMemo } from "react";
import { useCurrentFrame } from "remotion";
import { withAlpha } from "../lib/color";
import { useGsapTimeline } from "../lib/gsap";
import { rng } from "../lib/rng";
import { theme } from "../theme";

const W = 1080;
const H = 640;
const SURFACE = 200;

/**
 * Penampang lahan gambut. Timeline GSAP (di-seek per frame):
 *  beat A (0)      : pohon hangus + permukaan
 *  beat B (diveAt) : "kamera menyelam" — penampang naik, strata gambut terbuka, bara menjalar di bawah tanah
 *  beat C (dimAt)  : penampang meredup agar kartu teks terbaca
 */
export const PeatSection: React.FC<{ delay: number; diveAt: number; dimAt: number }> = ({ delay, diveAt, dimAt }) => {
  const frame = useCurrentFrame();
  const g = useGsapTimeline(
    { ground: 0, trees: 0, dive: 0, strata: 0, front: 0, ruler: 0, dim: 0 },
    (tl, s) => {
      tl.to(s, { ground: 1, duration: 0.6 }, 0)
        .to(s, { trees: 1, duration: 0.8 }, 0.1)
        .to(s, { dive: 1, duration: 0.9, ease: "expo.inOut" }, diveAt)
        .to(s, { strata: 1, duration: 0.8 }, diveAt + 0.15)
        .to(s, { ruler: 1, duration: 0.6 }, diveAt + 0.6)
        .to(s, { front: 1, duration: 2.6, ease: "expo.out" }, diveAt + 0.3)
        .to(s, { dim: 1, duration: 0.5 }, dimAt);
    },
    delay,
  );

  const trees = useMemo(() => {
    const r = rng(31);
    return Array.from({ length: 9 }, (_, i) => ({
      x: 60 + i * 120 + (r() - 0.5) * 40,
      h: 120 + r() * 70,
      lean: (r() - 0.5) * 8,
      branch: 0.45 + r() * 0.25,
    }));
  }, []);

  const veins = useMemo(() => {
    const r = rng(77);
    return Array.from({ length: 7 }, (_, i) => {
      const y0 = SURFACE + 60 + i * 50 + r() * 20;
      const pts: string[] = [];
      for (let x = -20; x <= W + 40; x += 60) pts.push(`${x},${(y0 + Math.sin(x / 90 + i) * 18 + (r() - 0.5) * 14).toFixed(1)}`);
      return { d: `M${pts.join(" L")}`, w: 3 + r() * 5, phase: r() * 6 };
    });
  }, []);

  const lift = -150 * g.dive;
  const flicker = (p: number) => 0.75 + 0.25 * Math.sin(frame / 5 + p);

  return (
    <div style={{ width: W, height: H, position: "relative", opacity: 1 - 0.55 * g.dim, filter: `saturate(${1 - 0.3 * g.dim})` }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible", transform: `translateY(${lift}px) scale(${1 + 0.08 * g.dive})`, transformOrigin: "50% 40%" }}>
        <defs>
          <linearGradient id="strata" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={theme.colors.peat} />
            <stop offset="0.55" stopColor={theme.colors.peatDeep} />
            <stop offset="1" stopColor={theme.colors.bg} stopOpacity={0} />
          </linearGradient>
          <clipPath id="front">
            <rect x={0} y={SURFACE} width={W * g.front} height={H} />
          </clipPath>
          <filter id="glow" x="-20%" y="-50%" width="140%" height="200%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>

        {/* Tanah + strata */}
        <rect x={0} y={SURFACE} width={W} height={(H - SURFACE + 160) * g.ground} fill="url(#strata)" />
        {[0.28, 0.52, 0.76].map((k, i) => (
          <line
            key={k}
            x1={0}
            x2={W * g.strata}
            y1={SURFACE + (H - SURFACE + 150) * k}
            y2={SURFACE + (H - SURFACE + 150) * k + (i % 2 ? 8 : -6)}
            stroke={withAlpha(theme.colors.text, 0.08)}
            strokeWidth={2}
            strokeDasharray="14 12"
          />
        ))}

        {/* Bara menjalar di bawah permukaan (dibuka oleh clip "front") */}
        <g clipPath="url(#front)">
          {veins.map((v, i) => (
            <g key={i} opacity={flicker(v.phase)}>
              <path d={v.d} stroke={theme.colors.accent} strokeWidth={v.w * 3} fill="none" filter="url(#glow)" opacity={0.45} />
              <path d={v.d} stroke={theme.colors.accent} strokeWidth={v.w * 0.6} fill="none" strokeLinecap="round" />
            </g>
          ))}
        </g>
        {/* Ujung front bara */}
        <circle
          cx={W * g.front}
          cy={SURFACE + 200}
          r={90 * Math.min(1, g.front * 6) * (1 - g.dim * 0.5)}
          fill={withAlpha(theme.colors.accent, 0.25)}
          filter="url(#glow)"
        />

        {/* Garis permukaan */}
        <line x1={0} x2={W * g.ground} y1={SURFACE} y2={SURFACE} stroke={withAlpha(theme.colors.text, 0.6)} strokeWidth={3} />

        {/* Pohon hangus */}
        {trees.map((t, i) => {
          const p = Math.min(1, Math.max(0, g.trees * 1.6 - i * 0.07));
          const top = SURFACE - t.h * p;
          const bx = t.x + t.lean;
          return (
            <g key={i} stroke={withAlpha(theme.colors.text, 0.75)} strokeWidth={6} strokeLinecap="round" fill="none" opacity={1 - 0.9 * g.dive}>
              <line x1={t.x} y1={SURFACE} x2={bx} y2={top} />
              <line x1={t.x + t.lean * t.branch} y1={SURFACE - t.h * t.branch * p} x2={t.x + t.lean * t.branch + 34 * p} y2={SURFACE - t.h * (t.branch + 0.18) * p} strokeWidth={4} />
              <line x1={t.x + t.lean * 0.7} y1={SURFACE - t.h * 0.7 * p} x2={t.x + t.lean * 0.7 - 26 * p} y2={SURFACE - t.h * 0.84 * p} strokeWidth={3} />
            </g>
          );
        })}

        {/* Penggaris kedalaman */}
        <g opacity={g.ruler} transform={`translate(${W - 120}, ${SURFACE})`}>
          <line x1={0} y1={0} x2={0} y2={380 * g.ruler} stroke={theme.colors.textDim} strokeWidth={2} />
          {[0, 1, 2, 3, 4].map((k) => (
            <line key={k} x1={-14} x2={14} y1={k * 95 * g.ruler} y2={k * 95 * g.ruler} stroke={theme.colors.textDim} strokeWidth={2} />
          ))}
        </g>
      </svg>
      <div
        style={{
          position: "absolute",
          left: 65,
          top: SURFACE + lift + 30,
          opacity: g.strata,
          transform: `translateY(${(1 - g.strata) * 20}px)`,
          fontFamily: theme.fonts.mono,
          fontWeight: 600,
          fontSize: theme.type.label,
          letterSpacing: "0.14em",
          color: theme.colors.textDim,
        }}
      >
        ▼ LAPISAN GAMBUT
      </div>
    </div>
  );
};
