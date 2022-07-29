import fs from "fs";
import path from "path";
import { DdsImage } from "../../dst/images";

const srcDir = path.resolve(__dirname, ".", "images");
if (!fs.existsSync(srcDir)) fs.mkdirSync(srcDir, { recursive: true });

const outDir = path.resolve(__dirname, ".", "out");
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const otherFileExtensions = [
  "png",
  // "jpeg",
  // "bmp",
  // "gif",
  // "tiff",
];

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

otherFileExtensions.forEach(ext => {
  // LB images
  const srcPath = path.join(srcDir, `LB.${ext}`);
  const outPath = path.join(outDir, `import-LB-${ext}.dds`);
  const buffer = fs.readFileSync(srcPath);
  DdsImage.fromImageAsync(buffer)
    .then(dds => {
      fs.writeFileSync(outPath, dds.buffer);
    });

  // Other images
  const otherSrcPath = path.join(srcDir, `FortyByForty.${ext}`);
  const otherOutPath = path.join(outDir, `import-FortyByForty-${ext}.dds`);
  const otherBuffer = fs.readFileSync(otherSrcPath);
  DdsImage.fromImageAsync(otherBuffer)
    .then(dds => {
      fs.writeFileSync(otherOutPath, dds.buffer);
    });
});

/*
  The below code takes the DXT/DST compressed DDS images that exist in the
  "images" directory, converts them to PNG, JPG, GIF, TIFF, and BMP images and
  outputs them to the "out" directory. It should be verified that these are
  valid images and are able to be rendered.
*/

["dxt", "dst"].forEach(ddsExt => {
  const srcPath = path.join(srcDir, `LB.${ddsExt}`);
  const ddsBuffer = fs.readFileSync(srcPath);
  const dds = DdsImage.from(ddsBuffer).toUnshuffled();
  fs.writeFileSync(path.join(outDir, `shuffle-${ddsExt}.dds`), dds.buffer);
  const image = dds.toJimp();
  otherFileExtensions.forEach(ext => {
    const outPath = path.join(outDir, `export-${ddsExt}.${ext}`);
    image.getBufferAsync(`image/${ext}`)
      .then(buffer => {
        fs.writeFileSync(outPath, buffer);
      });
  });
});
