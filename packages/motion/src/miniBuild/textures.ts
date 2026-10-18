import * as THREE from "three";
import { rng } from "../lib/rng";
import { buildTheme } from "./theme";

/**
 * Texture prosedural (canvas 2D → CanvasTexture). Dipanggil setelah font siap
 * (lihat useFonts), jadi teks di papan nama memakai font display yang benar.
 */
const C = buildTheme.colors;
const DISPLAY = buildTheme.fonts.display;

function canvas(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const el = document.createElement("canvas");
  el.width = w;
  el.height = h;
  const g = el.getContext("2d")!;
  draw(g);
  const tex = new THREE.CanvasTexture(el);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** Cutting mat hijau: garis tiap 1 unit, tebal tiap 5, diagonal 45° tipis, angka penggaris. */
export function matTexture(): THREE.CanvasTexture {
  const S = 1024; // 1 tile = 10 unit
  const tex = canvas(S, S, (g) => {
    g.fillStyle = C.mat;
    g.fillRect(0, 0, S, S);
    const r = rng(4);
    for (let i = 0; i < 9000; i++) {
      g.fillStyle = `rgba(255,255,255,${r() * 0.035})`;
      g.fillRect(r() * S, r() * S, 1.5, 1.5);
    }
    const u = S / 10;
    for (let i = 0; i <= 10; i++) {
      const major = i % 5 === 0;
      g.strokeStyle = major ? C.matLineStrong : C.matLine;
      g.globalAlpha = major ? 0.7 : 0.45;
      g.lineWidth = major ? 3 : 1.5;
      g.beginPath();
      g.moveTo(i * u, 0);
      g.lineTo(i * u, S);
      g.moveTo(0, i * u);
      g.lineTo(S, i * u);
      g.stroke();
    }
    g.globalAlpha = 0.18;
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(0, S);
    g.lineTo(S, 0);
    g.stroke();
    g.globalAlpha = 0.55;
    g.fillStyle = C.matLineStrong;
    g.font = `600 22px ${buildTheme.fonts.mono}`;
    for (let i = 1; i < 10; i++) g.fillText(String(i), i * u + 6, 26);
    g.globalAlpha = 1;
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/** Permukaan base plate: beton, lantai keramik di dalam toko, marka parkir, garis kuning-hitam. */
export function baseTopTexture(): THREE.CanvasTexture {
  const { w, d } = buildTheme.world.base;
  const ppu = 100;
  const W = w * ppu;
  const H = d * ppu;
  const fp = buildTheme.world.footprint;
  const X = (x: number) => (x + w / 2) * ppu;
  const Z = (z: number) => (z + d / 2) * ppu;
  return canvas(W, H, (g) => {
    g.fillStyle = C.concrete;
    g.fillRect(0, 0, W, H);
    const r = rng(12);
    for (let i = 0; i < 14000; i++) {
      const v = r();
      g.fillStyle = v > 0.5 ? `rgba(255,255,255,${(v - 0.5) * 0.12})` : `rgba(0,0,0,${v * 0.1})`;
      g.fillRect(r() * W, r() * H, 2, 2);
    }
    // Lantai keramik di dalam footprint.
    g.fillStyle = C.tile;
    g.fillRect(X(fp.x0), Z(fp.z0), (fp.x1 - fp.x0) * ppu, (fp.z1 - fp.z0) * ppu);
    g.strokeStyle = "rgba(0,0,0,0.12)";
    g.lineWidth = 2;
    for (let x = fp.x0; x <= fp.x1; x += 0.75) {
      g.beginPath();
      g.moveTo(X(x), Z(fp.z0));
      g.lineTo(X(x), Z(fp.z1));
      g.stroke();
    }
    for (let z = fp.z0; z <= fp.z1; z += 0.75) {
      g.beginPath();
      g.moveTo(X(fp.x0), Z(z));
      g.lineTo(X(fp.x1), Z(z));
      g.stroke();
    }
    // Marka parkir.
    g.strokeStyle = "rgba(255,255,255,0.85)";
    g.lineWidth = 7;
    for (const x of [-4.2, -1.4, 1.4, 4.2]) {
      g.beginPath();
      g.moveTo(X(x), Z(fp.z1 + 0.9));
      g.lineTo(X(x), Z(d / 2 - 0.55));
      g.stroke();
    }
    // Pita kuning-hitam di tepi depan.
    const y0 = Z(d / 2 - 0.35);
    for (let x = 0; x < W; x += 40) {
      g.fillStyle = (x / 40) % 2 === 0 ? C.hazardYellow : C.hazardBlack;
      g.beginPath();
      g.moveTo(x, y0);
      g.lineTo(x + 40, y0);
      g.lineTo(x + 20, H);
      g.lineTo(x - 20, H);
      g.closePath();
      g.fill();
    }
  });
}

/** Papan nama "WARUNG MINI" — brand fiktif, pita teal & coral. */
export function signTexture(): THREE.CanvasTexture {
  const W = 2048;
  const H = 272;
  return canvas(W, H, (g) => {
    g.fillStyle = C.signCream;
    g.fillRect(0, 0, W, H);
    g.fillStyle = C.trim;
    g.fillRect(0, 0, W, 54);
    g.fillStyle = C.signRed;
    g.fillRect(0, H - 54, W, 54);
    g.fillStyle = C.signCream;
    for (let x = 30; x < W; x += 120) g.fillRect(x, 22, 60, 10);
    // Logo bulat.
    g.fillStyle = C.signRed;
    g.beginPath();
    g.arc(250, H / 2, 74, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = C.signCream;
    g.font = `italic 900 78px ${DISPLAY}`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("WM", 250, H / 2 + 4);
    g.fillStyle = C.trim;
    g.font = `italic 900 150px ${DISPLAY}`;
    g.fillText("WARUNG MINI", W / 2 + 130, H / 2 + 6);
  });
}

/** Lightbox tiang: logo + "24 JAM". */
export function lightboxTexture(): THREE.CanvasTexture {
  return canvas(512, 384, (g) => {
    g.fillStyle = C.signCream;
    g.fillRect(0, 0, 512, 384);
    g.fillStyle = C.trim;
    g.fillRect(0, 0, 512, 60);
    g.fillStyle = C.signRed;
    g.beginPath();
    g.arc(256, 170, 92, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = C.signCream;
    g.font = `italic 900 100px ${DISPLAY}`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("WM", 256, 176);
    g.fillStyle = C.trim;
    g.font = `900 52px ${DISPLAY}`;
    g.fillText("24 JAM", 256, 326);
  });
}

/** Poster promo kecil untuk kaca depan. */
export function posterTexture(title: string, sub: string, bg: string, ink: string): THREE.CanvasTexture {
  return canvas(256, 360, (g) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, 256, 360);
    g.fillStyle = ink;
    g.textAlign = "center";
    g.font = `italic 900 64px ${DISPLAY}`;
    g.fillText(title, 128, 150);
    g.font = `800 34px ${DISPLAY}`;
    g.fillText(sub, 128, 220);
    g.fillRect(40, 270, 176, 14);
  });
}

/** Rambu parkir "P". */
export function parkingTexture(): THREE.CanvasTexture {
  return canvas(256, 256, (g) => {
    g.fillStyle = "#1F5FBF";
    g.fillRect(0, 0, 256, 256);
    g.strokeStyle = "#FFFFFF";
    g.lineWidth = 12;
    g.strokeRect(14, 14, 228, 228);
    g.fillStyle = "#FFFFFF";
    g.font = `900 190px ${DISPLAY}`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("P", 128, 140);
  });
}

/** Label kemasan produk: putih dengan pita — dikalikan warna instance. */
export function productTexture(): THREE.CanvasTexture {
  return canvas(64, 64, (g) => {
    g.fillStyle = "#FFFFFF";
    g.fillRect(0, 0, 64, 64);
    g.fillStyle = "#D9D9D9";
    g.fillRect(0, 22, 64, 20);
    g.fillStyle = "#9A9A9A";
    g.fillRect(8, 28, 30, 8);
  });
}

/** Garis kuning-hitam untuk stopper parkir. */
export function hazardTexture(): THREE.CanvasTexture {
  const tex = canvas(256, 64, (g) => {
    for (let x = -64; x < 320; x += 32) {
      g.fillStyle = ((x + 64) / 32) % 2 === 0 ? C.hazardYellow : C.hazardBlack;
      g.beginPath();
      g.moveTo(x, 64);
      g.lineTo(x + 32, 64);
      g.lineTo(x + 64, 0);
      g.lineTo(x + 32, 0);
      g.closePath();
      g.fill();
    }
  });
  return tex;
}
