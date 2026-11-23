# Real audit fixtures

These files are **byte-identical copies** of real Kern audit records. They are
not mocks and were not edited.

| Fixture | Source | SHA-256 |
|---|---|---|
| `broken-audit.json` | `.data/audits/2026-11-22T00-53-05-669Z-f5230a/audit.json` | `f42f8359bb40b9dc36114a125e7ce65e4b6a63bbd6d6523d726e4dd12fb425af` |
| `honored-audit.json` | `.data/audits/2026-11-23T12-35-29-692Z-48b993/audit.json` | `6d9a2c1ddc078166fe32dbdf1b975ebba59a6598bca3bfaf8e7f2a037eec1eb6` |

`broken-audit.json` is the pre-repair full audit (BROKEN; its eligible-60 rows
come from the user-provided captures). `honored-audit.json` is the post-repair
full audit (HONORED; `postRepair: true`; it answers
`2026-11-22T00-53-05-669Z-f5230a`).

The tests copy these files into a temporary audit root and exercise the reader,
receipt renderer and routes. The app itself reads the real `.data/audits`
directory and renders an empty state when that directory or a file is missing.
