# Kern demo — 3:30 shot list

The app is read-only and reads real audit JSON. It does not run Kane.

## Start everything

```bash
npm install
npm test
npm run app                     # terminal 1: app on http://127.0.0.1:3000
npm run demo:store-pre-repair   # terminal 2: the audited revision on 4173
```

Open **http://127.0.0.1:3000** before recording Segment 1. The pre-repair store
terminal will print:

```
PRE-REPAIR REVISION — seeded defect active
This is the revision that was audited, not a live audit.
```

If the app shows the banner **“Recorded audit: replay of real runs, not a live
session.”**, read it aloud once. Never let a recorded copy sound like a live
session. On a machine with `.data/audits`, the app shows live records and the
banner is absent; on a public clone it shows `recorded/` and the banner.

| Time | On screen / exact click | Say |
|---|---|---|
| 0:00–0:15 | App at `/`. Campaign hero and “Latest audit” visible. | “Kern checks whether the promise in an ad survives checkout. One storefront, one promise, three carts.” |
| 0:15–0:40 | Scroll to **Ad snapshot** and **Merchant's stated interpretation**. Point at each block, then the contract grid. | “The ad says free shipping over $50. The merchant approved an inclusive $50 boundary, US standard, after-discount subtotal. Those are two separate records, so the interpretation cannot hide inside the ad.” |
| 0:40–1:00 | Scroll to **Why $9.00 is a sourced expectation** and the three carts. Point at the policy line, then the $60/$50/$35 cards. | “Qualifying carts are promised $0. The $9 baseline comes from a separate approved policy, not from the ad. The $35 control is supposed to keep paying $9.” |
| 1:00–1:10 | Click **Audits** in the header. Point at the two canonical IDs: `2026-11-22T00-53-05-669Z-f5230a` (BROKEN) and `2026-11-23T12-35-29-692Z-48b993` (HONORED). | “Two real audits: one before the repair, one after. The second answers the first.” |
| 1:10–1:25 | Click the pre-repair ID `2026-11-22T00-53-05-669Z-f5230a`. The Journey X-Ray opens on eligible-60. | “The X-Ray puts the promise and the rendered checkout side by side.” |
| 1:25–1:50 | Point at the **Promised $0.00** lane, then **Observed $9.00**. Scroll to **Kane's verdict**. | “Kane's observe run read a $60.00 subtotal and a $9.00 shipping charge. The oracle expected $0.00. Kane's assert run returned a confirmed product bug, severity major. The artifacts carry the verdict; I am not inferring it.” |
| 1:50–2:10 | Scroll to **boundary-50**: Promised $0.00 / Observed $9.00. Then **control-35**: Promised $9.00 / Observed $9.00. | “The exact $50 boundary catches a fix that only frees $60 and up. The $35 control catches a fix that makes all shipping free: it must keep paying $9.” |
| 2:10–2:30 | Click **Closed loop** (pre-repair page). If you are on the post-repair page instead, click **Open the closed loop**. Point at the real diff and the right column. | “The repair is one line: remove the `* 100` that compared cents to dollars. The right column is the unchanged rerun: all six objective hashes match, and the post-repair audit is HONORED.” |
| 2:30–2:55 | Click **Promise Receipt** on the post-repair audit. Point at the contract hash, the pre-repair audit ID, the $0/$0/$9 table, and the evidence hashes. Scroll to **What this does not prove**. | “The receipt is scoped: verified for the tested conditions at the recorded time, not certified. It names the pre-repair audit and every evidence hash. And it says what it does not prove — one store, one promise, one moment.” |
| 2:55–3:15 | Switch to **http://127.0.0.1:4173**. Click **Load $60.00 eligible cart**. The checkout shows $9.00 shipping. | “This is the revision that was audited, not a live audit. The $60 cart is charged $9.00 where the contract says $0.00. The terminal labels the revision as the pre-repair one.” |
| 3:15–3:30 | Back to the app receipt or campaign. Hold on the “What this does not prove” / status line. | “One store, one promise type, USD/US. Hash-linked, not signed. The control still pays $9, so the fix did not just make shipping free.” |

## After the demo

Stop the pre-repair store with **Ctrl+C** (or press Enter). It restores
`src/lib/shipping.ts` and prints the restored SHA-256. Verify it matches the
fixed file:

```bash
sha256sum src/lib/shipping.ts
# 7c0a2e3b188694143a7ae9242a173bea21edc2e08b41744c8260aeb317164971
```
