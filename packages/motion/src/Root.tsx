import { Composition } from "remotion";
import { KarhutlaReel, calculateKarhutlaMetadata } from "./karhutla/Composition";
import { theme } from "./theme";

export const RemotionRoot: React.FC = () => (
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
);
