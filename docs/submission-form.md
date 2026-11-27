# Kern — submission form answers

Status: ready to paste. The form currently has the draft name **Kaelah**; change the project name to **Kern**.

## Project name

Kern

## One-line description

Kern verifies the promise an ad makes at checkout. Kane CLI reads the rendered price, discount, bundle total or delivery date; the gate opens only when evidence matches.

(169/170 characters)

## Project details

Every ad makes a promise: free shipping, a discount, a bundle, a delivery date. The customer expects that promise at checkout. Too often the checkout does something else, and the code still passes its tests.

Kern is the promise firewall for checkout. It freezes the ad and the merchant's interpretation into a contract, builds an eligible case, the exact edge and a control, then sends Kane CLI from TestMu AI through the real rendered checkout. Kane reads the price, discount, bundle total or delivery date the customer sees. A deterministic oracle decides whether the promise was kept. Kane is the witness, not a logo at the end of the pipeline.

When a promise breaks, Pi gets a bounded repair brief, changes only the allowed source, and a human approves the fix. Kane reruns the same objectives. The gate opens only when the evidence matches. The Promise Receipt records what was promised, what the checkout did, which code changed and what the test does not prove.

Kern covers four promise classes: free shipping, percentage discounts, bundles and delivery estimates. The shipping case has a real seeded defect and repair; the other three are correct-feature proofs. 18 new Kane runs across nine scenarios were honored, with every session, exit code and evidence hash recorded. 100 tests pass. The public site replays the recorded proof; the local demo is the real store. The public proof is live at tryoutkern.vercel.app.

(1429/1,500 characters)

## Agent used

Pi

## Anything else to add

Kane and Pi are connected through the CLI, exit codes and evidence files, not a private chat. Pi writes a bounded repair brief; the gate runs Kane's evidence and exits non-zero while the promise is broken; a Claude Code Stop hook can stop the agent from saying done. Kane caught the seeded $9 charge on the $60 and $50 shipping carts while the $35 control stayed correct. Pi's one-line fix was human-merged; the same six objectives were rerun unchanged, and 6/6 hashes matched. The new promise classes were then checked with 18 real Kane runs across nine scenarios; 9/9 were honored. Run `npm test` (100/100), `npm run promises`, and `npm run gate`. A read-only MCP server (`npm run mcp`) exposes status, gate and promise checks without starting Kane or spending credits. Next: member pricing, tax/currency and third-party checkout platforms.

(720 characters)

## Optional attachments

- `docs/pitch/kern-pitch.pdf` — 14 slides
- `docs/system-design/kern-system-design.pdf` — 5 pages
- `docs/architecture/kern-architecture.pdf` — 2 pages
- `docs/demo/kern-demo.mp4` — 3:30 demo master; public video: https://youtu.be/HNdahWD_ehE

## Checklist

- [ ] Project name changed from Kaelah to Kern
- [ ] One-liner pasted (169/170)
- [ ] Project details pasted (1,500 max)
- [ ] Agent used: Pi
- [x] Demo video uploaded to YouTube: https://youtu.be/HNdahWD_ehE
- [x] Public post 1: https://x.com/_kaaelaa_/status/2125914951734657399
- [x] Public post 2: https://x.com/_kaaelaa_/status/2125870283605115130
- [ ] Public post 1 and post 2 published
- [ ] Submit before 18:29 UTC / 7:29 PM WAT
