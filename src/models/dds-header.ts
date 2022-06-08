import { BinaryDecoder, BinaryEncoder } from "@s4tk/encoding";
import { HeaderFlags, RleVersion } from "../enums";
import PixelFormat from "../pixel-format";

/**
 * DTO for the fields in the DDS header structure.
 */
interface DdsHeaderFields {
  readonly size: number;
  get headerFlags(): HeaderFlags;
  get height(): number;
  get width(): number;
  get pitchOrLinearSize(): number;
  get depth(): number;
  get pixelFormat(): PixelFormat;
  get surfaceFlags(): number;
  get cubemapFlags(): number;
  get version(): RleVersion;
  get mipCount(): number;
  get unknown0E(): number;
}

/**
 * Model for the DDS header structure.
 */
export default class DdsHeader implements DdsHeaderFields {
  // static readonly SIGNATURE = 0x20534444;
  static readonly STRUCTURE_SIZE = PixelFormat.STRUCTURE_SIZE + 92;
  static readonly RESERVED1_LENGTH = 44;
  static readonly RESERVED2_LENGTH = 12;

  readonly size = DdsHeader.STRUCTURE_SIZE;
  headerFlags: HeaderFlags;
  height: number;
  width: number;
  pitchOrLinearSize: number;
  depth: number;
  pixelFormat: PixelFormat;
  surfaceFlags: number;
  cubemapFlags: number;
  version: RleVersion;
  mipCount: number;
  unknown0E: number;

  get hasSpecular(): boolean {
    return this.version === RleVersion.RLES;
  }

  constructor(fields?: Partial<DdsHeaderFields>) {
    if (fields?.size != undefined && fields.size !== DdsHeader.STRUCTURE_SIZE)
      throw new Error(`Expected size to be ${DdsHeader.STRUCTURE_SIZE}, got ${fields.size}.`);

    this.headerFlags = fields?.headerFlags ?? HeaderFlags.Texture;
    if ((this.headerFlags & HeaderFlags.Texture) !== HeaderFlags.Texture)
      throw new Error(`Expected HeaderFlags.Texture, got ${this.headerFlags}`);

    this.height = fields?.height ?? 0;
    this.width = fields?.width ?? 0;
    if (this.height > 0xFFFF || this.width > 0xFFFF)
      throw new Error("Invalid width or height");

    this.pitchOrLinearSize = fields?.pitchOrLinearSize ?? 0;

    this.depth = fields?.depth ?? 1;
    if (this.depth < 0 || this.depth > 1)
      throw new Error(`Expected depth 1 or 0, got ${this.depth}`);

    this.pixelFormat = new PixelFormat(fields?.pixelFormat);
    this.surfaceFlags = fields?.surfaceFlags ?? 0;
    this.cubemapFlags = fields?.cubemapFlags ?? 0;
    this.version = fields?.version ?? RleVersion.RLE2;

    this.mipCount = fields?.mipCount ?? 0;
    if (this.mipCount > 16)
      throw new Error(`Expected mini map count less than 16, got ${this.mipCount}`);

    this.unknown0E = fields?.unknown0E ?? 0;
  }

  /**
   * Reads a DdsHeader object from the given buffer. Note that this buffer
   * should NOT include the DDS signature - it is expected to begin on the first
   * byte of the "size" property.
   * 
   * @param buffer Buffer to read data from
   */
  static from(buffer: Buffer): DdsHeader {
    const decoder = new BinaryDecoder(buffer);

    function skipThen<T>(skip: number, then: () => T) {
      decoder.skip(skip);
      return then();
    }

    const fields: Partial<DdsHeaderFields> = {
      size: decoder.uint32(),
      headerFlags: decoder.uint32(),
      height: decoder.int32(),
      width: decoder.int32(),
      pitchOrLinearSize: decoder.uint32(),
      depth: decoder.int32(),
      mipCount: decoder.uint32(),
      pixelFormat: skipThen(
        DdsHeader.RESERVED1_LENGTH,
        () => PixelFormat.from(decoder.slice(PixelFormat.STRUCTURE_SIZE)
        )),
      surfaceFlags: decoder.uint32(),
      cubemapFlags: decoder.uint32()
    };

    return new DdsHeader(fields);
  }

  /**
   * Serializes this DdsHeader into a buffer and returns it.
   * 
   * @param encoder Encoder to write the DdsHeader to, if any. If not provided,
   * a new buffer and encder will be created. Regardless of if this is provided
   * or not, the buffer that was written to will be returned.
   */
  serialize(encoder?: BinaryEncoder): Buffer {
    encoder ??= new BinaryEncoder(Buffer.alloc(this.size));

    encoder.uint32(this.size);
    encoder.uint32(this.headerFlags);
    encoder.int32(this.height);
    encoder.int32(this.width);
    encoder.uint32(this.pitchOrLinearSize);
    encoder.int32(this.depth);
    encoder.uint32(this.mipCount);
    encoder.skip(DdsHeader.RESERVED1_LENGTH);
    this.pixelFormat.serialize(encoder);
    encoder.uint32(this.surfaceFlags);
    encoder.uint32(this.cubemapFlags);
    // intentionally not writing reserved2 bytes

    return encoder.buffer;
  }
}
