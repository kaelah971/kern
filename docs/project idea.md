# KERN — FULL PROJECT IDEA

> **Project:** Kern — The Promise Verification Engine  
> **Tagline:** Every ad makes a promise. Kane checks if it survives the click.  
> **Hackathon:** Kane CLI Online Hackathon, November 12–19, 2026  
> **Version:** Product concept v1.0, November 18, 2026  
> **Status:** Proposed design and execution plan. This file does **not** claim anything has been built, tested, deployed, or validated with customers.

## 1. The idea in one sentence

Kern is a merchant-first AI mystery shopper that translates an advertisement's promises into approved, testable customer scenarios; uses **Kane CLI** to experience the actual browser journey; compares observed outcomes with the promises; and helps an authorized coding agent repair and independently reverify failures.

## 2. The real-world problem

An advertisement promises 30% off, a product bundle, or free shipping over a threshold. A customer clicks, shops, and reaches a different result: the offer disappears, pricing changes, the redirect lands on the wrong product, or shipping fees unexpectedly appear. This hurts the buyer's trust and can waste marketing spend. The merchant may see click-through analytics but not whether the **specific customer promise** held at the end of the purchase journey.

### The first identifiable user

**Maya**, the owner or performance-marketing lead of a small-to-midsized online store, runs seasonal campaigns across social media, email, and influencer links. She currently clicks links manually, asks teammates to test checkout, trusts advertising analytics, and reacts to complaints. Her high-friction task is checking an offer under multiple eligibility conditions *before she spends to promote it*. Her cost of inaction is customer frustration, support load, and potentially wasted ad spend; dollar losses must be measured, not invented.

### What changes tomorrow

**Before:** Maya says, "Our campaign should work; somebody on the team checked the page."  
**After:** Maya says, "Kane followed this exact promotion as an eligible buyer, found a $9 shipping mismatch, captured the browser proof, and verified the corrected checkout against the same original criteria." 

This is about **customer outcome assurance**, not marketing copywriting, generic QA, web scraping, or automatic review of arbitrary merchants.

## 3. Product promise and distinctive insight

**Central hypothesis:** a business needs to know whether the *claim-to-checkout relationship* holds, not merely whether the landing page loads, a coupon rule exists, or a form is clickable.

The signature primitive is a **Promise Contract**: a merchant-reviewed, versioned record stating what a reasonable eligible buyer should experience. Kane tests that contract in the browser. Kern issues a **Promise Receipt**: scoped evidence that says which claim, shopper conditions, store version, browser run, timestamp, and expected/observed values support its verdict.

### The creative wedge: Promise Challenge

Kern gives Kane a challenge that the store must satisfy. For a free-shipping promotion, the challenge includes a **positive case** (eligible buyer obtains free shipping) and a **negative control** (ineligible buyer does not accidentally obtain free shipping). The fix cannot cheat by rewriting what the original promise meant. The original claim and acceptance criteria are frozen before the repair.

This makes Kane the skeptical mystery shopper, and the coding agent the repair engineer. The repair agent's statement "done" is never the final proof.

## 4. User story and illustrative demo

A demo merchant advertises: **"Free standard shipping on eligible orders with an after-discount merchandise subtotal of $50 or more."** Product eligibility, country, currency, shipping method, and taxes are explicitly defined in the campaign rules. The deterministic store fixture has a $60 eligible cart and a $35 ineligible control cart. Normal shipping is $9.

1. Maya submits the campaign text and authorized local store URL.
2. Kern proposes a `shipping_threshold` claim; Maya confirms the $50 threshold and eligibility rules.
3. A runner launches Kane CLI for the $60 cart. Kane navigates to checkout, extracts the displayed shipping quote using its **`store as`** pattern, and checks the assertion.
4. The intentionally defective store calculates shipping incorrectly; the $60 cart shows $9 instead of $0. The audit is **FAILED** with screenshot/log evidence. This is a real seeded code defect, not a hard-coded fake result.
5. The $35 control should still show $9. It must remain valid throughout the repair.
6. Kern produces a scoped repair case; the coding agent reads Kane's failure output and proposes a code patch within an allowlisted storefront directory.
7. A human reviews the proposed diff. After approval, the sandbox fix is applied, tested, and Kane repeats **the unchanged $60 and $35 challenges**.
8. The product issues a **VERIFIED_FOR_TESTED_CONDITIONS** Promise Receipt only when the Kane run succeeded, the expected/actual checks passed, and the evidence pack is valid. It is not a certification of every customer or a production order.

### The on-stage moment

Show the original ad and the final checkout side-by-side. Kane discovers $9 shipping where $0 was promised. A coding agent repairs the calculation. Kane's independent rerun proves $0 for the eligible cart and $9 for the ineligible control. The receipt preserves the before/after proof. The three-minute demo tells a story in understandable dollars.

## 5. Features

### Hackathon P0 — necessary for a truthful working demo

- **Campaign creation:** merchant supplies ad copy, destination URL, country/currency and eligible-product conditions. Optional screenshot attachment can support context; no screenshot alone is trusted as structured truth.
- **Promise Studio:** extraction/assistance for shipping and, if safe, percent-discount promises; merchant must review and lock final terms. Manual entry works without model keys.
- **Mystery Shopper Lab:** explicit positive and negative test cases with store-approved URL and persona/fixture conditions.
- **Kane-powered execution:** actual CLI subprocess on a trusted local worker, Chrome automation, structured NDJSON, terminal event, exit code and evidence pack.
- **Journey X-Ray:** campaign timeline, expected vs observed outcome, failing stage, screenshot/evidence link and audit status.
- **Repair Studio:** bounded repair case created from the failure; one authorized coding agent; human review; original assertions cannot be edited to manufacture success.
- **Promise Receipt:** documented, condition-scoped evidence with timestamps, browser-run IDs, hash of the claim/test spec, source version before/after if relevant, and reference to the real Kane evidence.
- **Authentic demonstration storefront:** usable browsing/cart/checkout quote UI, deterministic shipping engine, and a seeded threshold defect fixed through a real source change.

### Future P1 — after submission

Scheduled repeat audits and drift alerts; multiple campaigns/stores; preview environments and PR-gated checks; mobile browser scenarios where supported; store platform connectors; account/team roles; billing; AI-based ad image/video analysis; broader claim classes such as delivery ETA, included gifts, and refunds. None is implied to be built in P0.

## 6. Host and sponsor integration map

| Technology | Exact use | Verifiable output | If removed |
|---|---|---|---|
| **TestMu AI Kane CLI `run --agent`** | Operate merchant-approved browser journey; extract prices and shipping; assert outcomes | NDJSON `run_end`, exit code, stored `final_state` values | Product loses automated live mystery-shopping and factual browser observations |
| **Kane evidence packs** | Preserve browser steps, screenshots and logs | `.evidence` file + validation status | Receipt loses independent browser evidence |
| **Kane `testmd` / assurance** | Replay fixed requirements and maintain coverage of approved acceptance criteria | Saved `_test.md`, `Result.md`, optional `kane-cli cover` report | Cannot credibly demonstrate reproducibility/coverage through Kane |
| **TestMu AI Test Manager** | Optional cloud run reference when available and configured | Real test URL | Local evidence still works, but shared hosted run reference is absent |
| **Codex CLI or Pi** | Investigate code and propose bounded fix | Actual source diff, agent transcript, test run | Diagnosis/report still functions but automatic code repair does not |

**No other mandatory corporate sponsor API is assumed.** Vercel, a database, GitHub, screenshot extraction models, Shopify and Meta Ads are infrastructure/optional extensions, not alternative Kane verification engines.

## 7. Why it is not simply LaunchGate or Omni Verify

Published prior Kane Hack Day concepts have checked promotional discount rules (LaunchGate) and marketing-content claims (Omni Verify). Kern's differentiation is the **entire ad-to-outcome journey**, merchant-frozen eligibility conditions, a challenge that includes adversarial controls, a real browser evidence receipt, and a closed loop that requires the same challenge to pass after a bounded, approved repair. These are intended differentiators; we must prove them in running code rather than just assert originality.

The quality benchmark is the previous August 2026 winners: **demo.studio** made Kane the product's actual browser operator; **GuardianKane** made "done" subject to verification; **KANE vs. ABLE** made independent challenge-and-repair memorable. Kern deliberately combines those three lessons in commerce.

## 8. Winning strategy: Research → Proof → Impact

| Principle | Kern demonstration |
|---|---|
| One specific person + costly problem | Promotion manager who cannot trust that campaign offer reaches checkout |
| One action changes tomorrow | Can run an independent offer challenge and gate campaign launch |
| Sponsor essential | Kane drives the browser, extracts observed customer outcome, creates proof, reruns repair |
| Proof, not performance theater | Known genuine defect, deterministic controls, Kane output, code diff, raw evidence, no fake usage metrics |
| Agents propose; permissions govern | Manual approval for code changes/deployment; URL and file allowlists |
| Complete loop in minutes | Approved promise → Kane fail → coding-agent fix → Kane pass → scoped receipt |
| Learn from friction | Record real setup issues, failed/changing tests, coverage limits, and support notes |

## 9. Product value and potential business

- **Initial buyer:** performance-marketing teams and agencies responsible for offer accuracy.
- **Job to be done:** verify a public promise before launch and after a storefront change.
- **Potential pricing:** limited free audits, then per-campaign recurring monitoring or agency tiers; unvalidated hypothesis.
- **North-star metric (future):** number of independently verified promise-scenarios per active merchant per month, with denominator and evidence coverage.
- **Initial outcome measures:** scenario completion rate, detectable planted-failure rate, false-pass rate on negative controls, repair proof availability, manual time to reproduce.
- **Do not claim:** reduced ad spend, customer conversion gains, willingness to pay, real client usage, or production assurance until measured.

## 10. Trust, ethics and constraints

Only test sites owned by the user or explicitly authorized; require approved URL allowlists and block private/local network destinations for untrusted merchants. Never place real orders, spend money, misrepresent the agent as a human customer for unauthorized sites, evade anti-bot controls, or attempt account access without permission. Do not send full browser sessions, secrets, or payment details to model prompts. A "passed" run certifies only **the tested conditions at the recorded time**. Missing evidence, browser/tool errors, and ambiguous claims yield **INCONCLUSIVE** or **ERROR**, never pass.

## 11. Launch and demonstration constraints

The event is November 12–19, 2026. Official deadline **November 19 at 11:59 PM IST** (**7:29 PM WAT**). Public repository, YouTube demo and the organizer's submission requirements are time-critical. Freeze code before deadline. Follow the latest official contest page and form for exact submission materials and social-post conditions.

## 12. Scope boundaries

**P0 is deliberately narrow:** one owned demo merchant, one canonical shipping promise, two fixed shopper challenges, real Kane integration, one real agent fix, one verifiable receipt and a polished judge walkthrough. Broad live merchant onboarding, payments, platform account integration, scheduled monitoring, and universal claim interpretation are excluded.

## 13. Open questions / decisions for implementation

- Which coding agent is truly authenticated and callable locally: Pi or Codex? Use only one P0 adapter.
- Is Kane authenticated and able to launch installed Chrome on the build machine? Confirm immediately.
- Can screenshot/receipt evidence be shared without uploading private pack contents? Default to local links, sanitized exports and redacted evidence.
- Is the demo storefront reachable by the browser runtime at the authorized loopback URL? Test actual connectivity.

## 14. References and related documents

- Official hackathon: https://www.kaneclihack.sh/
- Official Kane source and user guide: https://github.com/LambdaTest/kane-cli
- Previous winners: https://www.testmuai.com/blog/kane-cli-hackathon-winners/
- Agent mode and evidence: https://github.com/LambdaTest/kane-cli/blob/main/README.md
- Companion documents: [prd.md](prd.md), [trd.md](trd.md), [architecture.md](architecture.md), [project plan.md](project%20plan.md), [full mvp_plan.md](full%20mvp_plan.md)
