import { useMemo } from "react";
import * as THREE from "three";
import { theme } from "../theme";
import { fullscreenVertex, smokeFragment } from "./shaders";

/** Kabut asap volumetrik-palsu: fBm noise ber-domain-warp yang naik pelan. */
export const SmokeVeil: React.FC<{ time: number; density: number; aspect: number }> = ({ time, density, aspect }) => {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: fullscreenVertex,
        fragmentShader: smokeFragment,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        uniforms: {
          uTime: { value: 0 },
          uDensity: { value: 0 },
          uAspect: { value: 1 },
          uDark: { value: new THREE.Color(theme.colors.bgAlt) },
          uLight: { value: new THREE.Color(theme.colors.smoke) },
          uGlow: { value: new THREE.Color(theme.colors.primary) },
        },
      }),
    [],
  );
  material.uniforms.uTime!.value = time;
  material.uniforms.uDensity!.value = density;
  material.uniforms.uAspect!.value = aspect;

  return (
    <mesh frustumCulled={false} renderOrder={2} material={material} visible={density > 0.001}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  );
};
