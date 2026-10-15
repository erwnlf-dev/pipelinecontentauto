import { CharAlignmentSchema } from "@pca/core";
import { z } from "zod";
import type { TtsProvider, TtsResult } from "./types";

const ResponseSchema = z.object({
  audio_base64: z.string(),
  alignment: CharAlignmentSchema.nullable(),
  normalized_alignment: CharAlignmentSchema.nullable().optional(),
});

export interface ElevenLabsOptions {
  apiKey: string;
  /** `eleven_v4` (terbaru) atau `eleven_multilingual_v2`; keduanya mendukung Bahasa Indonesia. */
  modelId?: string;
  outputFormat?: string;
  /** Kode bahasa ISO 639-1; hanya dikirim bila diisi. */
  languageCode?: string;
  /** Locator pronunciation dictionary untuk nama asing. */
  pronunciationDictionaries?: { pronunciation_dictionary_id: string; version_id?: string }[];
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

/**
 * TTS ElevenLabs via `POST /v1/text-to-speech/{voice_id}/with-timestamps`.
 * Seluruh script dikirim dalam satu call agar intonasi menyambung dan
 * timing kata konsisten. Timing diambil dari `alignment` (bukan
 * `normalized_alignment`) karena itulah yang sesuai dengan teks input.
 */
export class ElevenLabsTts implements TtsProvider {
  readonly sku = "elevenlabs:tts";
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly opts: ElevenLabsOptions) {
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  async synthesize({ text, voiceId }: { text: string; voiceId: string }): Promise<TtsResult> {
    const base = this.opts.baseUrl ?? "https://api.elevenlabs.io";
    const format = this.opts.outputFormat ?? "mp3_44100_128";
    const url = `${base}/v1/text-to-speech/${encodeURIComponent(voiceId)}/with-timestamps?output_format=${format}`;
    const body: Record<string, unknown> = {
      text,
      model_id: this.opts.modelId ?? "eleven_multilingual_v2",
    };
    if (this.opts.languageCode) body.language_code = this.opts.languageCode;
    if (this.opts.pronunciationDictionaries?.length) {
      body.pronunciation_dictionary_locators = this.opts.pronunciationDictionaries;
    }

    const res = await this.fetchImpl(url, {
      method: "POST",
      headers: { "xi-api-key": this.opts.apiKey, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 500)}`);
    }
    const json = ResponseSchema.parse(await res.json());
    if (!json.alignment) {
      // Beberapa model tidak mengembalikan alignment; gunakan forced alignment sebagai fallback.
      throw new Error("ElevenLabs tidak mengembalikan alignment untuk model ini; pakai /v1/forced-alignment");
    }
    return {
      audio: Buffer.from(json.audio_base64, "base64"),
      format: format.startsWith("mp3") ? "mp3" : "wav",
      alignment: json.alignment,
      characters: text.length,
    };
  }
}
