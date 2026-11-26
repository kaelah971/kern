# Kern pitch deck — speaker notes

Deck: `docs/pitch/kern-pitch.pdf` (14 slides, 16:9)  
Source: `docs/pitch/kern-pitch.html`  
For a 3-minute cut: slides 1, 2, 4, 6, 7, 9, 10, 14.

## 01 — Cover

Every ad makes a promise. Kern is the firewall that makes the checkout prove it. Four promise classes; one independent witness.

## 02 — The problem

A $60 cart, a free-shipping promise of $0.00, and a $9.00 charge. The same gap hides in discounts, bundles and delivery dates. The code can be green; the customer still gets a different answer.

## 03 — The vendor blind spot

The ad platform sees the click. Analytics sees the order. Tests see the code. Support sees the complaint. The rendered promise for the exact cart has no owner.

## 04 — Why now

AI agents can change pricing code, write the test and call it done. The fix can be too broad, too narrow, or the test can be weakened. A pass is a claim; the agent cannot be the witness.

## 05 — The insight

The ad is the spec. The checkout is the truth. Most tools start at the rule; Kern starts at the ad and keeps the merchant’s interpretation as a separate, frozen record.

## 06 — The loop

Freeze the promise. Build an eligible case, the exact boundary and a control. Send Kane through the real rendered checkout. The oracle decides. If the promise fails, Pi gets a bounded repair; a person approves; Kane reruns the same checks; the gate opens only when the evidence matches.

## 07 — The promise library

One promise type was never the product. The same discipline now covers free shipping, 20% off over $50, the tote + notebook bundle, and order-by-2pm delivery. Every class has an eligible case, an exact edge and a control.

## 08 — Why Kane / TestMu AI

Kane CLI opens the real storefront in a real browser and reads the rendered price, discount, bundle total or delivery date. It is not a logo at the end of the pipeline. Kern owns the contract, boundary, control, oracle, gate and receipt. Kane owns the observation, evidence and unchanged rerun.

## 09 — The first proof

The pre-repair shipping audit is BROKEN: $60 → $9, $50 → $9, $35 → $9 correctly. One line fixed a cents-versus-dollars mistake. The post-repair audit is HONORED: $60/$50 → $0, $35 → $9, 6/6 objective hashes, gate open. The control is what proves the fix did not just make shipping free.

## 10 — The proof grows

The same witness checked three more promises. 18 real Kane runs, 9 scenarios, 9/9 HONORED. Discount: $12 / $10 / $0. Bundle: $9 / $0 / $0. Delivery: Nov 30 / Dec 1 / Dec 2. These are correct-feature proofs, not defect/repair cases. The public page is tryoutkern.vercel.app/promises.

## 11 — The receipt

When a customer says “your ad promised free shipping,” the vendor needs a receipt, not an argument. The Promise Receipt shows the promise, carts, observed values, run IDs, evidence hashes, code revision, gate status and what it does not prove. It is a reproducible customer-side record for the tested conditions, not a recording of every shopper. Hash-linked, not signed.

## 12 — The product

A gate, not a dashboard. The gate CLI exits 0 or 1; a closed gate can block a Claude Code Stop hook. `npm run promise:audit` runs the 18-run proof. The test pages are the store’s own HTML; the agent cannot self-certify.

## 13 — Where Kern sits

Not a price monitor. Not a promotion-config checker. Not generic QA. Kern starts at the ad and ends at the rendered checkout, for four promise classes, then closes the loop. Who feels it: DTC operations, performance marketing, agencies and platform teams. The loop is the wedge; willingness to pay is not yet validated.

## 14 — Close

The checkout is the proof. Kane is the witness. Kern is the gate. Four promise classes, 18 real Kane runs, 9/9 HONORED. Built with Kane CLI / TestMu AI. Pi did the terminal-driven bounded repair; a human approved it. Kern is an independent project.
