import type { DisplayWord, EditPlan, Motion, Script } from "@pca/core";

const MOTION_CYCLE: Motion[] = ["zoomIn", "panL", "zoomOut", "panR", "panU"];

/**
 * EditPlan deterministik tanpa LLM: dipakai untuk dry-run (provider stub) dan
 * sebagai fallback bila stage EDIT gagal setelah batas repair loop.
 */
export function defaultEditPlan(
  script: Script,
  sceneAssets: Record<string, string>,
  words: DisplayWord[],
): EditPlan {
  const firstSentenceEnd = words.filter((w) => w.sentenceIdx === 0).at(-1)?.endMs ?? 2500;
  return {
    hook: { text: script.hook, endMs: Math.min(3000, Math.max(1500, firstSentenceEnd)) },
    musicMood: "curious",
    emphasisWordIdx: words.flatMap((w, i) => (/\d/.test(w.text) ? [i] : [])),
    scenes: script.scenes.map((scene, i) => {
      const assetId = sceneAssets[scene.id];
      if (!assetId) throw new Error(`tidak ada asset untuk scene ${scene.id}`);
      return {
        sceneId: scene.id,
        assetId,
        sourceInMs: 0,
        motion: MOTION_CYCLE[i % MOTION_CYCLE.length]!,
        focus: { x: 0.5, y: 0.45 },
        transitionIn: i % 2 === 0 ? "cut" : "fade",
        overlay: scene.onScreenText,
      };
    }),
  };
}
