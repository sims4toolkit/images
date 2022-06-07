export enum FourCC {
  DST1 = 0x31545344,
  DST3 = 0x33545344,
  DST5 = 0x35545344,
  DXT1 = 0x31545844,
  DXT3 = 0x33545844,
  DXT5 = 0x35545844,
  None = 0x00000000,
}

export enum PixelFormatFlag {
  FourCC = 0x00000004,
  RGB = 0x00000040,
  RGBA = 0x00000041,
  Luminance = 0x00020000,
}
