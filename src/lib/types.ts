/**
 * Object that interfaces with Jimp images.
 */
export interface Bitmap {
  data: Buffer;
  width: number;
  height: number;
}

/**
 * Optional arguments to provide when creating a DDS image from another format.
 */
export type DdsConversionOptions = Partial<{
  /**
   * The maximum number of mipmaps to generate for a DDS image. This must be an
   * integer between 1 and 15. If not provided, it is 15 by default.
   * 
   * This value includes the largest, highest-quality version of the image. To
   * avoid scaling down the image at all, use a value of 1.
   */
  maxMipMaps: number;

  /**
   * Whether or not the resulting DDS image should be shuffled. If true, the DDS
   * image will use DST5 compression. If false, it will use DXT5 compression.
   * If not provided, it is false by default.
   */
  shuffle: boolean;
}>;
