import type React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { entrance, formatId, springIn } from "../lib/anim";
import { withAlpha } from "../lib/color";
import { theme } from "../theme";

/** Wrapper entrance 3 properti (opacity + translateY + scale). */
export const Enter: React.FC<{
  delay: number;
  preset?: keyof typeof theme.spring;
  rise?: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ delay, preset, rise, style, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return <div style={{ ...entrance(frame, fps, delay, { preset, rise }), ...style }}>{children}</div>;
};

/** Label mono kecil berbingkai — konteks/sumber di atas headline. */
export const Kicker: React.FC<{ text: string; delay: number; dot?: boolean }> = ({ text, delay, dot = true }) => {
  const frame = useCurrentFrame();
  return (
    <Enter delay={delay} preset="snappy" rise={24}>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 16,
          padding: "12px 24px",
          borderRadius: 999,
          border: `2px solid ${theme.colors.line}`,
          background: withAlpha(theme.colors.bg, 0.45),
          fontFamily: theme.fonts.mono,
          fontWeight: 600,
          fontSize: theme.type.label,
          letterSpacing: "0.12em",
          color: theme.colors.textDim,
          textTransform: "uppercase",
        }}
      >
        {dot ? (
          <span
            style={{
              width: 14,
              height: 14,
              borderRadius: 7,
              background: theme.colors.accent,
              opacity: 0.55 + 0.45 * Math.abs(Math.sin(frame / 9)),
            }}
          />
        ) : null}
        {text}
      </div>
    </Enter>
  );
};

/** Headline dengan reveal per baris (stagger `theme.timing.staggerLine`). Satu baris boleh `hero`. */
export const Headline: React.FC<{
  lines: { text: string; hero?: boolean }[];
  delay: number;
  size?: number;
  align?: React.CSSProperties["textAlign"];
}> = ({ lines, delay, size = theme.type.h1, align = "center" }) => {
  const { fps } = useVideoConfig();
  const step = Math.round(theme.timing.staggerLine * fps);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: align === "left" ? "flex-start" : "center" }}>
      {lines.map((l, i) => (
        <Enter key={i} delay={delay + i * step} preset="smooth" rise={56}>
          <div
            style={{
              fontFamily: theme.fonts.display,
              ...theme.type.hero,
              fontSize: size,
              textAlign: align,
              textTransform: "uppercase",
              color: l.hero ? theme.colors.primary : theme.colors.text,
              textShadow: l.hero
                ? `0 0 60px ${withAlpha(theme.colors.primary, 0.45)}, 0 0 120px ${withAlpha(theme.colors.primary, 0.2)}`
                : `0 8px 30px ${theme.colors.shadow}`,
            }}
          >
            {l.text}
          </div>
        </Enter>
      ))}
    </div>
  );
};

/**
 * Stat counter besar: angka naik dengan spring (tabular-nums agar tidak goyang),
 * entrance 3 properti + punch scale. `hero` = warna & glow hero (maks 1 per frame).
 */
export const StatCounter: React.FC<{
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  delay: number;
  size?: number;
  hero?: boolean;
}> = ({ value, decimals = 0, prefix = "", suffix = "", delay, size = theme.type.stat, hero = true }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // Counter selesai dalam ±0,9 s (bukan menggantung di 499.998), lalu diam = hold.
  const count = springIn(frame, fps, delay, "counter", Math.round(0.9 * fps));
  const pop = springIn(frame, fps, delay, "bouncy");
  const raw = interpolate(count, [0, 1], [0, value], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const shown = count > 0.995 ? value : raw;
  const color = hero ? theme.colors.primary : theme.colors.text;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        justifyContent: "center",
        gap: 12,
        opacity: Math.min(1, pop * 1.4),
        transform: `translateY(${interpolate(pop, [0, 1], [70, 0])}px) scale(${interpolate(pop, [0, 1], [0.7, 1])})`,
        fontFamily: theme.fonts.display,
        ...theme.type.hero,
        fontVariantNumeric: "tabular-nums",
        color,
        textShadow: hero
          ? `0 0 60px ${withAlpha(theme.colors.primary, 0.5)}, 0 0 140px ${withAlpha(theme.colors.primary, 0.25)}`
          : `0 10px 40px ${theme.colors.shadow}`,
      }}
    >
      {prefix ? <span style={{ fontSize: size * 0.36, color: theme.colors.text }}>{prefix}</span> : null}
      <span style={{ fontSize: size }}>{formatId(shown, decimals)}</span>
      {suffix ? <span style={{ fontSize: size * 0.42 }}>{suffix}</span> : null}
    </div>
  );
};

/** Garis aksen yang "terbakar" dari kiri ke kanan (scaleX dengan spring). */
export const BurnLine: React.FC<{ delay: number; width: number }> = ({ delay, width }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = springIn(frame, fps, delay, "smooth");
  return (
    <div
      style={{
        width,
        height: 6,
        borderRadius: 3,
        transformOrigin: "0% 50%",
        transform: `scaleX(${p})`,
        background: `linear-gradient(90deg, ${withAlpha(theme.colors.accent, 0)}, ${theme.colors.accent} 60%, ${theme.colors.text})`,
        boxShadow: `0 0 24px ${withAlpha(theme.colors.accent, 0.6)}`,
      }}
    />
  );
};
