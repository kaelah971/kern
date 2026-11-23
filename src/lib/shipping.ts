export const FREE_SHIPPING_THRESHOLD_CENTS = 5_000;
export const STANDARD_SHIPPING_CENTS = 900;

/**
 * US standard shipping for the Kern demo store.
 *
 * Free when the after-discount merchandise subtotal is $50.00 (5,000 cents)
 * or more; otherwise $9.00. Both sides are integer cents.
 *
 * This is the repaired version of the seeded demo defect. The buggy revision
 * remains reachable in git history; see README "Replay the pre-repair defect".
 */
export function getStandardShippingCents(subtotalCents: number): number {
  if (!Number.isSafeInteger(subtotalCents) || subtotalCents < 0) {
    throw new RangeError(`subtotal must be non-negative integer cents, got ${subtotalCents}`);
  }

  if (subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS) {
    return 0;
  }
  return STANDARD_SHIPPING_CENTS;
}
