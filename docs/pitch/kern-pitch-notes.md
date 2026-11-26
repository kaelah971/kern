# Kern pitch deck — speaker notes

Deck: `docs/pitch/kern-pitch.pdf` (12 slides, 16:9)  
Source: `docs/pitch/kern-pitch.html`  
For a 3-minute cut: slides 1, 2, 4, 6, 8, 9, 12.

## 01 — Cover

Every ad makes a promise. Kern is the firewall that makes the checkout prove it.

Start with the concrete case: a $60 cart, a free-shipping promise of $0.00, and a $9.00 charge.

## 02 — The problem

This is not a hypothetical. A merchant in a public Shopify thread described a customer whose discount “showed in her checkout” but who was charged full price. The fallback was constantly refunding people.

The code was green. The page loaded. The customer still paid more. The promise dies at the last screen — where it becomes real.

## 03 — The vendor blind spot

The ad platform sees the click. Analytics sees the order. Unit tests see the code. Support sees the complaint. Each owns a slice.

Nobody owns the rendered checkout for the exact advertised cart. The last mile is unowned.

## 04 — Why now

AI agents can now change the pricing code, write the test and call the task done. That is useful speed, and a new risk: a pass is a claim, not proof.

The fix can be too broad and make all shipping free. It can be too narrow and miss the exact boundary. Or the agent can weaken the test until it goes green.

The agent can change the code. It cannot be the witness.

## 05 — The insight

Most tools start at the rule. Kern starts at the ad.

The ad is the spec. The merchant’s interpretation is stored separately — inclusive $50, after-discount merchandise subtotal, US standard, USD. The $9 baseline has its own approved policy source.

The checkout is the truth.

## 06 — The loop

Freeze the promise. Build three fixed carts: $60 eligible, exact $50 boundary, $35 control. Send Kane through the real rendered checkout. A deterministic oracle decides. If it fails, Pi gets a bounded repair brief; a human approves; Kane reruns the same six objectives. The gate opens only when the evidence matches. Then a scoped receipt.

The boundary catches a fix that only frees $60 and up. The control catches a fix that makes all shipping free. The gate catches a “done” with no passing witness.

The agent never decides whether the fix worked. The evidence does.

## 07 — Why Kane / TestMu AI

Kane CLI opens the real storefront in a real browser, follows the cart and reads the rendered shipping quote. It returns the observation, the terminal result and the evidence.

Kern owns the contract, boundary, control, oracle, gate and receipt. Kane owns the observation and the unchanged rerun.

Kane is not a logo at the end of the pipeline. Remove Kane and the loop loses the only independent view of the customer checkout.

## 08 — The proof

The pre-repair audit is BROKEN: $60 → $9, $50 → $9, $35 → $9. The $35 control was correct.

The repair was one line: remove the `* 100` that compared a cents subtotal with a dollar-denominated threshold. Pi made the bounded change; a human merged it.

The post-repair audit is HONORED: $60 → $0, $50 → $0, $35 → $9. All 6/6 objective hashes match. The gate is open.

The control stayed at $9.00. The fix did not just make shipping free.

Evidence note: the pre-repair $60 row is a provided real Kane capture; the $50 and $35 rows are live. A separate live $60 run repeats it. The post-repair audit is all live.

## 09 — The receipt

When a customer says “your ad promised free shipping,” the vendor needs a receipt, not an argument.

The Promise Receipt shows the ad snapshot, the frozen contract hash, the promised vs observed value per cart, the Kane run IDs and evidence hashes, the code revision and human approval, the gate status, and what the test does not prove.

It is a reproducible customer-side record for the tested conditions. Not a recording of every shopper. Hash-linked, not signed. Not a certification.

That is how a support lead gets from “I think it was working” to “here is the cart, the quote, the code and the evidence.”

## 10 — The product

A gate, not a dashboard.

The gate CLI exits 0 or 1. A coding agent can run it before it says done. A closed gate can return a Claude Code block decision through the Stop hook.

There is also the Promise Receipt, the local contract compiler, and the storefront before/after. The command is the product; the receipt is the interface.

## 11 — Where Kern sits

Not a price monitor. Not a promotion-config checker. Not generic QA.

Those tools start at the price, the rule or the flow. Kern starts at the ad and ends at the rendered checkout — then closes the loop with a bounded repair, an unchanged rerun and a receipt.

Who feels it: DTC operations, performance marketing, agencies and platform teams accountable for an offer. The trigger is a launch, a code change or a customer complaint.

The loop is the wedge. Willingness to pay is not yet validated.

## 12 — Close

The checkout is the proof. Kane is the witness. Kern is the gate.

Live proof: tryoutkern.vercel.app. Source: github.com/kaelah971/kern. The 3-minute demo is the same loop.

Built with Kane CLI / TestMu AI. Pi did the terminal-driven bounded repair. Kern is an independent project.
