/*
  Major credit goes towards the creators of S4PI, specifically those who
  contributed to the DstResource. Without their implementation, DXT > DST and
  DST > DXT conversions would not have been possible.

  Their code: https://github.com/s4ptacle/Sims4Tools/blob/develop/s4pi%20Wrappers/ImageResource/DSTResource.cs
*/

import type { Jimp as JimpType } from "@jimp/core/types/jimp";
import { BinaryDecoder, BinaryEncoder } from "@s4tk/encoding";
import { FourCC, HeaderFlags } from "./enums";
import Jimp from "./jimp";
import DdsHeader from "./dds-header";
import { Bitmap } from "./types";
import { findPowerOfTwo } from "./helpers";

try {
  var dxt = require("dxt-js");
} catch (err) {
  var dxt;
  console.warn("DXT compression not supported in this environment.", err);
}

/**
 * Model for DDS images, which may be in DXT (unshuffled) or DST (shuffled)
 * formats.
 */
export default class DdsImage {
  static readonly SIGNATURE = 0x20534444;
  static readonly DATA_OFFSET = 4 + DdsHeader.STRUCTURE_SIZE;

  /**
   * Whether or not this DDS image is shuffled. If it is, this means that it is
   * a DST image. If not, then it can be treated as a regular DDS image.
   */
  get isShuffled(): boolean {
    return this.header.pixelFormat.fourCC === FourCC.DST1 ||
      this.header.pixelFormat.fourCC === FourCC.DST3 ||
      this.header.pixelFormat.fourCC === FourCC.DST5;
  }

  //#region Initialization

  private constructor(
    public readonly header: DdsHeader,
    public readonly buffer: Buffer
  ) { }

  /**
   * Reads a DdsImage object from the given buffer. The buffer must contain the
   * entire DDS image, including signature and header.
   * 
   * @param buffer Buffer to read data from
   */
  static from(buffer: Buffer): DdsImage {
    const decoder = new BinaryDecoder(buffer);

    const signature = decoder.uint32();
    if (signature !== DdsImage.SIGNATURE)
      throw new Error(`Expected signature ${DdsImage.SIGNATURE}, got ${signature}`);

    const header = DdsHeader.from(decoder.slice(DdsHeader.STRUCTURE_SIZE));

    return new DdsImage(header, buffer);
  }

  /**
   * Asynchronously reads a DdsImage object from the given buffer. The buffer
   * must contain the entire DDS image, including signature and header.
   * 
   * @param buffer Buffer to read data from
   */
  static async fromAsync(buffer: Buffer): Promise<DdsImage> {
    return new Promise(resolve => {
      resolve(this.from(buffer));
    });
  }

  /**
   * Creates a DdsImage from a bitmap that contains 4 bytes per pixel, where
   * each byte represents R, G, B, and A respectively. Endianness is irrelevant,
   * as each byte is read individually.
   * 
   * @param bitmap Object containing byte-by-byte information about the image to
   * load as a DdsImage
   */
  static async fromBitmapAsync(bitmap: Bitmap): Promise<DdsImage> {
    return new Promise(async (resolve) => {
      resolve(await this.fromJimpAsync(new Jimp(bitmap)));
    });
  }

  /**
   * Reads an image buffer and converts it to a DdsImage. The only supported
   * image type is currently PNG. Dimensions should be a power of 2 greater than
   * 4; if not, they will be resized.
   * 
   * @param buffer Buffer containing PNG image
   */
  static async fromImageAsync(buffer: Buffer): Promise<DdsImage> {
    return new Promise(async (resolve) => {
      resolve(this.fromJimpAsync(await Jimp.read(buffer)));
    });
  }

  /**
   * Creates a DdsImage from a Jimp image object.
   * 
   * @param image Jimp image to load as DdsImage
   */
  static async fromJimpAsync(image: JimpType): Promise<DdsImage> {
    return new Promise(async (resolve, reject) => {
      const submittedWidth = image.bitmap.width;
      const submittedHeight = image.bitmap.height;

      if (submittedWidth < 4 || submittedHeight < 4)
        reject("Dimensions must be >= 4.");

      const initialWidth = findPowerOfTwo(submittedWidth);
      const initialHeight = findPowerOfTwo(submittedHeight);
      const compressedBuffers: Buffer[] = [];

      let mips = 1;
      let currentWidth = initialWidth;
      let currentHeight = initialHeight;

      while (currentWidth > 4 && currentHeight > 4 && mips <= 15) {
        if (currentWidth !== initialWidth || currentHeight !== initialHeight)
          // @ts-expect-error Using resize plugin
          image.resize(currentWidth, currentHeight);

        compressedBuffers.push(
          dxt.compress(
            image.bitmap.data,
            currentWidth,
            currentHeight,
            dxt.flags.DXT5
          )
        );

        currentWidth /= 2;
        currentHeight /= 2;
        mips++;
      }

      const header = new DdsHeader({
        width: initialWidth,
        height: initialHeight,
        headerFlags: HeaderFlags.Texture | HeaderFlags.Mipmap,
        surfaceFlags: 0x00401008,
        mipCount: mips - 1,
      });

      const dds = DdsImage._fromDdsData(
        header,
        Buffer.concat(compressedBuffers)
      );

      resolve(dds);
    });
  }

  //#endregion Initialization

  //#region Public Methods

  /**
   * Creates a deep copy of this DdsImage object.
   */
  clone(): DdsImage {
    return new DdsImage(
      this.header.clone(),
      Buffer.from(this.buffer)
    );
  }

  /**
   * Returns the data in this image as a bitmap object. This DDS image must be
   * using either DXT or DST compression, or an exception is thrown.
   */
  toBitmap(): Bitmap {
    const dds = this.toUnshuffled();

    // guaranteed to not be DST since dds gets unshuffled
    const compression = (() => {
      switch (dds.header.pixelFormat.fourCC) {
        case FourCC.DXT1: return dxt.flags.DXT1;
        case FourCC.DXT3: return dxt.flags.DXT3;
        case FourCC.DXT5: return dxt.flags.DXT5;
        default:
          throw new Error("Non-DXT DDS images cannot be converted to bitmaps.")
      }
    })();

    const { width, height } = this.header;

    const data = dxt.decompress(
      dds.buffer.slice(
        DdsImage.DATA_OFFSET,
        DdsImage.DATA_OFFSET + (width * height)
      ),
      width,
      height,
      compression
    );

    return { width, height, data };
  }

  /**
   * Returns the data in this image as a Jimp object. The Jimp object can then
   * be used to export the image to another formats - currently, only PNG is
   * officially supported.
   * 
   * ```ts
   * // Example of getting a buffer containing PNG data
   * ddsImage.toJimp().getBufferAsync("image/png")
   *   .then(buffer => {
   *     // do something with buffer
   *   });
   * ```
   */
  toJimp(): JimpType {
    return new Jimp(this.toBitmap());
  }

  /**
   * Returns a deep copy of this image, guaranteed to use DST compression. If
   * the image this is called on is not compressed or uses DXT3, an exception
   * will be thrown.
   * 
   * @param clone If true, then a clone of this image will be returned if it is
   * already shuffled. If false, this image itself will be returned. False by
   * default.
   */
  toShuffled(clone = false): DdsImage {
    return !this.isShuffled
      ? this._shuffle()
      : (clone ? this.clone() : this);
  }

  /**
   * Returns a deep copy of this image, guaranteed to use DST compression. If
   * the image this is called on uses DST3, an exception will be thrown.
   * 
   * @param clone If true, then a clone of this image will be returned if it is
   * already unshuffled. If false, this image itself will be returned. False by
   * default.
   */
  toUnshuffled(clone = false): DdsImage {
    return this.isShuffled
      ? this._unshuffle()
      : (clone ? this.clone() : this);
  }

  //#endregion Public Methods

  //#region Private Methods

  /**
   * Creates a new DDS image from a header and the data it contains. The buffer
   * must contain the image data and image data only, NOT the header. The data
   * may contain one or more mipmaps, but the number of mipmaps it contains
   * must match the number specified in the header.
   * 
   * @param header Header of DDS image being created
   * @param ddsData Actual DDS image data
   */
  private static _fromDdsData(header: DdsHeader, ddsData: Buffer): DdsImage {
    const encoder = BinaryEncoder.alloc(4 + header.size + ddsData.length);
    encoder.uint32(DdsImage.SIGNATURE);
    header.serialize(encoder);
    encoder.bytes(ddsData);
    return new DdsImage(header, encoder.buffer);
  }

  /**
   * Returns a shuffled copy of this image. The image's data MUST already be
   * unshuffled, or an exception is thrown.
   */
  private _shuffle(): DdsImage {
    const decoder = new BinaryDecoder(this.buffer);
    decoder.seek(DdsImage.DATA_OFFSET);

    const headerClone = this.header.clone();
    const dataSize = this.buffer.byteLength - DdsImage.DATA_OFFSET;
    const encoder = BinaryEncoder.alloc(this.buffer.byteLength);
    encoder.uint32(DdsImage.SIGNATURE);

    if (this.header.pixelFormat.fourCC === FourCC.DXT1) {
      headerClone.pixelFormat.fourCC = FourCC.DST1;
      encoder.bytes(headerClone.serialize());

      const count = dataSize / 8;
      const blockEncoder1 = BinaryEncoder.alloc(count * 4);
      const blockEncoder2 = BinaryEncoder.alloc(count * 4);

      for (let i = 0; i < count; i++) {
        blockEncoder1.bytes(decoder.bytes(4));
        blockEncoder2.bytes(decoder.bytes(4));
      }

      encoder.bytes(blockEncoder1.buffer);
      encoder.bytes(blockEncoder2.buffer);
    } else if (this.header.pixelFormat.fourCC === FourCC.DXT3) {
      throw new Error("DXT3 not supported.");
    } else if (this.header.pixelFormat.fourCC === FourCC.DXT5) {
      headerClone.pixelFormat.fourCC = FourCC.DST5;
      encoder.bytes(headerClone.serialize());

      const count = dataSize / 16;
      const blockEncoder1 = BinaryEncoder.alloc(count * 2);
      const blockEncoder2 = BinaryEncoder.alloc(count * 6);
      const blockEncoder3 = BinaryEncoder.alloc(count * 4);
      const blockEncoder4 = BinaryEncoder.alloc(count * 4);

      for (let i = 0; i < count; i++) {
        blockEncoder1.bytes(decoder.bytes(2));
        blockEncoder2.bytes(decoder.bytes(6));
        blockEncoder3.bytes(decoder.bytes(4));
        blockEncoder4.bytes(decoder.bytes(4));
      }

      // weird order is intentional
      encoder.bytes(blockEncoder1.buffer);
      encoder.bytes(blockEncoder3.buffer);
      encoder.bytes(blockEncoder2.buffer);
      encoder.bytes(blockEncoder4.buffer);
    } else {
      throw new Error("DDS image is either already shuffled or unsupported.");
    }

    return new DdsImage(headerClone, encoder.buffer);
  }

  /**
   * Returns an unshuffled copy of this image. The image's data MUST already be
   * shuffled, or an exception is thrown.
   */
  private _unshuffle(): DdsImage {
    const headerClone = this.header.clone();
    const dataSize = this.buffer.byteLength - DdsImage.DATA_OFFSET;
    const encoder = BinaryEncoder.alloc(this.buffer.byteLength);
    encoder.uint32(DdsImage.SIGNATURE);

    const slice = (offset: number, bytes: number) => {
      const start = DdsImage.DATA_OFFSET + offset;
      return this.buffer.slice(start, start + bytes);
    }

    if (this.header.pixelFormat.fourCC === FourCC.DST1) {
      headerClone.pixelFormat.fourCC = FourCC.DXT1;
      headerClone.serialize(encoder);

      let blockOffset2 = 0;
      let blockOffset3 = blockOffset2 + (dataSize >> 1);
      const count = (blockOffset3 - blockOffset2) / 4;

      for (let i = 0; i < count; i++) {
        encoder.bytes(slice(blockOffset2, 4));
        encoder.bytes(slice(blockOffset3, 4));

        blockOffset2 += 4;
        blockOffset3 += 4;
      }
    } else if (this.header.pixelFormat.fourCC == FourCC.DST3) {
      throw new Error("DST3 not supported.");
    } else if (this.header.pixelFormat.fourCC == FourCC.DST5) {
      headerClone.pixelFormat.fourCC = FourCC.DXT5;
      headerClone.serialize(encoder);

      let blockOffset0 = 0;
      let blockOffset2 = blockOffset0 + (dataSize >> 3);
      let blockOffset1 = blockOffset2 + (dataSize >> 2);
      let blockOffset3 = blockOffset1 + (6 * dataSize >> 4);

      const count = (blockOffset2 - blockOffset0) / 2;

      for (let i = 0; i < count; i++) {
        encoder.bytes(slice(blockOffset0, 2));
        encoder.bytes(slice(blockOffset1, 6));
        encoder.bytes(slice(blockOffset2, 4));
        encoder.bytes(slice(blockOffset3, 4));

        blockOffset0 += 2;
        blockOffset1 += 6;
        blockOffset2 += 4;
        blockOffset3 += 4;
      }
    } else {
      throw new Error("DDS image is either already unshuffled or unsupported.");
    }

    return new DdsImage(headerClone, encoder.buffer);
  }

  //#endregion Private Methods
}
