# Kern

**The promise firewall for checkout.**

An ad makes a promise. A coding agent changes the checkout. Kern freezes the promise, sends **Kane CLI** through the real rendered storefront, and refuses to accept the agent's patch until Kane reruns the **same six objectives** and passes.

Kern is an independent open-source project built on Kane CLI. It is not an official TestMu AI product.

**Live:** [tryoutkern.vercel.app](https://tryoutkern.vercel.app) · [Demo app](https://tryoutkern.vercel.app/campaign) · [Why Kane CLI](https://tryoutkern.vercel.app/why-kane) · [Gate](https://tryoutkern.vercel.app/gate) · [Store](https://tryoutkern.vercel.app/store/) · [GitHub](https://github.com/kaelah971/kern)

---

## The problem

A browser agent returns one word, `passed` or `failed`, and the pipeline acts on it. The rendered customer experience can still be wrong.

| What happens | Why it matters |
|---|---|
| **Promise drift.** The ad promises free shipping over $50; the checkout charges $9.00 on a $60 cart. | The code and its unit tests can both be internally consistent while the customer promise is broken. |
| **The agent grades itself.** The change passes its own tests, so it is marked done. | The tests were written against the code, not against the rendered checkout the customer sees. |
| **The fix is too broad.** “Make shipping free” passes the $60 eligible cart and silently gives the $35 control free shipping too. | A happy-path test misses the overcorrection. |
| **The fix is too narrow.** Only $60+ becomes free; the exact $50 boundary still charges $9.00. | The bug survives for the customer at the advertised boundary. |
| **The goalposts move.** The agent edits or weakens the test until it passes. | A green test suite is not proof. |
| **The evidence is vague.** A page screenshot or a prose claim replaces the run result. | There is nothing durable to inspect or gate on. |

Kern's answer is a frozen commercial contract, an independent browser witness, a deterministic oracle, a boundary and a control, and a gate that the agent cannot talk past.

## The proof

The demo promise is **$50.00 free standard shipping, after-discount merchandise subtotal, US/USD**.

| Cart | Promised | Before repair | After repair |
|---|---:|---:|---:|
| $60.00 eligible | $0.00 | **$9.00** | **$0.00** |
| $50.00 boundary | $0.00 | **$9.00** | **$0.00** |
| $35.00 control | $9.00 | $9.00 | **$9.00** |

**Pre-repair audit:** `2026-11-22T00-53-05-669Z-f5230a` — **BROKEN**.  
**Post-repair audit:** `2026-11-23T12-35-29-692Z-48b993` — **HONORED**, answers the first, and all **6/6** objective hashes match.

The repair is one line: remove the `* 100` that compared a cents subtotal with a dollar-denominated threshold. The actual fix commit is `4c8105f`; the human merge is `88536a9`.

Read the actual evidence:

- [Why Kane CLI](https://tryoutkern.vercel.app/why-kane)
- [Closed loop and agent gate](https://tryoutkern.vercel.app/repair/2026-11-22T00-53-05-669Z-f5230a)
- [Gate and six-patch gauntlet](https://tryoutkern.vercel.app/gate)
- [Pre-repair X-Ray](https://tryoutkern.vercel.app/audits/2026-11-22T00-53-05-669Z-f5230a)
- [Post-repair X-Ray](https://tryoutkern.vercel.app/audits/2026-11-23T12-35-29-692Z-48b993)
- [Promise Receipt](https://tryoutkern.vercel.app/audits/2026-11-23T12-35-29-692Z-48b993/receipt)
- [All runs](https://tryoutkern.vercel.app/runs)

The $60 pre-repair row is a provided real Kane capture; the $50 and $35 pre-repair rows are live. A separate live $60 audit in the local `.data/` evidence repeats the observation. The post-repair audit is all live.

## How the loop works

```text
ad + merchant terms
        │
        ▼
frozen promise contract ─── policy source for the $9 baseline
        │
        ▼
eligible · boundary · control carts
        │
        ▼
Kane CLI observes the real rendered checkout
        │
        ▼
deterministic oracle decides promised vs observed
        │
        ▼
Pi patches the real source within a bounded brief
        │
        ▼
human approval
        │
        ▼
Kane reruns the same six objectives
        │
        ▼
6/6 objective hashes match → gate opens → receipt
```

The agent never decides whether the fix worked. The oracle owns the expectation. Kane owns the browser observation and the independent rerun. The gate owns whether the patch may ship.

## Why Kane is the center

Kane is the only component that opens the customer checkout and reads the rendered quote. A unit test can agree with the bug. A screenshot can hide the number. Kane reads the line the customer sees.

Kane has three jobs:

1. **Observe** the actual rendered subtotal and shipping quote.
2. **Carry the evidence**: terminal `run_end`, exit code, final state and evidence hash.
3. **Rerun the unchanged objectives** after the repair.

Kern's job is the loop around the witness: freeze the promise, define the boundary and control carts, own the deterministic oracle, block the agent, and scope the receipt.

This is not a Kane wrapper. Remove Kane and the loop loses the only independent view of the customer checkout. That is why Kane is not a logo in the footer.

## Try it in two minutes

With no account and no Kane run:

- Open the [live landing](https://tryoutkern.vercel.app).
- Open the [demo app](https://tryoutkern.vercel.app/campaign).
- Read [Why Kane CLI](https://tryoutkern.vercel.app/why-kane).
- Inspect the [gate](https://tryoutkern.vercel.app/gate) and the [promise receipt](https://tryoutkern.vercel.app/audits/2026-11-23T12-35-29-692Z-48b993/receipt).

The public site is a static export of **recorded** evidence. It does not start Kane and it does not need a Kane account. Every recorded page carries the banner:

> **Recorded audit: replay of real runs, not a live session.**

On your machine, with no Kane account:

```bash
git clone https://github.com/kaelah971/kern
cd kern
npm install
npm test
npm run demo
```

`npm run demo` starts the recorded-audit app on `http://127.0.0.1:3000` and the real repaired store on `http://127.0.0.1:4173`, then opens both. It starts no Kane run.

## The gate

```bash
npm run gate
npm run gate -- --audit recorded/2026-11-23T12-35-29-692Z-48b993/audit.json
npm run gate -- --audit recorded/2026-11-22T00-53-05-669Z-f5230a/audit.json
npm run --silent gate -- --json
npm run gate -- --run
```

The gate reads a completed audit against the current frozen contract. It checks the contract hash, all three carts, observed values, live sources, exit codes and evidence presence. It does not trust `overallStatus` alone.

| Result | Exit code |
|---|---:|
| Gate open | `0` |
| Gate closed | `1` |
| Usage or infrastructure error | `2` |

A coding agent can use it as a stop gate:

```bash
npm run gate -- --audit <audit.json> || exit 1
```

The gate does not start Kane unless you pass `--run`. With `--run`, it invokes the real audit first and then evaluates the result.

## The patch gauntlet

The `/gate` page evaluates six candidate repairs against the same contract, boundary and control:

| Patch | Result |
|---|---|
| Correct cents comparison | **SHIP** |
| Make all shipping free | **REJECT** — fails the $35 control |
| Free only at $60+ | **REJECT** — fails the $50 boundary |
| Label the charge as Free | **REJECT** — the charge is still $9.00 |
| Fix the threshold, free the control | **REJECT** — breaks the control |
| The audited pre-repair rule | **REJECT** — fails $60 and $50 |

The gauntlet is labelled as deterministic contract coverage, not a new Kane browser run. The real Kane evidence is the linked pre/post audits.

## Promise Receipt

The receipt is the scoped record of what happened:

- the contract id and SHA-256;
- the pre-repair audit it answers;
- promised vs observed per cart;
- the actual patch that passed and the human merge;
- 6/6 unchanged objective hashes;
- the gate status;
- every run's session, exit, result, reason and evidence SHA-256;
- what this does **not** prove.

It is **hash-linked, not signed or certified**. It says “verified for the tested conditions at the recorded time,” not “this store honors all ads.”

## Contract compiler and preview gate

The contract compiler is a **local operator tool** at `/compile`:

```bash
npm run app
# open http://127.0.0.1:3000/compile
```

It takes the ad snapshot, merchant interpretation, threshold, destination, policy source and approver; validates them; generates the eligible, boundary and control cart plan; freezes the canonical contract; and writes it under `.data/contracts/`.

The public deployment returns **404** for `/compile`. There is no public write path and no fake form.

Use a compiled contract against a preview:

```bash
node scripts/kane-audit.ts \
  --contract .data/contracts/<id>.json \
  --url https://preview.example

npm run gate -- \
  --contract .data/contracts/<id>.json \
  --run --url https://preview.example
```

The audit objectives point at the preview; the contract and gate still judge. The preview must expose the three generated carts. The local demo store is fixed at $60/$50/$35; the compiler warns when a generated plan does not match the local fixture.

## Agent hook

Claude Code can use the Stop hook:

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node hooks/claude-code-stop.mjs"
          }
        ]
      }
    ]
  }
}
```

The hook evaluates the newest audit under `.data/audits` or `recorded/`; set `KERN_AUDIT_PATH` / `KERN_CONTRACT_PATH` for a specific audit. A closed gate returns a Claude Code `block` decision. It does not start Kane.

Pi and any other agent use the same exit contract:

```bash
npm run gate -- --audit <audit.json> || exit 1
```

## Run a real Kane audit

This spends credits. The recorded evidence was produced with **Kane CLI 0.10.6**; do not upgrade mid-evidence. The balance at recording time was **4,796.83**.

```bash
kane-cli login
kane-cli whoami
npm start                       # store on 127.0.0.1:4173
# in another terminal:
node scripts/kane-audit.ts
```

A full three-scenario audit is six Kane runs and costs roughly 140 credits. A cheap smoke run is:

```bash
node scripts/kane-audit.ts --scenario control-35 --kind observe
```

The CLI writes `.data/audits/<auditId>/audit.json`, copies the real `.evidence` packs and stores the objective and artifact hashes. The public recorded bundle keeps the evidence SHA-256 values, not the `.evidence` files.

## Evidence ledger

| Audit | Result | Runs | Credits | Notes |
|---|---|---:|---:|---|
| `2026-11-22T00-53-05-669Z-f5230a` | BROKEN | 6 | 141.999039 | pre-repair; $60 row is a provided real capture; $50/$35 live |
| `2026-11-23T12-35-29-692Z-48b993` | HONORED | 6 | 117.137467 | post-repair; all live; 6/6 objective hashes |
| **Recorded total** | | **12** | **259.14** | public bundle |

The local `.data/` evidence has more runs, including a live $60 replacement audit. The public site intentionally exports the two canonical audits and labels them as recorded. See [`docs/proof-ledger.md`](docs/proof-ledger.md) for sessions, exits, reasons, evidence hashes and spend.

## Tests

```bash
npm test                 # 90/90
npm run typecheck
npm run verify:vercel    # static export in a different cwd
```

The suite covers the oracle boundary at 4,999 / 5,000 / 5,001 cents, the real cart maths, the audit parser and fail-closed statuses, the recorded fallback, the repair gate, the six-patch gauntlet, the contract compiler, the preview objectives and the agent hook. The pre-repair replay characterization is excluded from the default glob and runs with `npm run demo:replay-pre-repair`.

## Repository layout

```text
src/app/          read-only proof app, live-check controller, gate/compiler UI
src/lib/          contract, oracle, cart, shipping, audit engine, gate, Kane adapter
scripts/          export, demo, gate, audit, replay and verification scripts
hooks/            Claude Code Stop-hook adapter
tests/            node:test suite, fixtures, excluded replay characterization
contracts/        frozen demo promise
recorded/         sanitized real audits used by the public static site
site/             static export and Vercel project config
docs/             proof ledger, architecture, decisions, demo script, deployment
```

The public site is a static export of the app plus the storefront:

```bash
npm run app:recorded      # recorded app on :3300
npm run export:static     # writes 18 pages under site/
cd site && vercel --prod --yes
```

The local app is `npm run app`; the one-command demo is `npm run demo`.

## Limitations

- One owned demo store, one promise type (`free_shipping_threshold`), USD/US, standard shipping.
- The public live site is static recorded evidence. Real Kane execution is local and operator-controlled.
- The public site does not expose a live Kane runner. The operator-only check is gated by `KERN_LIVE=1`.
- The repair was terminal-driven by Pi and human-approved. It was not an in-app autonomous repair.
- Evidence is **hash-linked, not signed or certified**.
- Recorded copies keep evidence SHA-256 values, not the `.evidence` files.
- The store stops at the shipping quote. There are no payment fields, no card data and no order submission.
- The contract compiler is local-only; the public `/compile` route is 404.

## Why this is different

Most browser-agent tools test whether the app still works. Kern tests whether the customer still gets the promise the ad made, at the exact boundary, without overcorrecting the control.

The defensible combination is:

- the ad is the input, not a test script;
- the merchant’s interpretation is frozen separately;
- the $9 baseline has a separate policy source;
- the $50 boundary and $35 control make the result falsifiable;
- Kane is the independent rendered-checkout witness;
- the same six objective hashes gate the repair;
- the result is a scoped evidence record, not a confidence score.

## License

MIT. See [LICENSE](LICENSE).

## Links

- [Live proof](https://tryoutkern.vercel.app)
- [Demo app](https://tryoutkern.vercel.app/campaign)
- [Why Kane CLI](https://tryoutkern.vercel.app/why-kane)
- [Gate](https://tryoutkern.vercel.app/gate)
- [Audits](https://tryoutkern.vercel.app/audits)
- [Runs](https://tryoutkern.vercel.app/runs)
- [Storefront](https://tryoutkern.vercel.app/store/)
- [Audited storefront](https://tryoutkern.vercel.app/store/before/eligible-60)
- [GitHub repository](https://github.com/kaelah971/kern)
- [Proof ledger](docs/proof-ledger.md)
- [Architecture](docs/architecture.md)
- [Decisions](docs/decisions.md)
- [Deployment](docs/vercel.md)
- [Demo script](docs/demo-script.md)
