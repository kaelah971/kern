export const FREE_SHIPPING_THRESHOLD_CENTS = 5_000;
export const STANDARD_SHIPPING_CENTS = 900;

/**
 * ===========================================================================
 * DELIBERATE DEMO DEFECT — SEEDED ON PURPOSE. DO NOT SHIP THIS FUNCTION.
 * ===========================================================================
 *
 * The advertised promise is free standard shipping at an after-discount
 * merchandise subtotal of $50.00 (5,000 cents) or more.
 *
 * This implementation compares a cents subtotal against a threshold that has
 * been multiplied by 100, as if the constant were denominated in dollars.
 * The effect is that no realistic cart ever reaches the free-shipping branch:
 *
 *   $35.00 cart (3,500 cents)  -> $9.00  (correct by accident)
 *   $50.00 cart (5,000 cents)  -> $9.00  (WRONG; promise says $0.00)
 *   $60.00 cart (6,000 cents)  -> $9.00  (WRONG; promise says $0.00)
 *
 * This is the controlled defect the Kern repair slice is meant to fix. The
 * oracle in src/lib/contract.ts is independent of this function and must not
 * be edited to match it. See docs/demo-defect.md.
 */
export function getStandardShippingCents(subtotalCents: number): number {
  if (!Number.isSafeInteger(subtotalCents) || subtotalCents < 0) {
    throw new RangeError(`subtotal must be non-negative integer cents, got ${subtotalCents}`);
  }

  // DELIBERATE DEMO DEFECT: * 100 treats the cents threshold as dollars.
  if (subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS * 100) {
    return 0;
  }
  return STANDARD_SHIPPING_CENTS;
}
