import type React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { withAlpha } from "../lib/color";
import { theme } from "../theme";

/** Layer 1 — gradient mesh yang bergerak pelan. `heat` 0..1 mengatur seberapa "membara" latarnya. */
export const BgMesh: React.FC<{ heat: number }> = ({ heat }) => {
  const frame = useCurrentFrame();
  const d1 = Math.sin(frame / 55) * 60;
  const d2 = Math.cos(frame / 70) * 45;
  const d3 = Math.sin(frame / 90) * 30;
  const c = theme.colors;
  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, ${c.bg} 0%, ${c.bgAlt} 100%)` }}>
      <div
        style={{
          position: "absolute",
          width: 1400,
          height: 1400,
          borderRadius: "50%",
          top: -520,
          left: -420 + d1,
          filter: "blur(60px)",
          background: `radial-gradient(circle, ${withAlpha(c.primary, 0.1 + 0.22 * heat)}, transparent 62%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 1100,
          height: 1100,
          borderRadius: "50%",
          bottom: -380,
          right: -360 - d2,
          filter: "blur(80px)",
          background: `radial-gradient(circle, ${withAlpha(c.accent, 0.06 + 0.16 * heat)}, transparent 65%)`,
        }}
      />
      {/* Cahaya bara dari "tanah" di bawah frame. */}
      <div
        style={{
          position: "absolute",
          width: 1800,
          height: 900,
          left: -360 + d3,
          bottom: -560,
          borderRadius: "50%",
          filter: "blur(90px)",
          background: `radial-gradient(ellipse, ${withAlpha(c.primary, 0.08 + 0.3 * heat)}, transparent 70%)`,
        }}
      />
    </AbsoluteFill>
  );
};

/** Layer 4 — color grade: menyatukan semua elemen ke satu look hangat-sinematik. */
export const Grade: React.FC<{ strength?: number }> = ({ strength = 1 }) => (
  <AbsoluteFill style={{ pointerEvents: "none" }}>
    <AbsoluteFill style={{ backgroundColor: theme.colors.primary, mixBlendMode: "soft-light", opacity: 0.2 * strength }} />
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${withAlpha(theme.colors.bg, 0.35)} 0%, transparent 22%, transparent 70%, ${withAlpha(theme.colors.bg, 0.55)} 100%)`,
      }}
    />
  </AbsoluteFill>
);

const NOISE = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='220' height='220' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")`;

/** Layer 5a — grain prosedural (tanpa file asset), posisi bergeser tiap frame = film flicker. */
export const Grain: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        backgroundImage: NOISE,
        backgroundSize: "220px",
        backgroundPosition: `${(frame * 7) % 220}px ${(frame * 13) % 220}px`,
        opacity: 0.09,
        mixBlendMode: "overlay",
      }}
    />
  );
};

/** Layer 5b — vignette, paling atas. */
export const Vignette: React.FC = () => (
  <AbsoluteFill
    style={{
      pointerEvents: "none",
      background: `radial-gradient(ellipse at center, transparent 52%, ${withAlpha(theme.colors.bg, 0.55)} 100%)`,
    }}
  />
);

/** Panduan safe zone Threads/Reels untuk QA (dimatikan saat render final). */
export const SafeZoneGuide: React.FC = () => {
  const s = theme.safe;
  const band = (top: number, height: number): React.CSSProperties => ({
    position: "absolute",
    left: 0,
    right: 0,
    top,
    height,
    background: "rgba(255, 0, 80, 0.18)",
  });
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={band(0, s.uiTop)} />
      <div style={band(s.height - s.uiBottom, s.uiBottom)} />
      <div
        style={{
          position: "absolute",
          left: s.side,
          right: s.side,
          top: s.top,
          height: s.bottom - s.top,
          border: "3px dashed rgba(0, 255, 160, 0.8)",
        }}
      />
    </AbsoluteFill>
  );
};
