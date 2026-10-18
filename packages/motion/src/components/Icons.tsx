import { theme } from "../theme";

/** Ikon garis SVG berwarna theme (tanpa emoji — emoji merusak palet). */
const stroke = { fill: "none", stroke: theme.colors.accent, strokeWidth: 5, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export const SchoolIcon: React.FC = () => (
  <svg width={70} height={70} viewBox="0 0 70 70">
    <path {...stroke} d="M8 30 L35 12 L62 30" />
    <path {...stroke} d="M14 28 V60 H56 V28" />
    <path {...stroke} d="M29 60 V44 H41 V60" />
    <path {...stroke} d="M35 12 V4 H46" />
  </svg>
);

export const PlaneIcon: React.FC = () => (
  <svg width={70} height={70} viewBox="0 0 70 70">
    <path {...stroke} d="M8 40 L62 22 M30 33 L22 12 L30 10 L44 28 M38 45 L44 60 L36 62 L28 42 M14 38 L8 28 L13 26 L20 34" />
  </svg>
);

export const ShareIcon: React.FC<{ color?: string }> = ({ color = theme.colors.bg }) => (
  <svg width={54} height={54} viewBox="0 0 54 54">
    <path d="M27 6 V34 M15 18 L27 6 L39 18" fill="none" stroke={color} strokeWidth={5.5} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M10 28 V46 H44 V28" fill="none" stroke={color} strokeWidth={5.5} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const BookmarkIcon: React.FC = () => (
  <svg width={44} height={44} viewBox="0 0 44 44">
    <path d="M11 6 H33 V38 L22 30 L11 38 Z" fill="none" stroke={theme.colors.text} strokeWidth={4.5} strokeLinejoin="round" />
  </svg>
);
