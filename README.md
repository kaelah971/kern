# Kern

**Every ad makes a promise. Kern checks whether it survives the click.**

Kern turns an advertised offer into a frozen, merchant-approved contract, sends Kane CLI through the real customer journey in a browser, compares what the customer was actually charged against what was promised, and — when the store is wrong — gets the source code repaired and has Kane rerun the same challenge unchanged.

Status: **audit engine built and run for real.** A real three-scenario Kane audit on 22 Nov 2026 returned **BROKEN** overall: the $60.00 and exact $50.00 carts were observed at **$9.00** against a **$0.00** contract expectation, and the $35.00 control passed at **$9.00**. The campaign wizard, repair flow and receipt are **not** built.

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
npm test          # contract hash, oracle boundary, parser, audit status table
npm start         # http://127.0.0.1:4173
```

The store has three deterministic demo carts: `$60.00 eligible`, `$50.00 boundary` and `$35.00 control`. Each one lands on a server-calculated shipping quote. The deliberate defect is documented in `docs/demo-defect.md`; the real Kane audit is in `docs/proof-ledger.md`.

## Audit engine

The audit engine is a CLI, not a web UI. With the store running in one process:

```bash
# in another process
node scripts/kane-audit.ts          # 3 scenarios, observe + assert each
node scripts/kane-audit.ts --scenario boundary-50 --kind observe
```

Each scenario runs two real Kane objectives: an **observe** run that reads the rendered amounts, and an **assert** run that checks the shipping amount against the contract. The audit writes `.data/audits/<auditId>/audit.json`, copies each real `.evidence` pack into the audit directory, and hashes it. Statuses are `HONORED`, `BROKEN`, `INCONCLUSIVE` or `INFRA_ERROR`; they fail closed.

`--reuse-capture eligible-60` imports the supplied real capture only when its recorded objective hash is byte-identical to the generated challenge. The audit record labels it `provided_capture` and does not pretend it was run again.

```bash
npm start
node scripts/kane-audit.ts --reuse-capture eligible-60
```

Both audit commands require an authenticated `kane-cli` and spend Kane credits.
The audit stops before any run if the store or authentication is unavailable.

---

## Deadline

Kane CLI Online Hackathon: **26 November 2026, 11:59 PM IST** (18:29 UTC / 7:29 PM WAT). Judging: Ships 25%, Verified 25%, Closed loop 25%, Craft 25%.

## What this is not

No Shopify or Meta integration. No payments. No production monitoring. No multi-tenant SaaS. No certification that a store is honest — only that named conditions were observed at a recorded time.
