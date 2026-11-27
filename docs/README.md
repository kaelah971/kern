# Kern documentation

Start with the root [README](../README.md) and the [Why Kane CLI brief](../WHY_KANE.md).

## Proof

- [Proof ledger](proof-ledger.md) — real run sessions, exits, evidence hashes, credits.
- [Promise proof page](https://tryoutkern.vercel.app/promises) — 18 real Kane runs across percentage discounts, bundles and delivery estimates.
- [Shipping gate](https://tryoutkern.vercel.app/gate) — the pre/post audit and six-patch gauntlet.
- [Promise receipt](https://tryoutkern.vercel.app/audits/2026-11-23T12-35-29-692Z-48b993/receipt).

## Design and architecture

- [MCP server](mcp.md) — read-only tools for Claude Code, Cursor, Codex and other MCP clients; no Kane credits.
- [System design PDF](system-design/kern-system-design.pdf) — information architecture, user flow, system architecture, technical architecture and tooling.
- [Architecture PDF](architecture/kern-architecture.pdf) — the full system map and start-to-finish connection map.
- [Architecture notes](architecture.md) — the original design brief.
- [Decisions](decisions.md) — boundary, interpretation, baseline source and “hash-linked, not signed”.
- [Store policy](store-policy.md) — the separate $9 baseline source.
- [Demo defect](demo-defect.md) — the seeded shipping bug.

## Submission and launch

- [Submission content](submission.md) — About, project story, short version and post 2.
- [Pitch deck](pitch/kern-pitch.pdf) — 14 slides.
- [Social post 1](social/kern-post-1.md) + [card](social/kern-post-1.png).
- [Social post 2](social/kern-post-2.md).
- [Demo script](demo-script.md).
- [Publish checklist](publish.md).
- [Deployment](vercel.md).

## Notes

The `src/`, `scripts/`, `tests/`, `contracts/` and `recorded/` directories are the executable source and the sanitized evidence bundle. `.data/` is private and gitignored.
