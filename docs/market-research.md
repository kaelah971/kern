# Kern: prior art, demand evidence and what still needs proving

Date: 2026-11-18. Public-source research only. No merchant interviews yet.
Status: research note for the Kane CLI Online Hackathon build decision. Not a claim that Kern is validated, novel or commercially viable.

Method: web search plus direct reads of vendor sites, public forum threads, regulator pages and the official event page. Vendor marketing claims are labelled as such. Where a source could not be loaded, it is marked unverified rather than paraphrased.

Limits of this pass:

- No interviews, no merchant emails, no analytics from a real store.
- Search-result descriptions are used only where the page itself was unreachable, and are marked.
- No paid analyst reports or paywalled data.
- One survey is vendor-run and is labelled accordingly.

---

## 1. Bottom line

1. **The category exists and is being productised right now.** PromoProof sells Shopify promotion testing at $9.99–$19.99 per 30 days and runs boundary carts through Shopify's Storefront Cart API. PromoInspect advertises "automated promotion QA for Shopify + Klaviyo" on a waitlist (site currently unreachable).
2. **But the closest competitor verifies the platform configuration, not the advertisement, and not the rendered checkout.** PromoProof's own "honest states" section says free shipping is *not* cart-tested, app/Function-backed discounts are unsupported, customer-segment prices cannot be reproduced, and only the primary market is varied. Those exclusions are exactly Kern's demo conditions.
3. **The "promise" framing is already taken inside this hackathon series.** Omni Verify (Kane CLI Hack Day, 24 Oct 2026) extracts promises from marketing copy, has Kane check each one in a real browser, repairs failures and only publishes on a pass. Same skeleton, different domain (social posts, not commerce).
4. **The host has published the technical core as a free recipe.** TestMu AI's own use-case page documents testing a discount code at checkout with Kane in four steps and 174 seconds, including asserting the discount line and the recalculated total. That de-risks the build and destroys any claim that "Kane checks a checkout total" is the idea.
5. **Demand is visible but not yet proven.** Public merchant threads show the failure happening in the wild, including the exact threshold and percentage bugs Kern demonstrates; a 2026 survey shows shopper response. None of this proves a merchant will pay for pre-launch verification.

Net: the defensible product is not "verify a promotion". It is **advertised promise → merchant-frozen conditions → rendered checkout → bounded repair → unchanged rerun → scoped receipt**. Three of those six links are unoccupied.

---

## 2. What already exists, by layer

| Layer | Examples | What it actually verifies | Where it stops |
|---|---|---|---|
| Platform-config promotion testing | **PromoProof** (Shopify, paid); **PromoInspect** (waitlist, unverified) | Discount rules read from Admin API vs. carts built through Storefront Cart API | No advertisement, no rendered checkout, no shipping quote, no repair |
| Synthetic checkout monitoring | Nightlamp, Revenue Shield, CheckView, Checkly, Datadog Synthetics | That a scripted flow completes: page loads, cart works, payment step responds | Flow health, not promise semantics; no notion of what was advertised |
| Manual promotion QA | Agency checklists (Brand Depot, Oct 2026), mystery-shopping providers (FieldPie, Planorama) | A human writes the offer, tests baskets around the threshold, compares checkout to the message | Labour-bound, inconsistent, no rerun proof, no code repair |
| Ad verification | IAS, DoubleVerify, Oracle Moat | Viewability, invalid traffic, brand safety, ad delivery | Stops at the impression/click; says nothing about the offer at checkout |
| Post-click / landing-page audit | Postclick (ppc.io), Stackmatix-style message-match services | Whether the landing page matches the ad's message and design | Inspection and advice, not a transactional assertion at checkout |
| Affiliate/coupon compliance | BrandVerity | Whether partners bid on brand terms or misrepresent offers | Partner conduct, not the merchant's own checkout |
| Digital shelf | CommerceIQ, Profitero, Salsify, Similarweb | Price, availability, content and promo execution on retailer sites | Retailer listings, not the brand's own ad-to-checkout journey |
| Enterprise services noise | 75way "Offer Integrity Assurance Agent" | Marketing copy claims "automated offer validation" | No published product, methodology or evidence; treat as messaging, not a competitor |

The empty cell in that table: **an advertisement-derived contract tested against a real browser checkout, with a control case and a repair loop.**

---

## 3. Closest competitor: PromoProof

Read directly from promoproof.app on 2026-11-18.

What it does:

- Reads a Shopify discount's rules from the Admin API and restates them in plain English.
- Computes the expected discount **before** building a cart and commits to that number.
- Generates carts below, at and above every threshold, in integer cents.
- Builds them through the **Storefront Cart API** and compares expected vs. observed.
- Returns one of four verdicts; keeps run history; nightly autotest on the Pro plan.
- Pricing: free trial (10 checks), Basic $9.99/30 days or $99.99/year, Pro $19.99/30 days or $199.99/year. "Coming to the Shopify App Store", listing in review. Built by one named developer.

What it explicitly does **not** do (their words, "Honest states"):

| Limitation | Consequence for Kern |
|---|---|
| "Free shipping — needs a delivery address and live shipping rates to observe. Not simulated." | The canonical Kern demo (free shipping over $50) is outside PromoProof's tested scope |
| "App and Function-backed discounts … marked unsupported" | Custom storefront logic is out of scope for them, in scope for a browser agent |
| "A signed-out test cart is not a member of your segment" | Customer-eligibility conditions cannot be reproduced |
| "Carts are built in your primary market. Other markets aren't varied." | Country/currency conditions are not covered |
| No advertisement input, no rendered page, no repair | The entire left and right ends of the Kern loop are unoccupied |

Assessment: this is a real, well-built, honestly documented competitor for the *discount-config* question. It is not the same product. It is also a warning: "test promotions before customers do" is now a live tagline, so Kern cannot use that positioning without looking derivative.

PromoInspect: Bing indexes promoinspect.com as "Inspect every promotion before your customers do. Join the waitlist for early access to automated promotion QA for Shopify and Klaviyo." The site returns Cloudflare error 1001 over HTTP and fails TLS in Chromium, so this is **search-index evidence only**. It suggests at least one more team aimed at the same wedge.

---

## 4. Prior art inside the Kane ecosystem

**Omni Verify** (github.com/omnigrowth-app/omni-verify; Kane CLI Hack Day, 24 Oct 2026) is the closest structural precedent:

- Agent drafts marketing copy containing promises.
- Each promise becomes a check; Kane verifies it in a real browser.
- Failed promises are repaired from what Kane observed.
- Publishing is gated on a passing run for the exact campaign version hash.
- Past posts are re-audited after releases; receipts carry run IDs.

Differences that matter: their promise is a **content claim** ("this feature exists", "this link carries this tag"); Kern's promise is a **transactional outcome** (a price at checkout). Their repair is to copy/links; Kern's is to storefront code. They do not model eligibility conditions, carts, or a negative control.

**The host's own recipe.** TestMu AI publishes "Test discount code application at checkout": four steps, 174 seconds, invalid code rejected, valid code applied, discount line and recalculated total asserted, with a reusable `_test.md`. Two implications: the browser mechanics are proven and documented, and a judge may reasonably ask what Kern adds beyond a use case the vendor already ships.

**LaunchGate** is referenced in the Kern documents as a prior Kane project about promotional discount rules. I could not independently verify it in this pass; treat the reference as unconfirmed.

---

## 5. Demand evidence

### 5.1 Merchants describing the exact failure, in public

All quotes are verbatim from public Shopify Community threads.

| Date | Thread | What the merchant said | Why it matters |
|---|---|---|---|
| 2023-06-20 | [Why is free shipping applied before reaching $50 threshold?](https://community.shopify.com/t/226210) | "When i put an item into my cart and im not at the 50$ threshold the customer is still not paying for shipping … the shipping cost is essential for me." | The negative-control failure: free shipping leaks below the threshold |
| 2023-08-01 | [Discounts showing but not applying at checkout](https://community.shopify.com/t/237563) | "a customer … the discount showed in her checkout but that she was charge full price … What can I do other than constantly refund people for what they've been overcharged?" | Discovery is via customer complaint; mitigation is refunds |
| 2024-02-10 | [25% off Promo code gave 100% off](https://community.shopify.com/t/294662) | "it gave him 100% off … I asked different people from different devices to apply the same promo code — it worked normally for all of them" | State-dependent, hard to reproduce by hand; the over-permissive failure |
| 2024-09-13 | [Discount code make free shipping threshold goes under](https://community.shopify.com/t/357943) | "I offer free shipping over 149.99 … by adding the newsletters 15%off coupon was now getting under 149.99 because the shipping is calculated after … It was nonsense for the client to pay 180$ shipping" | **Threshold basis** (before vs. after discount) is a real, ambiguous product requirement, not a hypothetical one |

These are four public posts out of many; they are illustrative, not a rate. They do establish that both failure directions occur, that discovery is post-hoc, and that the threshold-basis question is genuinely ambiguous in the wild.

### 5.2 The manual workaround is already a documented agency process

Brand Depot's "Shopify Discount Testing Checklist" (24 Oct 2026) tells merchants to:

- "Write the offer as a customer would understand it" and "avoid making a banner promise broader than the rule configured in Shopify";
- test "one basket below the threshold and one just above it";
- "compare the checkout outcome with the message shown to the customer, including what happens when only the best eligible discount is applied";
- "keep a record of what was tested for the next campaign".

That is Kern's method, performed by hand, sold as agency guidance. It is simultaneously the strongest demand signal and the strongest "why not just do it manually" objection.

### 5.3 Shopper-side consequence

SimplyCodes, "What Shoppers Do When a Coupon Fails" (16 Jul 2026, n=1,463 US online shoppers, vendor-run survey):

- 38% buy at full price anyway; 28% search for another code; **24% abandon the purchase**; **20% go to another retailer**; 8% contact support.
- **26%** say a failed promo code made them trust the retailer less, even when the code came from a third party.
- 50% believe retailers make promo codes harder to use on purpose.

Caveat: a coupon company has an interest in promo codes looking unreliable. Treat the direction as credible and the exact percentages as indicative.

### 5.4 Regulatory tailwind, narrower than it looks

- California SB 478 (in force 1 Jul 2024) requires advertised prices to include mandatory charges; it is a real "the price you show is the price you charge" law for California consumers.
- The FTC's fee rule (in force 12 May 2025) covers only event tickets and short-term lodging, so it is **not** a general online-checkout rule.
- FTC plus 20 states sued Dollar General on 26 Oct 2026 alleging it charged consumers more than advertised prices. Physical retail, but it is the clearest recent signal that advertised-vs-charged gaps carry legal exposure.

Implication: price-accuracy risk is real but unevenly regulated. Do not claim Kern provides compliance, and do not build the pitch on the FTC fee rule.

---

## 6. Differentiation, claim by claim

| Claim we might want to make | Verdict after research |
|---|---|
| "Nobody verifies whether promotions work before launch." | **False.** PromoProof sells exactly that for Shopify discounts; agencies sell it as a checklist. |
| "We verify the promise, not the config." | **Defensible.** No product found that takes the advertisement as the source of truth for a checkout assertion. |
| "We test the real browser checkout, not an API." | **Partly defensible.** PromoProof uses the Storefront Cart API; Nightlamp/CheckView use real browsers for flow health. The combination of ad-derived expectation + rendered page is unoccupied. |
| "We cover free shipping thresholds, which others skip." | **Supported by the competitor's own documentation.** PromoProof states free shipping is not cart-tested. Verify this stays true at submission. |
| "We test customer eligibility and non-primary markets." | **Defensible as a browser capability**, but only if the demo actually varies address/currency; do not claim it without a scenario that does. |
| "We close the loop: fail → code repair → unchanged rerun." | **Defensible for this event.** No competitor found that repairs storefront code and re-verifies the same frozen conditions. Omni Verify closes a similar loop for copy, not code. |
| "We invented promise verification for commerce." | **Do not say this.** Omni Verify occupies the promise framing in the same hackathon series; PromoProof occupies pre-launch promotion proof. |
| "Merchants want this and will pay." | **Unproven.** No interviews; competitor pricing proves someone is trying to charge, not that anyone pays. |

The honest one-line position:

> Kern starts where the customer starts — the ad — freezes what the merchant promised, sends Kane through the real checkout, and does not accept "fixed" until the same challenge passes unchanged.

---

## 7. What still needs to be established

Split by what kind of claim it is. Only the first block is fully in our control before 26 November.

### A. Technical claims — must exist as artifacts, not assertions

| # | Claim | How it is established | Fails if |
|---|---|---|---|
| A1 | Kane can read the shipping quote and total from the demo checkout reliably | ≥5 identical runs on the fixed cart; record pass rate, duration, extracted values | Any run where Kane cannot produce the value, or values drift without a code change |
| A2 | The seeded defect is genuinely in code, not in the fixture | Show the buggy calculation, the failing assertion, and the source diff that fixes it | The "defect" lives in test data or in the Kane objective |
| A3 | The negative control actually catches an over-broad fix | Deliberately apply "free shipping for everyone", run the control, show FAIL, then revert | Control passes on the bad patch — the control is doing nothing |
| A4 | Boundary conditions are covered | $49.99 / $50.00 / $50.01 scenarios at unit level and at least $50.00 in the browser | Only $60 and $35 are tested (a $60-only fix would pass) |
| A5 | The repair loop is real | Preserved Kane FAIL artifact → agent diff → `npm test` → unchanged objective → Kane PASS artifact, same contract hash | Any step is hand-waved, or the objective/expectations changed between runs |
| A6 | Verdicts fail closed | Kill the network / sign out Kane / corrupt a value; show INCONCLUSIVE or INFRA_ERROR, never PASS | A missing value renders as verified |
| A7 | The receipt is scoped and honest | Receipt shows tested conditions, run IDs, evidence hashes, code revision, and an explicit "not a certification" line | Receipt implies broader coverage than the run supports |

### B. Differentiation claims — cheap to check, expensive to get wrong

| # | Question | How to settle it before submitting | Decision it drives |
|---|---|---|---|
| B1 | Has PromoProof shipped browser/shipping testing since 18 Nov? | Re-read promoproof.app/features on 25 Nov; note the date in the README | If yes, drop "we cover what they skip" and lead with ad-derived contract + repair |
| B2 | Does any current-event entrant do ad→checkout? | Check the event showcase/ship pages as they appear; check Slack | If yes, differentiate on the repair loop and the receipt, not the audit |
| B3 | Is "promise verification" already associated with Omni Verify for judges? | It is, for anyone who saw the October event | Never claim the framing; cite it and state the difference in one line |

### C. Demand claims — the only part that cannot be settled by code

What would count as real signal, in ascending strength:

1. A merchant or agency describes a specific past promotion failure, unprompted, including how they found out and what it cost.
2. They currently do something manual and repeatable about it (checklist, second person, test order, refund policy).
3. They ask to use the tool on a real campaign, or ask what it would cost.
4. They run it on their own store with permission and act on the result.
5. They pay, or commit to paying, for the next campaign.

What does **not** count: "that sounds useful", waitlist emails with no store, or our own scenario retold back to us.

Minimum credible pass before 26 Nov: **five conversations, at least two of type 1–2, at least one of type 3.** That is enough to say "we spoke to five merchants; two described this failure; one asked to try it" — and nothing stronger. It is not enough to claim demand, pricing or retention.

### D. Kill criteria — decide now, not at 2 a.m.

- If A1 fails (Kane cannot reliably read the checkout value), stop building the product UI and ship the narrowest honest artifact: a Kane-driven checkout audit with evidence, no repair claim.
- If A3 fails (the control cannot catch an over-broad fix), the "cannot cheat" claim is dead; either fix the control design or remove the claim from the demo.
- If A5 cannot be completed by 24 Nov, drop "closed loop" from the pitch and present the failure audit plus a human-verified fix. Still honest, still scores on Verified, loses the 25% closed-loop dimension.
- If no merchant conversations happen, say so plainly in the README and the video. The project can win on craft without a demand claim.

---

## 8. Eight-day evidence plan

Deadline is **26 November, 11:59 PM IST** (18:29 UTC, 7:29 PM WAT, 10:29 AM PT). It was extended from 19 November. Judging is 25% Ships, 25% Verified, 25% Closed loop, 25% Craft — demand research does not score, so it must not displace the build.

| Day | Work | Artifact |
|---|---|---|
| 18 Nov (today) | Log in to Kane; verify one throwaway objective end to end | First real run, or a documented blocker |
| 19 Nov | Demo store + seeded defect + boundary tests; Kane reads the shipping quote | A1, A2, A4 evidence |
| 20 Nov | Negative control, including the deliberate bad patch | A3 evidence |
| 21 Nov | Repair loop: FAIL artifact → agent diff → unchanged rerun | A5 evidence |
| 22 Nov | Fail-closed states, receipt, run history | A6, A7 evidence |
| 23 Nov | Two merchant/agency conversations; re-check competitor pages | Written notes, B1/B2 answers |
| 24 Nov | Three more conversations; README, limitations, reproduction guide | Demand note with counts |
| 25 Nov | Record the 3–5 minute video; two public posts; freeze code | Submission artifacts |

The conversations are 20 minutes each and need three questions: *When did a promotion last not work the way it was advertised? How did you find out? What did you do about it?* Anything longer is procrastination dressed as validation.

---

## 9. Blockers and risks

- **Kane is installed but not authenticated.** `kane-cli whoami` reports "Not logged in", profile `default`, token missing. Every technical claim above depends on a real run. This needs the account owner, not a workaround.
- **PromoProof may extend scope.** It is a one-person product with a Shopify App Store listing in review; a shipping/browser feature is plausible. Re-check before submission.
- **The host's use case page commoditises the mechanics.** Judges may have seen it. The demo must show the contract, the control, the repair and the receipt — not just a green Kane run.
- **Evidence hygiene.** Kane run artifacts may contain session data. Review before publishing the repo; keep credentials and `.data` out of git.

---

## 10. Sources

Competitors and prior art

- PromoProof — https://promoproof.app/ , /features , /pricing (read 2026-11-18)
- PromoInspect — http://promoinspect.com/ (Cloudflare 1001; search-index description only)
- Omni Verify — https://github.com/omnigrowth-app/omni-verify (README, read 2026-11-18)
- TestMu AI use case, discount code at checkout — https://www.testmuai.com/use-cases/kane-cli/discount-code-application/
- Kane CLI Hack Day showcase — https://www.kaneclihack.sh/ship
- Nightlamp — https://nightlamp.app/ ; Revenue Shield — https://getrevenueshield.com/ ; CheckView — https://checkview.io/
- BrandVerity — https://www.brandverity.com/solutions/role/affiliate-managers
- CommerceIQ — https://www.commerceiq.ai/ ; Similarweb digital shelf — https://www.similarweb.com/corp/retail/digital-shelf-analytics/
- 75way offer integrity page — https://75way.com/ai-agents/bpo-customer-support/offer-discount-analysis/offer-integrity-assurance-agent

Demand

- Shopify Community /t/226210, /t/237563, /t/294662, /t/357943 (quotes above)
- Brand Depot, Shopify Discount Testing Checklist, 2026-10-24 — https://brand-depot.com/blogs/shopify-guides-tips/shopify-discount-promotion-testing
- SimplyCodes, What Shoppers Do When a Coupon Fails, 2026-07-16 — https://simplycodes.com/blog/coupon-code-failure-shopper-behavior

Regulatory

- California SB 478 — https://legiscan.com/CA/text/SB478/id/2841136 ; Fenwick FAQ — https://www.fenwick.com/insights/publications/californias-hidden-fee-ban-faqs-and-guidance
- FTC fee rule coverage summary — https://startbusinessbystate.com/junk-fee-laws-by-state/
- FTC v. Dollar General, 2026-10-26 — https://www.ftc.gov/news-events/news/press-releases/2026/10/ftc-state-partners-sue-dollar-general-charging-consumers-more-advertised-many-products

Event

- Official page (deadline, judging, submission requirements) — https://www.kaneclihack.sh/ (read 2026-11-18)
