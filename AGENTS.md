# Working rules for Kern

Read `README.md` and `docs/decisions.md` before changing product behaviour. Those two override the longer specifications where they disagree.

## Evidence rules

1. **Kane runs are real or they are absent.** Never fabricate a `run_end`, an evidence pack, an exit code, a screenshot or a run ID. A missing run is reported as missing.
2. **Classification comes from artifacts.** Exit 0 plus a terminal `run_end` with status passed, plus parsed observed values matching the frozen contract, plus a valid evidence pack. Anything less is INCONCLUSIVE or INFRA_ERROR, never verified.
3. **The checker never bends.** Never edit a fixture, expected value, contract or acceptance criterion to make a failing result green. If a test is wrong, say so and stop.
4. **The original objective is preserved.** A repair is only proven by rerunning the unchanged challenge against the unchanged contract hash.
5. **Human approval gates source edits.** The agent proposes a bounded diff inside allowlisted shipping files; it never touches tests, the oracle, the parser, the receipt builder, secrets or configuration.

## Scope rules

- Owned demo store only. No third-party sites, no real orders, no card data. Stop at the shipping quote.
- One promise type: `free_shipping_threshold`, after-discount merchandise subtotal, USD, US, standard shipping.
- Three scenarios: $60 eligible, $50.00 boundary, $35 control.
- No Shopify, Meta, payments, email, monitoring or multi-tenant auth in P0.

## Reporting rules

End every work report with:

- Changed files, with paths.
- What genuinely works and what is stubbed.
- Exact commands run and their real output summary.
- Any Kane run ID, artifact path and exit code, or the word "none".
- Remaining blocker.
- Commit SHA.

Do not restate the plan as progress. Do not describe a manually applied patch as an automated one. Do not claim a Kane pass without the artifact.

## Build order

1. Kane preflight — real installed CLI, real authenticated run against a trivial page.
2. Demo store with a genuine seeded shipping defect and a working checkout quote.
3. Promise contract, oracle and boundary unit tests.
4. Worker that runs Kane and parses real output.
5. Repair case, human approval, unchanged rerun.
6. Receipt and Journey X-Ray.
7. Polish, README, video, submission.

Do not start a later step because an earlier one is boring.
