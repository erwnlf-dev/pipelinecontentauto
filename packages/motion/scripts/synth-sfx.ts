/**
 * Kit SFX sintetis (WAV 16-bit mono) untuk mode dry — tanpa API, tanpa unduhan,
 * deterministik. Mode live memakai ElevenLabs /v1/sound-generation.
 */
import { writeFileSync } from "node:fs";

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

const GEN: Record<string, () => Float32Array> = {
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

// ── Kit ASMR miniatur (reel Warung Mini) ────────────────────────────────
const asmr: Record<string, () => Float32Array> = {
  tap: () => {
    const n = rng(11);
    const knock = make(0.4, (t) => Math.sin(2 * Math.PI * (180 + 260 * Math.exp(-t * 60)) * t) * Math.exp(-t * 28));
    const tick = lowpass(make(0.4, () => n()), () => 3500).map((v, i) => v * Math.exp(-(i / SR) * 90));
    return knock.map((v, i) => v + tick[i]! * 0.6);
  },
  click: () => {
    const n = rng(12);
    return make(0.25, (t) => {
      const a = t < 0.004 ? n() : 0;
      const b = t > 0.018 && t < 0.022 ? n() * 0.7 : 0;
      return a + b + Math.sin(2 * Math.PI * 4200 * t) * Math.exp(-t * 160) * 0.5;
    });
  },
  slide: () => {
    const n = rng(13);
    const scrape = lowpass(make(0.6, () => n()), (t) => 1800 + 2600 * (t / 0.6)).map((v, i) => {
      const t = i / SR;
      return v * Math.sin(Math.PI * Math.min(1, t / 0.5)) * 0.8 * (t < 0.5 ? 1 : 0);
    });
    return scrape.map((v, i) => {
      const d = i / SR - 0.5;
      return v + (d >= 0 ? Math.sin(2 * Math.PI * 3600 * d) * Math.exp(-d * 140) : 0);
    });
  },
  sticker: () => {
    const n = rng(14);
    return lowpass(make(0.8, () => n()), (t) => 900 + 700 * Math.sin(t * 40)).map((v, i) => {
      const t = i / SR;
      return v * (0.6 + 0.4 * Math.sin(t * 2 * Math.PI * 9)) * Math.sin(Math.PI * (t / 0.8));
    });
  },
  pop: () => {
    const r = rng(15);
    const out = new Float32Array(Math.round(1.0 * SR));
    for (let k = 0; k < 16; k++) {
      const at = Math.floor(((k + r() * 0.6) / 16) * 0.9 * SR);
      const f = 500 + r() * 500;
      for (let j = 0; j < SR * 0.05; j++) out[at + j]! += Math.sin(2 * Math.PI * f * (j / SR)) * Math.exp(-j / (SR * 0.008)) * (0.5 + r() * 0.5);
    }
    return out;
  },
  tink: () => make(0.6, (t) => (Math.sin(2 * Math.PI * 3150 * t) + 0.4 * Math.sin(2 * Math.PI * 6420 * t)) * Math.exp(-t * 9)),
  switch: () => {
    const n = rng(16);
    return make(0.9, (t) => {
      const click = t < 0.006 ? n() : 0;
      const hum = t > 0.04 ? (Math.sin(2 * Math.PI * 100 * t) * 0.5 + Math.sin(2 * Math.PI * 200 * t) * 0.2) * Math.min(1, (t - 0.04) / 0.15) * Math.exp(-(t - 0.04) * 2.5) : 0;
      return click + hum * 0.4;
    });
  },
  chime: () =>
    make(1.6, (t) =>
      [1046.5, 1318.5, 1568, 2093].reduce((sum, f, i) => {
        const d = t - i * 0.07;
        return sum + (d > 0 ? Math.sin(2 * Math.PI * f * d) * Math.exp(-d * 3.2) * 0.4 : 0);
      }, 0),
    ),
  bed: () =>
    make(10, (t) => {
      // Dua akor bergantian (Cmaj7 → Am7), envelope halus agar loop mulus di 10 s.
      const chordA = [261.6, 329.6, 392, 493.9];
      const chordB = [220, 261.6, 329.6, 392];
      const mix = 0.5 - 0.5 * Math.cos((2 * Math.PI * t) / 10);
      const pad = (fs: number[]) => fs.reduce((s2, f) => s2 + Math.sin(2 * Math.PI * f * t) + 0.5 * Math.sin(2 * Math.PI * f * 1.003 * t), 0);
      return (pad(chordA) * (1 - mix) + pad(chordB) * mix) * 0.12;
    }),
};
Object.assign(GEN, asmr);

export function synthSfx(id: string, file: string): void {
  const gen = GEN[id];
  if (!gen) throw new Error(`tidak ada generator sintetis untuk SFX "${id}"`);
  writeFileSync(file, wav(gen()));
}
