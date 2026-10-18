import type React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { breathe, exitAt, sec, springIn } from "../lib/anim";
import { withAlpha } from "../lib/color";
import { at, type Clock, STEPS, stepAt } from "./plan";
import { buildTheme } from "./theme";

const C = buildTheme.colors;
const S = buildTheme.safe;

/** HUD atas: "LANGKAH 3/7 · RAK & BARANG" + titik progres. */
const Hud: React.FC<{ clock: Clock }> = ({ clock }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = stepAt(clock, frame);
  const local = frame - clock.starts[s]!;
  const p = springIn(local, fps, 0, "snappy");
  return (
    <div style={{ position: "absolute", top: S.top + 4, left: S.side, right: S.side, display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
      <div
        style={{
          display: "inline-flex",
          gap: 14,
          alignItems: "center",
          padding: "12px 26px",
          borderRadius: 999,
          background: withAlpha(C.bg, 0.6),
          border: `2px solid ${C.line}`,
          fontFamily: buildTheme.fonts.mono,
          fontWeight: 600,
          fontSize: 28,
          letterSpacing: "0.12em",
          color: C.text,
          textTransform: "uppercase",
          opacity: Math.min(1, p * 1.5),
          transform: `translateY(${(1 - p) * 16}px) scale(${0.94 + 0.06 * p})`,
        }}
      >
        <span style={{ color: C.textDim }}>Langkah {s + 1}/7</span>
        <span style={{ width: 6, height: 6, borderRadius: 3, background: C.textDim }} />
        {STEPS[s]!.title}
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        {STEPS.map((_, i) => {
          const done = i < s || (i === s && frame >= at(clock, i, STEPS[i]!.labelAt));
          const fill = i === s ? springIn(frame, fps, Math.round(at(clock, i, STEPS[i]!.labelAt)), "bouncy") : done ? 1 : 0;
          return (
            <div key={i} style={{ width: 44, height: 8, borderRadius: 4, background: C.line, overflow: "hidden" }}>
              <div style={{ width: `${Math.min(1, fill) * 100}%`, height: "100%", borderRadius: 4, background: C.text }} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

/** Judul hook di langkah 1. */
const Title: React.FC<{ clock: Clock }> = ({ clock }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const end = clock.durs[0]!;
  if (frame >= end) return null;
  const e = exitAt(frame, fps, end);
  const lines = ["Bikin", "Warung Mini"];
  return (
    <div style={{ position: "absolute", top: 450, left: S.side, right: S.side, display: "flex", flexDirection: "column", alignItems: "center", opacity: e.opacity, transform: `translateY(${e.y}px)` }}>
      {lines.map((t, i) => {
        const p = springIn(frame, fps, 1 + i * 5, "smooth");
        return (
          <div
            key={t}
            style={{
              fontFamily: buildTheme.fonts.display,
              ...buildTheme.type.hero,
              fontSize: i === 0 ? 84 : 116,
              textTransform: "uppercase",
              color: C.text,
              textShadow: `0 10px 40px ${C.shadow}`,
              opacity: Math.min(1, p),
              transform: `translateY(${(1 - p) * 50}px) scale(${0.9 + 0.1 * p})`,
            }}
          >
            {t}
          </div>
        );
      })}
    </div>
  );
};

/** Label aksi gaya komik (hero kuning, outline hitam) + garis aksi berstagger. */
const ActionLabel: React.FC<{ text: string; start: number; end: number; top: number; tilt: number }> = ({ text, start, end, top, tilt }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < start - 1 || frame >= end) return null;
  const p = springIn(frame, fps, start, "bouncy");
  // Exit 6 frame (lebih cepat dari entrance ±15 frame), easing in.
  const out = interpolate(frame, [end - 6, end], [0, 1], { easing: buildTheme.ease.in, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const e = { opacity: 1 - out, y: -36 * out };
  const b = breathe(frame);
  return (
    <div
      style={{
        position: "absolute",
        top,
        right: S.side + 10,
        opacity: Math.min(1, p * 1.6) * e.opacity,
        transform: `translateY(${(1 - p) * 60 + e.y}px) scale(${(0.4 + 0.6 * p) * b.scale}) rotate(${tilt + (1 - p) * -12}deg)`,
        transformOrigin: "80% 60%",
      }}
    >
      <div style={{ position: "absolute", left: -46, top: -30 }}>
        {[0, 1, 2].map((i) => {
          const q = springIn(frame, fps, start + 2 + i * 2, "snappy");
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: 0,
                top: 20 + i * 30,
                width: 46 * q,
                height: 9,
                borderRadius: 5,
                background: C.label,
                border: `3px solid ${C.labelInk}`,
                transform: `rotate(${-28 + i * 28}deg)`,
                transformOrigin: "100% 50%",
              }}
            />
          );
        })}
      </div>
      <div
        style={{
          fontFamily: buildTheme.fonts.display,
          fontStyle: "italic",
          fontWeight: 900,
          fontSize: 132,
          letterSpacing: "-0.02em",
          lineHeight: 1,
          color: C.label,
          WebkitTextStroke: `12px ${C.labelInk}`,
          paintOrder: "stroke fill",
          textShadow: `0 10px 0 ${C.labelInk}, 0 18px 40px ${C.shadow}`,
        }}
      >
        {text}
      </div>
    </div>
  );
};

/** Badge FINISH! di akhir (bukan hero: merah tanpa glow). */
const FinishBadge: React.FC<{ start: number }> = ({ start }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < start) return null;
  const p = springIn(frame, fps, start, "bouncy");
  return (
    <div style={{ position: "absolute", top: S.bottom - 130, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
      <div
        style={{
          padding: "18px 48px",
          borderRadius: 22,
          background: buildTheme.colors.signRed,
          border: `5px solid ${C.text}`,
          fontFamily: buildTheme.fonts.display,
          fontStyle: "italic",
          fontWeight: 900,
          fontSize: 64,
          color: C.text,
          opacity: Math.min(1, p * 1.5),
          transform: `translateY(${(1 - p) * 40}px) scale(${0.6 + 0.4 * p}) rotate(${interpolate(p, [0, 1], [6, -2])}deg)`,
        }}
      >
        FINISH!
      </div>
    </div>
  );
};

/** Layer 3 — tipografi: HUD, judul hook, label aksi ASMR per langkah. */
export const Overlay: React.FC<{ clock: Clock }> = ({ clock }) => {
  const { fps } = useVideoConfig();
  const last = STEPS.length - 1;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <Hud clock={clock} />
      <Title clock={clock} />
      {STEPS.map((st, i) => {
        const start = Math.round(at(clock, i, st.labelAt));
        // Label minimal tampil 0,5 s — di tempo 8 s boleh melewati cut ke shot berikutnya.
        // …tapi selalu berhenti saat label berikutnya muncul agar tidak bertumpuk.
        const next = i === last ? Infinity : Math.round(at(clock, i + 1, STEPS[i + 1]!.labelAt));
        const end = i === last ? clock.total + 6 : Math.min(next, Math.max(clock.starts[i]! + clock.durs[i]!, start + sec(0.5, fps)));
        // Finale: label lebih tinggi, badge FINISH! di bawah.
        return <ActionLabel key={st.id} text={st.label} start={start} end={end} top={i === last ? 900 : 1010} tilt={i % 2 ? 6 : -7} />;
      })}
      <FinishBadge start={Math.round(at(clock, last, STEPS[last]!.labelAt)) + sec(0.25, fps)} />
    </AbsoluteFill>
  );
};
