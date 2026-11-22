# Seeded demo defect

**Type:** deliberate, controlled challenge defect  
**File:** `src/lib/shipping.ts` → `getStandardShippingCents()`  
**Status:** active until the repair slice; local demo only, not a production vulnerability

## What is wrong

The store compares the cart's cents subtotal with
`FREE_SHIPPING_THRESHOLD_CENTS * 100`. The multiplier treats the cents constant
as dollars, so the free-shipping branch requires a $5,000.00 cart. Every
realistic cart falls through to the $9.00 branch.

## Expected values

| Cart | After-discount subtotal | Promise / policy SP-01 | Current store quote |
|---|---:|---:|---:|
| `$60.00 eligible` (tote + notebook) | 6,000¢ | $0.00 | **$9.00** |
| `$50.00 boundary` (apron) | 5,000¢ | $0.00 | **$9.00** |
| `$35.00 control` (tote) | 3,500¢ | $9.00 | $9.00 (accidentally correct) |

## Why this defect

- The **$35.00 control** still pays $9.00, so a fix that makes all shipping
  free fails the control.
- The **$50.00 boundary** catches a fix that only frees carts at $60.00 or
  above, which would pass both original spec carts.
- The **$60.00 cart** is the advertised promise the customer was shown.

## Provenance and guardrails

- Seeded by hand in the initial implementation. It is not a generated failure,
  a mock, or a UI-only badge.
- The quote is calculated server-side in the request handler from the real
  cart subtotal, then rendered into the checkout page.
- The acceptance test `tests/acceptance.pre-repair.test.ts` records the
  defective quote and asserts the oracle's independent expectation. It must
  not be weakened to make the defect look fixed.
- Repair is proven by rerunning the unchanged challenge against the unchanged
  contract hash. Editing this file, the contract, the oracle or a test is not
  a repair.
- The store binds to `127.0.0.1` and stops at the shipping quote. No payment
  fields, card data or order submission exist.
