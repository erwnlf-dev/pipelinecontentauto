import { resolve } from "node:path";
import { parseArgs } from "node:util";
import type { Mode } from "./config";
import { runLocal } from "./local-run";

const USAGE = `Pemakaian:
  pnpm pipeline run --topic "Kenapa flamingo berwarna pink?" [opsi]

Opsi:
  --mode stub|live     stub = dry-run tanpa API/biaya (default), live = provider asli dari .env
  --with-video         generate klip video untuk scene "video" (Gemini Omni di mode live)
  --max-video <n>      batas scene video per video (default 3)
  --pillar <nama>      content pillar (default "sains")
  --tone <teks>        tone pillar (default "santai, penasaran, akurat")
  --music <file>       musik latar berlisensi (opsional)
  --out <dir>          direktori output (default ./out)
  --force              lewati penyaring topik sensitif
`;

async function main() {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      topic: { type: "string" },
      mode: { type: "string", default: "stub" },
      "with-video": { type: "boolean", default: false },
      "max-video": { type: "string", default: "3" },
      pillar: { type: "string", default: "sains" },
      tone: { type: "string", default: "santai, penasaran, akurat" },
      music: { type: "string" },
      out: { type: "string", default: "out" },
      force: { type: "boolean", default: false },
      help: { type: "boolean", default: false },
    },
  });
  if (values.help || positionals[0] !== "run") {
    console.log(USAGE);
    process.exit(values.help ? 0 : 1);
  }
  const mode = values.mode as Mode;
  if (mode !== "stub" && mode !== "live") throw new Error(`mode tidak dikenal: ${values.mode}`);
  const topic = values.topic ?? (mode === "stub" ? "Kenapa flamingo berwarna pink?" : undefined);
  if (!topic) throw new Error("--topic wajib diisi di mode live");

  const summary = await runLocal({
    topic,
    mode,
    outRoot: resolve(process.env.INIT_CWD ?? process.cwd(), values.out!),
    withVideo: values["with-video"]!,
    maxVideoScenes: Number(values["max-video"]),
    pillar: { name: values.pillar!, tone: values.tone! },
    musicFile: values.music ? resolve(process.env.INIT_CWD ?? process.cwd(), values.music) : undefined,
    force: values.force,
  });
  console.log(`\nSelesai: ${summary.finalFile}`);
  process.exit(summary.qa.passed ? 0 : 2);
}

main().catch((e) => {
  console.error(`\n✗ ${(e as Error).message}`);
  process.exit(1);
});
