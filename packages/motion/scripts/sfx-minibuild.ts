/**
 * Generate kit SFX ASMR untuk MiniBuild8s / MiniBuild15s.
 *
 *   pnpm --filter @pca/motion sfx:minibuild        # live: ElevenLabs /v1/sound-generation
 *   pnpm --filter @pca/motion sfx:minibuild --dry  # tanpa API: kit sintetis (WAV)
 *
 * Output: public/minibuild/sfx/* + src/miniBuild/generated/sfx.json.
 * File yang sudah ada tidak digenerate ulang (hemat kredit); pakai --force untuk mengulang.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { renameSync } from "node:fs";
import { ElevenLabsSfx, run } from "@pca/providers";
import type { SfxManifest } from "../src/miniBuild/AudioLayer";
import type { SfxId } from "../src/miniBuild/plan";
import { SFX_PROMPTS } from "../src/miniBuild/sfx";
import { synthSfx } from "./synth-sfx";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public/minibuild/sfx");
const manifestFile = join(root, "src/miniBuild/generated/sfx.json");
const args = new Set(process.argv.slice(2));
const dry = args.has("--dry");
const force = args.has("--force");

/** Peak-normalize one-shot ke −1 dBFS: hasil ElevenLabs levelnya bervariasi (mis. tap −18 dB). */
async function normalizePeak(file: string): Promise<void> {
  const { stderr } = await run("ffmpeg", ["-hide_banner", "-i", file, "-af", "volumedetect", "-f", "null", "-"]);
  const max = Number(stderr.match(/max_volume: (-?[\d.]+) dB/)?.[1] ?? 0);
  const gain = -1 - max;
  if (Math.abs(gain) < 0.5) return;
  const tmp = file.replace(/(\.\w+)$/, ".norm$1");
  await run("ffmpeg", ["-y", "-v", "error", "-i", file, "-af", `volume=${gain.toFixed(1)}dB`, tmp]);
  renameSync(tmp, file);
  console.log(`    peak ${max} dB → −1 dB`);
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!dry && !apiKey) throw new Error("ELEVENLABS_API_KEY kosong — isi .env atau pakai --dry");
  const api = new ElevenLabsSfx({ apiKey: apiKey ?? "" });
  const sfx: Partial<Record<SfxId, string>> = {};
  const totalSec = Object.values(SFX_PROMPTS).reduce((n, p) => n + p.durationSec, 0);
  console.log(`${dry ? "DRY" : "LIVE"} · ${Object.keys(SFX_PROMPTS).length} SFX · ±${totalSec.toFixed(1)} s audio`);

  for (const [id, p] of Object.entries(SFX_PROMPTS) as [SfxId, (typeof SFX_PROMPTS)[SfxId]][]) {
    const rel = `minibuild/sfx/${id}.${dry ? "wav" : "mp3"}`;
    const file = join(root, "public", rel);
    if (dry) {
      synthSfx(id, file);
    } else if (force || !existsSync(file)) {
      const res = await api.generate({ text: p.text, durationSec: p.durationSec, promptInfluence: p.promptInfluence, loop: p.loop });
      writeFileSync(file, res.audio);
      console.log(`  ↓ ${rel} (${(res.audio.length / 1024).toFixed(0)} KB)`);
    } else {
      console.log(`  ✓ cache ${rel}`);
    }
    if (!p.loop) await normalizePeak(file);
    sfx[id] = rel;
  }
  const manifest: SfxManifest = { v: 1, mode: dry ? "dry" : "live", sfx };
  writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`→ ${manifestFile}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
