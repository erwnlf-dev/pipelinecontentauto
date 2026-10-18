import type { SfxId } from "./plan";

/**
 * Prompt ElevenLabs `/v1/sound-generation` untuk kit ASMR miniatur.
 * Total ±17 detik audio ≈ ±700 kredit (cukup untuk free tier 10.000 kredit/bulan).
 */
export const SFX_PROMPTS: Record<SfxId, { text: string; durationSec: number; promptInfluence: number; loop?: boolean }> = {
  tap: {
    text: "ASMR close-up: a small thin grey board placed gently on a rubber cutting mat, single soft muted tap, crisp, no music, no voice",
    durationSec: 0.6,
    promptInfluence: 0.75,
  },
  click: {
    text: "ASMR close-up: tiny plastic model pieces snapping together, single crisp small click, no music, no voice",
    durationSec: 0.5,
    promptInfluence: 0.75,
  },
  slide: {
    text: "ASMR close-up: thin clear acrylic panel sliding into a plastic groove, short smooth scrape ending with a soft click, no music",
    durationSec: 0.8,
    promptInfluence: 0.7,
  },
  sticker: {
    text: "ASMR close-up: smoothing a small vinyl sticker flat with a plastic card, soft rubbing squeak, no music, no voice",
    durationSec: 0.9,
    promptInfluence: 0.7,
  },
  pop: {
    text: "ASMR close-up: many tiny cardboard boxes placed quickly on a shelf one after another, soft light rapid taps, no music",
    durationSec: 1.2,
    promptInfluence: 0.7,
  },
  tink: {
    text: "ASMR close-up: a tiny metal pole clicked into place, light bright metallic tink, no music, no voice",
    durationSec: 0.6,
    promptInfluence: 0.75,
  },
  switch: {
    text: "Small light switch click followed by a soft warm electrical hum of lights turning on, no music",
    durationSec: 0.9,
    promptInfluence: 0.7,
  },
  chime: {
    text: "Soft magical sparkle chime, gentle satisfying reveal, short and clean, no voice",
    durationSec: 1.5,
    promptInfluence: 0.6,
  },
  bed: {
    text: "Soft calm lo-fi ambient bed, warm mellow electric piano chords, cozy and satisfying, no drums, no vocals, seamless loop",
    durationSec: 10,
    promptInfluence: 0.45,
    loop: true,
  },
};
