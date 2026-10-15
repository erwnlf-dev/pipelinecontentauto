import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { type Server, createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { extname, join, normalize, sep } from "node:path";

const TYPES: Record<string, string> = {
  ".mp4": "video/mp4",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

/** Server statis minimal (dengan Range) agar Chrome milik Remotion bisa membaca asset lokal per job. */
export async function serveDirectory(root: string): Promise<{ url: string; close: () => Promise<void> }> {
  const base = normalize(root + sep);
  const server: Server = createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url ?? "/", "http://x").pathname);
      const file = normalize(join(base, pathname));
      if (!file.startsWith(base)) {
        res.writeHead(403).end();
        return;
      }
      const info = await stat(file);
      const type = TYPES[extname(file).toLowerCase()] ?? "application/octet-stream";
      const range = req.headers.range?.match(/bytes=(\d*)-(\d*)/);
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Accept-Ranges", "bytes");
      if (range) {
        const start = range[1] ? Number(range[1]) : 0;
        const end = range[2] ? Math.min(Number(range[2]), info.size - 1) : info.size - 1;
        res.writeHead(206, { "Content-Type": type, "Content-Length": end - start + 1, "Content-Range": `bytes ${start}-${end}/${info.size}` });
        createReadStream(file, { start, end }).pipe(res);
      } else {
        res.writeHead(200, { "Content-Type": type, "Content-Length": info.size });
        createReadStream(file).pipe(res);
      }
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise<void>((ok) => server.listen(0, "127.0.0.1", ok));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}/`,
    close: () => new Promise<void>((ok) => server.close(() => ok())),
  };
}
