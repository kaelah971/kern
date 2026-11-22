# Store policy SP-01 — US standard shipping

**Status:** approved for the Kern demo storefront only  
**Approved:** 2026-11-21T23:45:00.000Z by `demo-merchant`  
**Applies to:** destination US, standard shipping, USD

This is a separate source from the advertisement. The ad establishes the
free-shipping promise; this policy establishes the ordinary $9.00 price used
by the negative control, as required by `docs/decisions.md` §3.3.

1. US standard shipping costs **$9.00** (900 cents).
2. Standard shipping is **free** when the after-discount merchandise subtotal
   is **$50.00 (5,000 cents) or more**.
3. The threshold is applied to the after-discount merchandise subtotal, before
   tax and before shipping.
4. All amounts are integer USD cents in code. No floating-point comparisons.
5. This policy says nothing about any other store, market, shipping method or
   currency.

The demo store's current shipping implementation deliberately violates rule 2.
See [demo-defect.md](demo-defect.md). The frozen contract references this
policy as its `baselineSource`.
