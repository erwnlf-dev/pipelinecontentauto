import { type Script, spokenText, syntheticAlignment } from "@pca/core";
import { alignmentToSpokenWords, buildDisplayWords } from "../src";

/** Word timings sintetis untuk sebuah script (tanpa TTS). */
export function wordsFor(script: Script, msPerChar = 65) {
  const { text } = spokenText(script);
  const alignment = syntheticAlignment(text, { msPerChar });
  const spoken = alignmentToSpokenWords(alignment, script);
  const display = buildDisplayWords(script, spoken);
  const durationMs = Math.round(alignment.character_end_times_seconds.at(-1)! * 1000);
  return { spoken, display, durationMs };
}

export function oneSentenceScript(display: string, spoken: string): Script {
  return {
    title: "t",
    hook: "h",
    sentences: [{ display, spoken, claimIds: [] }],
    scenes: [],
    postCaption: "",
    hashtags: [],
  };
}
