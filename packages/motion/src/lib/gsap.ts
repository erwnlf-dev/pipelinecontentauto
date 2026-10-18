import { gsap } from "gsap";
import { useMemo } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";

/**
 * GSAP di Remotion: timeline dibuat `paused` dan men-tween objek biasa (bukan DOM),
 * lalu di-seek ke `frame / fps` di setiap render. Tidak ada ticker, tidak ada
 * requestAnimationFrame — hasilnya deterministik per frame dan aman dirender paralel.
 * `seek` otomatis clamp ke 0..durasi timeline.
 */
export function useGsapTimeline<T extends Record<string, number>>(
  initial: T,
  build: (tl: gsap.core.Timeline, state: T) => void,
  offsetFrames = 0,
): T {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { tl, state } = useMemo(() => {
    const s = { ...initial };
    const t = gsap.timeline({ paused: true, defaults: { ease: "expo.out" } });
    build(t, s);
    return { tl: t, state: s };
    // build/initial dianggap statis per instance komponen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  tl.seek(Math.max(0, (frame - offsetFrames) / fps), true);
  return { ...state };
}
