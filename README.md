# pipelinecontentauto

Pipeline otomatis untuk video pendek **Bahasa Indonesia, 9:16, 30–60 detik** bertema trivia / hidden knowledge:

```
riset & fact-check (Claude + web search) → script (Claude) → voice over (ElevenLabs)
→ footage (Gemini Omni / gambar AI + Ken Burns) → edit (Claude sebagai "editor brain")
→ render (Remotion) → QA → review manusia → publish Threads / TikTok
```

Desain lengkap (alasan arsitektur, skema DB, biaya, roadmap, keputusan SaaS): **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.

## Status

| Bagian | Status |
|---|---|
| Schema Zod: Script, EditPlan, Timeline, FactSheet, stage graph & status video | ✅ |
| Alignment ElevenLabs → word timing, mapping angka display ↔ spoken | ✅ |
| Caption chunker Bahasa Indonesia, `compileTimeline()` + validator | ✅ |
| Fact-check deterministik (tier sumber, cek kutipan verbatim, bantahan, script-to-claim) | ✅ |
| Budget guard (reserve → settle, cap per video/hari, kill switch) | ✅ |
| Adapter Claude (structured output + repair loop, web search, vision, fallback) | ✅ belum diuji ke API asli |
| Adapter ElevenLabs, Gemini Omni (Interactions API), Gemini image | ✅ belum diuji ke API asli |
| Komposisi Remotion `ShortVideo` + render + loudnorm + QA ffprobe | ✅ |
| CLI lokal end-to-end (`stub` / `live`) | ✅ |
| Skema Drizzle + migrasi (15 tabel, multi-tenant) | ✅ |
| Motion graphics reel `KarhutlaReel` (Remotion + GSAP + Three.js + VO/SFX ElevenLabs) — [packages/motion](packages/motion/README.md) | ✅ dry-run dirender; VO live belum diuji ke API asli |
| pg-boss worker, dashboard Next.js, publish Threads/TikTok | ⏳ fase berikutnya |

## Mulai

Butuh Node 22+, pnpm 10, dan ffmpeg.

```bash
pnpm install
pnpm test         # unit test (Vitest)
pnpm typecheck
```

### Dry-run tanpa API key dan tanpa biaya

```bash
pnpm pipeline run --mode stub --with-video
```

Memakai provider stub (nada sintetis, gambar gradien, klip dummy) dengan script demo, lalu me-render MP4 sungguhan ke `out/<video-id>/`:

```
factsheet.json  script.json  voice.json  editplan.json  timeline.json
qa.json  cost-ledger.json  final.mp4  assets/
```

### Mode live

```bash
cp .env.example .env   # isi ANTHROPIC_API_KEY, GEMINI_API_KEY, ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID
set -a; source .env; set +a
pnpm pipeline run --mode live --topic "Kenapa flamingo berwarna pink?" --with-video --max-video 2
```

Opsi lain: `--pillar`, `--tone`, `--music <file berlisensi>`, `--out`, `--force` (lewati penyaring topik sensitif). Biaya dibatasi `BUDGET_PER_VIDEO_USD` / `BUDGET_PER_DAY_USD`.

> Hal yang perlu diverifikasi saat run live pertama: format `duration` Omni (`"8s"`), dukungan `/with-timestamps` untuk `eleven_v4`, dan harga yang ditandai `verified: false` di `packages/pipeline/src/budget.ts`.

### Preview komposisi

```bash
pnpm studio   # Remotion Studio; muat timeline.json lewat --props
```

## Struktur

```
apps/worker/         CLI & orkestrator stage (nanti: pg-boss workers)
packages/core/       Zod schemas, validator, stage graph
packages/pipeline/   alignment, caption chunker, compileTimeline, fact-check, budget, data demo
packages/providers/  Claude, ElevenLabs, Gemini (video/gambar), helper ffmpeg, provider stub
packages/video/      Remotion composition ShortVideo + renderer
packages/motion/     Motion graphics hand-crafted (KarhutlaReel): GSAP, Three.js, VO + SFX ElevenLabs
packages/db/         Drizzle schema + migrations
docs/                ARCHITECTURE.md (plan yang disetujui)
```

## Catatan lisensi & kebijakan

- Remotion gratis untuk individu/organisasi ≤3 orang; tim ≥4 orang butuh Company License.
- Musik latar harus berlisensi; trending sound TikTok dipilih manual saat finalisasi draft.
- Video AI realistis wajib diberi label AI-generated di TikTok; tambahkan disclosure di caption Threads.
