import {
  ClaudeClient,
  ElevenLabsTts,
  GeminiImage,
  GeminiVideo,
  type ImageProvider,
  StubImage,
  StubTts,
  StubVideo,
  type TtsProvider,
  type VideoProvider,
} from "@pca/providers";
import type { BudgetLimits } from "@pca/pipeline";

export type Mode = "stub" | "live";

export interface Providers {
  mode: Mode;
  claude: ClaudeClient | null;
  tts: TtsProvider;
  voiceId: string;
  image: ImageProvider;
  video: VideoProvider | null;
}

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`env ${name} wajib diisi untuk mode live (lihat .env.example)`);
  return v;
}

export function budgetFromEnv(): BudgetLimits {
  return {
    perVideoUsd: Number(process.env.BUDGET_PER_VIDEO_USD ?? 5),
    perDayUsd: Number(process.env.BUDGET_PER_DAY_USD ?? 20),
    killSwitch: process.env.KILL_SWITCH === "1",
  };
}

export function providersFor(mode: Mode, opts: { withVideo: boolean }): Providers {
  if (mode === "stub") {
    return {
      mode,
      claude: null,
      tts: new StubTts(),
      voiceId: "stub",
      image: new StubImage(),
      video: opts.withVideo ? new StubVideo() : null,
    };
  }
  const gemini = required("GEMINI_API_KEY");
  return {
    mode,
    claude: new ClaudeClient({ apiKey: required("ANTHROPIC_API_KEY"), model: process.env.CLAUDE_MODEL }),
    tts: new ElevenLabsTts({
      apiKey: required("ELEVENLABS_API_KEY"),
      modelId: process.env.ELEVENLABS_MODEL_ID ?? "eleven_multilingual_v2",
      languageCode: process.env.ELEVENLABS_LANGUAGE_CODE || undefined,
    }),
    voiceId: required("ELEVENLABS_VOICE_ID"),
    image: new GeminiImage({ apiKey: gemini, model: process.env.GEMINI_IMAGE_MODEL }),
    video: opts.withVideo
      ? new GeminiVideo({ apiKey: gemini, model: process.env.GEMINI_VIDEO_MODEL ?? "gemini-omni-1.1-flash" })
      : null,
  };
}
