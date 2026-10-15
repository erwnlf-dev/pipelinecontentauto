import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/** Jalankan ffmpeg/ffprobe; stderr disertakan di pesan error. */
export async function run(bin: "ffmpeg" | "ffprobe", args: string[]): Promise<{ stdout: string; stderr: string }> {
  try {
    return await execFileAsync(bin, args, { maxBuffer: 64 * 1024 * 1024 });
  } catch (e) {
    const err = e as Error & { stderr?: string };
    throw new Error(`${bin} gagal: ${err.message}\n${(err.stderr ?? "").slice(-2000)}`);
  }
}

export interface ProbeResult {
  durationMs: number;
  width: number | null;
  height: number | null;
  fps: number | null;
  videoCodec: string | null;
  audioCodec: string | null;
  sizeBytes: number;
}

export async function probe(file: string): Promise<ProbeResult> {
  const { stdout } = await run("ffprobe", ["-v", "error", "-show_format", "-show_streams", "-of", "json", file]);
  const json = JSON.parse(stdout) as {
    format: { duration?: string; size?: string };
    streams: { codec_type: string; codec_name: string; width?: number; height?: number; avg_frame_rate?: string }[];
  };
  const video = json.streams.find((s) => s.codec_type === "video");
  const audio = json.streams.find((s) => s.codec_type === "audio");
  let fps: number | null = null;
  if (video?.avg_frame_rate) {
    const [n, d] = video.avg_frame_rate.split("/").map(Number);
    if (n && d) fps = Math.round((n / d) * 100) / 100;
  }
  return {
    durationMs: Math.round(Number(json.format.duration ?? 0) * 1000),
    width: video?.width ?? null,
    height: video?.height ?? null,
    fps,
    videoCodec: video?.codec_name ?? null,
    audioCodec: audio?.codec_name ?? null,
    sizeBytes: Number(json.format.size ?? 0),
  };
}

/** Normalisasi klip hasil generate: 1080x1920 (crop tengah), 30fps CFR, H.264, tanpa audio. */
export async function normalizeClip(input: string, output: string): Promise<void> {
  await run("ffmpeg", [
    "-y", "-i", input,
    "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,format=yuv420p",
    "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-movflags", "+faststart",
    output,
  ]);
}

/** Keyframe JPEG untuk vision Claude (sisi terpanjang ±maxSide px). */
export async function extractKeyframe(input: string, output: string, atSec = 0, maxSide = 720): Promise<void> {
  await run("ffmpeg", [
    "-y", "-ss", String(atSec), "-i", input, "-frames:v", "1",
    "-vf", `scale='if(gt(iw,ih),${maxSide},-2)':'if(gt(iw,ih),-2,${maxSide})'`,
    "-q:v", "3", output,
  ]);
}

/** Normalisasi loudness ke target LUFS (default −14, standar platform short video). Video di-copy. */
export async function loudnorm(input: string, output: string, targetLufs = -14): Promise<void> {
  await run("ffmpeg", [
    "-y", "-i", input,
    "-af", `loudnorm=I=${targetLufs}:TP=-1.5:LRA=11`,
    "-ar", "48000", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart",
    output,
  ]);
}

/** Integrated loudness (LUFS) dari sebuah file. */
export async function measureLoudness(file: string): Promise<number> {
  const { stderr } = await run("ffmpeg", ["-hide_banner", "-i", file, "-af", "loudnorm=print_format=json", "-f", "null", "-"]);
  const match = stderr.match(/\{[\s\S]*?"input_i"[\s\S]*?\}/);
  if (!match) throw new Error("gagal membaca loudness dari ffmpeg");
  return Number((JSON.parse(match[0]) as { input_i: string }).input_i);
}
