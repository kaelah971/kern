# Proof ledger

Only real runs appear here. A missing run is written as missing. No artifact,
screenshot, exit code or run ID is fabricated.

## 2026-11-22T00:16:46.633Z — preflight — example.com — PASSED

- **Purpose:** prove Kane CLI, authentication and headless Chrome work on this
  machine before building the store.
- **CLI:** `kane-cli` 0.10.6 (update to 0.10.7 offered, not applied).
- **Auth:** profile `default`, environment `prod`, method `basic`, user
  `kaelah679`, token valid.
- **Command:**

  ```bash
  kane-cli run "Confirm the page heading reads Example Domain" \
    --url https://example.com --agent --headless --max-steps 10 --timeout 180
  ```

- **Process exit code:** `0`
- **Terminal event:** `run_end` with `status: "passed"`
- **Result codes:** `result_code: 100`, `reason_code: "success.complete"`
- **Observed final state:** `{"url":"https://example.com/","page_heading":"Example Domain"}`
- **Duration:** 17.6 s
- **Credits consumed:** 11.583825
- **Run ID:** `run-0` (Kane's per-session run label)
- **Kane session:** `00e3ccce-c1bd-430a-809e-523af04c88dc`
- **Kane Test Manager share URL:** recorded in `run.ndjson` (`run_end.test_url`)
- **Raw stdout:** `.data/proof/0-preflight/run.ndjson`
  (`sha256 ef6f528f3c7ec5d208314955735281d08fa69ddbfd2a6f639203d0c37b3b65fc`)
- **Raw stderr:** `.data/proof/0-preflight/run.stderr.log`
  (`sha256 74bd83b1ac40a8b088a0ac69bdc20f55b370e8209346a64599f0c634e407b70c`)
- **Evidence pack:** `.data/proof/0-preflight/3f481467-33f1-420d-ae37-ce48e35834a5.evidence`
  (`sha256 b614980d8db6673c99830fe6e28dfa4d83320c12ab5bfc1ea27b6b162bbfc872`,
  163 KB)
- **Caveat:** this proves the Kane toolchain and authentication work. It does
  not prove anything about the Kern demo store; that requires separate runs
  against `http://127.0.0.1:4173`.

`.data/` is gitignored by design. The hashes and paths above are the committed
record; the raw artifacts remain on the machine that produced them.
