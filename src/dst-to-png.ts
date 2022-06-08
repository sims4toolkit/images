import { DstResource } from "./dst-resource";
import { FourCC } from "./enums";

/**
 * Converts a DST image to a PNG.
 * 
 * @param buffer Buffer containing a DST image
 */
export function dstToDds(buffer: Buffer): Buffer {
  const dst = DstResource.from(buffer);
  return dst.toDds();
}

export function ddsToDst(buffer: Buffer): Buffer {
  const dds = DstResource.from(buffer);
  return dds.toDst();
}
