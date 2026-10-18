// theme.ts — satu-satunya sumber warna, easing, spring, font, dan safe zone.
// Jangan inline hex/easing/spring di komponen (aturan #9 claude-remotion-skill).
import { Easing } from "remotion";

export const theme = {
  colors: {
    // Palet "bara malam": base gelap hangat + SATU hero (oranye api) + aksen amber.
    bg: "#0B0706",
    bgAlt: "#1A0F0B",
    primary: "#FF5A1F", // HERO — maksimal satu elemen per frame
    accent: "#FFB347", // bara/amber, dipakai tipis (partikel, garis)
    smoke: "#8C7B70",
    peat: "#3A2418",
    peatDeep: "#1F120C",
    text: "#F6EFE9",
    textDim: "#B8A79B",
    line: "rgba(246, 239, 233, 0.14)",
    glow: "rgba(255, 90, 31, 0.45)",
    shadow: "rgba(0, 0, 0, 0.6)",
  },
  fonts: {
    display: "Archivo", // 800/900, di-bundle lewat @fontsource (offline, deterministik)
    body: "Inter",
    mono: "JetBrains Mono",
  },
  type: {
    hero: { fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1.05 },
    // Reels hero 80–140px @1080 lebar; stat counter boleh lebih besar.
    stat: 260,
    h1: 118,
    h2: 84,
    body: 44,
    label: 30,
  },
  // Easing resmi. Linear dilarang.
  ease: {
    out: Easing.bezier(0.16, 1, 0.3, 1), // easeOutExpo — entrance
    inOut: Easing.bezier(0.83, 0, 0.17, 1), // easeInOutQuint — move, Ken Burns, sweep
    in: Easing.bezier(0.7, 0, 0.84, 0), // exit saja
  },
  // Padanan nama easing GSAP untuk timeline yang di-seek per frame.
  gsapEase: {
    out: "expo.out",
    inOut: "expo.inOut",
    in: "expo.in",
  },
  spring: {
    snappy: { damping: 14, stiffness: 160, mass: 0.6 }, // kata, pop UI
    smooth: { damping: 20, stiffness: 90, mass: 1 }, // blok besar
    bouncy: { damping: 11, stiffness: 170, mass: 0.7 }, // aksen
    counter: { damping: 30, stiffness: 60, mass: 1 }, // angka
  },
  // Durasi relatif dalam detik; dikonversi ke frame lewat fps (aturan #8).
  timing: {
    staggerLine: 5 / 30, // 4–6 frame per baris/kartu
    staggerWord: 3 / 30,
    hold: 18 / 30, // HIT → diam 15–20 frame → build
    exit: 10 / 30, // exit lebih cepat dari entrance (~20 frame)
    sfxLead: 3 / 30, // SFX mendahului visual 2–3 frame
  },
  // Meta Threads & Reels 1080×1920. Teks penting hanya di y 285–1250.
  safe: {
    width: 1080,
    height: 1920,
    top: 285,
    bottom: 1250,
    side: 65,
    // Margin UI platform (bukan area teks): atas 250, bawah 670, samping 65.
    uiTop: 250,
    uiBottom: 670,
  },
} as const;

export type Theme = typeof theme;
