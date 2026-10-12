import type { QuoteLine, Totals } from "./index";
// Integer half-up rounding: each line, then discount, then tax on discounted subtotal.
const roundRatio = (a: bigint, b: bigint) => (a + b / 2n) / b;
export function totals(
  lines: QuoteLine[],
  discountBps = 0,
  taxBps = 0,
): Totals {
  const subtotal = lines.reduce(
    (sum, l) =>
      sum + roundRatio(BigInt(l.unitMinor) * BigInt(l.quantity100), 100n),
    0n,
  );
  const discount = roundRatio(subtotal * BigInt(discountBps), 10000n);
  const tax = roundRatio((subtotal - discount) * BigInt(taxBps), 10000n);
  const result = [subtotal, discount, tax, subtotal - discount + tax].map(
    Number,
  );
  if (result.some((x) => !Number.isSafeInteger(x)))
    throw new Error("Amount exceeds supported precision");
  return {
    subtotalMinor: result[0],
    discountMinor: result[1],
    taxMinor: result[2],
    totalMinor: result[3],
  };
}
