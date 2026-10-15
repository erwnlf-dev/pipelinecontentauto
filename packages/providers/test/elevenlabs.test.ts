import { syntheticAlignment } from "@pca/core";
import { describe, expect, it } from "vitest";
import { ElevenLabsTts } from "../src";

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
