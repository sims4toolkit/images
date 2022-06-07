import fs from "fs";
import path from "path";
import { dstToPng } from "../dst/dst-to-png";

const srcPath = path.resolve(__dirname, path.join("..", "images", "LB.dst"));
const outPath = path.resolve(__dirname, path.join("..", "out", "LB.png"));

const dstBuffer = fs.readFileSync(srcPath);
const pngBuffer = dstToPng(dstBuffer);

fs.writeFileSync(outPath, pngBuffer);
