import type { Timeline } from "@pca/core";
import { Composition } from "remotion";
import { ShortVideo, type ShortVideoProps } from "./ShortVideo";

const PLACEHOLDER: Timeline = {
  v: 1,
  fps: 30,
  w: 1080,
  h: 1920,
  durationMs: 3000,
  assets: {},
  video: [],
  audio: [],
  captions: [{ startMs: 0, endMs: 3000, words: [{ startMs: 0, endMs: 3000, text: "Load timeline.json via --props", emphasis: true }] }],
  overlays: [],
  speech: [],
};

export const RemotionRoot: React.FC = () => (
  <Composition
    id="ShortVideo"
    component={ShortVideo}
    width={1080}
    height={1920}
    fps={30}
    durationInFrames={90}
    defaultProps={{ timeline: PLACEHOLDER, assetBaseUrl: "http://127.0.0.1:3999/" } satisfies ShortVideoProps}
    calculateMetadata={({ props }) => ({
      fps: props.timeline.fps,
      width: props.timeline.w,
      height: props.timeline.h,
      durationInFrames: Math.max(1, Math.round((props.timeline.durationMs * props.timeline.fps) / 1000)),
    })}
  />
);
