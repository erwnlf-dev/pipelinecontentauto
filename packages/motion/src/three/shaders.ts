/** GLSL untuk @remotion/three. Waktu selalu dari uniform uTime = frame / fps (deterministik). */

export const emberVertex = /* glsl */ `
  attribute vec4 aSeed;
  uniform float uTime;
  uniform float uIntensity;
  uniform float uBurst;
  uniform float uPixelRatio;
  varying float vAlpha;
  varying float vHeat;

  void main() {
    float speed = mix(0.12, 0.34, aSeed.y);
    float life = fract(aSeed.y * 7.13 + aSeed.x * 3.7 + uTime * speed);
    vec3 p;
    p.x = (aSeed.x - 0.5) * 6.0
        + sin(uTime * 0.9 + aSeed.y * 20.0) * 0.45 * life
        + sin(uTime * 2.3 + aSeed.z * 13.0) * 0.06;
    p.y = mix(-5.2, 5.2, life);
    p.z = (aSeed.z - 0.5) * 5.0;

    // Ledakan radial dari tengah frame (payoff), meluruh lewat uBurst 1 → 0.
    vec2 dir = normalize(vec2(aSeed.x - 0.5, aSeed.w - 0.5) + 1e-4);
    p.xy += dir * uBurst * (1.6 + aSeed.z * 3.2);

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;

    float fade = smoothstep(0.0, 0.1, life) * (1.0 - smoothstep(0.6, 1.0, life));
    float visible = smoothstep(aSeed.w - 0.08, aSeed.w, uIntensity);
    float flicker = 0.7 + 0.3 * sin(uTime * 14.0 + aSeed.x * 60.0);
    vAlpha = fade * visible * flicker;
    vHeat = clamp(1.0 - life * 1.3 + aSeed.z * 0.3, 0.0, 1.0);
    gl_PointSize = (7.0 + aSeed.z * 24.0) * uPixelRatio * (9.0 / -mv.z) * (1.0 - life * 0.55);
  }
`;

export const emberFragment = /* glsl */ `
  uniform vec3 uHot;
  uniform vec3 uCool;
  varying float vAlpha;
  varying float vHeat;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    float halo = smoothstep(0.5, 0.0, d);
    float core = smoothstep(0.16, 0.0, d);
    vec3 col = mix(uCool, uHot, vHeat);
    col = mix(col, vec3(1.0, 0.95, 0.85), core * 0.7);
    float a = halo * halo * vAlpha;
    if (a < 0.004) discard;
    gl_FragColor = vec4(col, a);
  }
`;

/** Quad layar penuh: posisi langsung di clip space, tidak terpengaruh kamera. */
export const fullscreenVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

export const smokeFragment = /* glsl */ `
  uniform float uTime;
  uniform float uDensity;
  uniform float uAspect;
  uniform vec3 uDark;
  uniform vec3 uLight;
  uniform vec3 uGlow;
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
    return v;
  }

  void main() {
    vec2 uv = vec2(vUv.x, vUv.y / uAspect);
    vec2 rise = vec2(0.0, -uTime * 0.07);
    vec2 warp = vec2(fbm(uv * 1.6 + uTime * 0.03), fbm(uv * 1.6 - uTime * 0.025 + 4.0));
    float n = fbm(uv * 2.4 + rise + warp * 1.4);
    float bottomHeavy = 0.5 + 0.5 * (1.0 - vUv.y);
    float d = smoothstep(0.32, 0.86, n) * uDensity * bottomHeavy;
    vec3 col = mix(uDark, uLight, smoothstep(0.35, 0.9, n));
    col = mix(col, uGlow, (1.0 - vUv.y) * 0.35 * uDensity);
    gl_FragColor = vec4(col, clamp(d, 0.0, 0.92));
  }
`;
