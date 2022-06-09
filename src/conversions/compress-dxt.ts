// import { BinaryDecoder, BinaryEncoder } from "@s4tk/encoding";

// //#region Structs

// /**
//  * Structure to simulate pointers in C++.
//  */
// class DataPointer<T = number> {
//   protected _index = 0;
//   get index() { return this._index; }
//   set index(value: number) { this._index = value; }

//   readonly data: T[];

//   constructor(length: number, defaultValue: any = 0) {
//     this.data = new Array(length).fill(defaultValue as T);
//   }

//   get(index = this.index) {
//     return this.data[index];
//   }

//   set(value: T, index = this.index) {
//     this.data[index] = value;
//   }
// }

// //#endregion Structs

// //#region Variables

// let dxtInit = 1;
// let nIterPower = 4;
// let stb__Expand5 = new DataPointer(32);
// let stb__Expand6 = new DataPointer(64);
// let stb__OMatch5 = (new Array<number[]>(256)).fill(new Array<number>(2).fill(0));
// let stb__OMatch6 = (new Array<number[]>(256)).fill(new Array<number>(2).fill(0));
// let stb__QuantRBTab = new Array<number>(256 + 16).fill(0);
// let stb__QuantGTab = new Array<number>(256 + 16).fill(0);

// //#endregion Variables

// //#region Helpers

// function extractBlock(
//   src: BinaryDecoder,
//   x: number,
//   y: number,
//   width: number,
//   height: number,
//   block: number[]
// ) {
//   // TODO: optimization - C++ line 790

//   const bw = Math.min(width - x, 4);
//   const bh = Math.min(height - y, 4);
//   let bx = 0, by = 0;

//   const rem: number[] =
//     [
//       0, 0, 0, 0,
//       0, 1, 0, 1,
//       0, 1, 2, 0,
//       0, 1, 2, 3
//     ];

//   for (let i = 0; i < 4; ++i) {
//     by = rem[(bh - 1) * 4 + i] + y;
//     for (let j = 0; j < 4; ++j) {
//       bx = rem[(bw - 1) * 4 + j] + x;
//       for (let k = 0; k < 4; ++k) {
//         block[(i * 4 * 4) + (j * 4) + k]
//           = src.buffer[(by * (width * 4)) + (bx * 4) + k];
//       }
//     }
//   }
// }

// function stbCompressDxtBlock(
//   dest: BinaryEncoder,
//   src: number[],
//   alpha: number
// ) {
//   if (dxtInit) {
//     stb__InitDXT();
//     dxtInit = 0;
//   }

//   if (alpha) {
//     stb__CompressAlphaBlock(dest, src);
//     // dest += 8; // FIXME: needed? probably not?
//   }

//   stb__CompressColorBlock(dest, src);
// }

// function stb__InitDXT() {
//   let i = 0;

//   for (i = 0; i < 32; i++)
//     stb__Expand5[i] = (i << 3) | (i >> 2);

//   for (i = 0; i < 64; i++)
//     stb__Expand6[i] = (i << 2) | (i >> 4);

//   for (i = 0; i < 256 + 16; i++) {
//     const v = i - 8 < 0 ? 0 : i - 8 > 255 ? 255 : i - 8;
//     stb__QuantRBTab[i] = stb__Expand5[stb__Mul8Bit(v, 31)];
//     stb__QuantGTab[i] = stb__Expand6[stb__Mul8Bit(v, 63)];
//   }

//   // FIXME: C++ uses pointers... these are pointers to indices... idk how to handle this in TS
//   stb__PrepareOptTable(stb__OMatch5[0], stb__Expand5, 32);
//   stb__PrepareOptTable(stb__OMatch6[0], stb__Expand6, 64);
// }

// function stb__Mul8Bit(a: number, b: number): number {
//   const t = a * b + 128;
//   return (t + (t >> 8)) >> 8;
// }

// function stb__As16Bit(r: number, g: number, b: number) {
//   return (stb__Mul8Bit(r, 31) << 11) + (stb__Mul8Bit(g, 63) << 5) + stb__Mul8Bit(b, 31);
// }

// function stb__PrepareOptTable(table: number[], expand: number[], size: number) {
//   let i = 0, mn = 0, mx = 0;
//   for (i = 0; i < 256; i++) {
//     let bestErr = 256;
//     for (mn = 0; mn < size; mn++) {
//       for (mx = 0; mx < size; mx++) {
//         const mine = expand[mn];
//         const maxe = expand[mx];
//         let err = Math.abs(stb__Lerp13(maxe, mine) - i);

//         // DX10 spec says that interpolation must be within 3% of "correct" result,
//         // add this as error term. (normally we'd expect a random distribution of
//         // +-1.5% error, but nowhere in the spec does it say that the error has to be
//         // unbiased - better safe than sorry).
//         err += Math.abs(maxe - mine) * 3 / 100;

//         if (err < bestErr) {
//           // FIXME: C++ uses pointers... these are pointers to indices... idk how to handle this in TS
//           table[i * 2 + 0] = mx;
//           table[i * 2 + 1] = mn;
//           bestErr = err;
//         }
//       }
//     }
//   }
// }

// function stb__Lerp13(a: number, b: number) {
//   // FIXME: how to use STB_DXT_USE_ROUNDING_BIAS here?
//   return (2 * a + b) / 3;
// }

// function stb__CompressAlphaBlock(dest: BinaryEncoder, src: number[]) {
//   let i = 0, dist = 0, bias = 0, dist4 = 0, dist2 = 0, bits = 0, mask = 0;

//   // find min/max color
//   let mn = 0, mx = 0;

//   // FIXME: are the indicies for src offset by anything?
//   mn = mx = src[3];
//   for (i = 1; i < 16; i++) {
//     if (src[i * 4 + 3] < mn) mn = src[i * 4 + 3];
//     else if (src[i * 4 + 3] > mx) mx = src[i * 4 + 3];
//   }

//   // encode them
//   dest.byte(mx);
//   dest.byte(mn);

//   // TODO: NEW_OPTIMISATIONS

//   // determine bias and emit color indices
//   // given the choice of mx/mn, these indices are optimal:
//   // http://fgiesen.wordpress.com/2009/12/15/dxt5-alpha-block-index-determination/
//   dist = mx - mn;
//   //printf("mn = %i; mx = %i; dist = %i\n", mn, mx, dist);
//   dist4 = dist * 4;
//   dist2 = dist * 2;
//   bias = (dist < 8) ? (dist - 1) : (dist / 2 + 2);
//   bias -= mn * 7;
//   bits = 0, mask = 0;

//   for (i = 0; i < 16; i++) {
//     let a = src[i * 4 + 3] * 7 + bias;
//     let ind = 0, t = 0;

//     // select index. this is a "linear scale" lerp factor between 0 (val=min) and 7 (val=max).
//     t = (a >= dist4) ? -1 : 0; ind = t & 4; a -= dist4 & t;
//     t = (a >= dist2) ? -1 : 0; ind += t & 2; a -= dist2 & t;
//     ind += (a >= dist) ? 1 : 0;

//     // turn linear scale into DXT index (0/1 are extremal pts)
//     ind = -ind & 7;
//     ind ^= (2 > ind) ? 1 : 0;

//     // write index
//     mask |= ind << bits;
//     if ((bits += 3) >= 8) {
//       dest.byte(mask); // * dest++ = mask;
//       mask >>= 8;
//       bits -= 8;
//     }
//   }
// }

// function stb__CompressColorBlock(dest: BinaryEncoder, block: number[]) {
//   let mask = 0, i = 0, dither = 0, refinecount = 0, max16 = 0, min16 = 0;
//   const dblock = new Array<number>(16 * 4).fill(0), color = new Array<number>(4 * 4).fill(0);

//   dither = 1; // for DXT5
//   refinecount = 2; // FIXME: high quality

//   // check if block is constant
//   for (i = 1; i < 16; i++)
//     if (block[i] !== block[0])
//       break;

//   if (i === 16) { // constant color
//     let r = block[0], g = block[1], b = block[2];
//     mask = 0xaaaaaaaa;
//     max16 = (stb__OMatch5[r][0] << 11) | (stb__OMatch6[g][0] << 5) | stb__OMatch5[b][0];
//     min16 = (stb__OMatch5[r][1] << 11) | (stb__OMatch6[g][1] << 5) | stb__OMatch5[b][1];
//   } else {
//     // first step: compute dithered version for PCA if desired
//     if (dither)
//       stb__DitherBlock(dblock, block);

//     // second step: pca+map along principal axis
//     const [pmax16, pmin16] = stb__OptimizeColorsBlock(dither ? dblock : block);
//     max16 = pmax16;
//     min16 = pmin16;

//     if (max16 !== min16) {
//       stb__EvalColors(color, max16, min16);
//       mask = stb__MatchColorsBlock(block, color, dither);
//     } else
//       mask = 0;

//     // third step: refine (multiple times if requested)
//     for (i = 0; i < refinecount; i++) {
//       const lastmask = mask;

//       if (stb__RefineBlock(dither ? dblock : block,& max16,& min16, mask)) {
//         if (max16 !== min16) {
//           stb__EvalColors(color, max16, min16);
//           mask = stb__MatchColorsBlock(block, color, dither);
//         } else {
//           mask = 0;
//           break;
//         }
//       }

//       if (mask === lastmask)
//         break;
//     }
//   }

//   // write the color block
//   if (max16 < min16) {
//     const t = min16;
//     min16 = max16;
//     max16 = t;
//     mask ^= 0x55555555;
//   }

//   dest[0] = max16;
//   dest[1] = max16 >> 8;
//   dest[2] = min16;
//   dest[3] = min16 >> 8;
//   dest[4] = mask;
//   dest[5] = mask >> 8;
//   dest[6] = mask >> 16;
//   dest[7] = mask >> 24;
// }

// function stb__OptimizeColorsBlock(block: number[]): [number, number] {
//   let minp = 0, maxp = 0;
//   let magn = 0;
//   let v_r = 0, v_g = 0, v_b = 0;

//   let covf = new Array<number>(6).fill(0), vfr = 0, vfg = 0, vfb = 0;

//   // determine color distribution
//   const cov = new Array<number>(6).fill(0);
//   const mu = new Array<number>(3).fill(0), min = new Array<number>(3).fill(0), max = new Array<number>(3).fill(0);
//   let ch = 0, i = 0, iter = 0;

//   for (ch = 0; ch < 3; ch++) {
//     const bp = block[ch];
//     let muv = 0, minv = 0, maxv = 0;

//     // TODO: NEW_OPTIMISATIONS

//     muv = minv = maxv = bp[0];
//     for (i = 4; i < 64; i += 4) {
//       muv += bp[i];
//       if (bp[i] < minv) minv = bp[i];
//       else if (bp[i] > maxv) maxv = bp[i];
//     }

//     mu[ch] = (muv + 8) >> 4;
//     min[ch] = minv;
//     max[ch] = maxv;
//   }

//   // determine covariance matrix
//   for (i = 0; i < 6; i++)
//     cov[i] = 0;

//   for (i = 0; i < 16; i++) {
//     const r = block[i * 4 + 0] - mu[0];
//     const g = block[i * 4 + 1] - mu[1];
//     const b = block[i * 4 + 2] - mu[2];

//     cov[0] += r * r;
//     cov[1] += r * g;
//     cov[2] += r * b;
//     cov[3] += g * g;
//     cov[4] += g * b;
//     cov[5] += b * b;
//   }

//   // convert covariance matrix to float, find principal axis via power iter
//   for (i = 0; i < 6; i++)
//     covf[i] = cov[i] / 255.0;

//   vfr = (max[0] - min[0]);
//   vfg = (max[1] - min[1]);
//   vfb = (max[2] - min[2]);

//   for (iter = 0; iter < nIterPower; iter++) {
//     const r = vfr * covf[0] + vfg * covf[1] + vfb * covf[2];
//     const g = vfr * covf[1] + vfg * covf[3] + vfb * covf[4];
//     const b = vfr * covf[2] + vfg * covf[4] + vfb * covf[5];

//     vfr = r;
//     vfg = g;
//     vfb = b;
//   }

//   magn = Math.abs(vfr);
//   if (Math.abs(vfg) > magn) magn = Math.abs(vfg);
//   if (Math.abs(vfb) > magn) magn = Math.abs(vfb);

//   if (magn < 4.0) { // too small, default to luminance
//     v_r = 299; // JPEG YCbCr luma coefs, scaled by 1000.
//     v_g = 587;
//     v_b = 114;
//   } else {
//     magn = 512.0 / magn;
//     // FIXME: conversions to ints
//     v_r = Math.floor(vfr * magn);
//     v_g = Math.floor(vfg * magn);
//     v_b = Math.floor(vfb * magn);
//   }

//   // TODO: NEW_OPTIMISATIONS
//   let mind = 0x7fffffff, maxd = -0x7fffffff;
//   // Pick colors at extreme points
//   for (i = 0; i < 16; i++) {
//     const dot = block[i * 4 + 0] * v_r + block[i * 4 + 1] * v_g + block[i * 4 + 2] * v_b;

//     if (dot < mind) {
//       mind = dot;
//       minp = i * 4;
//     }

//     if (dot > maxd) {
//       maxd = dot;
//       maxp = i * 4;
//     }
//   }


//   const pmax16 = stb__As16Bit(block[maxp], block[maxp + 1], block[maxp + 2]);
//   const pmin16 = stb__As16Bit(block[minp], block[minp + 1], block[minp + 2]);

//   return [pmax16, pmin16];
// }

// function stb__DitherBlock(dest: BinaryEncoder, block: number[]) {
//   const err = new Array(8).fill(0);
//   let ep1 = 0, ep2 = 4, et = 0;
//   let ch = 0, y = 0;

//   // process channels seperately
//   for (ch = 0; ch < 3; ++ch) {
//       unsigned char * bp = block + ch, * dp = dest + ch;
//       unsigned char * quant = (ch == 1) ? stb__QuantGTab + 8 : stb__QuantRBTab + 8;
//     memset(err, 0, sizeof(err));
//     for (y = 0; y < 4; ++y) {
//       dp[0] = quant[bp[0] + ((3 * ep2[1] + 5 * ep2[0]) >> 4)];
//       ep1[0] = bp[0] - dp[0];
//       dp[4] = quant[bp[4] + ((7 * ep1[0] + 3 * ep2[2] + 5 * ep2[1] + ep2[0]) >> 4)];
//       ep1[1] = bp[4] - dp[4];
//       dp[8] = quant[bp[8] + ((7 * ep1[1] + 3 * ep2[3] + 5 * ep2[2] + ep2[1]) >> 4)];
//       ep1[2] = bp[8] - dp[8];
//       dp[12] = quant[bp[12] + ((7 * ep1[2] + 5 * ep2[3] + ep2[2]) >> 4)];
//       ep1[3] = bp[12] - dp[12];
//       bp += 16;
//       dp += 16;
//       et = ep1, ep1 = ep2, ep2 = et; // swap
//     }
//   }
// }

// //#endregion Helpers

// //#region Interface

// /**
//  * TODO:
//  * 
//  * @param pixels TODO:
//  * @param width TODO:
//  * @param height TODO:
//  */
// export function compressDxt5(pixels: Buffer, width: number, height: number): Buffer {
//   const src = new BinaryDecoder(pixels);
//   const dest = BinaryEncoder.alloc(pixels.length / 4);
//   const block = new Array<number>(64).fill(0);

//   for (let y = 0; y < height; y += 4) {
//     for (let x = 0; x < width; x += 4) {
//       extractBlock(src, x, y, width, height, block);
//       stbCompressDxtBlock(dest, block, 10); // FIXME: 10?
//       // dst.skip(16);// FIXME: needed? probably not
//       // dst += isDxt5 ? 16 : 8; advance encoder offset
//     }
//   }

//   return dest.buffer;
// }

// //#endregion Interface
