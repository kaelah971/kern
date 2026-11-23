# Kern

**Every ad makes a promise. Kern checks whether it survives the click.**

Kern turns an advertised offer into a frozen, merchant-approved contract, sends Kane CLI through the real customer journey in a browser, compares what the customer was actually charged against what was promised, and — when the store is wrong — gets the source code repaired and has Kane rerun the same challenge unchanged.

Status: **broken promise proven, repaired, and re-verified.** The pre-repair audit observed **$9.00** on the $60.00 and exact $50.00 carts against a **$0.00** promise; the $35.00 control paid **$9.00**. After the one-line repair, an unchanged six-run audit observed **$0.00 / $0.00 / $9.00**, every assert exited 0, overall **HONORED**. The read-only audit app, Promise Receipt and closed-loop view are built. The campaign wizard and automation are **not** built.

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
npm test                              # 56 tests; replay characterization excluded
npm run demo:replay-pre-repair        # restores ed3dbaf, runs replay test, restores
npm start                             # store: http://127.0.0.1:4173
npm run app                           # app:   http://127.0.0.1:3000
npm run dev                           # both processes
```

The store has three deterministic demo carts: `$60.00 eligible`, `$50.00 boundary` and `$35.00 control`. Each one lands on a server-calculated shipping quote. The pre-repair defect is documented in `docs/demo-defect.md`; both real Kane audits are in `docs/proof-ledger.md`.

`tests/replay/pre-repair.test.ts` is preserved unchanged and excluded from the
default glob. It asserts the old $9.00 defect; `npm run demo:replay-pre-repair`
temporarily restores `ed3dbaf:src/lib/shipping.ts`, runs only that file, then
restores the current file and verifies the hash.

## Audit engine

The audit engine is a CLI; the read-only app reads its JSON records. With the store running in one process:

```bash
# in another process
node scripts/kane-audit.ts          # 3 scenarios, observe + assert each
node scripts/kane-audit.ts --scenario boundary-50 --kind observe
```

Each scenario runs two real Kane objectives: an **observe** run that reads the rendered amounts, and an **assert** run that checks the shipping amount against the contract. The audit writes `.data/audits/<auditId>/audit.json`, copies each real `.evidence` pack into the audit directory, and hashes it. Statuses are `HONORED`, `BROKEN`, `INCONCLUSIVE` or `INFRA_ERROR`; they fail closed.

`--reuse-capture eligible-60` imports the supplied real capture only when its recorded objective hash is byte-identical to the generated challenge. The audit record labels it `provided_capture` and does not pretend it was run again. The final pre-repair evidence uses a live eligible-60 run; the earlier capture audit is preserved.

On a `repair/*` branch the audit auto-links to the latest complete pre-repair
audit, requires all six objective SHA-256 values to be identical, and aborts
before spending credits if any hash moved. The record carries `postRepair: true`,
`answersAuditId`, and every pre/post hash comparison.

```bash
npm start
node scripts/kane-audit.ts --reuse-capture eligible-60
```

Both audit commands require an authenticated `kane-cli` and spend Kane credits.
The audit stops before any run if the store or authentication is unavailable.

## Repair verified

| Audit | Result | Role |
|---|---|---|
| `2026-11-22T00-53-05-669Z-f5230a` | BROKEN | Pre-repair full audit |
| `2026-11-23T12-27-07-978Z-a0c39f` | BROKEN | Live eligible-60 replacement for the borrowed capture |
| `2026-11-23T12-35-29-692Z-48b993` | **HONORED** | Post-repair full audit; answers the pre-repair audit, six identical objective hashes |

Replay the pre-repair defect: `git checkout ed3dbaf -- src/lib/shipping.ts`.

## App

A read-only, server-rendered Node app on **http://127.0.0.1:3000**, in the same
paper/ink/accent palette as the storefront. It reads real files and does not mock
a missing one:

| Route | What it shows |
|---|---|
| `/` | Campaign: ad snapshot, merchant interpretation, frozen contract, policy source for $9.00, three scenarios, latest audit |
| `/audits` | Every readable audit on disk, newest first, with status, post-repair provenance, runs and credits |
| `/audits/:id` | Journey X-Ray: per scenario, Promised / Observed lanes, assert result, Kane verdict, session, exit, result/reason, objective and evidence hashes, `kane-cli evidence serve` command |
| `/audits/:id/receipt` | Promise Receipt: contract id/hash, ad snapshot, policy reference, expected/observed, per-run table, evidence hashes, limits |
| `/repair/:preAuditId` | Closed loop: what failed and Kane's verdict, the actual `git diff ed3dbaf HEAD -- src/lib/shipping.ts`, and the post-repair audit with the six-hash comparison |

The app reads `.data/audits/*/audit.json` (and `docs/store-policy.md`). If that
directory or a file is missing, it renders an explicit empty state. The repair
diff is read from git; there are no fabricated screenshots.

---

## Deadline

Kane CLI Online Hackathon: **26 November 2026, 11:59 PM IST** (18:29 UTC / 7:29 PM WAT). Judging: Ships 25%, Verified 25%, Closed loop 25%, Craft 25%.

## What this is not

No Shopify or Meta integration. No payments. No production monitoring. No multi-tenant SaaS. No certification that a store is honest — only that named conditions were observed at a recorded time.
