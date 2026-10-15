import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import type { Timeline } from "@pca/core";
import { serveDirectory } from "./static-server";

const here = dirname(fileURLToPath(import.meta.url));
let bundled: Promise<string> | null = null;

/** Bundle Remotion sekali per proses (di produksi: sekali saat build image renderer). */
function getBundle(): Promise<string> {
  bundled ??= bundle({ entryPoint: join(here, "entry.ts") });
  return bundled;
}

/** Pakai Chromium headless shell yang sudah terpasang bila ada, agar tidak perlu download. */
function defaultBrowserExecutable(): string | null {
  const fromEnv = process.env.REMOTION_BROWSER_EXECUTABLE;
  if (fromEnv) return fromEnv;
  const playwright = "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell";
  return existsSync(playwright) ? playwright : null;
}

export interface RenderOptions {
  timeline: Timeline;
  /** Direktori berisi semua asset; `asset.key` relatif terhadap direktori ini. */
  assetDir: string;
  outFile: string;
  concurrency?: number;
  onProgress?: (progress: number) => void;
}

export async function renderTimeline(opts: RenderOptions): Promise<void> {
  const serveUrl = await getBundle();
  const server = await serveDirectory(opts.assetDir);
  const browserExecutable = defaultBrowserExecutable();
  try {
    const inputProps = { timeline: opts.timeline, assetBaseUrl: server.url };
    const composition = await selectComposition({ serveUrl, id: "ShortVideo", inputProps, browserExecutable });
    await renderMedia({
      composition,
      serveUrl,
      codec: "h264",
      outputLocation: opts.outFile,
      inputProps,
      browserExecutable,
      concurrency: opts.concurrency ?? null,
      onProgress: ({ progress }) => opts.onProgress?.(progress),
    });
  } finally {
    await server.close();
  }
}
