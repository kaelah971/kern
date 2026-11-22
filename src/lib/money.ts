/**
 * Money is always integer cents. Formatting is the only place a decimal
 * appears, and it never feeds a comparison.
 */
export function formatUsd(cents: number): string {
  if (!Number.isSafeInteger(cents)) {
    throw new RangeError(`USD amount must be integer cents, got ${cents}`);
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}
