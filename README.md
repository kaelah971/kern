# Kern

Kern turns an advertised checkout promise into a frozen, merchant-approved contract, sends Kane CLI through the real storefront in a browser, and compares the rendered charge with a deterministic oracle. When the store is wrong, a bounded source repair is followed by the same challenge rerun unchanged. The demo has one storefront, one `free_shipping_threshold` promise, three carts, and two real audits.

**Live demo:** https://kern-site-mocha.vercel.app — read-only proof site and static demo storefront. Every audit page is real recorded evidence; no account needed. Deployment steps: [`docs/vercel.md`](docs/vercel.md).

## The proof

**Pre-repair audit** `2026-11-22T00-53-05-669Z-f5230a` — **BROKEN**

| Cart | Promised | Observed |
|---|---:|---:|
| $60.00 eligible | $0.00 | **$9.00** |
| $50.00 boundary | $0.00 | **$9.00** |
| $35.00 control | $9.00 | $9.00 |

Kane's assert runs returned `status: failed`, `result_code: 740`, `reason_code: assertion_error.confirmed_product_bug`, `verdict.confirmed: true` for the two broken carts. The control passed.

**The repair:** remove the `* 100` in `src/lib/shipping.ts` that compared a cents subtotal with a dollar-denominated threshold.

**Post-repair audit** `2026-11-23T12-35-29-692Z-48b993` — **HONORED**, `postRepair: true`, answers the pre-repair audit, and all six objective SHA-256 values are identical:

| Cart | Promised | Observed |
|---|---:|---:|
| $60.00 eligible | $0.00 | **$0.00** |
| $50.00 boundary | $0.00 | **$0.00** |
| $35.00 control | $9.00 | **$9.00** |

Every assert exited 0; every evidence pack is present.

The four numbers: **$60 → $9.00 (promised $0.00)** and **$35 → $9.00 (promised $9.00)** before the repair; **$60 → $0.00** and **$35 → $9.00** after it. The exact $50 boundary also moved from $9.00 to $0.00.

The $60 row in the full pre-repair audit is a provided real Kane capture; the live replacement `2026-11-23T12-27-07-978Z-a0c39f` repeats the $60.00/$9.00 observation with process exit codes. The $50 and $35 rows are live in the full audit. The post-repair audit is all live.

Full session/exits/reason/evidence ledger: [`docs/proof-ledger.md`](docs/proof-ledger.md).

![Campaign: ad snapshot, merchant interpretation, frozen contract and latest audit](docs/screenshots/01-campaign.png)

![Journey X-Ray: promised versus observed, with Kane's confirmed verdict](docs/screenshots/02-journey-x-ray.png)

*Real captures from the live local app on 2026-11-23. A public clone shows the recorded-audit banner instead.*

## The closed loop

The repair is the committed one-line diff. The post-repair audit answers the pre-repair audit and compares all six objective hashes; none moved.

![Closed-loop view: failed verdict, the actual git diff, and the unchanged rerun](docs/screenshots/03-closed-loop.png)

## Judge it in five minutes

```bash
npm install && npm test && npm run demo
```

`npm run demo` starts the recorded-audit app on **http://127.0.0.1:3000** and the real repaired demo store on **http://127.0.0.1:4173**, then opens both. It does not start Kane and does not need a Kane account.

**The app works with no Kane account.** It ships sanitized copies of the two real audits in [`recorded/`](recorded/README.md). If `.data/audits` is absent — a public clone — the app reads `recorded/` and shows a visible banner on every recorded page: **“Recorded audit: replay of real runs, not a live session.”** No mock data is substituted. On the recording machine, `.data/audits` exists and the app prefers the live records.

What to click:

1. `/` — the reference-style landing page. Use **Open the demo app**, **Read the README**, the three test cards and the **Everything is open** links. The demo app is `/campaign`.
2. `/campaign` — the above-the-fold loop band (**Kane found $9.00 → Pi changed one line → Kane re-ran 6/6, gate open**), then the ad snapshot, the merchant's interpretation, the frozen contract, the policy source behind $9.00, the three carts, and the latest audit.
3. **Gate** — the evidence gate, the exact promised/observed table, and the six-patch gauntlet: only the correct fix passes all three carts.
4. **Audits** — every readable audit, newest first, with status, source, post-repair provenance, runs and credits.
5. **Runs** — every real Kane run, grouped by audit, with session, exit, result, credits, evidence hash and verdict. On the read-only deployment this page carries the operator-machine note and no run controls.
6. **`2026-11-22T00-53-05-669Z-f5230a`** — Journey X-Ray: $60 Promised $0.00 / Observed $9.00, Kane's confirmed verdict; the $50 boundary and $35 control follow.
7. **Closed loop** — the actual `git diff ed3dbaf HEAD -- src/lib/shipping.ts`, then the post-repair audit and the 6/6 objective-hash comparison.
8. **`2026-11-23T12-35-29-692Z-48b993` → Promise Receipt** — the scoped status, contract hash, pre-repair audit id, per-scenario and per-run evidence, and the “what this does not prove” section.

The public storefront is **https://kern-site-mocha.vercel.app/store/**. A 3:30–4:00 recording plan is in [`docs/demo-script.md`](docs/demo-script.md), including the static before/after toggle and the optional operator panel.

## Run it yourself with Kane

This is the second path, and it spends credits. A full three-scenario audit is six Kane runs and costs **roughly 140 credits**. The recorded runs reported 117–142 credits; exact per-run values are in each `audit.json`. The balance at recording time was **4,796.83**.

```bash
kane-cli login        # OAuth, or username/access-key
kane-cli whoami       # must say Authenticated
npm start             # store on 4173; leave it running
# in another terminal:
node scripts/kane-audit.ts
```

`0.10.6` was used; do not upgrade mid-evidence. The CLI writes `.data/audits/<auditId>/audit.json`, copies the real `.evidence` packs, and the app prefers those files. The public/recorded app never starts Kane. On the operator machine only, `KERN_LIVE=1 npm run app` adds a local check panel that spawns the same audit script; it is disabled on the public deployment and is not part of the recorded demo.

A cheap smoke run is `node scripts/kane-audit.ts --scenario control-35 --kind observe` (one run, roughly 20 credits).

## What is built

- One local storefront on 4173 with server-calculated shipping, three deterministic carts, and no payment fields.
- A frozen promise contract with SHA-256, a deterministic oracle, and boundary tests at 4,999 / 5,000 / 5,001 cents.
- A two-run Kane audit engine (observe + assert), strict NDJSON/USD parsing, fail-closed statuses, evidence copy and hash.
- A bounded repair and an unchanged post-repair audit gated by all six objective hashes. The `/repair` page shows the mixed evidence chain: exact failure → Pi's bounded scope → actual commit → human merge → unchanged Kane rerun → gate.
- A public/recorded read-only app on 3000: campaign, gate, audit list, Journey X-Ray, Promise Receipt, and the closed-loop diff. **89/89 tests pass.**
- `npm run demo` — one command starts the recorded app and the repaired store and opens both; no Kane account or credits needed.
- An operator-only local check panel (`KERN_LIVE=1`): fixed scenarios, one child at a time, balance/store guards, and a real audit link when a check completes. The public deployment returns 404.
- `/gate` — the evidence gate and a six-patch gauntlet. The correct repair passes all three carts; all-free, $60-only, UI-only, control-regression and the audited pre-repair rule are rejected. The page labels the gauntlet as contract coverage, not a new Kane run.
- `npm run gate` — a real gate CLI. It exits `0` only when the audit is open, with `--audit`, `--contract`, `--url`, `--json`, and an explicit `--run` that spends Kane credits. The coding agent can use the exit code as a stop hook.
- `/compile` — local-only contract compiler. The merchant enters ad, interpretation, threshold, destination, policy source and approver; Kern freezes a contract, hashes it, writes it under `.data/contracts/`, and generates the eligible, boundary and control cart plan. The public site returns 404.
- Preview support: `kane-audit.ts --contract <path> --url <preview>` and `npm run gate -- --contract <path> --run --url <preview>` — the browser objectives point at the preview; the contract and gate still judge. No preview is called in the recorded demo.
- `hooks/claude-code-stop.mjs` — a sample Stop hook: a closed Kern gate returns a Claude Code block decision; Pi can use `npm run gate -- --audit <path> || exit 1`.
- `/runs` — every real Kane run in the audit JSON, newest first, grouped by audit; 15 locally with `.data`, 12 in the two-audit `recorded/` bundle.
- `/store/` — static demo storefront with three fixed cart quotes; `/store/<cart>` shows the quote and the recorded "What Kern saw" values. No add-to-cart or checkout POST is exported.
- `/store/before/<cart>` — the audited `ed3dbaf` revision's quotes, labelled **“The revision Kern audited”**; the current pages link to it under **“After the repair.”** The before page states that it is not the current store.
- Public `recorded/` copies, a restore-safe pre-repair replay, and a pre-repair store runner for filming.

## What is not built

- A general campaign wizard beyond the local contract compiler.
- Automated in-app coding-agent repair or approval UI. The repair was terminal-driven by Pi; the actual commit, scope and gate are shown as evidence, with no invented transcript.
- Database, auth, or multi-tenancy.
- Public/hosted live Kane execution. The local operator-only check exists; the public site is read-only.
- Screenshot viewer or fabricated evidence imagery.
- Signed or certified receipts.

## Limitations

- One owned demo store, one promise type (`free_shipping_threshold`), USD/US only, standard shipping.
- The evidence is **hash-linked, not signed or certified**. The receipt says “verified for the tested conditions at the recorded time” and explicitly lists what it does not prove.
- **Boundary-50 recording quirk:** the pre-repair boundary assert has an empty `final_state`; the observed `$9.00` is only in the run's `context.memory`. The parser reads that recorded value; the raw NDJSON remains the source of truth, and `tests/boundary-50.test.ts` pins it. Kane's boundary verdict describes the boundary rule, while the actual code defect was the `* 100` cents/dollars error. Treat the verdict as an observation, not a code diagnosis.
- Recorded copies keep the evidence SHA-256 values but not the `.evidence` files. A live `.data` audit keeps the files.
- A public clone uses `recorded/`; live `.data` evidence is local and gitignored.

## History

The buggy revision is reachable at `ed3dbaf`. Replay the defect without rewriting history:

```bash
git checkout ed3dbaf -- src/lib/shipping.ts
npm start
# the $60 cart is charged $9.00 again
git checkout HEAD -- src/lib/shipping.ts
```

`npm run demo:store-pre-repair` does the swap, prints **“PRE-REPAIR REVISION — seeded defect active”**, serves the store on 4173, and restores the fixed file when stopped. Narrate it as the revision that was audited, not a live audit.

The pre-repair characterization lives at `tests/replay/pre-repair.test.ts` and is excluded from `npm test`; `npm run demo:replay-pre-repair` restores `ed3dbaf`, runs only that file, restores the current file, and verifies the hash.

## Deeper docs

- [`docs/proof-ledger.md`](docs/proof-ledger.md) — real runs, sessions, exits, reasons, evidence hashes, spend.
- [`docs/decisions.md`](docs/decisions.md) — scope, boundary, claim rules.
- [`docs/demo-script.md`](docs/demo-script.md) — 3:30 shot list.
- [`hooks/README.md`](hooks/README.md) — Claude Code Stop-hook adapter and the Pi command.
- [`docs/vercel.md`](docs/vercel.md) — read-only Vercel deployment, audit-root resolution, simulation result.
- [`docs/publish.md`](docs/publish.md) — publication commands, scan findings, post drafts.
- [`recorded/README.md`](recorded/README.md) — what was stripped, how to verify the originals.
- [`LICENSE`](LICENSE) — MIT.
