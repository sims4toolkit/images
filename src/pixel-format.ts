import { BinaryDecoder, BinaryEncoder } from "@s4tk/encoding";
import { FourCC, PixelFormatFlags } from "./enums";

export default class PixelFormat {
  static readonly STRUCTURE_SIZE = 32;

  readonly size = PixelFormat.STRUCTURE_SIZE;
  pixelFormatFlag: PixelFormatFlags = PixelFormatFlags.FourCC;
  fourCC: FourCC = FourCC.DXT5;
  rgbBitCount: number = 0;
  redBitMask: number = 0;
  greenBitMask: number = 0;
  blueBitMask: number = 0;
  alphaBitMask: number = 0;

  constructor() { }

  static from(buffer: Buffer): PixelFormat {
    const decoder = new BinaryDecoder(buffer);
    const pixelFormat = new PixelFormat();

    const size = decoder.uint32();
    if (size !== PixelFormat.STRUCTURE_SIZE)
      throw new Error(`Expected size of ${PixelFormat.STRUCTURE_SIZE}, got ${size}`);

    pixelFormat.pixelFormatFlag = decoder.uint32();
    if (!(pixelFormat.pixelFormatFlag in PixelFormatFlags))
      throw new Error(`Expected a valid PixelFormatFlag, got ${pixelFormat.pixelFormatFlag}`);

    pixelFormat.fourCC = decoder.uint32();
    if (!(pixelFormat.fourCC in FourCC))
      throw new Error(`Expected a valid FourCC, got ${pixelFormat.fourCC}`);

    pixelFormat.rgbBitCount = decoder.uint32();
    pixelFormat.redBitMask = decoder.uint32();
    pixelFormat.greenBitMask = decoder.uint32();
    pixelFormat.blueBitMask = decoder.uint32();
    pixelFormat.alphaBitMask = decoder.uint32();

    return pixelFormat;
  }

  serialize(): Buffer {
    const buffer = Buffer.alloc(PixelFormat.STRUCTURE_SIZE);
    const encoder = new BinaryEncoder(buffer);

    encoder.uint32(this.size);
    encoder.uint32(this.pixelFormatFlag);
    encoder.uint32(this.fourCC);
    encoder.uint32(this.rgbBitCount);
    encoder.uint32(this.redBitMask);
    encoder.uint32(this.greenBitMask);
    encoder.uint32(this.blueBitMask);
    encoder.uint32(this.alphaBitMask);

    return buffer;
  }
}
