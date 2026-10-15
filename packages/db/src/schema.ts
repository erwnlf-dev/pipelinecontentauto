import { sql } from "drizzle-orm";
import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { ClaimStatus, Stage, VideoStatus } from "@pca/core";

/*
 * Skema multi-tenant: setiap tabel bisnis punya workspace_id. Fase internal
 * cukup 1 workspace; fase SaaS tinggal menambah signup/billing tanpa migrasi
 * struktur. Artifact bersifat immutable dan berversi; tabel videos hanya
 * menyimpan pointer ke versi aktif.
 */

const id = () => uuid("id").primaryKey().defaultRandom();
const workspaceId = () =>
  uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" });
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const stageEnum = pgEnum("stage", [
  "IDEATE", "FACTCHECK", "SCRIPT", "VOICEOVER", "FOOTAGE", "EDIT", "RENDER", "QA", "PUBLISH",
] as const satisfies readonly Stage[]);

export const videoStatusEnum = pgEnum("video_status", [
  "draft", "running", "awaiting_script_approval", "awaiting_approval", "approved", "publishing", "published", "rejected", "failed",
] as const satisfies readonly VideoStatus[]);

export const claimStatusEnum = pgEnum("claim_status", ["verified", "rejected", "refuted"] as const satisfies readonly ClaimStatus[]);
export const platformEnum = pgEnum("platform", ["threads", "tiktok"]);
export const assetKindEnum = pgEnum("asset_kind", ["voice", "clip", "image", "music", "render", "keyframe"]);
export const runStatusEnum = pgEnum("run_status", ["queued", "running", "succeeded", "failed", "cancelled"]);
export const publicationStateEnum = pgEnum("publication_state", ["pending", "container_created", "published", "failed"]);
export const ledgerKindEnum = pgEnum("ledger_kind", ["reserve", "actual"]);
export const memberRoleEnum = pgEnum("member_role", ["owner", "editor", "reviewer"]);

export const workspaces = pgTable("workspaces", {
  id: id(),
  name: text("name").notNull(),
  perVideoBudgetUsd: doublePrecision("per_video_budget_usd").notNull().default(5),
  perDayBudgetUsd: doublePrecision("per_day_budget_usd").notNull().default(20),
  killSwitch: boolean("kill_switch").notNull().default(false),
  createdAt: createdAt(),
});

export const users = pgTable("users", {
  id: id(),
  email: text("email").notNull().unique(),
  name: text("name"),
  createdAt: createdAt(),
});

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    workspaceId: workspaceId(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: memberRoleEnum("role").notNull().default("editor"),
  },
  (t) => [primaryKey({ columns: [t.workspaceId, t.userId] })],
);

export const contentPillars = pgTable("content_pillars", {
  id: id(),
  workspaceId: workspaceId(),
  name: text("name").notNull(),
  tone: text("tone").notNull(),
  language: text("language").notNull().default("id"),
  voiceId: text("voice_id").notNull(),
  visualStylePreset: text("visual_style_preset"),
  scheduleCron: text("schedule_cron"),
  requireScriptApproval: boolean("require_script_approval").notNull().default(false),
  maxVideoScenes: integer("max_video_scenes").notNull().default(3),
  createdAt: createdAt(),
});

export const ideas = pgTable(
  "ideas",
  {
    id: id(),
    workspaceId: workspaceId(),
    pillarId: uuid("pillar_id").references(() => contentPillars.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    hook: text("hook"),
    angle: text("angle"),
    status: text("status").notNull().default("new"),
    createdAt: createdAt(),
  },
  (t) => [index("ideas_workspace_idx").on(t.workspaceId, t.createdAt)],
);

export const claims = pgTable("claims", {
  id: id(),
  workspaceId: workspaceId(),
  ideaId: uuid("idea_id")
    .notNull()
    .references(() => ideas.id, { onDelete: "cascade" }),
  /** Id lokal di FactSheet (c1, c2, …) yang dirujuk Script.sentences[].claimIds. */
  localId: text("local_id").notNull(),
  text: text("text").notNull(),
  status: claimStatusEnum("status").notNull(),
  reasons: jsonb("reasons").$type<string[]>().notNull().default([]),
  /** [{url, title, quote, domain, tier, quoteFound, snapshotHash}] */
  sources: jsonb("sources").notNull().default([]),
  createdAt: createdAt(),
});

export const videos = pgTable(
  "videos",
  {
    id: id(),
    workspaceId: workspaceId(),
    ideaId: uuid("idea_id").references(() => ideas.id, { onDelete: "set null" }),
    pillarId: uuid("pillar_id").references(() => contentPillars.id, { onDelete: "set null" }),
    status: videoStatusEnum("status").notNull().default("draft"),
    /** Pointer ke versi artifact aktif per stage: { SCRIPT: "<artifact id>", ... } */
    currentArtifactIds: jsonb("current_artifact_ids").$type<Partial<Record<Stage, string>>>().notNull().default({}),
    /** sha256 file render yang di-approve; render ulang membatalkan approval. */
    approvedRenderHash: text("approved_render_hash"),
    reviewNotes: text("review_notes"),
    error: text("error"),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("videos_status_idx").on(t.workspaceId, t.status)],
);

export const artifacts = pgTable(
  "artifacts",
  {
    id: id(),
    workspaceId: workspaceId(),
    videoId: uuid("video_id")
      .notNull()
      .references(() => videos.id, { onDelete: "cascade" }),
    stage: stageEnum("stage").notNull(),
    version: integer("version").notNull(),
    /** hash(stage, artifact hulu, prompt version, model, params) untuk idempotensi & cache. */
    inputHash: text("input_hash").notNull(),
    promptVersion: text("prompt_version"),
    model: text("model"),
    data: jsonb("data").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("artifacts_version_uq").on(t.videoId, t.stage, t.version),
    index("artifacts_input_hash_idx").on(t.videoId, t.stage, t.inputHash),
  ],
);

export const assets = pgTable(
  "assets",
  {
    id: id(),
    workspaceId: workspaceId(),
    videoId: uuid("video_id").references(() => videos.id, { onDelete: "cascade" }),
    kind: assetKindEnum("kind").notNull(),
    storageKey: text("storage_key"),
    mime: text("mime"),
    durationMs: integer("duration_ms"),
    provider: text("provider"),
    /** Id job async (mis. interaction Gemini Omni); retry melanjutkan polling, tidak submit ulang. */
    providerJobId: text("provider_job_id"),
    /** Cache footage: prompt visual yang sama tidak di-generate ulang. */
    visualPromptHash: text("visual_prompt_hash"),
    meta: jsonb("meta").notNull().default({}),
    createdAt: createdAt(),
  },
  (t) => [index("assets_prompt_hash_idx").on(t.workspaceId, t.visualPromptHash)],
);

export const stageRuns = pgTable(
  "stage_runs",
  {
    id: id(),
    workspaceId: workspaceId(),
    videoId: uuid("video_id")
      .notNull()
      .references(() => videos.id, { onDelete: "cascade" }),
    stage: stageEnum("stage").notNull(),
    /** Untuk re-run per scene; null = seluruh stage. */
    sceneId: text("scene_id"),
    attempt: integer("attempt").notNull().default(1),
    status: runStatusEnum("status").notNull().default("queued"),
    inputHash: text("input_hash").notNull(),
    artifactId: uuid("artifact_id").references(() => artifacts.id),
    error: text("error"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("stage_runs_video_idx").on(t.videoId, t.stage)],
);

export const socialAccounts = pgTable(
  "social_accounts",
  {
    id: id(),
    workspaceId: workspaceId(),
    platform: platformEnum("platform").notNull(),
    externalUserId: text("external_user_id").notNull(),
    displayName: text("display_name"),
    /** Fase SaaS: dienkripsi AES-GCM; fase internal boleh dari env. */
    accessToken: text("access_token").notNull(),
    refreshToken: text("refresh_token"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("social_accounts_uq").on(t.workspaceId, t.platform, t.externalUserId)],
);

export const publications = pgTable(
  "publications",
  {
    id: id(),
    workspaceId: workspaceId(),
    videoId: uuid("video_id")
      .notNull()
      .references(() => videos.id, { onDelete: "cascade" }),
    socialAccountId: uuid("social_account_id")
      .notNull()
      .references(() => socialAccounts.id, { onDelete: "cascade" }),
    platform: platformEnum("platform").notNull(),
    state: publicationStateEnum("state").notNull().default("pending"),
    /** Threads container id / TikTok publish_id; dicek dulu sebelum retry agar tidak double-post. */
    containerId: text("container_id"),
    platformPostId: text("platform_post_id"),
    url: text("url"),
    caption: text("caption"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    error: text("error"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("publications_once_uq").on(t.videoId, t.socialAccountId)],
);

export const priceTable = pgTable(
  "price_table",
  {
    sku: text("sku").notNull(),
    unit: text("unit").notNull(),
    usdPerUnit: doublePrecision("usd_per_unit").notNull(),
    verified: boolean("verified").notNull().default(false),
    effectiveFrom: timestamp("effective_from", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.sku, t.effectiveFrom] })],
);

export const costLedger = pgTable(
  "cost_ledger",
  {
    id: id(),
    workspaceId: workspaceId(),
    videoId: uuid("video_id").references(() => videos.id, { onDelete: "set null" }),
    stage: stageEnum("stage").notNull(),
    provider: text("provider").notNull(),
    sku: text("sku").notNull(),
    units: doublePrecision("units").notNull(),
    usd: doublePrecision("usd").notNull(),
    kind: ledgerKindEnum("kind").notNull(),
    settled: boolean("settled").notNull().default(false),
    day: text("day").notNull().default(sql`to_char(now() at time zone 'utc', 'YYYY-MM-DD')`),
    createdAt: createdAt(),
  },
  (t) => [index("cost_ledger_day_idx").on(t.workspaceId, t.day), index("cost_ledger_video_idx").on(t.videoId)],
);

export const musicTracks = pgTable("music_tracks", {
  id: id(),
  workspaceId: workspaceId(),
  storageKey: text("storage_key").notNull(),
  title: text("title").notNull(),
  mood: text("mood").notNull(),
  /** Bukti lisensi (nama lisensi, URL, tanggal) — wajib sebelum dipakai. */
  license: jsonb("license").notNull(),
  durationMs: integer("duration_ms"),
  createdAt: createdAt(),
});
