# Kern launch post 1

Attach **`kern-post-1.png`** to the post.

## Post

> When a testing agent says a checkout “passed,” most people take its word for it. That’s risky in commerce, because the customer can still be charged the wrong price.
>
> I watched it happen with @kane_cli. I planted a bug in a small store so a $60 cart — one that should get free shipping over $50 — was charged $9. I asked Kane to shop the real checkout and read the shipping price.
>
> Kane’s first audit was BROKEN: $60 → $9. The exact $50 cart → $9. The $35 cart paid $9 correctly. That $35 cart mattered: it showed the bug was specific, not just “all shipping is broken.”
>
> I’m building Kern for the #KaneCLIHackathon to catch exactly this. Kern freezes what the ad promised and the three test carts. It uses Kane as the independent browser witness, checks what the customer actually sees against the promise, and refuses to let the coding agent mark the work done until the same six checks pass again.
>
> Then a coding agent fixed one line of the shipping code. I approved the change. Kane reran the same six checks: $60 → $0, $50 → $0, $35 → $9. All 6/6 objective hashes stayed the same. The gate opened.
>
> It keeps the coding agent honest too. The agent cannot edit the challenge to get a pass. If the promise fails, the gate blocks the result, and a Claude Code Stop hook can stop the agent from saying “done” until Kane’s rerun passes.
>
> The public proof is recorded; the local demo is real. Twelve recorded runs. 90/90 tests. Full details soon as we prepare the submission.
>
> @testmuai #KaneCLI

## Image

`kern-post-1.png` — 1600 × 900, no links in the image.

Alt text: Dark green card with mint type. Headline: “Passed” is a claim. The checkout is the proof. A Kane audit card shows the $60 eligible and $50 boundary carts failing at $9.00 before the repair and passing at $0.00 after, while the $35 control stays $9.00. Bottom stats: $9.00 → $0.00, $35 control still $9.00, 6/6 unchanged objectives.
