export enum FourCC {
  DST1 = 0x31545344,
  DST3 = 0x33545344,
  DST5 = 0x35545344,
  DXT1 = 0x31545844,
  DXT3 = 0x33545844,
  DXT5 = 0x35545844,
  None = 0x00000000,
}

export enum PixelFormatFlags {
  FourCC = 0x00000004,
  RGB = 0x00000040,
  RGBA = 0x00000041,
  Luminance = 0x00020000,
}

export enum RleVersion {
  RLE2 = 0x32454C52,
  RLES = 0x53454C52
}

export enum HeaderFlags {
  Texture = 0x00001007, // DDSD_CAPS | DDSD_HEIGHT | DDSD_WIDTH | DDSD_PIXELFORMAT 
  Mipmap = 0x00020000, // DDSD_MIPMAPCOUNT
  Volume = 0x00800000, // DDSD_DEPTH
  Pitch = 0x00000008, // DDSD_PITCH
  LinearSize = 0x00080000, // DDSD_LINEARSIZE
}
