import { BEATS, type Beat, type SceneId } from "./script";
import type { BeatAudio, VoiceoverManifest } from "./manifest";

export interface BeatTiming {
  beat: Beat;
  audio: BeatAudio;
  /** Frame absolut awal beat (visual HIT). */
  from: number;
  dur: number;
  /** Frame absolut awal klip VO. */
  voFrom: number;
}

export interface SceneTiming {
  id: SceneId;
  from: number;
  dur: number;
  /** Awal tiap beat relatif terhadap awal scene. */
  beats: number[];
  beatDurs: number[];
}

export interface ReelTiming {
  beats: BeatTiming[];
  scenes: SceneTiming[];
  total: number;
}

/** VO mulai 2 frame setelah HIT visual; 8 frame napas setelah kalimat selesai (hold). */
export const VO_LEAD_FRAMES = 2;
export const VO_TAIL_FRAMES = 8;

/**
 * Grid beat dari durasi klip VO hasil ElevenLabs: durasi beat = max(minSec, VO + napas).
 * Jadi visual tidak pernah memotong kalimat, dan ritme 2.5–3.5 s tetap terjaga.
 */
export function computeTiming(manifest: VoiceoverManifest, fps: number): ReelTiming {
  const byId = new Map(manifest.beats.map((b) => [b.id, b]));
  let cursor = 0;
  const beats: BeatTiming[] = BEATS.map((beat) => {
    const audio = byId.get(beat.id);
    if (!audio) throw new Error(`voiceover.json tidak punya beat "${beat.id}" — jalankan pnpm audio`);
    const voFrames = Math.ceil((audio.durationMs * fps) / 1000);
    const dur = Math.max(Math.round(beat.minSec * fps), VO_LEAD_FRAMES + voFrames + VO_TAIL_FRAMES);
    const t: BeatTiming = { beat, audio, from: cursor, dur, voFrom: cursor + VO_LEAD_FRAMES };
    cursor += dur;
    return t;
  });

  const scenes: SceneTiming[] = [];
  for (const b of beats) {
    const last = scenes[scenes.length - 1];
    if (last && last.id === b.beat.scene) {
      last.beats.push(b.from - last.from);
      last.beatDurs.push(b.dur);
      last.dur += b.dur;
    } else {
      scenes.push({ id: b.beat.scene, from: b.from, dur: b.dur, beats: [0], beatDurs: [b.dur] });
    }
  }
  return { beats, scenes, total: cursor };
}
