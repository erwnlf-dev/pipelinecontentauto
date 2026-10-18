import { Composition } from "remotion";
import { KarhutlaReel, calculateKarhutlaMetadata } from "./karhutla/Composition";
import { MiniBuildReel, calculateMiniBuildMetadata } from "./miniBuild/Composition";
import { theme } from "./theme";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="KarhutlaReel"
      component={KarhutlaReel}
      width={theme.safe.width}
      height={theme.safe.height}
      fps={30}
      durationInFrames={1000}
      defaultProps={{ showSafeZone: false }}
      calculateMetadata={calculateKarhutlaMetadata}
    />
    {/* Miniatur ASMR "Warung Mini": tempo storyboard (8 s) dan santai (15 s). */}
    <Composition
      id="MiniBuild8s"
      component={MiniBuildReel}
      width={theme.safe.width}
      height={theme.safe.height}
      fps={30}
      durationInFrames={240}
      defaultProps={{ pace: "storyboard" as const, showSafeZone: false }}
      calculateMetadata={calculateMiniBuildMetadata}
    />
    <Composition
      id="MiniBuild15s"
      component={MiniBuildReel}
      width={theme.safe.width}
      height={theme.safe.height}
      fps={30}
      durationInFrames={450}
      defaultProps={{ pace: "relaxed" as const, showSafeZone: false }}
      calculateMetadata={calculateMiniBuildMetadata}
    />
  </>
);
