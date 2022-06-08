import fs from "fs";
import path from "path";
import { dstToDds, ddsToDst } from "../dst/dst-to-png";

const srcPath = path.resolve(__dirname, path.join("..", "images", "LB.dds"));
const outPath = path.resolve(__dirname, path.join("..", "out", "LB.dst")); // should be png

const srcBuffer = fs.readFileSync(srcPath);
const outBuffer = ddsToDst(srcBuffer);

fs.writeFileSync(outPath, outBuffer);
