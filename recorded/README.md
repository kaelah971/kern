# Recorded audits

These are sanitized copies of two **real** Kern audits. They exist so a public
clone can run the read-only app with no Kane account and no local `.data/`
directory. They are not mocks and they are not live sessions.

Copied on **2026-11-23** from the recording machine.

| Audit id | Result | Original `audit.json` SHA-256 | Recorded file SHA-256 | Bytes |
|---|---|---|---|---:|
| `2026-11-22T00-53-05-669Z-f5230a` | **BROKEN** — pre-repair | `f42f8359bb40b9dc36114a125e7ce65e4b6a63bbd6d6523d726e4dd12fb425af` | `ad1ddcc22940675345068c4059e6ee68b9e7654b1d967bfad9b6db206d57042c` | 26,771 |
| `2026-11-23T12-35-29-692Z-48b993` | **HONORED** — post-repair, answers the first | `6d9a2c1ddc078166fe32dbdf1b975ebba59a6598bca3bfaf8e7f2a037eec1eb6` | `360506331cc9cca3a4b2b622b39cc204898938371cfa48b95b08d8ae5dfbf78f` | 21,421 |

Original paths (not committed; `.data/` is gitignored):

- `.data/audits/2026-11-22T00-53-05-669Z-f5230a/audit.json`
- `.data/audits/2026-11-23T12-35-29-692Z-48b993/audit.json`

## What was stripped

- Absolute filesystem paths: `sessionDir`, `session_dir`, `run_dir`, `testUrl`,
  `test_url`, `evidencePath`, evidence `sourcePath`/`copiedPath`, artifact
  `stdoutPath`/`stderrPath`/`objectivePath`, and `argv`.
- `rawRunEnd`, including its `coverage.pack` and Test Manager link.
- Any string under the recording user's home directory. The generator refuses
  to write a copy if any such string survives.

## What was kept

- Statuses, result/reason codes, cents, timestamps, credits.
- Session ids, derived from the original session directories.
- Objective SHA-256 values, evidence SHA-256 values and byte counts.
- Kane verdict fields (`confirmed`, `bug_title`, `root_cause`, `severity`,
  `confidence`, `suggestion`, signals), `answersAuditId`,
  `objectiveHashComparisons`, per-run `source` and `exitCodeSource`.
- The contract snapshot and the objective text.

Each file adds:

```json
{
  "source": "recorded",
  "originalAuditSha256": "<hash of the original audit.json>"
}
```

## What "recorded" does and does not mean

`source: recorded` describes the **copy**, not the runs. The pre-repair audit's
eligible-60 runs were user-provided real captures (their exit codes are
user-reported); its boundary-50 and control-35 runs were live. The post-repair
audit's six runs were live. Those per-run provenance fields remain intact.

The app shows a visible banner on every page that renders one of these:

> **Recorded audit: replay of real runs, not a live session.**

The `.evidence` files are not included in the recorded copies. Their SHA-256
values are kept, and the app says that the file is not included instead of
offering a `kane-cli evidence serve` command that would point at a missing file.

## Verify

If you have the original audit directories:

```bash
sha256sum .data/audits/2026-11-22T00-53-05-669Z-f5230a/audit.json
sha256sum .data/audits/2026-11-23T12-35-29-692Z-48b993/audit.json
```

Compare against the original hashes above. Compare the recorded copies:

```bash
sha256sum recorded/2026-11-22T00-53-05-669Z-f5230a/audit.json
sha256sum recorded/2026-11-23T12-35-29-692Z-48b993/audit.json
```

Cross-check the run-level facts against
[`docs/proof-ledger.md`](../docs/proof-ledger.md): session ids, exit codes,
reason codes, observed amounts, evidence hashes and credits. The ledger records
the audit-json hashes for both original audits.

The sanitizer is [`scripts/record-audits.ts`](../scripts/record-audits.ts). It
requires the original `.data` files and exits non-zero if a home path or banned
key survives.
