import { useThree } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import { rng } from "../lib/rng";
import { theme } from "../theme";
import { emberFragment, emberVertex } from "./shaders";

/**
 * Partikel bara api melayang (THREE.Points + shader). Posisi dihitung di GPU dari
 * uTime & seed per partikel — tidak ada state antar frame, jadi tiap frame bisa
 * dirender independen (syarat render paralel Remotion).
 */
export const EmberField: React.FC<{ time: number; intensity: number; burst: number; count?: number }> = ({
  time,
  intensity,
  burst,
  count = 1400,
}) => {
  const dpr = useThree((s) => s.viewport.dpr);
  const geometry = useMemo(() => {
    const r = rng(2015);
    const seeds = new Float32Array(count * 4);
    for (let i = 0; i < seeds.length; i++) seeds[i] = r();
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 4));
    return g;
  }, [count]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: emberVertex,
        fragmentShader: emberFragment,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uIntensity: { value: 0 },
          uBurst: { value: 0 },
          uPixelRatio: { value: 1 },
          uHot: { value: new THREE.Color(theme.colors.accent) },
          uCool: { value: new THREE.Color(theme.colors.primary) },
        },
      }),
    [],
  );

  // Uniform di-set saat render; ThreeCanvas Remotion me-render ulang per frame.
  material.uniforms.uTime!.value = time;
  material.uniforms.uIntensity!.value = intensity;
  material.uniforms.uBurst!.value = burst;
  material.uniforms.uPixelRatio!.value = dpr;

  return <points geometry={geometry} material={material} frustumCulled={false} renderOrder={1} />;
};
