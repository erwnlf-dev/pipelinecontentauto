import { GoogleGenAI, type GoogleGenAIInteraction } from "@google/genai";
import type { ImageProvider, ImageResult, VideoJobState, VideoProvider } from "./types";

type Interaction = GoogleGenAIInteraction;
type ContentBlock = { type: string; data?: string; uri?: string; mime_type?: string };

export interface GeminiVideoOptions {
  apiKey: string;
  /** Default `gemini-omni-1.1-flash`; alternatif murah `veo-3.1-lite-generate-preview`. */
  model?: string;
  /** Resolusi output; 720p native, 1080p/4k hasil upscale dan lebih mahal. */
  resolution?: "360p" | "720p" | "1080p";
  fetchImpl?: typeof fetch;
  /** Untuk test: client Gemini yang sudah dibuat. */
  client?: GoogleGenAI;
}

/** Ambil konten media (video/gambar) pertama dari interaction, termasuk dari steps. */
function findMedia(interaction: Interaction, type: "video" | "image"): ContentBlock | undefined {
  const direct = (type === "video" ? interaction.output_video : interaction.output_image) as ContentBlock | undefined;
  if (direct?.data || direct?.uri) return direct;
  for (const step of interaction.steps ?? []) {
    if (step.type !== "model_output") continue;
    for (const c of (step as { content?: ContentBlock[] }).content ?? []) {
      if (c.type === type && (c.data || c.uri)) return c;
    }
  }
  return undefined;
}

function describeErrors(interaction: Interaction): string {
  return (interaction.errors ?? []).map((e: { code?: string; message?: string }) => `${e.code ?? ""} ${e.message ?? ""}`.trim()).join("; ") || interaction.status;
}

const looksLikeSafetyBlock = (text: string) => /safety|blocked|policy|prohibited|responsible ai/i.test(text);

/**
 * Gemini Omni (atau Veo) lewat Interactions API: `background: true` lalu
 * polling `interactions.get`. Webhook Omni dilaporkan belum andal, jadi
 * worker memakai polling terjadwal.
 */
export class GeminiVideo implements VideoProvider {
  readonly sku: string;
  private readonly ai: GoogleGenAI;
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly opts: GeminiVideoOptions) {
    this.ai = opts.client ?? new GoogleGenAI({ apiKey: opts.apiKey });
    this.fetchImpl = opts.fetchImpl ?? fetch;
    const model = opts.model ?? "gemini-omni-1.1-flash";
    this.sku = model.startsWith("veo-3.1-lite") ? "google:veo-3.1-lite:720p" : `google:${model}:${opts.resolution ?? "720p"}`;
  }

  async submit(input: { prompt: string; aspectRatio: "9:16"; durationSec: number; referenceImage?: Buffer }) {
    const durationSec = Math.min(10, Math.max(3, Math.round(input.durationSec)));
    const content: ContentBlock[] = [{ type: "text", text: input.prompt } as ContentBlock];
    if (input.referenceImage) {
      content.push({ type: "image", data: input.referenceImage.toString("base64"), mime_type: "image/png" });
    }
    const interaction = await this.ai.interactions.create({
      model: this.opts.model ?? "gemini-omni-1.1-flash",
      background: true,
      input: content as never,
      response_format: {
        type: "video",
        aspect_ratio: input.aspectRatio,
        // Format durasi mengikuti Duration JSON ("8s"); verifikasi saat run pertama.
        duration: `${durationSec}s`,
        resolution: this.opts.resolution ?? "720p",
        delivery: "inline",
      },
    });
    return { jobId: interaction.id };
  }

  async poll(jobId: string): Promise<VideoJobState> {
    const interaction = await this.ai.interactions.get(jobId);
    switch (interaction.status) {
      case "queued":
      case "in_progress":
        return { state: "running" };
      case "completed": {
        const media = findMedia(interaction, "video");
        if (!media) return { state: "failed", reason: "interaction selesai tanpa output video", safety: false };
        return { state: "succeeded", video: await this.download(media) };
      }
      default: {
        const reason = describeErrors(interaction);
        return { state: "failed", reason, safety: looksLikeSafetyBlock(reason) };
      }
    }
  }

  private async download(media: ContentBlock): Promise<Buffer> {
    if (media.data) return Buffer.from(media.data, "base64");
    const res = await this.fetchImpl(media.uri!, { headers: { "x-goog-api-key": this.opts.apiKey } });
    if (!res.ok) throw new Error(`gagal mengunduh video ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }
}

export interface GeminiImageOptions {
  apiKey: string;
  /** Model gambar Gemini; cek harga per gambar di halaman pricing. */
  model?: string;
  client?: GoogleGenAI;
}

/** Gambar 9:16 untuk scene non-video (dianimasikan Ken Burns saat render). */
export class GeminiImage implements ImageProvider {
  readonly sku = "google:image";
  private readonly ai: GoogleGenAI;

  constructor(private readonly opts: GeminiImageOptions) {
    this.ai = opts.client ?? new GoogleGenAI({ apiKey: opts.apiKey });
  }

  async generate(input: { prompt: string; aspectRatio: "9:16" }): Promise<ImageResult> {
    const interaction = await this.ai.interactions.create({
      model: this.opts.model ?? "gemini-3.1-flash-image",
      input: input.prompt,
      response_format: { type: "image", aspect_ratio: input.aspectRatio, delivery: "inline", mime_type: "image/png" },
    });
    const media = findMedia(interaction, "image");
    if (!media?.data) throw new Error(`model gambar tidak mengembalikan gambar: ${describeErrors(interaction)}`);
    return { data: Buffer.from(media.data, "base64"), format: media.mime_type === "image/jpeg" ? "jpg" : "png" };
  }
}
