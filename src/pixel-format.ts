import { BinaryDecoder, BinaryEncoder } from "@s4tk/encoding";
import { FourCC, PixelFormatFlags } from "./enums";

/**
 *  A DTO for the fields in the pixel format structure.
 */
interface PixelFormatFields {
  readonly size: number;
  get pixelFormatFlag(): PixelFormatFlags;
  get fourCC(): FourCC;
  get rgbBitCount(): number;
  get redBitMask(): number;
  get greenBitMask(): number;
  get blueBitMask(): number;
  get alphaBitMask(): number;
}

/**
 * A model for the pixel format structure.
 */
export default class PixelFormat implements PixelFormatFields {
  static readonly STRUCTURE_SIZE = 32;

  readonly size = PixelFormat.STRUCTURE_SIZE;
  pixelFormatFlag: PixelFormatFlags;
  fourCC: FourCC;
  rgbBitCount: number;
  redBitMask: number;
  greenBitMask: number;
  blueBitMask: number;
  alphaBitMask: number;

  constructor(fields?: Partial<PixelFormatFields>) {
    if (fields?.size != undefined && fields.size !== PixelFormat.STRUCTURE_SIZE)
      throw new Error(`Expected size to be ${PixelFormat.STRUCTURE_SIZE}, got ${fields.size}.`);

    this.pixelFormatFlag = fields?.pixelFormatFlag ?? PixelFormatFlags.FourCC;
    if (!(this.pixelFormatFlag in PixelFormatFlags))
      throw new Error(`Expected a valid PixelFormatFlag, got ${this.pixelFormatFlag}`);

    this.fourCC = fields?.fourCC ?? FourCC.DXT5;
    if (!(this.fourCC in FourCC))
      throw new Error(`Expected a valid FourCC, got ${this.fourCC}`);

    this.rgbBitCount = fields?.rgbBitCount ?? 0;
    this.redBitMask = fields?.redBitMask ?? 0;
    this.greenBitMask = fields?.greenBitMask ?? 0;
    this.blueBitMask = fields?.blueBitMask ?? 0;
    this.alphaBitMask = fields?.alphaBitMask ?? 0;
  }

  /**
   * Creates a copy of this PixelFormat object.
   */
  clone(): PixelFormat {
    return new PixelFormat(this);
  }

  /**
   * Reads a PixelFormat object from the given buffer. 
   * 
   * @param buffer Buffer to read data from
   */
  static from(buffer: Buffer): PixelFormat {
    const decoder = new BinaryDecoder(buffer);

    const fields: PixelFormatFields = {
      size: decoder.uint32(), // constructor will validate
      pixelFormatFlag: decoder.uint32(), // constructor will validate
      fourCC: decoder.uint32(), // constructor will validate
      rgbBitCount: decoder.uint32(),
      redBitMask: decoder.uint32(),
      greenBitMask: decoder.uint32(),
      blueBitMask: decoder.uint32(),
      alphaBitMask: decoder.uint32(),
    };

    return new PixelFormat(fields);
  }

  /**
   * Serializes this PixelFormat into a buffer and returns it.
   * 
   * @param encoder Encoder to write the PixelFormat to, if any. If not
   * provided, a new buffer and encder will be created. Regardless of if this
   * is provided or not, the buffer that was written to will be returned.
   */
  serialize(encoder?: BinaryEncoder): Buffer {
    encoder ??= new BinaryEncoder(Buffer.alloc(this.size));

    encoder.uint32(this.size);
    encoder.uint32(this.pixelFormatFlag);
    encoder.uint32(this.fourCC);
    encoder.uint32(this.rgbBitCount);
    encoder.uint32(this.redBitMask);
    encoder.uint32(this.greenBitMask);
    encoder.uint32(this.blueBitMask);
    encoder.uint32(this.alphaBitMask);

    return encoder.buffer;
  }
}
