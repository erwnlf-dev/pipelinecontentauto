import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { syntheticAlignment } from "@pca/core";
import { run } from "./media";
import type { ImageProvider, ImageResult, TtsProvider, TtsResult, VideoJobState, VideoProvider } from "./types";

/*
 * Provider stub untuk dry-run tanpa biaya dan tanpa API key: hasilnya media
 * sintetis (nada, gradien) dengan bentuk data yang sama seperti provider asli.
 */

async function withTemp<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), "pca-stub-"));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const PALETTE = ["0xff6b9a", "0x2ec4b6", "0xffbf69", "0x5e60ce", "0x80ed99", "0xef476f", "0x118ab2", "0xf4a261"];

function colorsFor(prompt: string): [string, string, number] {
  const h = createHash("sha256").update(prompt).digest();
  return [PALETTE[h[0]! % PALETTE.length]!, PALETTE[h[1]! % PALETTE.length]!, h.readUInt16BE(2)];
}

export class StubTts implements TtsProvider {
  readonly sku = "stub";

  async synthesize({ text }: { text: string; voiceId: string }): Promise<TtsResult> {
    const alignment = syntheticAlignment(text);
    const seconds = alignment.character_end_times_seconds.at(-1) ?? 1;
    const audio = await withTemp(async (dir) => {
      const out = join(dir, "voice.mp3");
      // Nada lembut yang "berdenyut" supaya terdengar ada audio; bukan suara manusia.
      await run("ffmpeg", [
        "-y", "-f", "lavfi", "-i", `sine=frequency=196:sample_rate=44100:duration=${seconds.toFixed(3)}`,
        "-af", "volume=0.25,tremolo=f=3:d=0.6", "-c:a", "libmp3lame", "-b:a", "128k", out,
      ]);
      return readFile(out);
    });
    return { audio, format: "mp3", alignment, characters: text.length };
  }
}

export class StubImage implements ImageProvider {
  readonly sku = "stub";

  async generate({ prompt }: { prompt: string; aspectRatio: "9:16" }): Promise<ImageResult> {
    const [c0, c1, seed] = colorsFor(prompt);
    const data = await withTemp(async (dir) => {
      const out = join(dir, "image.png");
      await run("ffmpeg", [
        "-y", "-f", "lavfi", "-i", `gradients=s=1080x1920:c0=${c0}:c1=${c1}:seed=${seed}:type=radial`,
        "-frames:v", "1", out,
      ]);
      return readFile(out);
    });
    return { data, format: "png" };
  }
}

export class StubVideo implements VideoProvider {
  readonly sku = "stub";
  private readonly jobs = new Map<string, { prompt: string; durationSec: number }>();

  async submit(input: { prompt: string; aspectRatio: "9:16"; durationSec: number }) {
    const jobId = createHash("sha256").update(`${input.prompt}:${input.durationSec}`).digest("hex").slice(0, 16);
    this.jobs.set(jobId, { prompt: input.prompt, durationSec: input.durationSec });
    return { jobId };
  }

  async poll(jobId: string): Promise<VideoJobState> {
    const job = this.jobs.get(jobId);
    if (!job) return { state: "failed", reason: `job stub ${jobId} tidak dikenal`, safety: false };
    const [c0, c1, seed] = colorsFor(job.prompt);
    const video = await withTemp(async (dir) => {
      const out = join(dir, "clip.mp4");
      await run("ffmpeg", [
        "-y", "-f", "lavfi",
        "-i", `gradients=s=720x1280:c0=${c0}:c1=${c1}:seed=${seed}:speed=0.02:d=${job.durationSec}:r=24`,
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "veryfast", out,
      ]);
      return readFile(out);
    });
    return { state: "succeeded", video };
  }
}
