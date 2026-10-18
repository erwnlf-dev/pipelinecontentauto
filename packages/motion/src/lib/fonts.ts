import "@fontsource/archivo/800.css";
import "@fontsource/archivo/900.css";
import "@fontsource/archivo/900-italic.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/jetbrains-mono/600.css";
import { useEffect, useState } from "react";
import { continueRender, delayRender } from "remotion";
import { theme } from "../theme";

const FACES = [
  `800 100px "${theme.fonts.display}"`,
  `900 100px "${theme.fonts.display}"`,
  `italic 900 100px "${theme.fonts.display}"`,
  `500 40px "${theme.fonts.body}"`,
  `600 40px "${theme.fonts.body}"`,
  `600 30px "${theme.fonts.mono}"`,
];

/**
 * Tahan render sampai semua font ter-load (font di-bundle, tanpa jaringan).
 * Mengembalikan `ready`: komponen yang menggambar teks ke canvas (texture Three.js)
 * baru di-mount setelah ready. continueRender dipanggil di effect commit yang sama,
 * setelah delayRender milik anak (mis. ThreeCanvas) sudah terdaftar.
 */
export function useFonts(): boolean {
  const [handle] = useState(() => delayRender("load fonts"));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    Promise.all(FACES.map((f) => document.fonts.load(f)))
      .catch((err) => console.error(err))
      .finally(() => setReady(true));
  }, []);
  useEffect(() => {
    if (ready) continueRender(handle);
  }, [ready, handle]);
  return ready;
}
