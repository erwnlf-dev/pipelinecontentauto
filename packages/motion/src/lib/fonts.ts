import "@fontsource/archivo/800.css";
import "@fontsource/archivo/900.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/jetbrains-mono/600.css";
import { useEffect, useState } from "react";
import { continueRender, delayRender } from "remotion";
import { theme } from "../theme";

const FACES = [
  `800 100px "${theme.fonts.display}"`,
  `900 100px "${theme.fonts.display}"`,
  `500 40px "${theme.fonts.body}"`,
  `600 40px "${theme.fonts.body}"`,
  `600 30px "${theme.fonts.mono}"`,
];

/** Tahan render sampai semua font display/body ter-load (font di-bundle, tanpa jaringan). */
export function useFonts(): void {
  const [handle] = useState(() => delayRender("load fonts"));
  useEffect(() => {
    Promise.all(FACES.map((f) => document.fonts.load(f)))
      .then(() => continueRender(handle))
      .catch((err) => {
        console.error(err);
        continueRender(handle);
      });
  }, [handle]);
}
