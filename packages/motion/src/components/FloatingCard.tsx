import type React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { breathe, springIn } from "../lib/anim";
import { withAlpha } from "../lib/color";
import { theme } from "../theme";

/**
 * Kartu 3D melayang (CSS perspective). Masuk dengan 3 properti + rotateX dari bawah,
 * lalu "bernapas" (rotasi & float sinus) selama tampil.
 */
export const FloatingCard: React.FC<{
  delay: number;
  icon?: React.ReactNode;
  title: string;
  sub?: string;
  tilt?: number;
  phase?: number;
  width?: number;
}> = ({ delay, icon, title, sub, tilt = 0, phase = 0, width = 900 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = springIn(frame, fps, delay, "smooth");
  const b = breathe(frame, phase);
  const rotX = interpolate(p, [0, 1], [55, 8]) + b.rot * 2;
  const rotY = tilt + Math.sin(frame / 37 + phase) * 4;
  return (
    <div style={{ perspective: 1400, width }}>
      <div
        style={{
          opacity: Math.min(1, p * 1.3),
          transform: `translateY(${interpolate(p, [0, 1], [90, 0]) + b.y}px) scale(${interpolate(p, [0, 1], [0.86, 1]) * b.scale}) rotateX(${rotX}deg) rotateY(${rotY}deg)`,
          transformStyle: "preserve-3d",
          display: "flex",
          alignItems: "center",
          gap: 32,
          padding: "34px 40px",
          borderRadius: 32,
          background: `linear-gradient(135deg, ${withAlpha(theme.colors.bgAlt, 0.88)}, ${withAlpha(theme.colors.bg, 0.72)})`,
          border: `1.5px solid ${theme.colors.line}`,
          boxShadow: `0 40px 80px -20px ${theme.colors.shadow}, inset 0 1px 0 ${withAlpha(theme.colors.text, 0.08)}`,
          backdropFilter: "blur(14px)",
        }}
      >
        {icon ? (
          <div
            style={{
              width: 116,
              height: 116,
              flexShrink: 0,
              borderRadius: 26,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: withAlpha(theme.colors.accent, 0.12),
              border: `1.5px solid ${withAlpha(theme.colors.accent, 0.35)}`,
            }}
          >
            {icon}
          </div>
        ) : null}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div
            style={{
              fontFamily: theme.fonts.display,
              ...theme.type.hero,
              fontWeight: 800,
              fontSize: 58,
              color: theme.colors.text,
              textTransform: "uppercase",
            }}
          >
            {title}
          </div>
          {sub ? (
            <div style={{ fontFamily: theme.fonts.body, fontWeight: 500, fontSize: 34, color: theme.colors.textDim }}>{sub}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
