import { BinaryDecoder, BinaryEncoder } from "@s4tk/encoding";
import Jimp from "jimp";
import { FourCC, HeaderFlags } from "./enums";
import DdsHeader from "./dds-header";
import { findPowerOfTwo } from "./helpers";

try {
  var dxt = require("dxt-js");
} catch (err) {
  var dxt;
  console.warn("DXT compression not supported in this environment.", err);
}

/**
 * Model for a DDS images, which may be in DXT (unsuhffled) or DST (shuffled)
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

  private constructor(
    public readonly header: DdsHeader,
    public readonly buffer: Buffer
  ) { }

  /**
   * Reads a DdsImage object from the given buffer. 
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
   * Creates a new DDS image from a header and the data it contains.
   * 
   * @param header Header of DDS image being created
   * @param ddsData Actual DDS data
   */
  static fromDdsData(header: DdsHeader, ddsData: Buffer): DdsImage {
    const encoder = BinaryEncoder.alloc(4 + header.size + ddsData.length);
    encoder.uint32(DdsImage.SIGNATURE);
    header.serialize(encoder);
    encoder.bytes(ddsData);
    return new DdsImage(header, encoder.buffer);
  }

  /**
   * Reads an image file and converts it to a DdsImage. Supported image types
   * include JPEG, PNG, BMP, TIFF, and GIF. Dimensions should be a power of 2
   * greater than 4; if not, they will be resized. The max mip count must be
   * 1 at the lowest, and 15 at the highest.
   * 
   * @param filepath Absolute path to image file
   * @param width Width of image being loaded
   * @param height Height of image being loaded
   * @param maxMipCount Maximum number of mipmaps to create, 15 by default
   * @param shuffle Whether or not to shuffle the DDS data, false by default
   */
  static async fromImageFile(
    filepath: string,
    width: number,
    height: number,
    maxMipCount = 15,
    shuffle = false
  ): Promise<DdsImage> {
    return new Promise((resolve, reject) => {
      try {
        var initialWidth = findPowerOfTwo(width);
        var initialHeight = findPowerOfTwo(height);

        if (initialWidth < 4 || initialHeight < 4)
          throw new Error("Dimensions must be >= 4.")
      } catch (err) {
        reject(`Invalid image dimensions: ${err}`);
      }

      Jimp.read(filepath)
        .then(image => {
          const compressedBuffers: Buffer[] = [];

          let mips = 1;
          let currentWidth = initialWidth;
          let currentHeight = initialHeight;

          while (currentWidth > 4 && currentHeight > 4 && mips <= maxMipCount) {
            if (currentWidth !== width || currentHeight !== height)
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

          return DdsImage.fromDdsData(header, Buffer.concat(compressedBuffers));
        })
        .then(dds => {
          resolve(shuffle ? dds.toShuffled() : dds);
        });
    });
  }

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
   * Returns a deep copy of this image, guaranteed to be in a DXT format.
   */
  toUnshuffled(): DdsImage {
    return this.isShuffled
      ? this._unshuffle()
      : this.clone();
  }

  /**
   * Returns a deep copy of this image, guaranteed to be in a DST format.
   */
  toShuffled(): DdsImage {
    return !this.isShuffled
      ? this._shuffle()
      : this.clone();
  }

  //#endregion Public Methods

  //#region Private Methods

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
    const decoder = new BinaryDecoder(this.buffer);
    decoder.seek(DdsImage.DATA_OFFSET);

    const headerClone = this.header.clone();
    const dataSize = this.buffer.byteLength - DdsImage.DATA_OFFSET;
    const encoder = BinaryEncoder.alloc(this.buffer.byteLength);
    encoder.uint32(DdsImage.SIGNATURE);

    if (this.header.pixelFormat.fourCC === FourCC.DST1) {
      headerClone.pixelFormat.fourCC = FourCC.DXT1;
      encoder.bytes(headerClone.serialize());

      let blockOffset2 = 0;
      let blockOffset3 = blockOffset2 + (dataSize >> 1);
      const count = (blockOffset3 - blockOffset2) / 4;

      for (let i = 0; i < count; i++) {
        encoder.bytes(this.buffer.slice(blockOffset2, blockOffset2 + 4));
        encoder.bytes(this.buffer.slice(blockOffset3, blockOffset3 + 4));

        blockOffset2 += 4;
        blockOffset3 += 4;
      }
    } else if (this.header.pixelFormat.fourCC == FourCC.DST3) {
      throw new Error("DST3 not supported.");
    } else if (this.header.pixelFormat.fourCC == FourCC.DST5) {
      headerClone.pixelFormat.fourCC = FourCC.DXT5;
      encoder.bytes(headerClone.serialize());

      let blockOffset0 = 0;
      let blockOffset2 = blockOffset0 + (dataSize >> 3);
      let blockOffset1 = blockOffset2 + (dataSize >> 2);
      let blockOffset3 = blockOffset1 + (6 * dataSize >> 4);

      const count = (blockOffset2 - blockOffset0) / 2;

      for (let i = 0; i < count; i++) {
        encoder.bytes(this.buffer.slice(blockOffset0, blockOffset0 + 2));
        encoder.bytes(this.buffer.slice(blockOffset1, blockOffset1 + 6));
        encoder.bytes(this.buffer.slice(blockOffset2, blockOffset2 + 4));
        encoder.bytes(this.buffer.slice(blockOffset3, blockOffset3 + 4));

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
