import type { JimpConstructors } from "@jimp/core/types/jimp";
import configure from "@jimp/custom";
import png from "@jimp/png";
import resize from "@jimp/plugin-resize";

const Jimp = configure({
  types: [png],
  plugins: [resize]
}) as JimpConstructors;

export default Jimp;
