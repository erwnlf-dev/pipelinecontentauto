/**
 * Kit SFX sintetis (WAV 16-bit mono) untuk mode dry — tanpa API, tanpa unduhan,
 * deterministik. Mode live memakai ElevenLabs /v1/sound-generation.
 */
import { writeFileSync } from "node:fs";
import type { SfxId } from "../src/karhutla/script";

const SR = 44100;

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (((t ^ (t >>> 14)) >>> 0) / 4294967296) * 2 - 1;
  };
}

function wav(samples: Float32Array): Buffer {
  const buf = Buffer.alloc(44 + samples.length * 2);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + samples.length * 2, 4);
  buf.write("WAVEfmt ", 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(samples.length * 2, 40);
  let peak = 1e-6;
  for (const s of samples) peak = Math.max(peak, Math.abs(s));
  const gain = 0.89 / peak;
  samples.forEach((s, i) => buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, s * gain)) * 32767), 44 + i * 2));
  return buf;
}

/** Low-pass satu kutub dengan cutoff yang bisa berubah per sampel. */
function lowpass(x: Float32Array, cutoff: (t: number) => number): Float32Array {
  const y = new Float32Array(x.length);
  let prev = 0;
  for (let i = 0; i < x.length; i++) {
    const a = 1 - Math.exp((-2 * Math.PI * cutoff(i / SR)) / SR);
    prev += a * (x[i]! - prev);
    y[i] = prev;
  }
  return y;
}

function make(sec: number, fn: (t: number, i: number) => number): Float32Array {
  const out = new Float32Array(Math.round(sec * SR));
  for (let i = 0; i < out.length; i++) out[i] = fn(i / SR, i);
  return out;
}

const GEN: Record<SfxId, () => Float32Array> = {
  whoosh: () => {
    const n = rng(1);
    const noise = make(0.9, () => n());
    const env = (t: number) => Math.sin(Math.PI * Math.min(1, t / 0.9)) ** 2;
    return lowpass(noise, (t) => 300 + 5200 * env(t)).map((s, i) => s * env(i / SR));
  },
  riser: () => {
    const n = rng(2);
    const noise = make(2.0, () => n());
    const f = lowpass(noise, (t) => 200 + 6000 * (t / 2) ** 2);
    return f.map((s, i) => {
      const t = i / SR;
      const tone = Math.sin(2 * Math.PI * (110 * t + 220 * t * t)) * 0.4;
      return (s + tone) * (t / 2) ** 1.6;
    });
  },
  impact: () => {
    const n = rng(3);
    return make(1.5, (t) => {
      const f = 38 + 90 * Math.exp(-t * 18);
      const body = Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 3.2);
      const crack = n() * Math.exp(-t * 26) * 0.6;
      return body + crack;
    });
  },
  tick: () =>
    make(1.0, (t) => {
      // Klik makin rapat (counter melaju) — 18 klik dalam 1 detik.
      let s = 0;
      for (let k = 0; k < 18; k++) {
        const at = 1 - Math.sqrt(1 - k / 18);
        const d = t - at;
        if (d >= 0 && d < 0.012) s += Math.sin(2 * Math.PI * 3200 * d) * Math.exp(-d * 500);
      }
      return s * (1 - t * 0.5);
    }),
  ping: () => make(1.0, (t) => Math.sin(2 * Math.PI * 1320 * t) * Math.exp(-t * 7) + Math.sin(2 * Math.PI * 1320 * (t - 0.18)) * (t > 0.18 ? Math.exp(-(t - 0.18) * 9) * 0.3 : 0)),
  crackle: () => {
    const n = rng(5);
    const len = 12;
    const brown = new Float32Array(Math.round(len * SR));
    let b = 0;
    for (let i = 0; i < brown.length; i++) {
      b = (b + 0.02 * n()) * 0.996;
      brown[i] = b * 3;
    }
    const pops = rng(6);
    for (let k = 0; k < 420; k++) {
      const at = Math.floor(((pops() + 1) / 2) * (brown.length - SR * 0.02));
      const amp = 0.2 + 0.8 * Math.abs(pops());
      for (let j = 0; j < SR * 0.012; j++) brown[at + j]! += pops() * amp * Math.exp(-j / (SR * 0.002));
    }
    // Crossfade ujung agar loop mulus.
    const xf = SR * 0.3;
    for (let i = 0; i < xf; i++) {
      const k = i / xf;
      brown[i] = brown[i]! * k + brown[brown.length - xf + i]! * (1 - k);
    }
    return brown.subarray(0, brown.length - xf);
  },
  drone: () =>
    make(24, (t) => {
      const lfo = 0.6 + 0.4 * Math.sin((2 * Math.PI * t) / 12);
      const v = Math.sin(2 * Math.PI * 55 * t) + 0.6 * Math.sin(2 * Math.PI * 55.4 * t) + 0.35 * Math.sin(2 * Math.PI * 82.4 * t) + 0.2 * Math.sin(2 * Math.PI * 110.3 * t);
      return v * lfo;
    }),
};

export function synthSfx(id: SfxId, file: string): void {
  writeFileSync(file, wav(GEN[id]()));
}
