import fs from "fs";
import path from "path";
import { DdsImage } from "../../dst/images";

const srcDir = path.resolve(__dirname, ".", "images");
const outDir = path.resolve(__dirname, ".", "out");
if (!fs.existsSync(srcDir)) fs.mkdirSync(srcDir, { recursive: true });
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

/*
  The below code takes the PNG, JPG, GIF, TIFF, and BMP images that exist in the
  "images" directory, converts them to unshuffled DDS images (DXT compression),
  and outputs them to the "out" directory. It should be verified that these are
  valid DDS images around 22KB, and are able to be rendered.

  DXT is a lossy compression format, so lower quality is expected for all
  conversions. PNG, GIF, and TIFF images should retain any transparency they
  previously had, and JPG should fill the transparent space with white pixels.
  BMP is not fully supported, but is included in the tests anyways - if the BMP
  image produces a DDS with inverted pixels shifted by 128 bytes, that is
  expected and accepted.
*/

["png", "jpg", "bmp", "gif", "tiff"].forEach(ext => {
  const srcPath = path.join(srcDir, `LB.${ext}`);
  const outPath = path.join(outDir, `LB-${ext}.dds`);
  const buffer = fs.readFileSync(srcPath);
  DdsImage.fromImageAsync(buffer)
    .then(dds => {
      fs.writeFileSync(outPath, dds.buffer);
    });
});

/*
  TODO:
*/

// const dxtSrcPath = path.join(srcDir, "LB.dds");
// const dxtOutPath = path.join(outDir, "LB-dxt.png");
// const dxtBuffer = fs.readFileSync(dxtSrcPath);

// DdsImage.fromImage(dxtBuffer)
//   .then(dxt => {
//     fs.writeFileSync(dxtOutPath, dxt.toImage());
//   });
