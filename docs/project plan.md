# KERN — PROJECT PLAN & HACKATHON DELIVERY STRATEGY

> **Version:** 1.0 | **Planning date:** Wednesday, November 18, 2026 (Nigeria / WAT)  
> **Event:** Kane CLI Online Hackathon, November 12–19, 2026  
> **Official submission deadline:** Thursday, **November 19, 2026, 11:59 PM IST = 7:29 PM WAT (Nigeria)**  
> **Status:** Planned deliverables, not completed. Treat any times below as planning timeboxes, not claims about current progress.

## 1. Mission

Deliver a polished, reproducible **Kern** prototype in which a merchant turns a free-shipping advertisement into a locked promise; Kane CLI independently executes an eligible and ineligible purchase journey; the system detects a genuine checkout bug; an authorized coding agent repairs the actual source; and Kane rechecks the unchanged promise before issuing a verified Promise Receipt.

The judging story is **"Ads make promises. Kane is the customer who checks whether they hold."** All engineering scope follows that. Nothing decorative can displace the genuine Kane loop.

## 2. Winning strategy and scoring alignment

Organizer judging dimensions have equal weight: **Ships (25%), Verified (25%), Closed Loop (25%), Craft (25%)**. Verification, then closed-loop quality, breaks ties according to organizer material. We must pursue all four, but a real verifiable loop is the foundation.

| Dimension | Must-show artifact | Hard failure to avoid |
|---|---|---|
| Ships | Usable campaign wizard, owned demo storefront, real end-to-end audit | Dashboard with no functioning customer journey |
| Verified | Actual Kane browser outputs, evidence pack, expected/observed money comparison, control | "AI says passed" without independent browser proof |
| Closed Loop | Real defect → agent run → source diff → unchanged Kane rerun → receipt | Pre-recorded results or agent self-certification |
| Craft | Memorable Journey X-Ray + Promise Receipt, coherent visual language, simple merchant wording | Generic log console or overwhelming technical panels |

Prior winner lessons: **demo.studio** made Kane the product operator; **GuardianKane** made completion contingent on browser proof; **KANE vs. ABLE** dramatized an independent challenge. We combine the mechanisms, not their products.

## 3. The single critical path

```text
Kane preflight → deterministic working store → one intentionally failing
shipping promise → real Kane observation → honest FAILED_PROMISE verdict
→ agent changes source → unchanged Kane retests positive + negative
→ verified evidence receipt → 3-minute recorded demo → public submission
```

**If any phase lacks actual evidence, do not claim it is finished.** A fake demo never earns a substitute milestone.

## 4. Roles and responsibilities

For a solo builder, one person can fill all roles using an AI coding agent. Keep responsibilities logically distinct.

| Role | Responsibilities | Approval authority |
|---|---|---|
| Product owner | Scope, promise semantics, user story, judges' narrative | Freeze requirements, approve demonstration claims |
| Coding agent (Pi or Codex) | Implement bounded vertical slices, fix defects, run typecheck/tests | No unrestricted production actions |
| Kane CLI | Execute browser checks, return real evidence and status | Does not modify source; cannot approve its own correctness |
| Local operator | Confirm CLI login, control store URLs, review patches, maintain proof ledger | Approve applying fix and publishing artifacts |
| Demo/editor | Film real screen flows and create three-minute narrative | Verify footage represents actual state |

## 5. Milestones with exit criteria

**M0 — Toolchain preflight**  
Kane installed/authenticated; local Chrome launches; Node and selected coding agent available; `kane-cli run --agent` works against a known safe page. Capture CLI version and actual raw output. **Gate:** real successful baseline execution. **If blocked:** prioritize Kane setup before building anything else.

**M1 — Real demo storefront and frozen promise**  
A product page supports add-to-cart, shows correct merchandise subtotal and shipping quote in a checkout preview. A deliberate shipping threshold error is in real source. Merchant can enter/approve claim and preview scenarios. **Gate:** seeded defect reproducible in browser; $35 control behaves predictably.

**M2 — Kane-powered live audit**  
Worker queue launches two actual CLI runs. Parser reads exit and `run_end`, saves observed amounts and evidence; UI displays FAILED_PROMISE vs INCONCLUSIVE/INFRA_ERROR honestly. **Gate:** $60 case fails with a real $9 observed quote and existing evidence, $35 control is recognized.

**M3 — Verified agent repair**  
Coding agent receives actual failure reference and limited source scope, produces diff, human approves, tests run, and Kane executes original positive and negative controls again. **Gate:** passing evidence for both original scenarios and proof of actual source change.

**M4 — Product craft and receipt**  
Journey X-Ray shows meaningful before/after, Promise Receipt hashes and links to evidence, baseline responsive layout, accessible statuses. **Gate:** merchant can understand result without reading raw JSON.

**M5 — Submission package**  
README, `.env.example`, fixture seeding/repro commands, known limitations, clear recorded demo ≤ three minutes, public GitHub repo, required public posts, submission form. **Gate:** all mandatory links open and submission is acknowledged before cutoff.

## 6. Deadline-focused work sequence

**Do in this order, not all at once.**

| Sequence | Work package | Priority | Stop/go evidence |
|---|---|---|---|
| 1 | Kane installation/login/Chrome test + repo init | P0 | One real `run_end` captured |
| 2 | Deterministic checkout UI and failing source defect | P0 | Browser quote $9 where rule expects $0 |
| 3 | Frozen Promise Contract, two scenarios, simple audit trigger | P0 | Same stable expectations on every run |
| 4 | Node Kane worker, real result ingestion, failure classification | P0 | Real Kane output/evidence attached to UI |
| 5 | Agent patch flow + source diff + unchanged retest | P0 | Before/after proof from separate real runs |
| 6 | Readable Journey X-Ray and Promise Receipt | P0 | Honest verified/scope-limited artifact |
| 7 | README, tests, demo recording, public links | P0 | Independent replay and valid submission |
| 8 | AI screenshot extraction, monitoring, cloud hosting, integrations | P1 | Cut immediately if end-to-end proof at risk |

**Cut line:** Freeze nonessential feature work while enough time remains to perform a clean end-to-end rehearsal, capture the demo, publish the repo and submit. Never keep shipping UI polish while the Kane loop is unverified.

## 7. Workstream definitions

### WS-A — Product and experience

Deliver: merchant dashboard, campaign creation, promise approval, challenge preview, Journey X-Ray, repair review, receipt. Success is understandable navigation and visible true statuses, not pixel-perfect screens only. Visual direction: confident editorial commerce aesthetic, sharp contrasts, clear evidence hierarchy, restrained motion, prominent expected-vs-observed figures. Separate case status (FAILED) from run infrastructure state (ERROR) in visual language.

### WS-B — Domain and fixtures

Deliver: one precise shipping contract, deterministic $60 and $35 carts, after-discount subtotal definition, no real payments. Unit tests define threshold behavior, exact cents, currency parsing, contract immutability, and negative control. The demo store must use a separate shipping function containing a deliberate bug that can be repaired.

### WS-C — Kane integration and proof

Deliver: working CLI, trusted worker, artifact capture, typed final-state parser, evidence validation and linking. Demonstrate the actual run, not a mocked alternative. Preserve raw exit code, timestamps, run IDs and screenshots. Pair Kane's positive-case failure with a negative control. Optional `context ingest`, saved `_test.md`, and `cover` strengthen the sponsor story if actual version supports them and time allows.

### WS-D — Repair engine

Deliver: sanitized failure case, one working coding-agent connection and a constrained source patch. Human approval protects against tests/contract modifications. The original claim and scenario IDs are reused after repair. Maximum two attempts; stop and escalate if still failing. Log actual execution; don't pass off a manually performed terminal command as an automated app integration.

### WS-E — Communication and submission

Deliver: clean README and env template, architecture diagram, reproducibility commands, limitations, 3-minute YouTube demo, two public social posts if still required by current organizer page, final form. Verify all public URLs in incognito and confirm repo creation/build-window compliance.

## 8. Risk register with trigger and response

| Risk | Early signal | Mitigation / fallback |
|---|---|---|
| Kane cannot authenticate or launch Chrome | First real test exits 2 | Stop feature work, fix environment; use documented login and Chrome path; never simulate a pass |
| Tool charges/credit usage unexpectedly high | Balance shrinks in baseline tests | Bound scenarios/steps; use saved tests and controlled reruns; track actual usage |
| CLI extraction misses shipping | Missing `final_state.observed_shipping` | Simplify store quote UI and objective, use explicit `store as`, inspect pack, classify inconclusive |
| First demo flow is unreliable | Repeated browser misnavigation | Simplify page paths, stable semantic labels, avoid animation-heavy checkout, separate tasks |
| Agent changes the test instead of store | Diff includes test, oracle or contract | Reject patch; file allowlist; manual diff review |
| Fix passes only positive case | $35 ineligible cart shows free shipping | Negative control blocks verified outcome |
| Work expands to Shopify/Meta API auth | Connector setup consumes core build | Defer; owned store is honest P0 target |
| User-facing receipt overclaims | Says "all shoppers" or "certified merchant" | Scope to exact cases/time/version, show evidence status and limits |
| Public demo leaks keys or customer data | Secrets visible in logs/recording | Fresh sandbox profiles, redaction and preview before upload |
| Deadline approaches with missing proof | No valid fail→fix→pass chain | Cut extras, publish truthful partial capabilities; prioritize mandatory submission artifacts |

## 9. Definition of success and fallback tiers

**Gold / target:** Fully operating merchant journey; two Kane scenarios; genuine failing run; agent-generated approved source fix; passing rerun and negative control; evidence receipts; polished three-minute demo.

**Silver / credible:** Real merchant journey and Kane failure/pass runs; coding agent operated transparently from terminal with actual source diff; web UI stores and explains results. No claim of fully automated in-app repair.

**Bronze / truthful partial:** One real Kane browser audit and meaningful evidence, approved contract and failure diagnosis. Label unbuilt repair features as planned; do not produce a staged fake.

The goal is Gold, but honesty is non-negotiable at every tier.

## 10. QA and proof ledger

Create `docs/proof-ledger.md` **only when evidence exists**. For each experiment:

| Field | Example of what to record (not actual evidence) |
|---|---|
| Timestamp | Real UTC ISO string and local timezone |
| Claim | Contract ID and SHA-256 |
| Scenario | `eligible_cart_60` |
| Kane | CLI version, exact invocation, exit code, `run_end` status |
| Evidence | Real pack path/hash, optionally Test Manager link |
| Actual observation | Browser-extracted shipping amount, quote screenshot location |
| Source | Git commit before/after |
| Repair | Agent invocation and patch diff / human approval |
| Verdict | Derived state and why |
| Caveats | Fixture, country, store version, no payment made |

Independent baseline/control should be captured *before* any production-like demonstration. Record negative results as carefully as positives.

## 11. Judging adversarial questions and answers

- **"Did Kane really detect the problem?"** Show actual CLI result, screenshot, observed $9 quote and the deliberately defective shipping source.
- **"Did the coding agent actually fix it?"** Show agent invocation, constrained diff, source revision, unit tests and new Kane run IDs.
- **"Could the agent game the test?"** Freeze contract hash; positive and negative controls; reject changes to test/oracle.
- **"Does a passing test mean all ads are true?"** No. Receipt is scoped to named conditions, time and the tested storefront.
- **"Why Kane?"** It powers the live customer simulation, evidence, regression retest, and acceptance proof. Without Kane the runtime assurance feature is absent in this implementation.
- **"Why not just existing coupon-testing tools?"** We start from actual ad promise, not configured discount rule, and generate independent claim-to-checkout proof plus bounded repair.

## 12. Submission checklist

- [ ] Confirm organizer registration and consistent account email.
- [ ] Public repository created during allowed build window; source committed and accessible.
- [ ] Official Kane CLI integrated and genuine browser use visible in demo.
- [ ] Working app/agent/workflow, not a static mockup.
- [ ] Requirements, setup, credentials template without secrets, reproduction guide.
- [ ] Before/after browser evidence, agent patch and controls captured.
- [ ] YouTube demo within organizer's stated **three-minute judging window**; link opens publicly.
- [ ] At least two distinct public project posts (as stated on current hackathon page); save links.
- [ ] Live link if used works, but local reproduction is documented even if no live host.
- [ ] Submission form complete, evidence/public links double-checked before **7:29 PM WAT, Nov 19**.
- [ ] No post-deadline pushes if organizer prohibits them.

## 13. Operating rhythm for the coding agent

Use a single bounded vertical slice per iteration. After each slice, ask for **changed files, what genuinely works, what is stubbed, exact test/Kane evidence, remaining blocker, and commit SHA**. Preserve unrelated changes. The agent must never restate requirements as accomplishments. Do not run a broad repo audit when the current slice is understood. Prefer finishing a working end-to-end path over building seven impressive but disconnected screens.

### Suggested handoff prompts

**First slice:** "Implement only the demo storefront shipping-quote flow and strict Promise Contract fixtures from `docs/prd.md` and `docs/trd.md`. Keep the deliberate eligible-cart threshold bug behind an obvious demo-only fixture, with the ineligible cart control. Do not touch Kane worker yet. Prove browser-visible outputs and unit-test contract semantics. Report exact files and commands."

**Integration slice:** "Integrate Kane CLI through a local worker. Run one real eligible and one control scenario, capture process result and evidence, and show accurate app audit states. Refuse fake successes. Use real installed CLI syntax and document authentic output."

**Closed-loop slice:** "Take the real failure, generate bounded repair context, use the selected coding agent to change only shipping implementation source, show the diff, rerun untouched scenarios through Kane, and record actual before/after evidence."

## 14. Official source links

- Hackathon: https://www.kaneclihack.sh/
- Kane CLI: https://github.com/LambdaTest/kane-cli
- Previous winners: https://www.testmuai.com/blog/kane-cli-hackathon-winners/
- Submission requirements must be rechecked at event page immediately before final publication.
