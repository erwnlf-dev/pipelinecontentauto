# @pca/motion — Motion graphics reel (Remotion + GSAP + Three.js + ElevenLabs)

Paket ini berisi komposisi motion graphic yang dirancang tangan. Pipeline otomatis `@pca/video` hanya menyusun footage dan caption, sedangkan paket ini menulis koreografinya sendiri. Kaidahnya mengikuti
[claude-remotion-skill](https://github.com/haidrrrry/claude-remotion-skill):

- tanpa easing linear;
- entrance 3 properti dengan stagger;
- exit lebih cepat dari entrance;
- 5 layer per scene;
- elemen diam tetap bernapas;
- semua timing diturunkan dari `fps`;
- satu `theme.ts`;
- render → periksa frame → perbaiki.

Komposisi yang tersedia (semua 1080×1920, 30 fps, untuk Meta Threads & Reels / Shorts / TikTok):

- **`KarhutlaReel`**: explainer Karhutla Kalimantan, Bahasa Indonesia, ±34–35 detik, dengan VO.
- **`MiniBuild8s` / `MiniBuild15s`**: miniatur ASMR "Warung Mini" dibangun langkah demi langkah, tanpa VO, SFX ElevenLabs. Lihat [bagian MiniBuild](#minibuild--miniatur-asmr-warung-mini).

## Alur kerja

```bash
pnpm install

# 1a. Tanpa API (timing sintetis + kit SFX sintetis) — untuk preview/QA
pnpm --filter @pca/motion audio:dry

# 1b. Live: VO ElevenLabs per kalimat (/with-timestamps) + SFX (/sound-generation)
set -a; source .env; set +a          # ELEVENLABS_API_KEY wajib; ELEVENLABS_VOICE_ID opsional (default Liam)
pnpm --filter @pca/motion audio

# 2. Preview interaktif
pnpm --filter @pca/motion studio

# 3. Verifikasi frame kunci (overlay safe zone), lalu buka PNG di out/karhutla/frames/
pnpm --filter @pca/motion check:karhutla

# 4. Render master (h264, CRF 16). Mesin tanpa GPU: tambahkan --gl=swangle
pnpm --filter @pca/motion render:karhutla
```

Langkah 1 menulis `src/karhutla/generated/voiceover.json`. File ini berisi durasi tiap klip VO, caption per kata, dan path SFX, dan baru dibaca saat bundle. Versi yang di-commit sengaja tanpa audio, jadi komposisi tetap bisa dirender tanpa suara. Audio hasil generate disimpan di `public/karhutla/` (di-gitignore).

Klip VO di-cache per hash. Hash dihitung dari teks, konteks, voice dan setting, jadi re-run tidak membakar kredit.

## Storyboard

Satu beat = satu kalimat VO = satu klip TTS. Durasi beat dihitung oleh `computeTiming()`: `max(minSec, 2 frame lead + durasi VO + 8 frame napas)`. Dengan begitu kalimat tidak pernah terpotong, dan visual berganti tiap 2,6–3,4 detik.

Kolom waktu di bawah berasal dari run `audio:dry`. Hasil VO asli akan menggeser angkanya sedikit, dan komposisi menyesuaikan otomatis.

| # | Waktu | Scene | Visual (HIT → hold → build) | VO (spoken) | SFX |
|---|---|---|---|---|---|
| 1 | 0,0–3,0 | **HOOK** | Counter **2,6** (hero, glow) meledak naik di frame 2, partikel bara Three.js penuh → hold → garis bara + "juta hektare" + konteks | "Dua koma enam juta hektare. Hangus." | impact + tick |
| 2 | 3,0–5,7 | Body 1 · Skala | Counter **4,5×** → "luas Pulau Bali" → 4½ siluet Bali "terbakar" (stagger 5 f) | "Empat setengah kali luas Pulau Bali." | whoosh |
| 3 | 5,7–8,7 | Body 1 · Skala | Radar satelit di atas siluet Kalimantan: sweep GSAP `expo.inOut`, titik api muncul saat dilewati sweep | "Satelit merekam ribuan titik api." | whoosh, ping ×2 |
| 4 | 8,7–11,3 | Body 2 · Gambut | Penampang tanah: pohon hangus tumbuh berstagger, headline "Bukan cuma **pohon**" | "Yang terbakar, bukan cuma pohon." | whoosh |
| 5 | 11,3–14,1 | Body 2 · Gambut | Kamera "menyelam": pohon memudar, strata gambut terbuka, bara menjalar di bawah tanah + penggaris kedalaman | "Gambut menyimpan bara di bawah tanah," | riser |
| 6 | 14,1–16,8 | Body 2 · Gambut | Penampang meredup, 3 kartu 3D melayang (Permukaan / Bawah tanah / Berminggu-minggu) | "berminggu-minggu, sulit dipadamkan." | impact (ringan) |
| 7 | 16,8–19,6 | Body 3 · Asap | Shader asap fBm menebal; 2 kartu 3D dengan ikon SVG (sekolah, bandara) | "Asapnya, menutup sekolah dan bandara." | whoosh |
| 8 | 19,6–22,6 | Body 3 · Asap | Counter **500.000+** + cincin napas + "warga terkena ISPA" | "Lima ratus ribu lebih warga, terkena ispa." | impact + tick |
| 9 | 22,6–25,2 | Payoff · Biaya | "Berapa kerugiannya?" + meter antisipasi (GSAP) + push-in pelan | "Lalu, berapa kerugian ekonominya?" | whoosh, riser |
| 10 | 25,2–28,4 | **PAYOFF** | **Rp221** slam + sinar radial + ledakan bara Three.js + screen shake meluruh → "triliun" → "≈ US$16,1 miliar · 1,9% PDB" | "Dua ratus dua puluh satu triliun rupiah." | impact (keras) + tick |
| 11 | 28,4–31,4 | **CTA** | "Hampir semua dipicu **manusia**" + korek api menyala | "Hampir semuanya, dipicu ulah manusia." | whoosh |
| 12 | 31,4–34,8 | **CTA** | Tombol **Bagikan** (satu-satunya hero + glow, bernapas) + "Simpan untuk nanti" | "Bagikan, biar musim asap tak terulang." | ping |

Bed audio sepanjang video:

- drone gelap, volume 0,22, di-duck ke 0,09 di bawah VO;
- crackle api, volume 0,14;
- keduanya fade-out 1 detik di akhir.

**Safe zone teks** (`theme.safe`): margin atas 250 px, bawah 670 px, samping 65 px; area teks y 285–1250. Caption dikunci di pita y 1085–1245. `--props='{"showSafeZone":true}'` menampilkan overlay panduan.

## Naskah & ejaan fonetik

Sumber kebenarannya `src/karhutla/script.ts` (`BEATS`). `display` tampil di caption, sedangkan `spoken` yang dikirim ke TTS. Aturan penulisan `spoken`:

- angka → kata: "2,6" → "dua koma enam", "4,5" → "empat setengah", "500 ribu" → "lima ratus ribu";
- mata uang → "Rp221 triliun" → "dua ratus dua puluh satu triliun rupiah";
- akronim yang lazim dibaca sebagai kata ditulis huruf kecil: "ISPA" → "ispa";
- koma tambahan sebagai jeda napas ("Asapnya, menutup…").

Caption tetap memakai bentuk display. Pemetaan display↔spoken ditangani `mapDisplayWords()` dari `@pca/pipeline`.

## Request ElevenLabs

**TTS + timestamp per karakter** (satu call per beat; `previous_text`/`next_text` menjaga intonasi lintas klip):

```bash
curl -sS -X POST \
  "https://api.elevenlabs.io/v1/text-to-speech/TX3LPaxmHKxFdv7VOQHJ/with-timestamps?output_format=mp3_44100_128" \
  -H "xi-api-key: $ELEVENLABS_API_KEY" -H "Content-Type: application/json" \
  -d '{
    "text": "Dua ratus dua puluh satu triliun rupiah.",
    "model_id": "eleven_multilingual_v2",
    "voice_settings": { "stability": 0.42, "similarity_boost": 0.8, "style": 0.35, "use_speaker_boost": true, "speed": 1.0 },
    "previous_text": "Lalu, berapa kerugian ekonominya?",
    "next_text": "Hampir semuanya, dipicu ulah manusia."
  }'
# → { "audio_base64": "...", "alignment": { "characters": [...],
#     "character_start_times_seconds": [...], "character_end_times_seconds": [...] }, "normalized_alignment": {...} }
```

`alignment` dikelompokkan jadi kata (`alignmentToSpokenWords`), dipetakan ke kata display, lalu dipecah jadi chunk caption 1–4 kata (`chunkCaptions`). `language_code` hanya dikirim bila `ELEVENLABS_LANGUAGE_CODE` diisi, karena tidak semua model menerimanya.

**SFX** (`/v1/sound-generation`, respons = byte MP3):

```bash
curl -sS -X POST "https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128" \
  -H "xi-api-key: $ELEVENLABS_API_KEY" -H "Content-Type: application/json" \
  -d '{ "text": "Fast cinematic whoosh transition, airy swoosh passing left to right, clean, short tail, no music",
        "model_id": "eleven_text_to_sound_v2", "duration_seconds": 1.0, "prompt_influence": 0.7 }' \
  --output public/karhutla/sfx/whoosh.mp3
```

| id | Prompt | Durasi | Influence |
|---|---|---|---|
| whoosh | Fast cinematic whoosh transition, airy swoosh passing left to right, clean, short tail, no music | 1,0 s | 0,7 |
| riser | Tense cinematic riser, rising filtered noise and pitch building for two seconds, ends abruptly, no music | 2,0 s | 0,6 |
| impact | Deep cinematic bass impact hit with a burst of fire flames, punchy boom, short decay | 1,5 s | 0,6 |
| tick | Rapid soft digital counter ticking, small clean UI clicks speeding up, one second | 1,0 s | 0,7 |
| ping | Single sonar radar ping, clean electronic blip with soft echo | 1,0 s | 0,7 |
| crackle | Close-up forest fire crackling, burning wood and embers popping, continuous ambience, no music, no voices | 12 s, `loop: true` | 0,5 |
| drone | Dark ominous cinematic drone pad, low rumble with smoky atmosphere, slow and seamless, no drums | 24 s, `loop: true` | 0,45 |

Whoosh diputar 3 frame sebelum cut. Impact jatuh tepat di cut.

## Struktur

```
src/
  index.ts, Root.tsx            registerRoot + Composition (durasi dari calculateMetadata)
  theme.ts                      warna, easing (expo), spring, font, timing, safe zone — satu-satunya sumber
  lib/                          anim (entrance/exit/breathe), gsap (timeline di-seek per frame), fonts, geo, rng
  components/                   Layers (BgMesh/Grade/Grain/Vignette), Type (Headline/StatCounter/Kicker),
                                Captions, RadarScan, BaliTiles, PeatSection, FloatingCard, SparkBurst, MatchFlame, Icons
  three/                        FireScene (ThreeCanvas), EmberField (Points + shader), SmokeVeil (fBm), shaders.ts
  karhutla/
    script.ts                   naskah per beat, prompt SFX, voice, sumber klaim
    timing.ts                   solver grid beat dari durasi VO
    Composition.tsx             5-layer stack + mood global (bara/asap/panas) per scene
    AudioLayer.tsx              VO per beat, cue SFX, bed + ducking
    scenes/                     Hook, Scale, Peat, Haze, Cost, Cta
    generated/voiceover.json    output scripts/elevenlabs.ts
scripts/
  elevenlabs.ts                 generator VO + SFX (live / --dry)
  synth-sfx.ts                  kit SFX sintetis untuk mode dry
  check-frames.sh               render frame kunci untuk QA visual
```

**GSAP di Remotion.** Timeline dibuat `paused`, men-tween objek biasa (bukan DOM), lalu di-`seek(frame / fps)` di setiap render. Tidak ada ticker, sehingga hasilnya deterministik dan aman dirender paralel.

**Three.js.** Hal yang sama berlaku: semua gerak dihitung di shader dari `uTime = frame / fps` dan seed per partikel. Tidak ada `useFrame`.

## Fakta & sumber

Daftar sumber tiap klaim ada di `SOURCES` (`script.ts`). Angka seperti 2,6 juta ha, US$16,1 miliar (Bank Dunia 2016), dan 503.874 kasus ISPA (BNPB 2015) **wajib diverifikasi ulang** lewat stage fact-check repo sebelum publish.

---

## MiniBuild — miniatur ASMR "Warung Mini"

Format "lagi build sesuatu" ala storyboard miniatur ASMR: 7 langkah, satu potongan dipasang pinset di tiap momen, label aksi gaya komik, dan SFX kecil yang memuaskan. Footage tangan sungguhan diganti diorama 3D procedural (Three.js via `@remotion/three`). Brand-nya fiktif ("Warung Mini", teal/coral), jadi tidak memakai merek minimarket asli.

```bash
pnpm --filter @pca/motion sfx:minibuild          # SFX live (ElevenLabs /v1/sound-generation), atau --dry untuk kit sintetis
pnpm --filter @pca/motion render:minibuild       # 8 detik  (tempo storyboard)
pnpm --filter @pca/motion render:minibuild15     # 15 detik (tempo santai)
# tanpa GPU: tambahkan --gl=swangle
```

### Storyboard (tempo 8 s; tempo 15 s = 2 s per langkah + finale 3 s)

| # | Waktu | Visual / adegan | Kamera | SFX | Label |
|---|---|---|---|---|---|
| 1 | 0:00–0:01 | Base plate beton (marka parkir, stopper kuning-hitam) turun ke cutting mat, riak debu saat mendarat; judul "Bikin Warung Mini" | Macro rendah 3/4, push pelan | tap | START! |
| 2 | 0:01–0:02 | Tiga dinding dipasang satu per satu oleh pinset | Close-up tinggi 3/4 | click ×3 | PAS! |
| 3 | 0:02–0:03 | Dua rak gondola + kulkas + kasir, lalu ±150 produk & botol pop-in merambat | Top-down over-shoulder | slide ×2, pop | SUSUN! |
| 4 | 0:03–0:04 | Kaca kiri, kanan, lalu pintu disisipkan ke rel (poster promo di kaca) | Macro frontal | slide ×2, click | KLIK! |
| 5 | 0:04–0:05 | Atap + AC turun, papan nama "WARUNG MINI" ditempel lalu digosok kartu (kilau menyapu) | Close-up depan-atas | tap, click, sticker | RAPI! |
| 6 | 0:05–0:06 | Lampu jalan + rambu P, tiang lightbox, tong sampah, pot tanaman | Samping 3/4 | tink ×2, tap ×2 | TING! |
| 7 | 0:06–0:08 | Malam turun; papan nama → interior → lampu jalan menyala berurutan (kedip singkat) | Wide slow push-in | switch, chime | WOW! + FINISH! |

Bed lo-fi lembut (ElevenLabs, loop 10 s) di volume 0,32, fade in/out.

### Cara kerjanya

- **`plan.ts`**: semua waktu ditulis sebagai fraksi langkah. Satu koreografi jadi bisa dirender di dua tempo. Isinya daftar langkah (label, kamera, cue SFX) dan potongan (`PIECES`: jendela gerak, posisi akhir, arah masuk di ruang layar, titik jepit pinset).
- **`anim3d.ts`**:
  - `placement()`: potongan masuk dari luar frame (arah dihitung dari kamera langkah itu), mendarat dengan easing presisi, lalu squash halus yang meluruh;
  - `cameraAt()`: cut keras antar langkah, drift ber-easing di dalam langkah, ditambah punch FOV kecil saat cut.
- **`world/Tweezers.tsx`**: pinset selalu masuk dari kanan-atas layar, menjepit titik grip selama dibawa, membuka saat dilepas, lalu keluar frame lebih cepat dari masuknya. Test memastikan potongan berpinset dalam satu langkah tidak tumpang tindih.
- **`world/*`**: base, dinding, interior (`InstancedMesh` produk & botol), kaca, atap/papan nama, properti, dan rig kamera/lampu. Texture papan nama, poster, mat, dan lantai digambar ke canvas setelah font siap.
- **5 layer**:
  1. latar studio + bokeh;
  2. diorama 3D;
  3. HUD / label;
  4. grade (hangat → biru malam);
  5. grain + vignette.

### SFX ElevenLabs (`src/miniBuild/sfx.ts`)

| id | Prompt | Durasi |
|---|---|---|
| tap | ASMR close-up: a small thin grey board placed gently on a rubber cutting mat, single soft muted tap… | 0,6 s |
| click | ASMR close-up: tiny plastic model pieces snapping together, single crisp small click… | 0,5 s |
| slide | ASMR close-up: thin clear acrylic panel sliding into a plastic groove, short smooth scrape ending with a soft click… | 0,8 s |
| sticker | ASMR close-up: smoothing a small vinyl sticker flat with a plastic card, soft rubbing squeak… | 0,9 s |
| pop | ASMR close-up: many tiny cardboard boxes placed quickly on a shelf one after another… | 1,2 s |
| tink | ASMR close-up: a tiny metal pole clicked into place, light bright metallic tink… | 0,6 s |
| switch | Small light switch click followed by a soft warm electrical hum of lights turning on… | 0,9 s |
| chime | Soft magical sparkle chime, gentle satisfying reveal… | 1,5 s |
| bed | Soft calm lo-fi ambient bed, warm mellow electric piano chords… (`loop: true`) | 10 s |

Generator menormalkan peak one-shot ke −1 dBFS, karena level hasil ElevenLabs bervariasi. MP3 hasil generate di-commit di `public/minibuild/sfx/` supaya render ulang tidak membakar kredit. Catatan lisensi: output ElevenLabs paket **free tier** tidak untuk penggunaan komersial dan wajib atribusi. Untuk konten monetisasi pakai paket berbayar (Starter ke atas).
