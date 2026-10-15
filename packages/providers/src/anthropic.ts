import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import {
  type DisplayWord,
  type EditPlan,
  EditPlanSchema,
  type FactSheet,
  type ResearchResult,
  ResearchResultSchema,
  type Script,
  ScriptSchema,
} from "@pca/core";
import { z } from "zod";

export const CLAUDE_MODEL = "claude-opus-5-5";
/** Fallback server-side bila request ditolak classifier (dipilih otomatis per kategori). */
const FALLBACK_BETA = "server-side-fallback-2026-07-01";

type Effort = "low" | "medium" | "high" | "xhigh" | "max";
type UserContent = Anthropic.Beta.BetaContentBlockParam[];

export interface ClaudeUsage {
  /** Model yang benar-benar melayani (bisa model fallback). */
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  webSearches: number;
  webFetches: number;
}

export interface ClaudeResult<T> {
  data: T;
  usage: ClaudeUsage[];
}

export class ClaudeRefusalError extends Error {
  constructor(public readonly category: string | null, explanation: string | null) {
    super(`Claude menolak request (${category ?? "tanpa kategori"}): ${explanation ?? ""}`);
    this.name = "ClaudeRefusalError";
  }
}

export class ClaudeValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super(`output Claude tetap tidak valid setelah repair:\n- ${issues.join("\n- ")}`);
    this.name = "ClaudeValidationError";
  }
}

export const IdeaListSchema = z.object({
  ideas: z.array(
    z.object({
      title: z.string(),
      hook: z.string(),
      angle: z.string(),
      claimsToVerify: z.array(z.string()),
    }),
  ),
});
export type IdeaList = z.infer<typeof IdeaListSchema>;

export interface PillarStyle {
  name: string;
  tone: string;
}

export interface SceneKeyframe {
  sceneId: string;
  assetId: string;
  kind: "video" | "image";
  durationMs?: number;
  /** JPEG ±720px sisi terpanjang. */
  keyframe: Buffer;
}

const SCRIPT_SYSTEM = `Kamu penulis naskah video pendek vertikal (TikTok/Threads) berbahasa Indonesia untuk kanal trivia & hidden knowledge.

Aturan naskah:
- Total 90–130 kata (bentuk spoken), durasi bicara 30–60 detik. Kalimat pendek, gaya santai tapi akurat, menyapa "kamu". Hindari pembuka klise seperti "Halo guys".
- Kalimat pertama adalah hook (≤ 12 kata): pertanyaan atau pernyataan mengejutkan. Kalimat terakhir boleh CTA singkat.
- HANYA gunakan klaim dari FactSheet. Setiap kalimat yang menyatakan fakta wajib mengisi claimIds. Jangan menambah angka, tanggal, nama, atau superlatif yang tidak ada di FactSheet. Kalimat non-faktual (hook pertanyaan, CTA) memakai claimIds [].
- display = teks yang tampil di caption (angka boleh ditulis sebagai digit). spoken = teks untuk TTS: angka, simbol, satuan, dan singkatan ditulis seperti diucapkan dalam Bahasa Indonesia (mis. "1945" → "sembilan belas empat puluh lima", "70%" → "tujuh puluh persen"). Selain itu display dan spoken harus sama kata per kata.
- hook (field terpisah) = teks overlay 2–6 kata untuk 2–3 detik pertama.

Aturan scene:
- 3–6 scene; tiap scene = rentang kalimat berurutan (fromSentence..toSentence, inklusif, mulai dari 0) yang bersama-sama menutup semua kalimat.
- visualPrompt dalam bahasa Inggris, deskriptif, fotorealistik, komposisi vertikal 9:16, tanpa teks/tulisan/logo di gambar, tanpa wajah tokoh nyata yang bisa dikenali.
- assetType "video" hanya untuk momen paling dinamis (maksimal sesuai batas di permintaan); sisanya "image".
- onScreenText ≤ 4 kata atau null.

postCaption ≤ 300 karakter, tanpa hashtag. hashtags 3–6 item diawali "#".`;

const EDIT_SYSTEM = `Kamu editor video pendek vertikal. Kamu menerima naskah, daftar kata voice over beserta indeksnya, dan keyframe tiap scene. Tugasmu hanya membuat keputusan kreatif; semua timing dihitung oleh sistem.

- hook.text: 2–6 kata, kuat, boleh berbeda dari naskah. hook.endMs: kira-kira akhir kalimat pertama (1500–3500).
- musicMood: pilih yang paling cocok.
- emphasisWordIdx: 3–8 indeks kata kunci (angka, kata mengejutkan, nama penting) dari daftar kata.
- scenes: satu entri per scene, sceneId dan assetId persis seperti yang diberikan. Untuk gambar pilih motion Ken Burns (zoomIn/zoomOut/panL/panR/panU/panD) yang mengikuti subjek; focus = titik subjek utama di keyframe (x,y dalam 0..1). Untuk video pakai motion "none" dan sourceInMs bagian paling menarik (0 bila ragu). transitionIn: kebanyakan "cut"; "fade"/"zoom" hanya untuk pergantian topik. overlay: ≤ 4 kata atau null, jangan mengulang hook.`;

const RESEARCH_SYSTEM = `Kamu peneliti fakta untuk konten edukasi berbahasa Indonesia. Akurasi lebih penting daripada menarik.

- Kumpulkan 4–8 klaim faktual inti tentang topik yang menarik untuk video 45 detik.
- Untuk setiap klaim cari minimal 2 sumber independen (domain berbeda), utamakan lembaga resmi/akademik (.go.id, .ac.id, .gov, .edu), ensiklopedia (Britannica), jurnal, dan museum. Jangan gunakan Quora, Brainly, Reddit, media sosial, Kompasiana, atau blog pribadi.
- Buka halaman sumber dengan web_fetch dan salin kutipan VERBATIM (persis, tanpa parafrase, 1–2 kalimat) yang mendukung klaim, beserta URL lengkap.
- Lakukan pencarian bantahan untuk tiap klaim (mis. "<klaim> mitos", "hoaks", cekfakta.com, turnbackhoax.id, snopes). Laporkan bantahan kredibel beserta kutipan verbatim dan URL.
- Buang klaim yang hanya didukung satu sumber atau sumber lemah.
Tulis laporan per klaim: teks klaim (Bahasa Indonesia), sumber pendukung (URL, judul, kutipan), sumber bantahan (URL, judul, kutipan).`;

const EXTRACT_SYSTEM = `Ubah laporan riset menjadi JSON sesuai schema. Beri id klaim c1, c2, … berurutan. Salin URL, judul, dan kutipan PERSIS seperti di laporan; jangan menambah sumber, mengubah kutipan, atau mengarang URL. Klaim tanpa sumber pendukung tetap dimasukkan dengan supporting [].`;

const IDEATE_SYSTEM = `Kamu produser konten trivia & hidden knowledge berbahasa Indonesia untuk TikTok/Threads. Hasilkan ide yang mengejutkan tapi bisa diverifikasi dari sumber kredibel. Hindari politik praktis, SARA, klaim kesehatan/keuangan, tokoh yang masih hidup, dan mitos populer yang sudah dibantah. Setiap ide: judul, hook ≤ 12 kata, sudut pandang (angle), dan daftar klaim spesifik yang harus diverifikasi.`;

/**
 * Pembungkus Claude API untuk semua stage berbasis LLM. Semua request memakai
 * adaptive thinking, effort per stage, fallback server-side, dan cek
 * `stop_reason` sebelum membaca konten.
 */
export class ClaudeClient {
  private readonly client: Anthropic;
  readonly model: string;

  constructor(opts: { apiKey?: string; model?: string; client?: Anthropic } = {}) {
    this.client = opts.client ?? new Anthropic(opts.apiKey ? { apiKey: opts.apiKey } : {});
    this.model = opts.model ?? CLAUDE_MODEL;
  }

  async ideate(input: { pillar: PillarStyle; count: number; recentTitles: string[] }): Promise<ClaudeResult<IdeaList>> {
    const text = [
      `Pillar: ${input.pillar.name} (tone: ${input.pillar.tone}).`,
      `Buat ${input.count} ide.`,
      input.recentTitles.length ? `Jangan mengulang judul yang sudah pernah dibuat:\n- ${input.recentTitles.join("\n- ")}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");
    return this.structured(IdeaListSchema, { system: IDEATE_SYSTEM, content: [{ type: "text", text }], effort: "medium" });
  }

  /** Research call dengan web_search/web_fetch; hasilnya teks laporan (structured output tidak bisa digabung dengan tools ini). */
  async research(input: { topic: string; claimsToVerify?: string[] }): Promise<ClaudeResult<string>> {
    const messages: Anthropic.Beta.BetaMessageParam[] = [
      {
        role: "user",
        content: [
          `Topik: ${input.topic}`,
          input.claimsToVerify?.length ? `Klaim awal yang perlu diverifikasi:\n- ${input.claimsToVerify.join("\n- ")}` : "",
        ]
          .filter(Boolean)
          .join("\n\n"),
      },
    ];
    const usage: ClaudeUsage[] = [];
    for (let turn = 0; turn < 6; turn++) {
      const res = await this.client.beta.messages.create({
        model: this.model,
        max_tokens: 16000,
        betas: [FALLBACK_BETA],
        fallbacks: "default",
        thinking: { type: "adaptive" },
        output_config: { effort: "high" },
        system: RESEARCH_SYSTEM,
        tools: [
          { type: "web_search_20260209", name: "web_search", max_uses: 10 },
          { type: "web_fetch_20260209", name: "web_fetch", max_uses: 12 },
        ],
        messages,
      });
      usage.push(toUsage(res));
      assertNotRefused(res);
      if (res.stop_reason === "pause_turn") {
        // Turn server-tool yang panjang dijeda; lanjutkan dengan mengirim balik konten apa adanya.
        messages.push({ role: "assistant", content: res.content });
        continue;
      }
      const report = res.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("\n");
      if (!report.trim()) throw new Error("research call selesai tanpa laporan");
      return { data: report, usage };
    }
    throw new Error("research call masih pause_turn setelah 6 lanjutan");
  }

  async extractResearch(report: string): Promise<ClaudeResult<ResearchResult>> {
    return this.structured(ResearchResultSchema, {
      system: EXTRACT_SYSTEM,
      content: [{ type: "text", text: report }],
      effort: "low",
    });
  }

  async writeScript(
    input: { topic: string; facts: FactSheet; pillar: PillarStyle; maxVideoScenes: number },
    validate: (script: Script) => string[] = () => [],
  ): Promise<ClaudeResult<Script>> {
    const verified = input.facts.claims
      .filter((c) => c.status === "verified")
      .map((c) => ({ id: c.id, text: c.text }));
    const text = [
      `Topik: ${input.topic}`,
      `Pillar: ${input.pillar.name} (tone: ${input.pillar.tone})`,
      `Maksimal scene video: ${input.maxVideoScenes}`,
      `FactSheet (hanya klaim terverifikasi):\n${JSON.stringify(verified, null, 2)}`,
    ].join("\n\n");
    return this.structured(ScriptSchema, {
      system: SCRIPT_SYSTEM,
      content: [{ type: "text", text }],
      effort: "high",
      validate,
    });
  }

  async planEdit(
    input: { script: Script; words: DisplayWord[]; scenes: SceneKeyframe[] },
    validate: (plan: EditPlan) => string[] = () => [],
  ): Promise<ClaudeResult<EditPlan>> {
    const content: UserContent = [
      {
        type: "text",
        text: [
          `Naskah:\n${input.script.sentences.map((s, i) => `${i}. ${s.display}`).join("\n")}`,
          `Hook naskah: ${input.script.hook}`,
          `Kata voice over (indeks:kata):\n${input.words.map((w, i) => `${i}:${w.text}`).join(" ")}`,
          `Scene:\n${input.script.scenes
            .map((s) => `${s.id}: kalimat ${s.fromSentence}-${s.toSentence}, onScreenText=${JSON.stringify(s.onScreenText)}`)
            .join("\n")}`,
        ].join("\n\n"),
      },
    ];
    for (const scene of input.scenes) {
      content.push({
        type: "text",
        text: `Keyframe scene ${scene.sceneId} — assetId ${scene.assetId} (${scene.kind}${scene.durationMs ? `, ${scene.durationMs}ms` : ""}):`,
      });
      content.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: scene.keyframe.toString("base64") } });
    }
    return this.structured(EditPlanSchema, { system: EDIT_SYSTEM, content, effort: "high", validate });
  }

  /**
   * Structured output + repair loop: pelanggaran validasi dikirim sebagai user
   * turn baru (history tidak pernah diedit), maksimal `maxRepairs` kali.
   */
  private async structured<T>(
    schema: z.ZodType<T>,
    req: { system: string; content: UserContent; effort: Effort; validate?: (data: T) => string[]; maxRepairs?: number },
  ): Promise<ClaudeResult<T>> {
    const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: req.content }];
    const usage: ClaudeUsage[] = [];
    const maxRepairs = req.maxRepairs ?? 2;
    // Hanya type + schema yang dikirim; parsing & validasi Zod dilakukan sendiri
    // agar kegagalan schema ikut masuk repair loop alih-alih melempar error.
    const { type, schema: jsonSchema } = betaZodOutputFormat(schema);
    let issues: string[] = [];

    for (let attempt = 0; attempt <= maxRepairs; attempt++) {
      const res = await this.client.beta.messages.create({
        model: this.model,
        max_tokens: 16000,
        betas: [FALLBACK_BETA],
        fallbacks: "default",
        thinking: { type: "adaptive" },
        output_config: { effort: req.effort, format: { type, schema: jsonSchema } },
        system: [{ type: "text", text: req.system, cache_control: { type: "ephemeral" } }],
        messages,
      });
      usage.push(toUsage(res));
      assertNotRefused(res);
      if (res.stop_reason === "max_tokens") throw new Error("output Claude terpotong (max_tokens)");

      const text = res.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
      const parsed = safeJson(text);
      const result = parsed.ok ? schema.safeParse(parsed.value) : null;
      let data: T | null = null;
      if (!parsed.ok) issues = [`output bukan JSON valid: ${parsed.error}`];
      else if (!result?.success) issues = (result?.error.issues ?? []).map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`);
      else {
        data = result.data;
        issues = req.validate?.(data) ?? [];
      }
      if (data !== null && issues.length === 0) return { data, usage };

      messages.push(
        { role: "assistant", content: res.content },
        {
          role: "user",
          content: `Output belum valid:\n- ${issues.join("\n- ")}\n\nPerbaiki semua poin di atas dan kirim ulang JSON lengkap.`,
        },
      );
    }
    throw new ClaudeValidationError(issues);
  }
}

function safeJson(text: string): { ok: true; value: unknown } | { ok: false; error: string } {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

function assertNotRefused(res: Anthropic.Beta.BetaMessage): void {
  if (res.stop_reason === "refusal") {
    throw new ClaudeRefusalError(res.stop_details?.category ?? null, res.stop_details?.explanation ?? null);
  }
}

function toUsage(res: Anthropic.Beta.BetaMessage): ClaudeUsage {
  const u = res.usage;
  return {
    model: res.model,
    inputTokens: u.input_tokens,
    outputTokens: u.output_tokens,
    cacheReadTokens: u.cache_read_input_tokens ?? 0,
    cacheWriteTokens: u.cache_creation_input_tokens ?? 0,
    webSearches: u.server_tool_use?.web_search_requests ?? 0,
    webFetches: u.server_tool_use?.web_fetch_requests ?? 0,
  };
}
