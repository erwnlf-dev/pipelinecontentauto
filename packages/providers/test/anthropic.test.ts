import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import { DEMO_FACTSHEET, DEMO_SCRIPT } from "../../pipeline/src/demo";
import { ClaudeClient, ClaudeRefusalError, ClaudeValidationError } from "../src";

type Params = Record<string, unknown> & { messages: { role: string; content: unknown }[] };

function fakeClient(responses: Partial<Anthropic.Beta.BetaMessage>[]) {
  const calls: Params[] = [];
  const client = {
    beta: {
      messages: {
        create: async (params: Params) => {
          // Salin agar mutasi array messages setelah call tidak mengubah rekaman.
          calls.push({ ...params, messages: [...params.messages] });
          const r = responses.shift();
          if (!r) throw new Error("tidak ada respons palsu tersisa");
          return {
            model: "claude-opus-5-5",
            stop_reason: "end_turn",
            stop_details: null,
            content: [],
            usage: { input_tokens: 100, output_tokens: 50, cache_read_input_tokens: 0, cache_creation_input_tokens: 0, server_tool_use: null },
            ...r,
          };
        },
      },
    },
  } as unknown as Anthropic;
  return { client, calls };
}

const text = (t: string) => [{ type: "text", text: t }] as Anthropic.Beta.BetaContentBlock[];
const input = { topic: "Flamingo", facts: DEMO_FACTSHEET, pillar: { name: "sains", tone: "santai" }, maxVideoScenes: 2 };

describe("ClaudeClient.writeScript", () => {
  it("mengirim request dengan model, adaptive thinking, fallback, dan JSON schema", async () => {
    const { client, calls } = fakeClient([{ content: text(JSON.stringify(DEMO_SCRIPT)) }]);
    const res = await new ClaudeClient({ client }).writeScript(input);
    expect(res.data.title).toBe(DEMO_SCRIPT.title);
    const p = calls[0]!;
    expect(p.model).toBe("claude-opus-5-5");
    expect(p.thinking).toEqual({ type: "adaptive" });
    expect(p.fallbacks).toBe("default");
    expect(p.betas).toEqual(["server-side-fallback-2026-07-01"]);
    expect((p.output_config as { format: { type: string } }).format.type).toBe("json_schema");
    expect((p.output_config as { effort: string }).effort).toBe("high");
  });

  it("repair loop: error schema & validasi dikirim sebagai user turn baru tanpa mengedit history", async () => {
    const { client, calls } = fakeClient([
      { content: text('{"title": "kurang field"}') },
      { content: text(JSON.stringify({ ...DEMO_SCRIPT, hashtags: [] })) },
      { content: text(JSON.stringify(DEMO_SCRIPT)) },
    ]);
    const validate = (s: typeof DEMO_SCRIPT) => (s.hashtags.length ? [] : ["hashtags kosong"]);
    const res = await new ClaudeClient({ client }).writeScript(input, validate);

    expect(res.usage).toHaveLength(3);
    expect(calls).toHaveLength(3);
    expect(calls[1]!.messages).toHaveLength(3);
    expect(calls[2]!.messages).toHaveLength(5);
    expect(calls[2]!.messages[0]).toEqual(calls[0]!.messages[0]);
    expect(JSON.stringify(calls[1]!.messages[2])).toContain("sentences");
    expect(JSON.stringify(calls[2]!.messages[4])).toContain("hashtags kosong");
  });

  it("menyerah setelah batas repair", async () => {
    const bad = { content: text("bukan json") };
    const { client } = fakeClient([bad, bad, bad]);
    await expect(new ClaudeClient({ client }).writeScript(input)).rejects.toBeInstanceOf(ClaudeValidationError);
  });

  it("melempar ClaudeRefusalError saat stop_reason refusal", async () => {
    const { client } = fakeClient([
      { stop_reason: "refusal", stop_details: { type: "refusal", category: "cyber", explanation: "x" } as never },
    ]);
    await expect(new ClaudeClient({ client }).writeScript(input)).rejects.toBeInstanceOf(ClaudeRefusalError);
  });
});

describe("ClaudeClient.research", () => {
  it("melanjutkan pause_turn dan menghitung web search", async () => {
    const { client, calls } = fakeClient([
      {
        stop_reason: "pause_turn",
        content: text("sedang mencari"),
        usage: { input_tokens: 10, output_tokens: 5, cache_read_input_tokens: 0, cache_creation_input_tokens: 0, server_tool_use: { web_search_requests: 3, web_fetch_requests: 2 } } as never,
      },
      { content: text("Laporan: klaim c1 …") },
    ]);
    const res = await new ClaudeClient({ client }).research({ topic: "Flamingo" });
    expect(res.data).toBe("Laporan: klaim c1 …");
    expect(res.usage[0]!.webSearches).toBe(3);
    expect(calls[1]!.messages.at(-1)!.role).toBe("assistant");
    const tools = calls[0]!.tools as { type: string }[];
    expect(tools.map((t) => t.type)).toEqual(["web_search_20260209", "web_fetch_20260209"]);
  });
});
