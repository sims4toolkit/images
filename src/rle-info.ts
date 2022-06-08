import { BinaryDecoder, BinaryEncoder } from "@s4tk/encoding";
import { HeaderFlags, RleVersion } from "./enums";
import PixelFormat from "./pixel-format";

export default class RleInfo {
  static readonly SIGNATURE = 0x20534444;
  static readonly RESERVED1_LENGTH = 44;
  static readonly RESERVED2_LENGTH = 12;

  // S4PI: (18 * 4) + PixelFormat.STRUCTURE_SIZE + (5 * 4)
  // S4PI length appears to be missing 4 bytes...
  readonly size: number = PixelFormat.STRUCTURE_SIZE + 92;
  headerFlags: HeaderFlags = HeaderFlags.Texture;
  height: number = 0;
  width: number = 0;
  pitchOrLinearSize: number = 0;
  depth: number = 1;
  pixelFormat: PixelFormat = new PixelFormat();
  surfaceFlags: number = 0;
  cubemapFlags: number = 0;
  version: RleVersion = RleVersion.RLE2; // FIXME: default?
  mipCount: number = 0;
  unknown0E: number = 0;

  get hasSpecular(): boolean {
    return this.version == RleVersion.RLES;
  }

  constructor() { }

  static from(buffer: Buffer): RleInfo {
    const decoder = new BinaryDecoder(buffer);
    const rleInfo = new RleInfo();

    const signature = decoder.uint32();
    if (signature !== RleInfo.SIGNATURE)
      throw new Error(`Expected signature ${RleInfo.SIGNATURE}, got ${signature}`);

    const size = decoder.uint32();
    if (size !== rleInfo.size)
      throw new Error(`Expected size of ${rleInfo.size}, got ${size}`);

    rleInfo.headerFlags = decoder.uint32();
    if ((rleInfo.headerFlags & HeaderFlags.Texture) !== HeaderFlags.Texture)
      throw new Error(`Expected HeaderFlags.Texture (${HeaderFlags.Texture}), got ${rleInfo.headerFlags}`);

    rleInfo.height = decoder.int32();
    rleInfo.width = decoder.int32();
    if (rleInfo.height > 0xFFFF || rleInfo.width > 0xFFFF)
      throw new Error("Invalid width or height");

    rleInfo.pitchOrLinearSize = decoder.uint32();

    rleInfo.depth = decoder.int32();
    if (rleInfo.depth < 0 || rleInfo.depth > 1)
      throw new Error(`Expected depth 1 or 0, got ${rleInfo.depth}`);

    rleInfo.mipCount = decoder.uint32();
    if (rleInfo.mipCount > 16)
      throw new Error(`Expected mini map count less than 16, got ${rleInfo.mipCount}`);

    decoder.skip(RleInfo.RESERVED1_LENGTH);
    rleInfo.pixelFormat = PixelFormat.from(decoder.slice(PixelFormat.STRUCTURE_SIZE));
    rleInfo.surfaceFlags = decoder.uint32();
    rleInfo.cubemapFlags = decoder.uint32();
    // intentionally not reading reserved2 bytes

    return rleInfo;
  }

  serialize(): Buffer {
    const buffer = Buffer.alloc(this.size);
    const encoder = new BinaryEncoder(buffer);

    encoder.uint32(this.size);
    encoder.uint32(this.headerFlags);
    encoder.int32(this.height);
    encoder.int32(this.width);
    encoder.uint32(this.pitchOrLinearSize);
    encoder.int32(this.depth);
    encoder.uint32(this.mipCount);
    encoder.skip(RleInfo.RESERVED1_LENGTH);
    this.pixelFormat.serialize().forEach(byte => encoder.uint8(byte)); // FIXME: is this right?
    encoder.uint32(this.surfaceFlags);
    encoder.uint32(this.cubemapFlags);
    // intentionally not writing reserved2 bytes

    return buffer;
  }
}
