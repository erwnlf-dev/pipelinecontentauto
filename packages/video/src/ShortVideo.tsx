import type { Caption, Motion, Overlay, Timeline, VideoSegment } from "@pca/core";
import { msToFrame } from "@pca/core";
import type React from "react";
import {
  AbsoluteFill,
  Audio,
  Freeze,
  Img,
  OffthreadVideo,
  Sequence,
  interpolate,
  useCurrentFrame,
} from "remotion";

export interface ShortVideoProps {
  timeline: Timeline;
  /** Base URL tempat asset disajikan saat render (mis. http://127.0.0.1:port/). */
  assetBaseUrl: string;
  [key: string]: unknown;
}

const FONT = "Inter, 'DejaVu Sans', Arial, sans-serif";
/** Area aman: hindari ±20% bawah dan ±12% kanan (UI TikTok/Threads). */
const SAFE = { captionTop: "58%", sideLeft: "6%", sideRight: "12%", overlayTop: "11%" };

/** Pita horizontal di dalam area aman; isi di-center dan dibungkus bila terlalu panjang. */
const band = (top: string, opacity = 1): React.CSSProperties => ({
  position: "absolute",
  top,
  left: SAFE.sideLeft,
  right: SAFE.sideRight,
  display: "flex",
  justifyContent: "center",
  opacity,
});

const resolve = (t: Timeline, base: string, assetId: string) => {
  const asset = t.assets[assetId];
  if (!asset) throw new Error(`asset ${assetId} tidak ada di timeline`);
  return /^https?:\/\//.test(asset.key) ? asset.key : new URL(asset.key, base).toString();
};

const span = (fps: number, startMs: number, endMs: number) => {
  const from = msToFrame(startMs, fps);
  return { from, durationInFrames: Math.max(1, msToFrame(endMs, fps) - from) };
};

function kenBurns(motion: Motion, progress: number): string {
  const p = Math.min(1, Math.max(0, progress));
  switch (motion) {
    case "zoomIn":
      return `scale(${1.05 + 0.15 * p})`;
    case "zoomOut":
      return `scale(${1.2 - 0.15 * p})`;
    case "panL":
      return `scale(1.18) translateX(${4 - 8 * p}%)`;
    case "panR":
      return `scale(1.18) translateX(${-4 + 8 * p}%)`;
    case "panU":
      return `scale(1.18) translateY(${4 - 8 * p}%)`;
    case "panD":
      return `scale(1.18) translateY(${-4 + 8 * p}%)`;
    default:
      return "scale(1)";
  }
}

const Segment: React.FC<{ seg: VideoSegment; t: Timeline; base: string; durationInFrames: number }> = ({
  seg,
  t,
  base,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const asset = t.assets[seg.assetId]!;
  const src = resolve(t, base, seg.assetId);
  const transitionFrames = msToFrame(seg.transitionIn.ms, t.fps);

  const opacity =
    seg.transitionIn.type === "fade" && transitionFrames > 0
      ? interpolate(frame, [0, transitionFrames], [0, 1], { extrapolateRight: "clamp" })
      : 1;
  const punch =
    seg.transitionIn.type === "zoom" && transitionFrames > 0
      ? interpolate(frame, [0, transitionFrames], [1.15, 1], { extrapolateRight: "clamp" })
      : 1;
  const origin = `${seg.focus.x * 100}% ${seg.focus.y * 100}%`;

  let media: React.ReactNode;
  if (asset.kind === "image") {
    media = (
      <Img
        src={src}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transformOrigin: origin,
          transform: kenBurns(seg.motion, frame / durationInFrames),
        }}
      />
    );
  } else {
    const startFrom = msToFrame(seg.sourceInMs, t.fps);
    const video = (
      <OffthreadVideo
        src={src}
        muted
        startFrom={startFrom}
        playbackRate={seg.rate}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    );
    // Bila klip habis sebelum segmen selesai, tahan frame terakhir yang tersedia.
    const playable = Math.floor((((asset.durationMs ?? 0) - seg.sourceInMs) / seg.rate / 1000) * t.fps) - 1;
    media = seg.hold && playable > 0 && frame >= playable ? <Freeze frame={playable}>{video}</Freeze> : video;
  }

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <AbsoluteFill style={{ opacity, transform: `scale(${punch})` }}>{media}</AbsoluteFill>
      {/* Gradien bawah tipis agar caption terbaca di atas gambar terang. */}
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0) 25%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.45) 100%)" }} />
    </AbsoluteFill>
  );
};

const CaptionView: React.FC<{ caption: Caption; fps: number }> = ({ caption, fps }) => {
  const frame = useCurrentFrame();
  const nowMs = caption.startMs + (frame / fps) * 1000;
  const pop = interpolate(frame, [0, 4], [0.85, 1], { extrapolateRight: "clamp" });
  return (
    <div style={band(SAFE.captionTop)}>
      <div
        style={{
          maxWidth: "100%",
          fontFamily: FONT,
          fontWeight: 900,
          fontSize: 84,
          lineHeight: 1.1,
          textAlign: "center",
          color: "white",
          transform: `scale(${pop})`,
          WebkitTextStroke: "3px black",
          paintOrder: "stroke fill",
          textShadow: "0 6px 18px rgba(0,0,0,0.55)",
        }}
      >
        {caption.words.map((w, i) => {
          const active = nowMs >= w.startMs && nowMs < w.endMs + 80;
          return (
            <span
              key={i}
              style={{
                color: w.emphasis ? "#FFD60A" : active ? "#7CF5FF" : "white",
                display: "inline-block",
                margin: "0 12px",
                transform: active ? "scale(1.08)" : "none",
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

const OverlayView: React.FC<{ overlay: Overlay; durationInFrames: number }> = ({ overlay, durationInFrames }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 6, durationInFrames - 6, durationInFrames], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const top = overlay.slot === "top" ? SAFE.overlayTop : "38%";
  return (
    <div style={band(top, opacity)}>
      <div
        style={{
          maxWidth: "100%",
          boxSizing: "border-box",
          fontFamily: FONT,
          fontWeight: 900,
          fontSize: 66,
          lineHeight: 1.15,
          textAlign: "center",
          color: "#111",
          background: "#FFD60A",
          padding: "18px 30px",
          borderRadius: 22,
          boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
          textTransform: "uppercase",
        }}
      >
        {overlay.text}
      </div>
    </div>
  );
};

const dbToGain = (db: number) => Math.pow(10, db / 20);

export const ShortVideo: React.FC<ShortVideoProps> = ({ timeline: t, assetBaseUrl }) => {
  const fps = t.fps;
  const rampMs = 150;
  const speechAt = (ms: number) => {
    // 0..1: seberapa "di dalam" rentang bicara (dengan ramp halus).
    let level = 0;
    for (const s of t.speech) {
      if (ms >= s.startMs - rampMs && ms <= s.endMs + rampMs) {
        const inRamp = Math.min(ms - (s.startMs - rampMs), s.endMs + rampMs - ms);
        level = Math.max(level, Math.min(1, inRamp / rampMs));
      }
    }
    return level;
  };

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      {t.video.map((seg, i) => {
        const s = span(fps, seg.startMs, seg.endMs);
        return (
          <Sequence key={`v${i}`} {...s}>
            <Segment seg={seg} t={t} base={assetBaseUrl} durationInFrames={s.durationInFrames} />
          </Sequence>
        );
      })}

      {t.overlays.map((o, i) => {
        const s = span(fps, o.startMs, o.endMs);
        return (
          <Sequence key={`o${i}`} {...s}>
            <OverlayView overlay={o} durationInFrames={s.durationInFrames} />
          </Sequence>
        );
      })}

      {t.captions.map((c, i) => (
        <Sequence key={`c${i}`} {...span(fps, c.startMs, c.endMs)}>
          <CaptionView caption={c} fps={fps} />
        </Sequence>
      ))}

      {t.audio.map((a, i) => {
        const s = span(fps, a.startMs, a.endMs);
        const src = resolve(t, assetBaseUrl, a.assetId);
        if (a.role === "voice") {
          return (
            <Sequence key={`a${i}`} {...s}>
              <Audio src={src} volume={dbToGain(a.gainDb)} />
            </Sequence>
          );
        }
        return (
          <Sequence key={`a${i}`} {...s}>
            <Audio
              src={src}
              loop={a.loop}
              volume={(f) => {
                const ms = a.startMs + (f / fps) * 1000;
                const duck = (a.duckDb ?? 0) * speechAt(ms);
                const fadeOut = interpolate(f, [s.durationInFrames - fps, s.durationInFrames], [1, 0], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                });
                return dbToGain(a.gainDb + duck) * fadeOut;
              }}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
