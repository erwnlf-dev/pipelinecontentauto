/**
 * Naskah voiceover "Karhutla Kalimantan" — 1 beat = 1 kalimat = 1 klip TTS.
 * `display` tampil di caption; `spoken` dikirim ke ElevenLabs dengan angka,
 * mata uang, dan singkatan ditulis seperti diucapkan (fonetik verbal).
 * `claimIds` menunjuk SOURCES di bawah — jalankan fact-check repo sebelum publish.
 */

export type SceneId = "hook" | "scale" | "peat" | "haze" | "cost" | "cta";
export type SfxId = "whoosh" | "riser" | "impact" | "tick" | "ping" | "crackle" | "drone";

export interface Beat {
  id: string;
  scene: SceneId;
  display: string;
  spoken: string;
  /** Kata display (tanpa tanda baca) yang diberi penekanan di caption. */
  emphasis: string[];
  claimIds: string[];
  /** Durasi minimum beat (detik). Visual berganti tiap 2.5–3.5 s. */
  minSec: number;
  /** SFX yang dipicu di awal beat (offset detik relatif awal beat; negatif = mendahului cut). */
  sfx: { id: SfxId; at: number; volume: number }[];
}

export const TITLE = "Karhutla Kalimantan";

export const BEATS: Beat[] = [
  {
    id: "hook",
    scene: "hook",
    display: "2,6 juta hektare. Hangus.",
    spoken: "Dua koma enam juta hektare. Hangus.",
    emphasis: ["2,6", "Hangus"],
    claimIds: ["c-area-2015"],
    minSec: 3.0,
    sfx: [
      { id: "impact", at: 0.0, volume: 0.9 },
      { id: "tick", at: 0.15, volume: 0.35 },
    ],
  },
  {
    id: "scale-bali",
    scene: "scale",
    display: "4,5 kali luas Pulau Bali.",
    spoken: "Empat setengah kali luas Pulau Bali.",
    emphasis: ["4,5", "Bali"],
    claimIds: ["c-area-2015", "c-bali-area"],
    minSec: 2.7,
    sfx: [{ id: "whoosh", at: -0.1, volume: 0.6 }],
  },
  {
    id: "scale-radar",
    scene: "scale",
    display: "Satelit merekam ribuan titik api.",
    spoken: "Satelit merekam ribuan titik api.",
    emphasis: ["ribuan"],
    claimIds: ["c-hotspots-2015"],
    minSec: 3.0,
    sfx: [
      { id: "whoosh", at: -0.1, volume: 0.45 },
      { id: "ping", at: 0.35, volume: 0.5 },
      { id: "ping", at: 1.55, volume: 0.4 },
    ],
  },
  {
    id: "peat-trees",
    scene: "peat",
    display: "Yang terbakar bukan cuma pohon.",
    spoken: "Yang terbakar, bukan cuma pohon.",
    emphasis: ["pohon"],
    claimIds: ["c-peat-smoulder"],
    minSec: 2.6,
    sfx: [{ id: "whoosh", at: -0.1, volume: 0.6 }],
  },
  {
    id: "peat-under",
    scene: "peat",
    display: "Gambut menyimpan bara di bawah tanah,",
    spoken: "Gambut menyimpan bara di bawah tanah,",
    emphasis: ["Gambut", "bawah"],
    claimIds: ["c-peat-smoulder"],
    minSec: 2.8,
    sfx: [{ id: "riser", at: -0.2, volume: 0.35 }],
  },
  {
    id: "peat-weeks",
    scene: "peat",
    display: "berminggu-minggu, sulit dipadamkan.",
    spoken: "berminggu-minggu, sulit dipadamkan.",
    emphasis: ["berminggu-minggu"],
    claimIds: ["c-peat-smoulder"],
    minSec: 2.6,
    sfx: [{ id: "impact", at: 0.0, volume: 0.45 }],
  },
  {
    id: "haze-cards",
    scene: "haze",
    display: "Asapnya menutup sekolah dan bandara.",
    spoken: "Asapnya, menutup sekolah dan bandara.",
    emphasis: ["sekolah", "bandara"],
    claimIds: ["c-haze-closures"],
    minSec: 2.8,
    sfx: [{ id: "whoosh", at: -0.1, volume: 0.6 }],
  },
  {
    id: "haze-ispa",
    scene: "haze",
    display: "500 ribu lebih warga terkena ISPA.",
    spoken: "Lima ratus ribu lebih warga, terkena ispa.",
    emphasis: ["500", "ISPA"],
    claimIds: ["c-ispa-2015"],
    minSec: 3.0,
    sfx: [
      { id: "impact", at: 0.0, volume: 0.5 },
      { id: "tick", at: 0.1, volume: 0.35 },
    ],
  },
  {
    id: "cost-ask",
    scene: "cost",
    display: "Berapa kerugian ekonominya?",
    spoken: "Lalu, berapa kerugian ekonominya?",
    emphasis: ["kerugian"],
    claimIds: [],
    minSec: 2.6,
    sfx: [
      { id: "whoosh", at: -0.1, volume: 0.5 },
      { id: "riser", at: 0.6, volume: 0.55 },
    ],
  },
  {
    id: "cost-hit",
    scene: "cost",
    display: "Rp221 triliun.",
    spoken: "Dua ratus dua puluh satu triliun rupiah.",
    emphasis: ["Rp221", "triliun"],
    claimIds: ["c-cost-2015"],
    minSec: 3.2,
    sfx: [
      { id: "impact", at: 0.0, volume: 1.0 },
      { id: "tick", at: 0.1, volume: 0.4 },
    ],
  },
  {
    id: "cta-human",
    scene: "cta",
    display: "Hampir semuanya dipicu ulah manusia.",
    spoken: "Hampir semuanya, dipicu ulah manusia.",
    emphasis: ["manusia"],
    claimIds: ["c-human-cause"],
    minSec: 3.0,
    sfx: [{ id: "whoosh", at: -0.1, volume: 0.5 }],
  },
  {
    id: "cta-share",
    scene: "cta",
    display: "Bagikan, biar musim asap tak terulang.",
    spoken: "Bagikan, biar musim asap tak terulang.",
    emphasis: ["Bagikan"],
    claimIds: [],
    minSec: 3.4,
    sfx: [{ id: "ping", at: 0.25, volume: 0.45 }],
  },
];

/**
 * Prompt ElevenLabs `/v1/sound-generation`. `loop: true` untuk bed ambience.
 * Durasi 0.5–30 s; `prompt_influence` tinggi = lebih patuh ke prompt.
 */
export const SFX_PROMPTS: Record<SfxId, { text: string; durationSec: number; promptInfluence: number; loop?: boolean }> = {
  whoosh: {
    text: "Fast cinematic whoosh transition, airy swoosh passing left to right, clean, short tail, no music",
    durationSec: 1.0,
    promptInfluence: 0.7,
  },
  riser: {
    text: "Tense cinematic riser, rising filtered noise and pitch building for two seconds, ends abruptly, no music",
    durationSec: 2.0,
    promptInfluence: 0.6,
  },
  impact: {
    text: "Deep cinematic bass impact hit with a burst of fire flames, punchy boom, short decay",
    durationSec: 1.5,
    promptInfluence: 0.6,
  },
  tick: {
    text: "Rapid soft digital counter ticking, small clean UI clicks speeding up, one second",
    durationSec: 1.0,
    promptInfluence: 0.7,
  },
  ping: {
    text: "Single sonar radar ping, clean electronic blip with soft echo",
    durationSec: 1.0,
    promptInfluence: 0.7,
  },
  crackle: {
    text: "Close-up forest fire crackling, burning wood and embers popping, continuous ambience, no music, no voices",
    durationSec: 12,
    promptInfluence: 0.5,
    loop: true,
  },
  drone: {
    text: "Dark ominous cinematic drone pad, low rumble with smoky atmosphere, slow and seamless, no drums",
    durationSec: 24,
    promptInfluence: 0.45,
    loop: true,
  },
};

/** Voice: Liam (eleven_multilingual_v2 — mendukung Bahasa Indonesia). */
export const VOICE = {
  voiceId: "TX3LPaxmHKxFdv7VOQHJ",
  modelId: "eleven_multilingual_v2",
  settings: { stability: 0.42, similarity_boost: 0.8, style: 0.35, use_speaker_boost: true, speed: 1.0 },
} as const;

/** Sumber klaim. Wajib diverifikasi ulang (fact-check stage) sebelum publish. */
export const SOURCES: Record<string, { claim: string; source: string }> = {
  "c-area-2015": {
    claim: "Karhutla 2015 di Indonesia membakar ±2,6 juta hektare.",
    source: "World Bank (2016), The Cost of Fire: An Economic Analysis of Indonesia's 2015 Fire Crisis",
  },
  "c-bali-area": {
    claim: "Luas Pulau/Provinsi Bali ±5.780 km² → 26.000 km² ÷ 5.780 km² ≈ 4,5×.",
    source: "BPS Provinsi Bali, Bali Dalam Angka",
  },
  "c-hotspots-2015": {
    claim: "Satelit (MODIS/LAPAN) mendeteksi ribuan titik panas selama musim kebakaran 2015.",
    source: "LAPAN / NASA FIRMS (arsip hotspot 2015)",
  },
  "c-peat-smoulder": {
    claim: "Api gambut membara di bawah permukaan dan bisa bertahan berminggu-minggu, sulit dipadamkan.",
    source: "CIFOR; Badan Restorasi Gambut dan Mangrove (BRGM)",
  },
  "c-haze-closures": {
    claim: "Kabut asap 2015 meliburkan sekolah dan menutup/mengganggu operasional bandara di Kalimantan & Sumatra.",
    source: "BNPB; pemberitaan nasional Sep–Okt 2015",
  },
  "c-ispa-2015": {
    claim: "Lebih dari 500 ribu warga menderita ISPA akibat kabut asap 2015.",
    source: "BNPB (Okt 2015): 503.874 jiwa menderita ISPA di 6 provinsi",
  },
  "c-cost-2015": {
    claim: "Kerugian ekonomi karhutla 2015 ±US$16,1 miliar (±Rp221 triliun), ±1,9% PDB.",
    source: "World Bank (2016), The Cost of Fire",
  },
  "c-human-cause": {
    claim: "Hampir seluruh karhutla dipicu aktivitas manusia (BNPB: ±99%).",
    source: "BNPB",
  },
};
