import type React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { exitAt } from "../../lib/anim";
import { theme } from "../../theme";

export interface SceneProps {
  /** Awal tiap beat relatif awal scene (frame). */
  beats: number[];
  beatDurs: number[];
  dur: number;
}

/** Exit cepat (~10 frame, easing in) di akhir rentang `end` — dipakai beat & scene. */
export const Exit: React.FC<{ end: number; children: React.ReactNode; disabled?: boolean }> = ({ end, children, disabled }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const e = disabled ? { opacity: 1, y: 0, scale: 1, blur: 0 } : exitAt(frame, fps, end);
  return (
    <AbsoluteFill style={{ opacity: e.opacity, transform: `translateY(${e.y}px) scale(${e.scale})`, filter: e.blur > 0.05 ? `blur(${e.blur}px)` : undefined }}>
      {children}
    </AbsoluteFill>
  );
};

/** Satu beat = Sequence lokal (frame mulai 0) + exit di akhir beat. */
export const BeatSlot: React.FC<{ from: number; dur: number; children: React.ReactNode; keepExit?: boolean }> = ({
  from,
  dur,
  children,
  keepExit,
}) => (
  <Sequence from={from} durationInFrames={dur} layout="none">
    <Exit end={dur} disabled={keepExit}>
      {children}
    </Exit>
  </Sequence>
);

/** Kolom terpusat dengan posisi y absolut — semua teks wajib di dalam safe zone (y 285–1250, sisi 65). */
export const Block: React.FC<{ top: number; gap?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({
  top,
  gap = 24,
  children,
  style,
}) => (
  <div
    style={{
      position: "absolute",
      top,
      left: theme.safe.side,
      right: theme.safe.side,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap,
      ...style,
    }}
  >
    {children}
  </div>
);

/** Grafik non-teks boleh melebar penuh; tetap dipusatkan horizontal. */
export const Center: React.FC<{ top: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ top, children, style }) => (
  <div style={{ position: "absolute", top, left: 0, right: 0, display: "flex", justifyContent: "center", ...style }}>{children}</div>
);
