import { useMemo } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { ease, springIn } from "../lib/anim";
import { withAlpha } from "../lib/color";
import { BORNEO, HOTSPOT_ZONES, fitProjection, smoothPath } from "../lib/geo";
import { useGsapTimeline } from "../lib/gsap";
import { rng } from "../lib/rng";
import { theme } from "../theme";

const SIZE = 760;

/**
 * Radar satelit di atas siluet Kalimantan. Sweep digerakkan timeline GSAP (expo.inOut,
 * di-seek per frame); titik api muncul (spring) tepat saat sweep melewati sudutnya.
 */
export const RadarScan: React.FC<{ delay: number; hotspots?: number }> = ({ delay, hotspots = 140 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = SIZE / 2;

  const { path, dots } = useMemo(() => {
    const proj = fitProjection(BORNEO, SIZE, SIZE, 120);
    const d = smoothPath(BORNEO.map(proj.project));
    const r = rng(9);
    const total = HOTSPOT_ZONES.reduce((a, z) => a + z.weight, 0);
    const pts = Array.from({ length: hotspots }, () => {
      let pick = r() * total;
      const zone = HOTSPOT_ZONES.find((z) => (pick -= z.weight) <= 0) ?? HOTSPOT_ZONES[0]!;
      const a = r() * Math.PI * 2;
      const m = Math.sqrt(r());
      const [x, y] = proj.project([zone.lon + Math.cos(a) * zone.rLon * m, zone.lat + Math.sin(a) * zone.rLat * m]);
      // Sudut dari jam 12 searah jarum jam, 0..360.
      const angle = ((Math.atan2(x - c, -(y - c)) * 180) / Math.PI + 360) % 360;
      return { x, y, angle, size: 4 + r() * 6, phase: r() * 6 };
    });
    return { path: d, dots: pts };
  }, [hotspots, c]);

  const g = useGsapTimeline(
    { sweep: 0, ring: 0, map: 0 },
    (tl, s) => {
      tl.to(s, { map: 1, duration: 0.7, ease: theme.gsapEase.out }, 0)
        .to(s, { ring: 1, duration: 0.9, ease: theme.gsapEase.out }, 0.05)
        // 1¼ putaran: cepat di tengah, melambat di akhir → hold diam.
        .to(s, { sweep: 450, duration: 1.7, ease: theme.gsapEase.inOut }, 0.15);
    },
    delay,
  );

  const enter = springIn(frame, fps, delay, "smooth");
  const swept = g.sweep;

  return (
    <div
      style={{
        width: SIZE,
        height: SIZE,
        position: "relative",
        opacity: Math.min(1, enter),
        transform: `scale(${0.86 + 0.14 * enter}) translateY(${(1 - enter) * 50}px)`,
      }}
    >
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ overflow: "visible" }}>
        <defs>
          <radialGradient id="radar-bg">
            <stop offset="0%" stopColor={withAlpha(theme.colors.accent, 0.1)} />
            <stop offset="100%" stopColor={withAlpha(theme.colors.bg, 0.6)} />
          </radialGradient>
          <clipPath id="radar-clip">
            <circle cx={c} cy={c} r={c - 4} />
          </clipPath>
        </defs>
        <circle cx={c} cy={c} r={c - 4} fill="url(#radar-bg)" stroke={theme.colors.line} strokeWidth={2} />
        <g clipPath="url(#radar-clip)">
          {[0.25, 0.5, 0.75].map((k, i) => (
            <circle
              key={k}
              cx={c}
              cy={c}
              r={(c - 4) * k * Math.min(1, g.ring * 1.2 - i * 0.1)}
              fill="none"
              stroke={theme.colors.line}
              strokeWidth={1.5}
              strokeDasharray="6 10"
            />
          ))}
          <line x1={c} y1={0} x2={c} y2={SIZE} stroke={theme.colors.line} strokeWidth={1.5} opacity={g.ring} />
          <line x1={0} y1={c} x2={SIZE} y2={c} stroke={theme.colors.line} strokeWidth={1.5} opacity={g.ring} />
          <path
            d={path}
            fill={withAlpha(theme.colors.peat, 0.85)}
            stroke={withAlpha(theme.colors.text, 0.55)}
            strokeWidth={2.5}
            opacity={g.map}
            style={{ transform: `scale(${0.94 + 0.06 * g.map})`, transformOrigin: "50% 50%" }}
          />
          {/* Sweep: wedge 50° dengan ekor memudar. */}
          <g transform={`rotate(${swept} ${c} ${c})`} opacity={swept > 0 && swept < 450 ? 1 : 0.35}>
            {Array.from({ length: 10 }).map((_, i) => {
              const a0 = (-i * 5 * Math.PI) / 180;
              const a1 = (-(i + 1) * 5 * Math.PI) / 180;
              const R = c;
              return (
                <path
                  key={i}
                  d={`M${c},${c} L${c + R * Math.sin(a0)},${c - R * Math.cos(a0)} A${R},${R} 0 0 0 ${c + R * Math.sin(a1)},${c - R * Math.cos(a1)} Z`}
                  fill={withAlpha(theme.colors.accent, 0.22 * (1 - i / 10))}
                />
              );
            })}
            <line x1={c} y1={c} x2={c} y2={0} stroke={theme.colors.accent} strokeWidth={3} />
          </g>
          {dots.map((d, i) => {
            // Muncul saat sweep melewati sudut titik; easing expo.out di atas sudut sweep yang sudah eased.
            const pop = ease(swept - d.angle, [0, 40], [0, 1]);
            const pulse = 1 + Math.sin(frame / 7 + d.phase) * 0.25;
            return (
              <g key={i} opacity={pop}>
                <circle cx={d.x} cy={d.y} r={d.size * 2.6 * pulse} fill={withAlpha(theme.colors.primary, 0.18)} />
                <circle cx={d.x} cy={d.y} r={d.size * (0.6 + 0.4 * pop)} fill={theme.colors.primary} />
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
};
