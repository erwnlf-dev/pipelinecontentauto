import { Config } from "@remotion/cli/config";

// WebGL (Three.js) di headless Chrome. Mesin tanpa GPU: override dengan `--gl=swangle`.
Config.setChromiumOpenGlRenderer("angle");
Config.setVideoImageFormat("jpeg");
Config.setCodec("h264");
Config.setCrf(16);
if (process.env.REMOTION_BROWSER_EXECUTABLE) Config.setBrowserExecutable(process.env.REMOTION_BROWSER_EXECUTABLE);
