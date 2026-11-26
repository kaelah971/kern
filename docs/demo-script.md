# Kern demo — 3:30–4:00 shot list

The recorded demo app is read-only and reads real audit JSON; it does not run
Kane. The operator-only live check is a separate local mode and is not part of
the recorded-only demo. No Kane runs are started by `npm run demo`.

## Start everything

```bash
npm install
npm test
npm run demo                    # app on 3000 + repaired store on 4173, opens both
```

The optional local pre-repair store is a separate terminal: stop `npm run demo`
first (it holds 4173), then run `npm run demo:store-pre-repair`. It temporarily
restores the audited revision, serves it on 4173, and restores the fixed file
when stopped. The public `/store/before/<cart>` pages are the same audited
revision as static HTML, so the main one-command demo does not need that swap.

Open **http://127.0.0.1:3000** before recording Segment 1. The optional
pre-repair store terminal will print:

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
| 2:55–3:15 | Switch to **http://127.0.0.1:4173**. Click **Load $60.00 eligible cart**. The current repaired checkout shows $0.00 shipping. | “This is the repaired store. The same fixed cart that the audited revision charged $9.00 now shows $0.00.” |
| 3:15–3:35 | Open **https://kern-site-mocha.vercel.app/store/**. Point at the banner and the three fixed carts. Open **eligible-60** ($0.00), then click **The revision Kern audited** and show the $9.00 page and its “not the current store” notice. | “The public store is the same fixture, statically exported from the store’s own templates. The current $60 quote is $0.00; the audited revision is $9.00. The page labels the old revision and links both to the recorded audit.” |
| 3:35–3:50 | Open **http://127.0.0.1:3000/gate**. Point at **Gate OPEN**, the six-patch gauntlet, and the three REJECT rows. | “The gate is the product. The correct fix passes all three carts; all-free fails the $35 control, $60-only fails the $50 boundary, and the audited rule fails the promise. The agent does not decide; Kane does.” |
| 3:50–4:00 | Back to the receipt or gate page. Hold on the “What this does not prove” / gate line. | “One store, one promise type, USD/US. Hash-linked, not signed. The control still pays $9, so the fix did not just make shipping free. Kane gates the patch.” |

## Optional operator panel (do not start a run)

The local check panel is gated by `KERN_LIVE=1` and is not on the public site.
If you show it, use a separate local app with the store running and do **not**
click Start unless you intend to spend Kane credits. The completed recorded
audits already carry the evidence. The panel is there to show the product can
start the same audit script; the recorded demo does not start it.

## Optional local-only product surfaces

- **Contract compiler:** `/compile` on the local app (not public). It freezes a
  contract and writes `.data/contracts/`; it does not run Kane. The public site
  404s the route.
- **Agent hook:** `hooks/claude-code-stop.mjs` blocks Claude Code when the gate is
  closed. Pi uses `npm run gate -- --audit <path> || exit 1`. Do not enable it in
  a recorded-only demo unless the audit named by `KERN_AUDIT_PATH` exists.

## After the demo

Stop the pre-repair store with **Ctrl+C** (or press Enter). It restores
`src/lib/shipping.ts` and prints the restored SHA-256. Verify it matches the
fixed file:

```bash
sha256sum src/lib/shipping.ts
# 7c0a2e3b188694143a7ae9242a173bea21edc2e08b41744c8260aeb317164971
```
