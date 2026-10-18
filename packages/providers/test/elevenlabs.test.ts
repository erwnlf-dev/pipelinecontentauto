import { syntheticAlignment } from "@pca/core";
import { describe, expect, it } from "vitest";
import { ElevenLabsSfx, ElevenLabsTts } from "../src";

describe("ElevenLabsTts", () => {
  it("memanggil endpoint with-timestamps dan mendekode audio + alignment", async () => {
    const seen: { url: string; init: RequestInit }[] = [];
    const alignment = syntheticAlignment("Halo dunia");
    const fetchImpl = (async (url: string, init: RequestInit) => {
      seen.push({ url, init });
      return new Response(JSON.stringify({ audio_base64: Buffer.from("mp3-bytes").toString("base64"), alignment, normalized_alignment: alignment }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }) as unknown as typeof fetch;

    const tts = new ElevenLabsTts({ apiKey: "k", modelId: "eleven_v4", languageCode: "id", fetchImpl });
    const res = await tts.synthesize({ text: "Halo dunia", voiceId: "voice 1" });

    expect(seen[0]!.url).toBe("https://api.elevenlabs.io/v1/text-to-speech/voice%201/with-timestamps?output_format=mp3_44100_128");
    expect((seen[0]!.init.headers as Record<string, string>)["xi-api-key"]).toBe("k");
    expect(JSON.parse(seen[0]!.init.body as string)).toEqual({ text: "Halo dunia", model_id: "eleven_v4", language_code: "id" });
    expect(res.audio.toString()).toBe("mp3-bytes");
    expect(res.alignment).toEqual(alignment);
    expect(res.characters).toBe(10);
  });

  it("melempar error berisi status bila API gagal", async () => {
    const fetchImpl = (async () => new Response("quota exceeded", { status: 401 })) as unknown as typeof fetch;
    await expect(new ElevenLabsTts({ apiKey: "k", fetchImpl }).synthesize({ text: "x", voiceId: "v" })).rejects.toThrow(/401/);
  });
});

describe("ElevenLabsTts konteks prosodi", () => {
  it("mengirim previous_text, next_text, dan voice_settings bila diisi", async () => {
    let body: Record<string, unknown> = {};
    const alignment = syntheticAlignment("Hangus.");
    const fetchImpl = (async (_url: string, init: RequestInit) => {
      body = JSON.parse(init.body as string);
      return new Response(JSON.stringify({ audio_base64: "", alignment }), { status: 200 });
    }) as unknown as typeof fetch;
    const tts = new ElevenLabsTts({ apiKey: "k", voiceSettings: { stability: 0.4, use_speaker_boost: true }, fetchImpl });
    await tts.synthesize({ text: "Hangus.", voiceId: "v", previousText: "Dua koma enam juta hektare.", nextText: "Empat setengah kali." });
    expect(body).toEqual({
      text: "Hangus.",
      model_id: "eleven_multilingual_v2",
      voice_settings: { stability: 0.4, use_speaker_boost: true },
      previous_text: "Dua koma enam juta hektare.",
      next_text: "Empat setengah kali.",
    });
  });
});

describe("ElevenLabsSfx", () => {
  it("memanggil /v1/sound-generation dan mengembalikan byte audio", async () => {
    const seen: { url: string; body: Record<string, unknown> }[] = [];
    const fetchImpl = (async (url: string, init: RequestInit) => {
      seen.push({ url, body: JSON.parse(init.body as string) });
      return new Response(Buffer.from("sfx-bytes"), { status: 200 });
    }) as unknown as typeof fetch;
    const res = await new ElevenLabsSfx({ apiKey: "k", fetchImpl }).generate({ text: "whoosh", durationSec: 1, promptInfluence: 0.7, loop: true });
    expect(seen[0]!.url).toBe("https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128");
    expect(seen[0]!.body).toEqual({ text: "whoosh", model_id: "eleven_text_to_sound_v2", duration_seconds: 1, prompt_influence: 0.7, loop: true });
    expect(res.audio.toString()).toBe("sfx-bytes");
  });

  it("melempar error berisi status bila API gagal", async () => {
    const fetchImpl = (async () => new Response("bad", { status: 422 })) as unknown as typeof fetch;
    await expect(new ElevenLabsSfx({ apiKey: "k", fetchImpl }).generate({ text: "x" })).rejects.toThrow(/422/);
  });
});
