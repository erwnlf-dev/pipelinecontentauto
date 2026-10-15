# Plan: Content Automation Pipeline (Trivia & Hidden Knowledge → Threads/TikTok)

> Plan yang disetujui (Okt 2026). Status implementasi ada di [README](../README.md#status): Fase 1 langkah 1–4
> sudah jalan end-to-end dengan provider stub; skema DB, fact-check deterministik, dan budget guard sudah ada;
> pg-boss, dashboard, dan publishing menyusul.

## Context

Repo `pipelinecontentauto` masih kosong (greenfield). Tujuannya pipeline yang otomatis membuat video pendek
**Bahasa Indonesia, 9:16, 30–60 detik** bertema trivia/hidden knowledge:

`ide → riset & fact-check → script → voice over (ElevenLabs) → footage (Gemini Omni) → edit (Claude Opus) → render → review manusia → upload Threads/TikTok`

Keputusan user:
- **Internal dulu, SaaS-ready**: 1 workspace, tapi skema sudah multi-tenant (`workspace_id` di semua tabel).
- **TypeScript full-stack**: Next.js + Node worker + Remotion.
- **Approve sebelum publish**: semua otomatis sampai video jadi, publish setelah di-approve di dashboard.
- **Bahasa Indonesia, 9:16, 30–60 detik.**

## Jawaban: bikin SaaS sekarang?

Belum. Bangun dulu **tool internal yang SaaS-ready**, lalu validasi 4–8 minggu di channel sendiri. Alasannya:
1. **Unit economics belum diketahui.** Footage AI ±US$3–7 per video. Biaya per video dan performa konten harus terukur dulu (lewat `cost_ledger`) sebelum menentukan harga.
2. **Langganan tidak bisa dijual ulang.** SaaS harus memakai API key berbayar, entah kredit dari platform kamu atau BYOK per user.
3. **Audit TikTok justru mensyaratkan SaaS.** Guideline TikTok menolak app berupa "utility tool untuk upload ke akun sendiri/tim".
   - Selama internal: pakai alur **Upload/draft**, lalu video difinalisasi di app TikTok.
   - Direct Post publik baru realistis setelah jadi SaaS multi-creator dan lolos audit. Audit butuh beberapa hari sampai ±6 minggu, plus demo video dan UI posting sesuai guideline.
4. **Pasar "faceless video generator" sudah ramai.** Diferensiasinya (niche Indonesia, fact-check yang ketat) perlu dibuktikan dulu.

Skema, credential per workspace dan `cost_ledger` sudah disiapkan dari awal. Jadi pindah ke SaaS nanti cukup menambah signup, billing dan UI posting yang sesuai audit, tanpa rewrite.

## Langganan vs API: apa yang bisa dipakai backend

| Langganan | Bisa untuk backend otomatis? | Yang dibutuhkan |
|---|---|---|
| **Claude Team** | **Ya, lewat API credits bawaan Team:** US$20/seat Standard atau US$100/seat Premium per bulan, di-pool, maks US$500/bulan, tidak rollover. Klaimnya dengan link 1 Console org. Login subscription (OAuth) **tidak boleh** dipakai untuk backend/produk. | API key dari Console org yang di-link. Kredit Team terpakai dulu, sisanya pay-as-you-go. Seat Team (Claude Code) dipakai untuk *membangun* project ini. |
| **Google AI Pro** | **Sebagian kecil.** 1.000 Flow credits/bulan hanya bisa dipakai lewat UI Gemini/Flow; tidak ada Flow API. Yang bisa dipakai API hanya **US$10/bulan Google Cloud credits**, setara ±100 detik video Omni 720p/bulan. | Gemini API key + Cloud Billing; credits AI Pro jadi potongan. **Jangan** pakai wrapper tidak resmi yang mengotomasi Flow (risiko ToS, gampang rusak). |
| **ElevenLabs** | **Ya.** API memakai pool kredit langganan yang sama. Cek di dashboard apakah API dihitung kredit atau USD sejak perubahan harga Mei 2026. | API key dari akun yang sama. Pemakaian komersial minimal paket Starter. |

**"Edit dengan Claude Opus"**: Claude tidak bisa menerima atau meng-edit file video (input-nya gambar dan teks saja). Claude dipakai sebagai **editor brain**:
- membaca script, timing kata dari voice over, dan keyframe footage (lewat vision);
- memutuskan kreatifnya dalam bentuk **EditPlan JSON**.

Kode lalu meng-compile EditPlan menjadi **Timeline**, dan Remotion me-render Timeline itu secara deterministik (React → MP4).

### Gemini Omni (riset Okt 2026)
- Keluarga model video Google, diumumkan di I/O Mei 2026. Di Gemini app, Omni menggantikan Veo 3.1, dan Google merekomendasikannya sebagai default di Gemini API.
- **Model:** `gemini-omni-1.1-flash` (stable). Alternatif termurah: `veo-3.1-lite-generate-preview`.
- **Alur API (Interactions API, async):**
  1. `POST /v1beta/interactions` dengan `background: true`.
  2. Poll `GET /v1beta/interactions/{id}` sampai selesai. Webhook dilaporkan belum andal, jadi pakai polling.
- **Spesifikasi:**
  - Durasi 3–10 detik per generate; bisa di-extend sampai 40 detik. Durasinya fleksibel, sehingga bisa dicocokkan dengan panjang scene.
  - `aspect_ratio: "9:16"`.
  - 720p native (1080p dan 4K hasil upscale), 24 fps.
  - Ada native audio, tapi akan kita strip.
  - Mendukung image reference dan first/last frame.
  - Output diberi watermark SynthID.
- **Harga:** Omni 720p ±**US$0.10/detik** (360p ±$0.03, 1080p ±$0.15). Veo 3.1 Lite 720p ±$0.05/detik.
- **Rate limit:** tidak dipublikasikan; cek kuota project di AI Studio.

---

## Arsitektur

```
Next.js dashboard (apps/web) ──► Postgres (source of truth + queue pg-boss)
                                     ▲
                                     │ jobs (transaksional dengan perubahan state)
                               Worker (apps/worker) ──► Anthropic | Gemini Omni/Image | ElevenLabs | Threads | TikTok
                                     │
                                     ├──► Renderer container (Remotion, 1 job/kali, ffmpeg loudnorm)
                                     └──► Cloudflare R2 (aset + URL publik untuk Threads)
```

- **Queue: pg-boss** (antrean di dalam Postgres), bukan BullMQ + Redis.
  - Job di-enqueue dalam transaksi yang sama dengan perubahan state, jadi tidak ada job yang hilang atau dobel.
  - `singletonKey = videoId:stage:inputHash` mencegah job duplikat.
  - `startAfter` dipakai untuk polling; cron dan backoff sudah built-in.
  - Satu service lebih sedikit di VPS.
  - Stage ditulis sebagai fungsi murni, sehingga kelak bisa dipindah ke Inngest/Trigger.dev cukup dengan mengganti wrapper.
- **Artifact immutable dan berversi:** `artifacts(video_id, stage, version, input_hash, data)`; tabel `videos` hanya menyimpan pointer ke versi aktif. Hasilnya: bisa diff, bisa rollback, dan yang di-approve persis yang ditonton.
- **Provider adapter interface** di `packages/providers`, ditambah implementasi `stub/` untuk dry-run tanpa biaya. Model video bisa diganti lewat config (Omni / Veo / vendor lain).
- **Hosting awal:** 1 VPS (4 vCPU / 8 GB) dengan Docker Compose: `postgres`, `web`, `worker`, `renderer`.
  - Renderer memakai Dockerfile Debian resmi Remotion (Chrome headless shell + font), limit memori 3–4 GB, dan `bundle()` sekali saat build.
- **Lisensi Remotion:** gratis untuk individu atau organisasi ≤3 orang, termasuk pemakaian komersial dan SaaS. Mulai 4 orang wajib Company License (Automators: US$0.01/render, minimum US$100/bulan). Renderer dibungkus interface `Renderer` supaya bisa diganti FFmpeg murni.

### Struktur monorepo (pnpm workspaces)
```
apps/web/            Next.js App Router: review/approve, sources, biaya, OAuth callback, settings
apps/worker/         pg-boss workers per stage + cron + CLI (`pnpm pipeline run --topic "..."`)
apps/renderer/       Remotion render service (Dockerfile resmi Remotion)
packages/core/       Zod schemas: Idea, FactSheet, Script, EditPlan, Timeline, enum stage
packages/db/         Drizzle schema + migrations
packages/providers/  anthropic.ts, gemini-video.ts, gemini-image.ts, elevenlabs.ts, threads.ts, tiktok.ts, storage-r2.ts, stub/
packages/pipeline/   stage functions, compile-timeline.ts, captions/chunk-id.ts, factcheck/, budget.ts
packages/video/      Remotion composition ShortVideo (1080x1920 @30fps) yang membaca Timeline
docker-compose.yml, .env.example
```

---

## Pipeline & dependency graph

```
IDEATE → FACTCHECK → SCRIPT ─┬→ VOICEOVER ─┐
                             └→ FOOTAGE ───┴→ EDIT → RENDER → QA → AWAITING_APPROVAL → PUBLISH
```
- Re-run satu stage hanya meng-invalidate stage di hilirnya.
- Footage di-cache berdasarkan hash visual prompt, jadi revisi narasi tidak memicu generate ulang video.
- Re-run per scene didukung, karena ini permintaan revisi yang paling sering.
- **Opsional:** flag `requireScriptApproval` menambah gate murah sebelum FOOTAGE (stage termahal). Default off sesuai pilihan user, tapi disarankan on di minggu-minggu awal.

| Stage | Pelaksana | Output |
|---|---|---|
| **IDEATE** | 1 call Claude + `web_search`, per content pillar (sejarah, sains, psikologi, geografi, bahasa…) | 10 ide (judul, hook, klaim inti); user bisa juga mengetik topik sendiri |
| **FACTCHECK** | Lihat bagian *Fact-check* di bawah | FactSheet: klaim terverifikasi beserta id, sumber dan kutipan |
| **SCRIPT** | Claude (structured output) | ±90–130 kata. Tiap kalimat punya bentuk **display** dan **spoken** (mis. "1945" / "sembilan belas empat puluh lima") plus `claimIds`. Juga scene breakdown (narasi, visual prompt EN, `video`/`image`), on-screen text, dan caption post + hashtag |
| **VOICEOVER** | ElevenLabs `POST /v1/text-to-speech/{voice_id}/with-timestamps` (`eleven_v4` atau `eleven_multilingual_v2`, keduanya mendukung Bahasa Indonesia), **satu call untuk seluruh script** | MP3 + word timings yang dikelompokkan dari `alignment` per karakter. Fallback: `POST /v1/forced-alignment`. Durasi 30–60 detik dicek **di sini** |
| **FOOTAGE** | Omni 9:16 untuk 2–3 scene "hero"; Google image model + Ken Burns untuk scene lain | Lihat *Video generation* di bawah |
| **EDIT** | Claude Opus 5.5 + vision (keyframe ±720 px) | **EditPlan** (keputusan kreatif saja) |
| **RENDER** | `compileTimeline()` → Remotion → ffmpeg `loudnorm` (−14 LUFS) | MP4 H.264/AAC 1080x1920 30fps |
| **QA** | ffprobe (durasi, resolusi, ukuran, audio ada) | pass/fail |
| **AWAITING_APPROVAL** | Manusia di dashboard | approve / reject / re-run stage atau scene + catatan. Approval menyimpan hash render; render ulang membatalkan approval |
| **PUBLISH** | Threads auto; TikTok draft | post id/url |

### Video generation (FOOTAGE)
- **Submit:** simpan id interaction di `assets.provider_job_id`, lalu enqueue job poll (interval 15→60 detik). Worker tidak pernah `sleep`.
- **Timeout:** ±15 menit. Setelah itu fallback ke gambar + Ken Burns.
- **Retry:** kalau id interaction sudah ada, **lanjutkan polling, jangan submit ulang** (submit ulang = bayar dua kali).
- **Ingest:** unduh segera, lalu normalisasi dengan ffmpeg: 30fps CFR, 1080x1920, H.264, audio di-strip.
- **Kena safety filter:** jangan di-retry apa adanya. Claude menulis ulang prompt sekali, lalu fallback ke gambar.
- **Durasi klip:** pilih dari panjang scene di voice over (Omni 3–10 detik). Validator mengizinkan slow-down sampai 0.8x atau hold frame terakhir.

### Claude sebagai editor: dua schema
Claude hanya membuat keputusan kreatif. Semua perhitungan timing dikerjakan kode, sehingga error durasi atau gap yang tadinya butuh repair loop hampir hilang.
```ts
// A) Output Claude
EditPlan = { hook:{text,endMs}, musicMood: "curious"|"epic"|"calm"|"tense"|"upbeat",
  emphasisWordIdx: number[],
  scenes: [{ sceneId, assetId, sourceInMs, motion: "none"|"zoomIn"|"zoomOut"|"panL"|"panR"|"panU"|"panD",
             focus:{x,y}, transitionIn: "cut"|"fade"|"zoom", overlay: string|null }] }

// B) Dibangun oleh compileTimeline(script, voWords, assets, editPlan), dibaca Remotion
Timeline = { v:1, fps:30, w:1080, h:1920, durationMs,
  assets: Record<id,{key, kind, durationMs?}>,           // pakai asset id, bukan presigned URL
  video:   [{startMs,endMs, assetId, sourceInMs, rate, motion, focus, transitionIn:{type,ms}}],
  audio:   [{startMs,endMs, assetId, role:"voice"|"music", gainDb, duckDb?}],
  captions:[{startMs,endMs, words:[{startMs,endMs,text,emphasis}]}],
  overlays:[{startMs,endMs, text, slot:"top"|"center"}] }
```
Validator `Timeline` memastikan:
- segmen video menutup 0..durationMs tanpa gap;
- `sourceInMs + panjang×rate` ≤ durasi aset;
- caption urut dan berada di dalam durasi video;
- semua asset id ada;
- total durasi 30–60 detik.

Konversi ms ke frame dihitung dari posisi absolut supaya pembulatan tidak menumpuk.

### Pemakaian Claude API (`packages/providers/anthropic.ts`)
- **Setup dasar:** `@anthropic-ai/sdk`, model `claude-opus-5-5`, `thinking: {type:"adaptive"}`, `output_config.effort` per stage (`high` untuk script/edit, `medium` untuk ideate, `low` untuk ekstraksi). Pakai streaming + `finalMessage()`.
- **Structured outputs** (`output_config.format` dengan Zod dari `packages/core`) **tidak boleh** dipakai bersamaan dengan citations atau web search. Karena itu riset dibagi dua call:
  1. call riset dengan tools;
  2. call ekstraksi tanpa tools.
- **Server tools:** `web_search_20260209` dan `web_fetch_20260209`, dengan `max_uses` dibatasi. Tangani `pause_turn`.
- **Repair loop:** error validasi dikirim sebagai **user turn baru**, history tidak diedit.
- **Fallback dan logging:**
  - `fallbacks: "default"` (beta `server-side-fallback-2026-07-01`).
  - Selalu cek `stop_reason` (`refusal`).
  - Log `response.model` dan `usage.server_tool_use` ke `cost_ledger`.
- **Prompt caching** untuk system prompt dan style guide per pillar. Batch API tidak dipakai (tidak cocok dengan server-tool loop, dan volumenya kecil).

### Fact-check (kualitas = diferensiasi utama)
1. **Research call** (Claude + `web_search`/`web_fetch`): tiap klaim menghasilkan sumber dan **kutipan verbatim**.
2. **Cek di kode:**
   - kutipan benar-benar ada di teks halaman yang di-fetch (snapshot dan hash disimpan);
   - minimal 2 domain terdaftar yang berbeda;
   - minimal 1 sumber tier atas (.go.id, .ac.id, jurnal, museum, ensiklopedia);
   - blocklist (Quora, Brainly, content farm, media sosial).
3. **Adversarial pass:** cari bantahan ("mitos", "hoaks", cekfakta.com, turnbackhoax.id). Klaim yang terbantah langsung ditolak.
4. **Script-to-claim check:** setiap kalimat faktual di script, on-screen text dan caption post harus terpetakan ke `claimId` yang sudah terverifikasi. Ini menutup celah script yang menambah atau melebih-lebihkan klaim.
5. **Topic blocklist:** SARA, politik, klaim kesehatan/keuangan, tokoh yang masih hidup (risiko UU ITE).

### Audio & caption
- **Caption chunking dikerjakan kode** (`captions/chunk-id.ts`), bukan Claude:
  - 1–4 kata, ≤18 karakter per baris, tampil minimal 0.4 detik;
  - potong di tanda baca atau jeda >250 ms;
  - jangan mengakhiri chunk dengan *di/ke/dari/yang/dan/untuk/dengan/pada/si*;
  - jaga tetap utuh: "anak-anak", "ke-19", angka + satuan ("300 juta").
- **Safe zone:** caption dijauhkan dari ±20% bagian bawah dan ±12% bagian kanan layar (area UI aplikasi).
- **Pronunciation dictionary** ElevenLabs untuk nama asing.
- **Musik:**
  - library kecil yang sudah dikurasi dengan lisensi tercatat (`music_tracks`), atau musik AI ber-hak komersial (verifikasi lisensi ElevenLabs Music sesuai paket);
  - ducking dihitung di kode dari timing voice over;
  - untuk TikTok, trending sound dipilih manual saat finalisasi draft.

---

## Skema database (Drizzle; semua tabel punya `workspace_id`)
- `workspaces`, `users`, `workspace_members(role)`
- `content_pillars(name, tone, voice_id, visual_style_preset, schedule_cron, require_script_approval)`
- `ideas(pillar_id, title, hook, status)`
- `claims(idea_id, text, status, sources jsonb[{url, domain, tier, quote, snapshot_hash}])`
- `videos(idea_id, status, current_artifact_ids jsonb, approved_render_hash, error)`
- `artifacts(video_id, stage, version, input_hash, prompt_version, model, data jsonb)`, immutable
- `assets(kind: voice|clip|image|music|render|keyframe, storage_key, mime, duration_ms, provider, provider_job_id, visual_prompt_hash, meta)`
- `stage_runs(video_id, stage, attempt, status, input_hash, error, started_at, finished_at)`
- `publications(video_id, social_account_id, platform, state: pending|container_created|published|failed, container_id, platform_post_id, url, scheduled_at)` dengan unique key (video, account)
- `social_accounts(platform, external_user_id, tokens, expires_at)`
- `cost_ledger(video_id, stage, provider, sku, units, usd, kind: reserve|actual)`
- `price_table(sku, usd_per_unit, effective_from)`
- `music_tracks(storage_key, license, mood)`
- Fase SaaS: `provider_credentials` (BYOK, terenkripsi AES-GCM) dan `metrics_snapshots`

## Dashboard / API (Next.js route handlers + Zod)
- **Halaman:** Ideas, Video detail (player, script, klaim + sumber + kutipan, biaya, tombol approve/reject/re-run stage/scene), Publish queue, Settings.
- **Endpoint:**
  - `POST /api/ideas/generate`
  - `POST /api/videos`
  - `POST /api/videos/:id/{approve|reject|rerun}`
  - `POST /api/publications`
  - `/api/oauth/{threads|tiktok}/callback`
- **Auth:** 1 login (Better Auth / Auth.js), cukup untuk fase internal.

---

## Publishing
- **Threads** (full auto, dikerjakan duluan), host `graph.threads.net`:
  1. `POST /{user-id}/threads` dengan `media_type=VIDEO`, `video_url` publik dari R2, dan `text` (≤500 karakter, termasuk disclosure AI).
  2. Poll `GET /{container-id}?fields=status,error_message` (tiap ±1 menit, maks 5 menit).
  3. `POST /{user-id}/threads_publish`.
  - Scope: `threads_basic` + `threads_content_publish`. Akun sendiri cukup didaftarkan sebagai tester, tanpa App Review.
  - Token berlaku 60 hari; job refresh otomatis. Limit 250 post/24 jam.
- **TikTok, fase internal** (scope `video.upload`):
  1. `POST /v2/post/publish/inbox/video/init/` dengan FILE_UPLOAD. Chunk 5–64 MB, jadi video 45 detik biasanya cukup 1 chunk.
  2. Video masuk inbox TikTok. Di sana kamu finalisasi: pilih trending sound dan nyalakan label AI-generated.
  3. Poll `/v2/post/publish/status/fetch/`.
  - Limit 6 request/menit per token. Access token berlaku 24 jam, jadi refresh sebelum tiap upload.
- **TikTok, fase SaaS** (scope `video.publish`, Direct Post):
  - wajib memanggil `creator_info/query` sebelum setiap post;
  - privacy picker tanpa nilai default, toggle comment/duet/stitch, disclosure konten komersial dan label AIGC;
  - setelah itu ajukan audit.
- **Idempotensi publish:** sebelum retry setelah timeout, cek dulu status di platform. Jangan pernah double-post.

---

## Biaya & guardrail
| Per video 45 detik | Full video AI | **Hybrid (default)** |
|---|---|---|
| Claude Opus 5.5 ($4/$20 per MTok) + web search | ±$0.5–1.0 | ±$0.5–1.0 |
| ElevenLabs (±600–900 karakter) | kuota langganan | kuota langganan |
| Footage Omni 720p ($0.10/detik) | 45 detik + retry ≈ $5.9 | 2–3 klip hero (±20 detik) ≈ $2.6 + gambar |
| **Total** | **±$6.5–7** | **±$3–4** |

Asumsi volume dan biaya tetap:
- 1 video/hari mode hybrid ≈ US$90–120/bulan, sebagian tertutup kredit API Team plan dan US$10 credits AI Pro.
- VPS + R2 ≈ US$20–40/bulan.

Guardrail:
- **Reserve sebelum stage mahal:** estimasi biaya, catat sebagai reserve di `cost_ledger`, dan tolak bila melewati cap per video atau per hari. Setelah selesai, rekonsiliasi dengan biaya aktual.
- **Cap keras:**
  - jumlah klip hero per video;
  - regenerate maks 1 kali per scene;
  - `max_uses` web search;
  - `max_tokens`;
  - repair loop maks 2.
- **Global kill switch** di config.
- **Batas di sisi provider:** spend limit di workspace Anthropic Console, budget alert di Google Cloud. Budget alert Google hanya memberi notifikasi, tidak menghentikan pemakaian, jadi cap di kode tetap wajib.

---

## Roadmap & urutan build

**Fase 0 — Akun (1–2 hari)**
- Link Console org ke Team plan, lalu buat API key.
- Gemini API key + Cloud Billing (aktifkan credits AI Pro).
- ElevenLabs API key + voice ID Bahasa Indonesia.
- Cloudflare R2 + domain.
- Meta app (Threads, akun sendiri sebagai tester).
- TikTok developer app (scope `video.upload`).

**Fase 1 — MVP, vertical slice terkecil dulu (±2–3 minggu)**
1. Schema `Timeline` + composition Remotion + timeline tulisan tangan (3 gambar, MP3 contoh, caption) → render MP4. Tuning caption, safe zone dan Ken Burns di Remotion Studio.
2. ElevenLabs with-timestamps → word timings → `chunk-id.ts` → `compileTimeline()` → render. Ditambah unit test.
3. Claude script (structured output) dari topik yang diketik + 1 gambar AI per scene, dijalankan sebagai CLI di disk lokal. **Video nyata pertama.**
4. Stage EDIT (EditPlan + vision) + ffmpeg loudnorm + cek ffprobe.
5. Persistence: Drizzle (`videos`, `artifacts`, `stage_runs`, `assets`, `cost_ledger`) + R2 + pg-boss + budget guard + re-run dari stage mana saja.
6. Fact-check lengkap (research → ekstraksi → cek kutipan → adversarial → script-to-claim).
7. Klip hero Omni (submit/poll/ingest) di bawah budget cap.
8. Halaman review minimal (player, script, sumber + kutipan, biaya, approve/reject/re-run).

**Fase 2 — Publishing (±1 minggu)**
- Threads auto-publish.
- TikTok draft upload.
- Scheduler (pg-boss cron) dan refresh token.

**Fase 3 — Kualitas & growth**
- Ideation terjadwal per pillar + dedupe.
- QA vision oleh Claude dan regenerate otomatis.
- Metrics loop (Threads insights / TikTok stats) → skor ide.
- A/B hook dan template visual tambahan.

**Fase 4 — SaaS (bila unit economics terbukti)**
- Signup multi-workspace.
- Billing kredit (Stripe / Xendit / Midtrans) atau BYOK.
- Kuota per workspace.
- UI Direct Post sesuai audit TikTok + audit.
- App Review Meta.
- ToS / Privacy Policy.
- Lisensi Remotion company bila tim ≥4 orang.

**Dikeluarkan dari MVP:**
- Redis/BullMQ, Turborepo.
- Batch API, skor viral, dedupe otomatis.
- QA vision otomatis, SFX, transisi selain cut/fade/zoom, thumbnail custom.
- BYOK dan enkripsi credential (pakai env dulu).
- Auth multi-user.

## File kunci (akan dibuat)
- `packages/core/src/timeline.ts`, `packages/core/src/edit-plan.ts`, `packages/core/src/script.ts`
- `packages/pipeline/src/compile-timeline.ts`, `packages/pipeline/src/captions/chunk-id.ts`, `packages/pipeline/src/factcheck/*`, `packages/pipeline/src/budget.ts`
- `packages/providers/src/{anthropic,gemini-video,elevenlabs,threads,tiktok}.ts`
- `packages/video/src/ShortVideo.tsx`
- `packages/db/src/schema.ts`
- `apps/worker/src/index.ts`, `docker-compose.yml`, `.env.example`

## Verifikasi
1. **Unit test (Vitest):**
   - validator Timeline (gap, durasi, batas aset);
   - `compileTimeline()`;
   - chunker caption Indonesia (kasus "di/ke", "anak-anak", angka + satuan);
   - pemetaan alignment karakter → kata;
   - transisi state machine;
   - kalkulasi budget/reserve;
   - cek kutipan fact-check.
2. **Adapter test:** HTTP di-mock dengan msw memakai fixture respons nyata tiap provider, termasuk polling Omni dan status container Threads.
3. **Dry-run end-to-end dengan provider `stub/`:** TTS sintetis + gambar solid → render MP4 nyata. `ffprobe` harus menunjukkan 1080x1920, 30fps, 30–60 detik, ada audio, dan loudness sekitar −14 LUFS.
4. **Live run 1 topik dengan provider asli:**
   - cek `cost_ledger` vs tagihan;
   - tonton hasilnya;
   - audit klaim, sumber dan kutipan;
   - re-run 1 scene dan pastikan footage lain tidak di-generate ulang.
5. **Publish test:**
   - Threads ke akun tester;
   - TikTok draft ke inbox;
   - ulangi job publish dan pastikan tidak ada double-post.
