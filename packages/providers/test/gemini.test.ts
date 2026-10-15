import type { GoogleGenAI } from "@google/genai";
import { describe, expect, it } from "vitest";
import { GeminiVideo } from "../src";

function fakeAi(getResult: unknown) {
  const created: unknown[] = [];
  const client = {
    interactions: {
      create: async (p: unknown) => {
        created.push(p);
        return { id: "int-1", status: "in_progress" };
      },
      get: async () => getResult,
    },
  } as unknown as GoogleGenAI;
  return { client, created };
}

describe("GeminiVideo", () => {
  it("submit memakai background + response_format video 9:16 dan durasi dibatasi 3–10 detik", async () => {
    const { client, created } = fakeAi({});
    const v = new GeminiVideo({ apiKey: "k", client });
    expect(await v.submit({ prompt: "flamingo", aspectRatio: "9:16", durationSec: 14 })).toEqual({ jobId: "int-1" });
    expect(created[0]).toMatchObject({
      model: "gemini-omni-1.1-flash",
      background: true,
      response_format: { type: "video", aspect_ratio: "9:16", duration: "10s", resolution: "720p" },
    });
    expect(v.sku).toBe("google:gemini-omni-1.1-flash:720p");
  });

  it("poll memetakan status interaction", async () => {
    const running = new GeminiVideo({ apiKey: "k", client: fakeAi({ id: "x", status: "in_progress", steps: [] }).client });
    expect(await running.poll("x")).toEqual({ state: "running" });

    const done = new GeminiVideo({
      apiKey: "k",
      client: fakeAi({
        id: "x",
        status: "completed",
        steps: [{ type: "model_output", content: [{ type: "video", data: Buffer.from("vid").toString("base64") }] }],
      }).client,
    });
    const ok = await done.poll("x");
    expect(ok.state).toBe("succeeded");
    expect(ok.state === "succeeded" && ok.video.toString()).toBe("vid");

    const blocked = new GeminiVideo({
      apiKey: "k",
      client: fakeAi({ id: "x", status: "failed", steps: [], errors: [{ code: "SAFETY", message: "blocked by safety filters" }] }).client,
    });
    expect(await blocked.poll("x")).toMatchObject({ state: "failed", safety: true });
  });
});
