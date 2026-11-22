# Kern

**Every ad makes a promise. Kern checks whether it survives the click.**

Kern turns an advertised offer into a frozen, merchant-approved contract, sends Kane CLI through the real customer journey in a browser, compares what the customer was actually charged against what was promised, and — when the store is wrong — gets the source code repaired and has Kane rerun the same challenge unchanged.

Status: **first slice built.** A real Kane preflight passed on 22 Nov 2026 (`run_end` passed, exit 0). The demo storefront, seeded shipping defect, frozen promise contract and oracle tests exist. The campaign wizard, worker, repair flow and receipt are **not** built.

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

Nothing else in this slice. No dashboard, no repair flow, no receipt until the store and the bug are real and reproducible.

## Run what exists

```bash
npm install
npm test          # contract hash, oracle boundary, pre-repair acceptance
npm start         # http://127.0.0.1:4173
```

The store has three deterministic demo carts: `$60.00 eligible`, `$50.00 boundary` and `$35.00 control`. Each one lands on a server-calculated shipping quote. The deliberate defect is documented in `docs/demo-defect.md`; the real Kane preflight is in `docs/proof-ledger.md`.

---

## Deadline

Kane CLI Online Hackathon: **26 November 2026, 11:59 PM IST** (18:29 UTC / 7:29 PM WAT). Judging: Ships 25%, Verified 25%, Closed loop 25%, Craft 25%.

## What this is not

No Shopify or Meta integration. No payments. No production monitoring. No multi-tenant SaaS. No certification that a store is honest — only that named conditions were observed at a recorded time.
