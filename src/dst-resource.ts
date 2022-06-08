import { BinaryDecoder, BinaryEncoder } from "@s4tk/encoding";
import clone from "just-clone";
import { FourCC } from "./enums";
import RleInfo from "./rle-info";

export class DstResource {
  constructor(
    readonly header: RleInfo,
    readonly data: Buffer,
    readonly isShuffled: boolean
  ) { }

  static from(buffer: Buffer): DstResource {
    const header = RleInfo.from(buffer);
    const isShuffled = header.pixelFormat.fourCC === FourCC.DST1 ||
      header.pixelFormat.fourCC === FourCC.DST3 ||
      header.pixelFormat.fourCC === FourCC.DST5;
    return new DstResource(header, buffer, isShuffled);
  }

  toDds(): Buffer {
    if (this.data == null) return null;

    return this.isShuffled
      ? DstResource.unshuffle(this.header, this.data)
      : Buffer.from(this.data);
  }

  static shuffle(header: RleInfo, buffer: Buffer): Buffer {
    const dataOffset = 128;
    const decoder = new BinaryDecoder(buffer);
    const encoder = BinaryEncoder.alloc(buffer.byteLength);

    if (header.pixelFormat.fourCC === FourCC.DST1) {
      const headerClone = clone(header);
      headerClone.pixelFormat.fourCC = FourCC.DXT1;
      encoder.uint32(RleInfo.SIGNATURE);
      encoder.bytes(headerClone.serialize());
      encoder.seek(dataOffset); // FIXME: necessary?

      const count = (buffer.byteLength - dataOffset) / 8;

      const blockEncoder1 = BinaryEncoder.alloc(count * 4);
      const blockEncoder2 = BinaryEncoder.alloc(count * 4);

      for (let i = 0; i < count; i++) {
        blockEncoder1.bytes(decoder.bytes(4));
        blockEncoder2.bytes(decoder.bytes(4));
      }

      encoder.bytes(blockEncoder1.buffer);
      encoder.bytes(blockEncoder2.buffer);
    } else if (header.pixelFormat.fourCC === FourCC.DST3) {
      throw new Error("DST3 not supported.");
    } else if (header.pixelFormat.fourCC === FourCC.DST5) {
      const headerClone = clone(header);
      headerClone.pixelFormat.fourCC = FourCC.DXT5;
      encoder.uint32(RleInfo.SIGNATURE);
      encoder.bytes(headerClone.serialize());
      encoder.seek(dataOffset); // FIXME: necessary?

      const count = (buffer.byteLength - dataOffset) / 16;

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

      // order is intentional
      encoder.bytes(blockEncoder1.buffer);
      encoder.bytes(blockEncoder3.buffer);
      encoder.bytes(blockEncoder2.buffer);
      encoder.bytes(blockEncoder4.buffer);
    }

    return encoder.buffer;
  }

  static unshuffle(header: RleInfo, buffer: Buffer): Buffer {
    const dataOffset = 128;
    const dataSize = buffer.byteLength - dataOffset;

    const decoder = new BinaryDecoder(buffer);
    decoder.seek(dataOffset);

    const encoder = BinaryEncoder.alloc(buffer.byteLength); // FIXME: size correct?
    const tempBytes = decoder.bytes(dataSize);

    if (header.pixelFormat.fourCC === FourCC.DST1) {
      const headerClone = clone(header);
      headerClone.pixelFormat.fourCC = FourCC.DXT1;
      encoder.uint32(RleInfo.SIGNATURE); // DDS header
      encoder.bytes(headerClone.serialize());

      let blockOffset2 = 0;
      let blockOffset3 = blockOffset2 + (dataSize >> 1);
      const count = (blockOffset3 - blockOffset2) / 4;

      for (let i = 0; i < count; i++) {
        encoder.bytes(tempBytes.slice(blockOffset2, blockOffset2 + 4));
        encoder.bytes(tempBytes.slice(blockOffset3, blockOffset3 + 4));

        blockOffset2 += 4;
        blockOffset3 += 4;
      }
    } else if (header.pixelFormat.fourCC == FourCC.DST3) {
      throw new Error("DST3/DXT3 not supported.");
    } else if (header.pixelFormat.fourCC == FourCC.DST5) {
      const headerClone = clone(header);
      headerClone.pixelFormat.fourCC = FourCC.DXT5;
      encoder.uint32(RleInfo.SIGNATURE); // DDS header
      encoder.bytes(headerClone.serialize());

      let blockOffset0 = 0;
      let blockOffset2 = blockOffset0 + (dataSize >> 3);
      let blockOffset1 = blockOffset2 + (dataSize >> 2);
      let blockOffset3 = blockOffset1 + (6 * dataSize >> 4);

      const count = (blockOffset2 - blockOffset0) / 2;

      for (let i = 0; i < count; i++) {
        encoder.bytes(tempBytes.slice(blockOffset0, blockOffset0 + 2));
        encoder.bytes(tempBytes.slice(blockOffset1, blockOffset1 + 6));
        encoder.bytes(tempBytes.slice(blockOffset2, blockOffset2 + 4));
        encoder.bytes(tempBytes.slice(blockOffset3, blockOffset3 + 4));

        blockOffset0 += 2;
        blockOffset1 += 6;
        blockOffset2 += 4;
        blockOffset3 += 4;
      }
    }

    return encoder.buffer;
  }
}
