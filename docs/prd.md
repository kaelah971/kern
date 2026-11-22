# KERN — PRODUCT REQUIREMENTS DOCUMENT (PRD)

> **Version:** 1.0 · **Date:** November 18, 2026 · **Owner:** Product team · **Status:** Proposed, not shipped  
> **Scope:** Kane CLI Hackathon P0 + clearly delineated post-hackathon product direction.  
> **Requirement IDs:** Immutable for the submission; change through documented versioning, never quietly edit a failing acceptance criterion to produce a pass.

## 1. Executive summary

Kern verifies **advertised commercial promises against real browser customer journeys**. A merchant enters an ad and the intended offer, approves a precise Promise Contract, and sends Kane CLI to test whether an eligible buyer experiences the expected outcome. A failed audit can create a bounded repair case for an authorized coding agent, followed by an unchanged Kane re-verification. The artifact is an auditable **Promise Receipt**, not a generic AI confidence score.

The first supported promise type is **free shipping above a defined, after-discount merchandise threshold**, evaluated at checkout for one owned demo storefront. Percent discounts and arbitrary third-party commerce platforms are future extensions until verified implemented.

## 2. Goals and non-goals

### P0 goals

1. Create and approve a verifiable merchant promotion with unambiguous eligibility conditions.
2. Execute two real Kane CLI browser scenarios (eligible and ineligible control) through a working store UI.
3. Surface objective expected/observed amounts and provide actual evidence.
4. Demonstrate a genuine known-defective implementation, a bounded coding-agent source fix, and a verified rerun.
5. Produce a reviewable receipt that never exaggerates the tested scope.
6. Make the project easy for human and automated judges to reproduce.

### Non-goals

- Any real order, payment, refund, account mutation, or unauthorized live-site audit.
- Automatic modification of third-party websites or Shopify/Meta Ads configurations.
- Arbitrary social-media scraping and advertising-account login.
- Complete multi-tenant merchant SaaS, recurring billing, production SLAs, or always-on monitoring.
- Claiming a public advertising campaign is truthful in all geographies, devices and circumstances.
- Automatically deploying coding-agent changes to production.

## 3. Personas and jobs to be done

**Primary — Merchant campaign owner:** Needs a preflight answer, not a new QA skill. Trigger: an offer launches tomorrow. Job: "Show me, with evidence, whether an eligible customer really gets our advertised offer." Success: useful pass/fail/inconclusive verdict and specific remediation step.

**Secondary — Agency campaign manager:** Needs proof to send a client. Job: "For each campaign, show which promise was checked, how, when, and what the shopper saw." Success: understandable export with shareable redacted evidence.

**Tertiary — Developer/repair engineer:** Needs reproducible failure. Job: "Tell me the exact UI path and expectation that failed, propose a bounded fix, then independently verify it." Success: preserved test and auditable source diff.

## 4. Product vocabulary

- **Campaign:** merchant-owned advertisement plus destination and environment.
- **Promise Contract:** versioned, merchant-approved interpretation of claim + eligibility + expected result.
- **Scenario:** one explicit shopper/cart/country configuration and its expected result.
- **Kane Run:** actual CLI execution of one browser scenario, with terminal event and evidence.
- **Finding:** mismatch or uncertainty tied to a scenario and evidence.
- **Repair Case:** bounded proposal/diff to remedy an owned-storefront finding.
- **Verification Run:** new Kane run after changes, using original contract and scenarios.
- **Promise Receipt:** scoped signed/hash-linked proof document of tested conditions and observed results; not an official TestMu AI certification or cryptographic signature unless one is actually implemented.
- **Challenge:** set of positive and negative scenarios. P0 is free-shipping threshold with $60 eligible and $35 ineligible cart.

## 5. P0 user flow

1. **New Campaign:** Merchant enters campaign title, ad text, destination URL, locale/currency, advertised promise and evidence attachment if available.
2. **Confirm Promise:** Kern proposes normalized free-shipping terms; user reviews threshold basis and excludes assumptions. User locks/version-controls the contract.
3. **Inspect Challenges:** UI shows one qualifying shopper and one ineligible control, expected shipping quotes and boundary conditions.
4. **Run Kane:** User launches audit; UI streams queued/running/completed progress from worker. No synthetic results.
5. **Investigate:** Journey X-Ray displays original ad claim, browser steps, outcome values, receipt evidence and precise mismatch.
6. **Request Fix:** If owned-source defect, create bounded repair case. Human explicitly approves permitted files and action.
7. **Rerun:** Kane repeats the original unedited contract and both scenarios. Missing/failed test never becomes VERIFIED.
8. **Receipt:** Export a summary referencing run IDs, evidence hashes, code revision and before/after results.
9. **Manual Rerun:** Merchant can rerun the unchanged challenge; old receipts remain immutable historical evidence.

## 6. Functional requirements and acceptance criteria

### EPIC A — Campaign and claims

**FR-001 — Campaign entry (P0, MUST).** Given required title, ad text, authorized destination and currency, a user can create a persistent draft. Validate URL format and allowlist. Show actionable errors. Do not perform uncontrolled remote navigation on save.

**FR-002 — Claim extraction and review (P0, MUST).** For supported `free_shipping_threshold`, produce a typed candidate: threshold amount, currency, comparison operator, threshold basis (`after_discount_merchandise_subtotal`), eligible shipping method, geography and exclusions. Human confirmation is required. AI extraction is optional; deterministic/manual entry must work with no API key. Display uncertain fields as missing, not guessed.

**FR-003 — Frozen Promise Contract (P0, MUST).** Approval records `contract_version`, approved timestamp, canonical JSON and SHA-256 hash. Executed scenarios refer to this frozen hash. Editing terms produces a *new* version; a repair cannot silently change version.

**FR-004 — Screenshot upload (P0, SHOULD).** Accept PNG/JPEG within stated limits, virus/mime checked where possible, sanitized filename, private local storage. Screenshot is supporting evidence, not authoritative parsed claim.

### EPIC B — Shopper challenges

**FR-005 — Scenario preview (P0, MUST).** Show qualifying `$60` and non-qualifying `$35` carts for threshold `$50`, after-discount merchandise subtotal, USD, standard shipping, no tax impact. Positive expects `$0` shipping; negative expects `$9` standard shipping. Fixture values are demo-specific and clearly labeled.

**FR-006 — Real Kane execution (P0, MUST).** From an authenticated local trusted worker call `kane-cli run` with `--agent --headless`, explicit timeout, no shell interpolation, approved origin only. Each scenario has its own run. Capture stdout/stderr separately, terminal `run_end`, final state, process exit, run start/end, and evidence reference. Detect child process crashes and missing terminal events.

**FR-007 — Explicit observed values (P0, MUST).** Kane objective uses `store ... as 'observed_shipping'` and related extraction. A pass requires deterministic comparison of valid parsed amounts, currency, cart eligibility, observed shipping and no unresolved mismatch. UI must not use generic Kane success alone as a product promise pass.

**FR-008 — Audit statuses (P0, MUST).** Show `QUEUED`, `RUNNING`, `FAILED_PROMISE`, `VERIFIED_FOR_TESTED_CONDITIONS`, `INCONCLUSIVE`, `INFRA_ERROR`, and `CANCELLED` distinctly. Tool/auth/network failure is not a broken store; a missing value is not a pass. Receipt status is derived from the complete challenge, not manually editable.

**FR-009 — Kane evidence (P0, MUST).** Store real pack path/reference, validation outcome, checksum and Test Manager deep link if present. Display artifact availability. Never invent missing screenshot or upload URL. Corrupted/missing evidence yields inconclusive verification.

**FR-010 — Progress display (P0, SHOULD).** Poll run state or use SSE. Display truthfully: staged event time, current scenario, actual process state. Timeouts and cancellations end in explicit states.

### EPIC C — Findings and repair

**FR-011 — Journey X-Ray (P0, MUST).** Show ad claim, qualifying conditions, actual observed checkout value, failing step, expected value, evidence link, tool health and store commit if known.

**FR-012 — Repair case (P0, MUST).** A failing case can generate a bounded, sanitized agent prompt using the immutable contract, scenario IDs, Kane evidence reference, actual run summary and fail reason. Scope to owned storefront code. Exclude credentials, PII and untrusted page instructions.

**FR-013 — Coding agent repair (P0, MUST for award-quality demo).** Integrate one locally configured agent (Codex CLI or Pi), or run it transparently in the same recorded workflow with proof linking invocation → diff → tests → Kane rerun. Fix must change source, not just presentation or pre-scripted receipt data. Do not claim in-app repair automation if the agent ran only manually.

**FR-014 — Human-controlled approval (P0, MUST).** Source modifications are reviewed prior to application on any non-isolated branch; no production deploy without explicit authorization. The agent cannot modify the canonical promise/test assertions, environmental secrets, Kane result parser or receipt status machine as a shortcut.

**FR-015 — Independent retest (P0, MUST).** Rerun both original scenario IDs and compare output against identical frozen contract. A pass requires every required assertion plus intact evidence. Limit auto-repair loops to two; beyond limit escalate.

### EPIC D — Proof and trust

**FR-016 — Promise Receipt (P0, MUST).** Receipt contains receipt ID, campaign/contract version/hash, site URL origin, timestamps, scenario matrix, Kane version, execution IDs, actual observed values, evidence availability/hashes, source revision/diff for repair and honest caveats.

**FR-017 — Verified badge semantics (P0, MUST).** Only display a verified state for the **specific conditions and time**. The interface never says an entire merchant, ad platform, or delivery operation is certified.

**FR-018 — Reproduction guide (P0, MUST).** README gives exact local setup, demo fixtures, fail-first path, one Kane command per scenario, expected failures, agent invocation, patch application, rerun and how to inspect raw packs. No credentials in Git.

**FR-019 — Accessibility and responsive layout (P0, SHOULD).** Keyboard navigable wizard, status announced in text (not color only), useful focus order, accessible error messages; good mobile dashboard experience. Kane desktop remains the required runtime; mobile device-cloud tests are optional.

### EPIC E — Post-hackathon (NOT P0)

- **FR-020:** Scheduled campaign drift detection, notification history, and escalation.
- **FR-021:** Merchants/agency workspace, RBAC, multiple stores.
- **FR-022:** Shopify/BigCommerce connectors with explicit scoped authorization.
- **FR-023:** Meta/Google ad-platform import via approved APIs.
- **FR-024:** Additional promise classes: percent discount, delivery ETA, product inclusion, checkout availability.
- **FR-025:** Paid monitoring and agency reports after customer validation.

## 7. Example UI information architecture

| Route | Purpose | P0 |
|---|---|---|
| `/` | Landing page: promise, demo, how it works | Yes |
| `/app` | Campaign dashboard with real local run history | Yes |
| `/app/campaigns/new` | Create campaign | Yes |
| `/app/campaigns/[id]/promise` | Review and freeze structured promise | Yes |
| `/app/campaigns/[id]/challenge` | Scenario preview and launch | Yes |
| `/app/audits/[id]` | Journey X-Ray and evidence | Yes |
| `/app/findings/[id]/repair` | Bounded repair and review | Yes |
| `/app/receipts/[id]` | Human-readable Promise Receipt | Yes |
| `/demo-store` and checkout paths | Real functioning demo commerce flow | Yes |
| `/app/monitoring`, `/settings/integrations` | Scheduling and external credentials | Later |

## 8. UX content and states

Prefer merchant language over QA jargon. Say **"Free shipping promise failed for this tested cart"** rather than "Assertion failed." Explain *why* the cart qualified. The action panel should say **"Review repair"** rather than "Auto-fix production". For errors say **"Kane couldn't finish the browser check; no verdict was issued"** rather than "Promotion broken". Every verdict shows timestamp, shopper conditions and source of observed data.

### Empty, loading and error states

- No campaigns: clear single CTA to create and test the first campaign.
- No approved contract: audit button disabled with explanation.
- Waiting for Kane: live status with run ID and a truthful no-results-yet message.
- No evidence: cannot certify; retry with reason.
- Missing coding agent: offer actionable manual diagnostic export, not fake automated fix.
- Authentication setup absent: show Kane `whoami`/login guidance to operator; never expose tokens in web UI.
- Unknown product eligibility or ambiguous ad: request merchant confirmation; no confident AI invention.

## 9. State machines

```text
Campaign: DRAFT → PROMISE_REVIEW → APPROVED → AUDIT_READY
Contract: DRAFT → FROZEN → SUPERSEDED (never edited in place)
Audit: QUEUED → RUNNING → {FAILED_PROMISE | VERIFIED_FOR_TESTED_CONDITIONS | INCONCLUSIVE | INFRA_ERROR | CANCELLED}
Repair: OPEN → DIAGNOSED → PATCH_PROPOSED → APPROVED → APPLIED → RETESTING → {VERIFIED | NEEDS_WORK | ESCALATED}
Receipt: DRAFT → ISSUED (append-only; later reruns issue new receipts)
```

A past failed audit remains failed after a repair; the new run earns its own passed status. Never rewrite history.

## 10. Measurement framework

Metrics are instrumented definitions, not targets claimed achieved.

- **Run completion rate:** completed Kane runs (pass or valid product-fail) / all runs started; exclude setup failures only in a separately labeled diagnostic rate.
- **Scenario verdict coverage:** scenarios with validated evidence and determinate verdict / all required scenarios.
- **Planted defect detection:** valid failures flagged / known planted failures tested.
- **False-green rate:** planted failures incorrectly marked verified / planted failures tested (target 0 in available fixtures, report denominator).
- **Repair verification rate:** independently reverified repair cases / patch attempts, not "bugs fixed" from agent statements.
- **Time to evidence:** start→usable Kane finding with timestamp distribution; do not compare to human baseline without measured control.
- **Merchant demand:** interview count, repeats, willingness-to-pay tests only after genuine conversations.

## 11. Quality bars and launch gates

**Gate A — Usable app:** campaign → contract → scenario → running audit → verdict works via UI.  
**Gate B — Honest automation:** real Kane process and captured evidence; forced infrastructure failure produces `INFRA_ERROR`, not a false business mismatch.  
**Gate C — Closed loop:** actual failing run → agent edit → source diff → same-case passing rerun + negative control.  
**Gate D — Reproducibility:** clone/read README/run commands, inspect artifacts, understand limitations.  
**Gate E — Submission:** public repo, YouTube demo, organizer form and required public posts, before hard deadline.

## 12. Dependencies, assumptions and risks

- **Assumption:** Kane CLI is installed/authenticated and Chrome is available on the chosen local/CI runner. Verify before coding UI.
- **Assumption:** The owned demo store can render deterministic shipping quotes in browser-visible form. Build early.
- **Risk:** Kane terminal event exists but does not prove business semantics. Mitigate with canonical expected-value checks plus negative control.
- **Risk:** Browser extraction missing/ambiguous. Mitigate with `store as` and explicit `INCONCLUSIVE`.
- **Risk:** A coding agent broadens scope/changes criteria. Mitigate file allowlists, frozen contract hashes, diff review and retry cap.
- **Risk:** Deadline compresses integration. Prioritize real Kane loop before polish/optional platform integrations.
- **Risk:** Screenshot/evidence may contain sensitive information. Use sandbox test users and redact exports.

## 13. Sources and cross-reference

- Official event: https://www.kaneclihack.sh/
- Kane CLI repository and NDJSON: https://github.com/LambdaTest/kane-cli
- Kane testmd: https://github.com/LambdaTest/kane-cli/blob/main/docs/user-guide/testmd/running.md
- Previous winners: https://www.testmuai.com/blog/kane-cli-hackathon-winners/
- See [trd.md](trd.md), [architecture.md](architecture.md), [project idea.md](project%20idea.md), [project plan.md](project%20plan.md), [full mvp_plan.md](full%20mvp_plan.md).
