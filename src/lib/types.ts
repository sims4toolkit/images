/**
 * Object that interfaces with Jimp images.
 */
export interface Bitmap {
  data: Buffer;
  width: number;
  height: number;
}