import { BinaryDecoder, BinaryEncoder } from "@s4tk/encoding";
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
    // TODO: impl
    // if (this.data == null) return null;
    // if (!this.isShuffled)
    // {
    //     return new MemoryStream(this.data);
    // }
    // else
    // {
    //     using (MemoryStream ms = new MemoryStream(this.data))
    //     {
    //         MemoryStream result = (MemoryStream)Unshuffle(this.header, ms);
    //         result.Position = 0;
    //         return result;
    //     }
    // }
  }

  static shuffle(header: RleInfo, buffer: Buffer): Buffer {
    const decoder = new BinaryDecoder(buffer);

    const shuffledBuffer = Buffer.alloc(0); // FIXME: number?
    const encoder = new BinaryEncoder(shuffledBuffer);
    encoder.seek(128);

    if (header.pixelFormat.fourCC === FourCC.DST1) {
      const count = (buffer.byteLength - 128) / 8;

      const blockBuffer1 = Buffer.alloc(count * 4);
      const blockBuffer2 = Buffer.alloc(count * 4);

      const blockEncoder1 = new BinaryEncoder(blockBuffer1);
      const blockEncoder2 = new BinaryEncoder(blockBuffer2);

      for (let i = 0; i < count; i++) {
        // FIXME: add a better way to handle this in binary encoder
        decoder.bytes(4).forEach(byte => blockEncoder1.uint8(byte));
        decoder.bytes(4).forEach(byte => blockEncoder2.uint8(byte));
      }

      blockBuffer1.forEach(byte => encoder.uint8(byte));
      blockBuffer2.forEach(byte => encoder.uint8(byte));
    } else if (header.pixelFormat.fourCC == FourCC.DST3) {
      throw new Error("DST3 not supported.");
    } else if (header.pixelFormat.fourCC == FourCC.DST5) {
      const count = (buffer.byteLength - 128) / 16;

      const blockBuffer1 = Buffer.alloc(count * 2);
      const blockBuffer2 = Buffer.alloc(count * 6);
      const blockBuffer3 = Buffer.alloc(count * 4);
      const blockBuffer4 = Buffer.alloc(count * 4);

      const blockEncoder1 = new BinaryEncoder(blockBuffer1);
      const blockEncoder2 = new BinaryEncoder(blockBuffer2);
      const blockEncoder3 = new BinaryEncoder(blockBuffer3);
      const blockEncoder4 = new BinaryEncoder(blockBuffer4);

      for (let i = 0; i < count; i++) {
        // FIXME: add a better way to handle this in binary encoder
        decoder.bytes(2).forEach(byte => blockEncoder1.uint8(byte));
        decoder.bytes(6).forEach(byte => blockEncoder2.uint8(byte));
        decoder.bytes(4).forEach(byte => blockEncoder3.uint8(byte));
        decoder.bytes(4).forEach(byte => blockEncoder4.uint8(byte));
      }

      // order is intentional
      blockBuffer1.forEach(byte => encoder.uint8(byte));
      blockBuffer3.forEach(byte => encoder.uint8(byte));
      blockBuffer2.forEach(byte => encoder.uint8(byte));
      blockBuffer4.forEach(byte => encoder.uint8(byte));
    }
  }

  static unshuffle(header: RleInfo, buffer: Buffer): Buffer {
    // const int dataOffset = 128;
    // var dataSize = (int)(s.Length - dataOffset);

    // s.Position = dataOffset;
    // BinaryReader r = new BinaryReader(s);

    // MemoryStream result = new MemoryStream();
    // BinaryWriter w = new BinaryWriter(result);
    // var temp = r.ReadBytes(dataSize);

    // if (header.pixelFormat.Fourcc == FourCC.DST1)
    // {
    //     header.pixelFormat.Fourcc = FourCC.DXT1;
    //     w.Write(0x20534444); // DDS header
    //     header.UnParse(result);

    //     var blockOffset2 = 0;
    //     var blockOffset3 = blockOffset2 + (dataSize >> 1);

    //     // probably a better way to do this
    //     var count = (blockOffset3 - blockOffset2) / 4;

    //     for (int i = 0; i < count; i++)
    //     {
    //         result.Write(temp, blockOffset2, 4);
    //         result.Write(temp, blockOffset3, 4);
    //         blockOffset2 += 4;
    //         blockOffset3 += 4;
    //     }
    // }
    // else if (header.pixelFormat.Fourcc == FourCC.DST3) // DST3
    // {
    //     header.pixelFormat.Fourcc = FourCC.DXT3;
    //     w.Write(0x20534444);
    //     header.UnParse(result);

    //     var blockOffset0 = 0;
    //     var blockOffset2 = blockOffset0 + (dataSize >> 1);
    //     var blockOffset3 = blockOffset2 + (dataSize >> 2);

    //     throw new NotImplementedException("no samples");
    // }
    // else if (header.pixelFormat.Fourcc ==  FourCC.DST5) // DST5
    // {
    //     header.pixelFormat.Fourcc = FourCC.DXT5;
    //     w.Write(0x20534444);
    //     header.UnParse(result);

    //     var blockOffset0 = 0;
    //     var blockOffset2 = blockOffset0 + (dataSize >> 3);
    //     var blockOffset1 = blockOffset2 + (dataSize >> 2);
    //     var blockOffset3 = blockOffset1 + (6 * dataSize >> 4);

    //     // probably a better way to do this
    //     var count = (blockOffset2 - blockOffset0) / 2;

    //     for (int i = 0; i < count; i++)
    //     {
    //         result.Write(temp, blockOffset0, 2);
    //         result.Write(temp, blockOffset1, 6);
    //         result.Write(temp, blockOffset2, 4);
    //         result.Write(temp, blockOffset3, 4);

    //         blockOffset0 += 2;
    //         blockOffset1 += 6;
    //         blockOffset2 += 4;
    //         blockOffset3 += 4;
    //     }
    // }
    // result.Position = 0;
    // return result;
  }
}
