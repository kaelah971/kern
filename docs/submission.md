# Kern — final submission content

Status: ready to paste. Nothing here has been posted.

Kern is an independent open-source project built on **Kane CLI** from **TestMu AI**. It is not an official TestMu AI product.

---

## 1. About field (short)

Kern is the promise firewall for checkout, built independently on **Kane CLI** from **TestMu AI**. A store advertises free shipping over $50; a coding agent changes the shipping rule; a $60 cart is charged $9. Kern freezes the ad and the merchant's interpretation into a versioned contract, sends **Kane CLI** through the real rendered checkout on eligible, exact-boundary and control carts, and refuses to open the gate until Kane reruns the same six objectives. **Pi** made the bounded one-line repair; a human merged it; **Kane was the independent browser witness**. The Promise Receipt shows what was promised, what the checkout did, which code passed, and what it does not prove.

**One-line version:** The checkout is the proof. Kane is the witness. Kern is the gate.

---

## 2. Project story (long form)

### The promise dies at checkout

A shopper sees the offer: free shipping over $50, 20% off, a bundle, a member price. She clicks, adds the cart, reaches checkout, and the number is different. The discount is missing. The shipping fee appeared. The threshold moved because the code applied it before the discount instead of after.

She does not experience a “configuration issue.” She experiences a broken promise.

The vendor is left holding the complaint. Marketing has the click. Analytics has the order. Support has a screenshot. Engineering has logs and a green test suite. Nobody has the one thing that matters: **what the rendered checkout actually showed the customer for the exact cart in the ad.**

This is not an edge case. Merchants describe it in public. One wrote that a customer’s discount “showed in her checkout” but she was charged full price, and asked what he could do “other than constantly refund people for what they’ve been overcharged.” Another offered free shipping over $149.99; a 15% coupon pushed the subtotal below the threshold because shipping was calculated after the discount. The customer could have paid $180 in shipping. Both are product failures wearing the costume of a support ticket.

A 2026 survey of 1,463 US shoppers, run by a coupon company, found 24% abandoned a purchase after a coupon failed and 20% went to another retailer. Treat the exact percentages as directional; the direction is not surprising. A failed promise is not only a refund. It is lost trust, wasted ad spend, and a customer who now believes the store is careless.

### The vendor’s blind spot

The modern checkout is dynamic: discount codes, automatic promotions, member prices, bundles, shipping thresholds, tax, currency, geography, A/B tests, app-backed rules. The more combinations, the more places a promise can break.

The tools around the problem each see a slice:

- The ad platform sees the impression and the click.
- Analytics sees the visit and the order.
- A unit test sees the code.
- A synthetic monitor sees whether a scripted flow completes.
- A promotion checker sees whether a discount rule exists in the platform.
- Support sees the complaint after the customer is already angry.

None of them starts with **the ad** and ends with **the customer’s rendered checkout**.

That is the gap Kern closes.

### Why agents make it urgent

AI coding agents can now change pricing code, write the test, and mark the task done. That speed is useful. It also makes an old problem worse: **a pass is a claim, not proof.**

The agent can pick the happy path. It can make the fix too broad and give everyone free shipping. It can make it too narrow and miss the exact $50 boundary. It can weaken the test until it goes green. It is not being malicious; it is optimizing for the signal it was given.

The missing layer is an independent witness that sees what the customer sees, plus a gate that refuses to accept the agent’s own verdict.

### What Kern does

Kern starts with the promise, not the test script.

1. **Freeze the promise.** The ad snapshot and the merchant’s stated interpretation are stored separately. The contract is versioned and hashed. The merchant cannot silently rewrite the offer after the fact.
2. **Build the challenge.** Three fixed carts: the $60 eligible cart, the exact $50 boundary, and the $35 control. The boundary catches a fix that only frees $60 and up. The control catches a fix that makes all shipping free. The $9 baseline comes from a separate approved store policy, not from the ad.
3. **Send Kane through the real checkout.** Kane CLI opens the actual rendered storefront, follows the cart and reads the shipping quote the customer sees. Not a mock. Not the store’s internal function.
4. **Let the oracle decide.** A deterministic comparison turns promised and observed cents into a verdict. Kane’s `run_end` is necessary but not sufficient; the observed amount and the evidence have to agree with the frozen contract.
5. **Repair inside a boundary.** If the promise is broken, Pi receives a bounded brief: the exact failure, the files it may touch, the files it may not touch. It proposes a source change. A human reviews and merges it.
6. **Rerun the same challenge.** Kane runs the same six objectives — observe and assert for each cart — against the repaired store. The objective hashes must match the pre-repair audit. The challenge cannot move.
7. **Open the gate only when the evidence does.** The gate checks the contract hash, the carts, the observed values, the live sources, the exit codes and the evidence presence. The agent cannot self-certify. A Claude Code Stop hook can block “done” until the gate opens.
8. **Issue a scoped receipt.** The receipt is the record of what happened, including what it does not prove.

### Where Kane CLI and TestMu AI fit

Kane is not a logo at the end of the pipeline. It is the only component that opens the customer’s checkout and reads the rendered quote.

**Kane CLI from TestMu AI** supplies the independent browser execution: a real Chrome session, the actual storefront, the rendered shipping line, the terminal result, the exit code and the evidence pack. It is the witness. Kern owns the promise contract, the boundary and control carts, the deterministic oracle, the repair gate and the receipt.

Remove Kane and the loop loses the only independent view of the customer experience. A unit test can agree with the bug. A screenshot can hide the number. Kane reads the line the customer sees.

### When something goes wrong, the vendor needs a receipt, not an argument

This is the part that matters after launch.

A customer says: “Your ad promised free shipping. I was charged $9.”

The vendor can now show a **Promise Receipt** for the tested conditions:

- the ad snapshot and the frozen contract hash;
- the exact carts and their promised values;
- what Kane observed at checkout, per cart;
- the run IDs, terminal results and evidence hashes;
- the code revision and the approved patch;
- whether the gate is open;
- the date and time of the evidence;
- and an explicit “what this does not prove.”

That turns a support conversation from “I think it was working” into:

> “Here is the promise, here is the cart, here is the quote the checkout rendered, here is the code revision, and here is the evidence. This case is covered — or it is outside the conditions we tested, and here is what we need to add.”

It is not a recording of every shopper. It is a reproducible customer-side record for the conditions the store chose to verify. That distinction is the product’s honesty, not a weakness. A receipt that claims to prove every customer would be a lie. A receipt that proves the exact conditions, with evidence, is useful.

For a marketplace vendor caught between the platform’s checkout and the shopper’s screenshot, the same shape of artifact can be a shared starting point: the cart, the quote, the revision, the evidence. It moves the conversation from blame to reproduction.

For the store, the receipt is also an incident tool: it narrows the search, shows whether the failure is in the promise or outside the tested conditions, and gives the next audit a precise target.

### What we proved

The demo promise is **$50.00 free standard shipping, after-discount merchandise subtotal, US/USD**.

| Cart | Promised | Before repair | After repair |
|---|---:|---:|---:|
| $60.00 eligible | $0.00 | **$9.00** | **$0.00** |
| $50.00 boundary | $0.00 | **$9.00** | **$0.00** |
| $35.00 control | $9.00 | $9.00 | **$9.00** |

The pre-repair audit is **BROKEN**. The post-repair audit is **HONORED**, answers the first, and all **6/6** objective hashes match. The repair was one line: remove the `* 100` that compared a cents subtotal with a dollar-denominated threshold. Pi made the bounded change; a human merged it; Kane reran the unchanged six objectives. The control stayed at $9.00, so the fix did not simply make shipping free.

Evidence note: the pre-repair $60 row is a provided real Kane capture; the $50 and $35 rows are live. A separate live $60 audit repeats the $60 observation. The post-repair audit is all live.

### What this does not prove

Kern is deliberately narrow, and the receipt says so:

- one owned demo storefront;
- one promise type: free shipping over an after-discount threshold;
- three fixed carts;
- US destination, USD, standard shipping;
- one recorded time;
- no real orders, payments, refunds or fulfilment;
- evidence is **hash-linked, not signed**;
- the public site replays recorded audits; the local demo is the real store;
- this is not a legal, compliance or security certification.

It proves the tested promise for the tested conditions at the recorded time. That is enough to catch the class of bug that reaches customers, and honest enough not to pretend it caught everything else.

### Why this is different

Kern is not a price monitor. It is not a promotion-config checker. It is not a generic QA dashboard.

It starts where the customer starts — the ad — and ends where the promise becomes real — the rendered checkout. It uses a boundary and a control so a repair cannot cheat in either direction. It requires the same challenge to pass after the repair. It turns the evidence into a receipt a support lead can use. And it makes Kane the stop condition for the coding agent.

The next promise types are percent discounts, bundles, member pricing and delivery estimates. The architecture is designed for them; P0 proves one promise end to end rather than claiming all of them.

### The checkout is the proof

Every store already has an ad. Every store already has a checkout. The missing piece is the independent record that connects them.

Kern is that record. Kane is the witness. The gate is how the agent earns “done.”

**Live:** https://tryoutkern.vercel.app  
**Why Kane:** https://tryoutkern.vercel.app/why-kane  
**Gate:** https://tryoutkern.vercel.app/gate  
**Receipt:** https://tryoutkern.vercel.app/audits/2026-11-23T12-35-29-692Z-48b993/receipt  
**Repo:** https://github.com/kaelah971/kern  
**Demo video:** [add the YouTube link]

---

## 3. Short version (if the form has a limit)

Every discount is a promise. The customer sees it in the ad and expects it at checkout. Too often the checkout does something else: the code is green, the rule exists, the page loads, and the customer is still charged the wrong amount.

Kern freezes the ad and the merchant’s interpretation, builds an eligible cart, the exact boundary and a control, and sends **Kane CLI** (TestMu AI) through the real rendered checkout. The deterministic oracle decides. If the promise is broken, **Pi** makes a bounded source repair, a human approves it, and Kane reruns the same six objectives. The gate opens only when the evidence matches. The Promise Receipt shows what was promised, what the checkout did, which code passed, and what it does not prove.

The checkout is the proof. Kane is the witness. Kern is the gate.

---

## 4. Second public post

Attach the receipt screenshot (`docs/screenshots/04-receipt.png`) or a short clip from the demo.

> A customer says: “Your ad promised free shipping. I was charged $9.”
>
> The vendor has a screenshot, a support ticket, and no way to prove what the checkout actually did.
>
> That is the gap I built Kern to close.
>
> Every discount is a promise: free shipping over $50, 20% off, a member price. The ad makes it; the checkout is where it becomes real. But the ad platform sees the click, analytics sees the order, the test sees the code, and support sees the complaint after the customer is already angry. Nobody sees the promise at the rendered checkout for the exact cart.
>
> Kern freezes the ad and the merchant’s interpretation into a contract. It builds the $60 eligible cart, the exact $50 boundary and the $35 control. It sends @kane_cli through the real store and reads the shipping quote the customer sees. The oracle decides; the agent does not grade itself.
>
> In the demo, the pre-repair checkout charged $9 on the $60 and $50 carts. The $35 control paid $9 correctly. One line of shipping code was wrong. Pi made the bounded fix; a human merged it; Kane reran the same six objectives. $60 and $50 came back $0. The control stayed $9. All 6/6 objective hashes matched. The gate opened.
>
> The part I care about most is the receipt. When something goes wrong, the vendor can show the promise, the cart, the quote, the code revision and the evidence — and say exactly what the test does not prove. Not a recording of every shopper. A reproducible customer-side record for the conditions that matter.
>
> That is what @testmuai’s Kane CLI makes possible: a real browser witness, not a logo.
>
> Live: https://tryoutkern.vercel.app  
> Repo: https://github.com/kaelah971/kern
>
> #KaneCLIHackathon #KaneCLI

---

## 5. Assets and links

- **Live site:** https://tryoutkern.vercel.app
- **Demo app:** https://tryoutkern.vercel.app/campaign
- **Why Kane:** https://tryoutkern.vercel.app/why-kane
- **Gate:** https://tryoutkern.vercel.app/gate
- **Receipt:** https://tryoutkern.vercel.app/audits/2026-11-23T12-35-29-692Z-48b993/receipt
- **Repo:** https://github.com/kaelah971/kern
- **Video:** `docs/demo/kern-demo.mp4` — upload to YouTube, then replace the placeholder.
- **Post 1:** `docs/social/kern-post-1.md` + `docs/social/kern-post-1.png`
- **Post 2:** the draft above; attach the receipt screenshot or a short clip.
