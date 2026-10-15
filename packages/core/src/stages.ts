export const STAGES = [
  "IDEATE",
  "FACTCHECK",
  "SCRIPT",
  "VOICEOVER",
  "FOOTAGE",
  "EDIT",
  "RENDER",
  "QA",
  "PUBLISH",
] as const;
export type Stage = (typeof STAGES)[number];

/** Dependency graph antar stage (stage → stage yang harus selesai dulu). */
export const STAGE_DEPS: Record<Stage, readonly Stage[]> = {
  IDEATE: [],
  FACTCHECK: ["IDEATE"],
  SCRIPT: ["FACTCHECK"],
  VOICEOVER: ["SCRIPT"],
  FOOTAGE: ["SCRIPT"],
  EDIT: ["VOICEOVER", "FOOTAGE"],
  RENDER: ["EDIT"],
  QA: ["RENDER"],
  PUBLISH: ["QA"],
};

/** Semua stage hilir (transitif) yang harus di-invalidate bila `stage` di-run ulang. */
export function downstreamOf(stage: Stage): Stage[] {
  const out = new Set<Stage>();
  const visit = (s: Stage) => {
    for (const candidate of STAGES) {
      if (STAGE_DEPS[candidate].includes(s) && !out.has(candidate)) {
        out.add(candidate);
        visit(candidate);
      }
    }
  };
  visit(stage);
  return STAGES.filter((s) => out.has(s));
}

/** Stage yang siap dijalankan: belum selesai dan semua dependency-nya selesai. */
export function runnableStages(done: ReadonlySet<Stage>): Stage[] {
  return STAGES.filter((s) => !done.has(s) && STAGE_DEPS[s].every((d) => done.has(d)));
}

export const VIDEO_STATUSES = [
  "draft",
  "running",
  "awaiting_script_approval",
  "awaiting_approval",
  "approved",
  "publishing",
  "published",
  "rejected",
  "failed",
] as const;
export type VideoStatus = (typeof VIDEO_STATUSES)[number];

const TRANSITIONS: Record<VideoStatus, readonly VideoStatus[]> = {
  draft: ["running"],
  running: ["awaiting_script_approval", "awaiting_approval", "failed"],
  awaiting_script_approval: ["running", "rejected"],
  // "running" = re-run stage/scene dengan catatan reviewer.
  awaiting_approval: ["approved", "rejected", "running"],
  // Render ulang membatalkan approval.
  approved: ["publishing", "running"],
  publishing: ["published", "failed"],
  published: [],
  rejected: ["running"],
  failed: ["running"],
};

export function canTransition(from: VideoStatus, to: VideoStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function assertTransition(from: VideoStatus, to: VideoStatus): void {
  if (!canTransition(from, to)) throw new Error(`transisi status tidak valid: ${from} → ${to}`);
}
