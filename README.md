# Kern

**Every ad makes a promise. Kern checks whether it survives the click.**

Kern turns an advertised offer into a frozen, merchant-approved contract, sends Kane CLI through the real customer journey in a browser, compares what the customer was actually charged against what was promised, and — when the store is wrong — gets the source code repaired and has Kane rerun the same challenge unchanged.

Status: **specification only. Nothing is built.** No Kane run has been made, no storefront exists, no customer has used this.

---

## The demo in five lines

1. The store advertises free standard shipping on orders over $50 (after-discount merchandise subtotal, USD, US).
2. A $60 cart is charged $9 at checkout. That breaks the promise.
3. A $35 cart is correctly charged $9. That control must keep passing.
4. A coding agent fixes the shipping calculation. A human approves the diff.
5. Kane reruns both carts unchanged: $0 and $9. A scoped receipt records both runs and what was never tested.

---

## Read in this order

| File | Why |
|---|---|
| `docs/decisions.md` | **Start here.** Name change, corrections to the specs, scope, claim limits |
| `docs/project idea.md` | The product in one document |
| `docs/prd.md` | Requirements and acceptance criteria |
| `docs/trd.md` | Stack, Kane integration, data model |
| `docs/architecture.md` | Trust boundaries and run/repair flows |
| `docs/full mvp_plan.md` | Slice-by-slice build order |
| `docs/project plan.md` | Milestones and submission checklist |
| `docs/market-research.md` | Who else is doing this, and what is actually different |

---

## First slice

Kane preflight (real, installed CLI) → demo store with a real seeded shipping bug → unit-tested promise oracle including the $50 boundary.

Nothing else. No dashboard, no repair flow, no receipt until the store and the bug are real and reproducible.

---

## Deadline

Kane CLI Online Hackathon: **26 November 2026, 11:59 PM IST** (18:29 UTC / 7:29 PM WAT). Judging: Ships 25%, Verified 25%, Closed loop 25%, Craft 25%.

## What this is not

No Shopify or Meta integration. No payments. No production monitoring. No multi-tenant SaaS. No certification that a store is honest — only that named conditions were observed at a recorded time.
