/**
 * Finds the closet power of 2 that is less than or equal to the given number.
 * Yes, this is inefficient. But, it should never be used on numbers that would
 * loop more than ~8 times anyways, so who cares.
 * 
 * @param n Number to find closet power of 2 for
 */
export function findPowerOfTwo(n: number): number {
  if (n < 1) throw new Error("N must be >= 1");
  let power = 1;
  while (true) {
    const nextPower = power * 2;
    if (nextPower <= n) {
      power = nextPower;
    } else {
      return power;
    }
  }
}