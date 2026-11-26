# Why Kane CLI

**The checkout is the truth. Kane is the only one who sees it.**

Kern does not ask the coding agent to grade its own work. It sends **Kane CLI** through the real rendered checkout, then uses that outside observation as the evidence the gate depends on. A unit test can agree with the bug. Kane reads what the customer actually sees.

- Live page: https://tryoutkern.vercel.app/why-kane
- Promise proof: https://tryoutkern.vercel.app/promises
- Repository: https://github.com/kaelah971/kern

## What Kane does

Kane is the independent browser witness.

1. **It opens the real storefront.** A real Chrome session follows the fixed customer journey.
2. **It reads the rendered value.** Shipping, percentage discount, bundle price or delivery estimate — the value on the screen, not the store’s internal function.
3. **It carries the evidence.** Every run returns a terminal `run_end`, exit code, final state and an evidence pack with a SHA-256 hash.
4. **It reruns the unchanged challenge.** After a repair, Kane runs the same objectives again so the goalposts cannot move.

Kane is not the judge. The frozen contract and deterministic oracle decide what the observed value means. The boundary and control scenarios make the verdict falsifiable.

## What Kern does

Kern is the loop around the witness:

- freezes the ad and the merchant’s stated interpretation;
- defines the eligible case, the exact boundary and the negative control;
- owns the deterministic oracle and fail-closed status rules;
- blocks the coding agent until the evidence passes;
- issues the scoped receipt.

**Kane observes. Kern decides what the observation means. The gate lets the agent ship only when the evidence supports it.**

## This is not a Kane wrapper

Remove Kane and the loop loses the only independent view of the customer checkout. A test can pass while the customer is charged the wrong price. A screenshot can hide the number. Kane reads the line the customer sees.

That is why Kane is not a logo in the footer. It is a required part of the proof.

## What has been proven

### The repair loop: free shipping

The demo store promised free standard shipping over $50. The pre-repair audit was **BROKEN**: $60 → $9, exact $50 → $9, $35 control → $9 correctly. One line fixed a cents-versus-dollars comparison. Kane reran the same six objectives and the post-repair audit is **HONORED**: $60/$50 → $0, $35 → $9, **6/6 objective hashes match**.

### The new promise classes: percentage, bundle and delivery

A second audit used **18 real Kane runs** across three new classes and nine scenarios:

| Promise | Observed | Result |
|---|---|---|
| 20% off orders over $50 | $60 → $12.00; exact $50 → $10.00; $35 → $0.00 | 3/3 HONORED |
| Tote + notebook: 15% off | complete → $9.00; tote only → $0.00; notebook only → $0.00 | 3/3 HONORED |
| Order by 2pm, 2 business days | Nov 30 / Dec 1 / Dec 2 | 3/3 HONORED |

- **Audit:** `2026-11-26T13-53-49-423Z-0525db`
- **18 Kane runs**; **9/9 scenarios HONORED**; **253.342116 credits**
- Kane CLI **0.10.6**; TestMu AI
- [Public proof page](https://tryoutkern.vercel.app/promises) with every session, exit code, evidence SHA-256 and objective SHA-256.

The new classes are correct-feature proofs on local test pages. They are not defect/repair cases. The free-shipping class remains the seeded-defect repair loop.

## What this does not prove

One test storefront; fixed carts and order times; one recorded time; USD/US. No real orders, payments, refunds or fulfilment. The percentage and bundle rules use fixed test carts. Delivery is a deterministic UTC fixture and is holiday-free. Evidence is **hash-linked, not signed or certified**. It is not a carrier promise and not proof for every customer.

It proves the tested conditions, at the recorded time.

## Read more

- [README](README.md)
- [Promise proof](https://tryoutkern.vercel.app/promises)
- [Gate](https://tryoutkern.vercel.app/gate)
- [Why Kane live page](https://tryoutkern.vercel.app/why-kane)
- [Proof ledger](docs/proof-ledger.md)
- [Submission content](docs/submission.md)
- [System design](docs/system-design/kern-system-design.pdf)
- [Pitch deck](docs/pitch/kern-pitch.pdf)
