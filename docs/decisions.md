# Kern: decisions and open questions

Date: 2026-11-18. This file overrides the six specification documents where they disagree with it.

## 1. Name

The product is **Kern**. The six documents were written under the working name AfterClick; they were renamed on import, but any stray mention of "AfterClick" means Kern.

Chosen because "kerning" is the craft of adjusting the space between things so they fit — which is what the product does between an advertisement and a checkout.

## 2. What Kern is

An ad-to-checkout promise verifier. It does not test whether a page loads, whether a discount rule exists, or whether a form submits. It tests whether **the specific promise a customer was shown** is what the customer is **actually charged**, and it does not accept a repair until the same challenge passes unchanged.

## 3. Four corrections to the specifications

These came out of reviewing the package. They are decisions, not suggestions.

### 3.1 Boundary at exactly $50

The specs test a $60 cart and a $35 cart. Neither can prove the threshold is right: a broken fix that grants free shipping only from $60 would pass both.

- Oracle unit tests: $49.99 → $9, $50.00 → $0, $50.01 → $0.
- Browser scenarios: the $50.00 cart is required in addition to $60 and $35.
- A $60-only fix must be detectable. If it is not, the demo proves nothing.

### 3.2 The advertisement is not the merchant's interpretation

The approved contract must not silently absorb the ad's ambiguity. If the ad says "free shipping over $50" and the approved contract adds "US only, standard, after discount, excludes gift cards", that difference stays visible in the receipt as a stated interpretation.

Otherwise the product verifies a promise the merchant rewrote after seeing the ad, which is the exact failure mode it claims to catch.

### 3.3 The $9 baseline needs its own source

The ad establishes that qualifying orders ship free. It does not establish that ordinary shipping costs $9.

So the $9 expectation comes from a separate, approved store-policy statement, referenced by the contract. Without that source, the control's expected value is invented.

### 3.4 Hash-linked, not signed

A SHA-256 hash proves the contract and evidence did not change after the fact. It does not prove who issued them, and it is not a cryptographic signature.

Receipt language: "hash-linked evidence record". Never "signed receipt" unless a real signing key exists and is verified.

## 4. Scope

**P0, in scope:** one owned demo storefront, one promise type (`free_shipping_threshold`), three scenarios ($60 eligible, $50 boundary, $35 control), real Kane CLI runs, one bounded code repair with human approval, one unchanged rerun, one scoped receipt.

**P0, out of scope:** real orders or payments, Shopify/Meta/any third-party integration, arbitrary URLs, scheduled monitoring, multi-merchant auth, automatic deployment, email, analytics dashboards.

**Stops at the shipping quote.** No card entry, no order submission, no fulfilment.

## 5. Claim rules

Allowed:

- "Kane observed a $9 standard shipping charge for a cart that the approved contract says ships free."
- "The control cart was charged $9 before and after the repair, so the fix did not make all shipping free."
- "Verified for the tested conditions, at the recorded time, on the demo storefront."

Not allowed:

- "This store honors its ads."
- "All promotions are correct."
- "Kane detected the bug" if Kane only navigated and the mismatch came from a fixture.
- "The agent fixed it" if the patch was applied by hand and only described as agent work.
- Anything about customers, revenue, retention or demand.

## 6. Differentiation, in one paragraph

Promotion-testing products exist and check the platform configuration against carts. They start from the discount rule, not the advertisement, and the closest one documents that free shipping is not cart-tested, app-backed discounts are unsupported, customer segments cannot be reproduced, and only the primary market is varied. The "promise" framing is also already used by a prior hackathon project, for marketing copy rather than commerce. Kern's defensible position: start from the ad, freeze the merchant's terms, observe the rendered checkout, then close the loop with a bounded code repair and an unchanged rerun. See `market-research.md`.

## 7. Deadline and remaining time

**26 November 2026, 11:59 PM IST** = 18:29 UTC = 7:29 PM WAT = 10:29 AM PT.

The six documents say 19 November; that was the original date and has been extended.

Current date on this machine: **21 November 2026**. That leaves roughly **4 days 18 hours**. Plan against that, not against the two weeks the documents describe.

Judging: Ships 25%, Verified 25%, Closed loop 25%, Craft 25%. Clear the three bars first (works end to end, Kane caught or proved something, the agent and Kane talked to each other).

Compressed plan:

| Day | Must finish |
|---|---|
| 22 Nov | Kane preflight (real run) + demo store with seeded defect + oracle and boundary tests |
| 23 Nov | Worker + three real Kane scenarios, correct verdict classification |
| 24 Nov | Repair loop: FAIL artifact → bounded diff → unchanged rerun passing |
| 25 Nov | Receipt, Journey X-Ray, README, record the demo video |
| 26 Nov (before 18:29 UTC) | Publish repo, two public posts, submit. Code frozen. |

No merchant interviews are scheduled. If one happens by accident, record it; do not spend build time on it.

## 8. Open questions

1. Which coding agent is authenticated locally: Codex, Pi, or something else? Choose one and record the version.
2. Does the installed Kane version (0.10.6) return `final_state` values from `store as` on a local checkout? Unverified until a real run.
3. Can Kane read a shipping quote reliably enough to trust across repeated runs? Needs ≥5 runs before any claim.
4. Is the demo store served from the same origin as the app, or a separate port? Decide before the worker is written.
