# Real audit fixtures (sanitized)

These are sanitized copies of real Kern audit records. They are not mocks. The
statuses, cents, timestamps, verdicts, objective hashes and evidence hashes are
unchanged; the recording machine's home directory and Kane session directories
were replaced with `C:\Users\<user>` and `<session-dir>` so the public tree
contains no home path. The Test Manager share URLs remain, because they are
public references, not filesystem paths.

| Fixture | Original source | Original source SHA-256 | Sanitized fixture SHA-256 |
|---|---|---|---|
| `broken-audit.json` | `.data/audits/2026-11-22T00-53-05-669Z-f5230a/audit.json` | `f42f8359bb40b9dc36114a125e7ce65e4b6a63bbd6d6523d726e4dd12fb425af` | `b8cd7aaf2b66effb5b4685e3d55f1ad200448ecfa60a3f87a0610a73c7199e9a` |
| `honored-audit.json` | `.data/audits/2026-11-23T12-35-29-692Z-48b993/audit.json` | `6d9a2c1ddc078166fe32dbdf1b975ebba59a6598bca3bfaf8e7f2a037eec1eb6` | `8ecc00838514a27ad57450705410fb925b5b57af91c4df86b2f536f23123d6f2` |

`broken-audit.json` is the pre-repair full audit (BROKEN; its eligible-60 rows
come from the user-provided captures). `honored-audit.json` is the post-repair
full audit (HONORED; `postRepair: true`; it answers
`2026-11-22T00-53-05-669Z-f5230a`).

The tests copy these sanitized files into a temporary audit root and exercise
the reader, receipt renderer and routes. The app itself reads the real
`.data/audits` directory when present and falls back to `recorded/`; it renders
an empty state when neither exists.
