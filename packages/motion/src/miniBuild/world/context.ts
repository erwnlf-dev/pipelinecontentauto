import * as THREE from "three";
import type { Clock } from "../plan";
import { buildTheme } from "../theme";
import {
  baseTopTexture,
  hazardTexture,
  lightboxTexture,
  matTexture,
  parkingTexture,
  posterTexture,
  productTexture,
  signTexture,
} from "../textures";

const C = buildTheme.colors;

export interface Lights {
  sign: number;
  interior: number;
  lamp: number;
}

export interface WorldCtx {
  frame: number;
  clock: Clock;
  night: number;
  lights: Lights;
  mat: Materials;
}

const std = (p: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(p);

/** Semua material dibuat sekali (setelah font siap); intensitas emissive diubah per frame. */
export function createMaterials() {
  const mat = matTexture();
  mat.repeat.set(22, 22);
  const sign = signTexture();
  const lightbox = lightboxTexture();
  return {
    mat: std({ map: mat, roughness: 0.92 }),
    baseTop: std({ map: baseTopTexture(), roughness: 0.85 }),
    baseSide: std({ color: C.concreteDark, roughness: 0.9 }),
    wall: std({ color: C.wall, roughness: 0.8 }),
    trim: std({ color: C.trim, roughness: 0.45 }),
    glass: std({ color: C.glass, transparent: true, opacity: 0.2, roughness: 0.04, metalness: 0.1, envMapIntensity: 1.6, depthWrite: false }),
    metal: std({ color: C.metal, metalness: 0.92, roughness: 0.22 }),
    metalDark: std({ color: C.metalDark, metalness: 0.7, roughness: 0.4 }),
    rubber: std({ color: "#202326", roughness: 0.7 }),
    sign: std({ map: sign, emissiveMap: sign, emissive: new THREE.Color("#ffffff"), emissiveIntensity: 0, roughness: 0.5 }),
    lightbox: std({ map: lightbox, emissiveMap: lightbox, emissive: new THREE.Color("#ffffff"), emissiveIntensity: 0, roughness: 0.5 }),
    posters: [
      std({ map: posterTexture("PROMO", "HEMAT!", C.signRed, C.signCream), roughness: 0.6 }),
      std({ map: posterTexture("KOPI", "5RB", C.hazardYellow, C.hazardBlack), roughness: 0.6 }),
      std({ map: posterTexture("BARU", "SNACK", C.trim, C.signCream), roughness: 0.6 }),
    ],
    parking: std({ map: parkingTexture(), roughness: 0.5 }),
    hazard: std({ map: hazardTexture(), roughness: 0.7 }),
    product: std({ map: productTexture(), roughness: 0.55 }),
    bottle: std({ roughness: 0.25, metalness: 0.05 }),
    glowPanel: std({ color: "#ffffff", emissive: new THREE.Color(C.warmLight), emissiveIntensity: 0, roughness: 0.4 }),
    fridgeGlow: std({ color: "#dfefff", emissive: new THREE.Color("#E8F4FF"), emissiveIntensity: 0, roughness: 0.4 }),
    bulb: std({ color: "#fff3d6", emissive: new THREE.Color(C.warmLight), emissiveIntensity: 0, roughness: 0.3 }),
    leaf: std({ color: C.leaf, roughness: 0.8 }),
    pot: std({ color: "#B5653D", roughness: 0.85 }),
    bin: std({ color: "#2F4A3A", roughness: 0.6 }),
    ring: new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0, depthWrite: false }),
  };
}

export type Materials = ReturnType<typeof createMaterials>;
