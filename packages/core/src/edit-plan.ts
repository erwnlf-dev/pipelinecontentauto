import { z } from "zod";

export const MOTIONS = ["none", "zoomIn", "zoomOut", "panL", "panR", "panU", "panD"] as const;
export const TRANSITIONS = ["cut", "fade", "zoom"] as const;
export const MUSIC_MOODS = ["curious", "epic", "calm", "tense", "upbeat"] as const;

export const MotionSchema = z.enum(MOTIONS);
export const TransitionSchema = z.enum(TRANSITIONS);
export const FocusSchema = z.object({ x: z.number(), y: z.number() });

/**
 * Output stage EDIT: hanya keputusan kreatif dari Claude. Semua timing
 * dihitung oleh `compileTimeline`, sehingga Claude tidak perlu berhitung ms.
 */
export const EditPlanSchema = z.object({
  hook: z.object({
    text: z.string(),
    endMs: z.number().int(),
  }),
  musicMood: z.enum(MUSIC_MOODS),
  /** Indeks ke daftar display words voice over yang diberi highlight. */
  emphasisWordIdx: z.array(z.number().int()),
  scenes: z.array(
    z.object({
      sceneId: z.string(),
      assetId: z.string(),
      sourceInMs: z.number().int(),
      motion: MotionSchema,
      /** Titik fokus 0..1 untuk zoom/pan, biasanya dari analisis vision. */
      focus: FocusSchema,
      transitionIn: TransitionSchema,
      overlay: z.string().nullable(),
    }),
  ),
});
export type EditPlan = z.infer<typeof EditPlanSchema>;
export type Motion = z.infer<typeof MotionSchema>;
export type Transition = z.infer<typeof TransitionSchema>;
