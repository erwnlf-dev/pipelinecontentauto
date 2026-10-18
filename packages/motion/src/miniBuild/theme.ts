// Palet & preset khusus reel "Warung Mini" (miniatur ASMR). Easing/spring/font tetap dari theme utama.
import { Easing } from "remotion";
import { theme } from "../theme";

export const buildTheme = {
  ...theme,
  colors: {
    bg: "#151B1D",
    bgNight: "#090C0E",
    mat: "#2C5A4A",
    matLine: "#5E8F7C",
    matLineStrong: "#9BC2B0",
    concrete: "#A9A59C",
    concreteDark: "#8F8B83",
    tile: "#DCD6CA",
    wall: "#E9E2D4",
    trim: "#0F6E68", // teal — identitas Warung Mini
    signRed: "#E8553A", // coral
    signCream: "#FFF4DC",
    hazardYellow: "#F4C430",
    hazardBlack: "#1C1C1C",
    metal: "#C9CED3",
    metalDark: "#5B6168",
    glass: "#BFE3F0",
    warmLight: "#FFD9A0",
    leaf: "#3E8E4F",
    label: "#FFD23F", // HERO — label aksi ASMR, maks satu per frame
    labelInk: "#141414",
    text: "#F7F4EE",
    textDim: "#B9C2C0",
    line: "rgba(247, 244, 238, 0.16)",
    shadow: "rgba(0, 0, 0, 0.55)",
  },
  products: ["#E8553A", "#F4C430", "#2F80ED", "#27AE60", "#EB5757", "#9B51E0", "#F2994A", "#56CCF2", "#FFFFFF"],
  ease: {
    ...theme.ease,
    // Penempatan presisi: mulai lembut, melambat halus sampai menyentuh permukaan.
    place: Easing.bezier(0.45, 0, 0.2, 1),
  },
  // Ukuran dunia (1 unit ≈ 1 cm miniatur).
  world: {
    base: { w: 12, h: 0.4, d: 9 },
    wallH: 4.2,
    wallT: 0.22,
    footprint: { x0: -4.5, x1: 4.5, z0: -4, z1: 1.4 },
  },
} as const;

export type BuildTheme = typeof buildTheme;
