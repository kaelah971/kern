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

## Aborted attempt — control-35 observe — 2026-11-22T00:49:56.521Z

This is recorded because it happened, not because it is evidence. It is **not**
counted as a run and was not used in any verdict.

- **Session:** `092205a4-a043-4fd9-888b-a5168ca02e2a`
- **Status:** `in_progress`, `runs: []`; no `run_end` was produced.
- **Cause:** the coding harness's 60-second command timeout killed the process
  tree during step 4 (the analyze step). The session events stop at
  `2026-11-22T00:50:42.635Z`.
- **Artifact:** only
  `.data/audits/2026-11-22T00-49-52-332Z-5b92df/control-35/observe.objective.txt`.
  No stdout NDJSON and no complete evidence pack.
- **Credits:** the balance was `127.779` before the attempt and `109.9357`
  immediately after the visible charge (`17.8433`). The final balance is
  `12.01` after the audit below. The audit's four live `run_end` events report
  `88.956199` credits, so the remaining `8.969501` is unitemized account usage,
  consistent with delayed posting from this aborted attempt. It is not
  attributed to any successful run and no precise per-run split is claimed.

## 2026-11-22T00:53:05.669Z — real audit `2026-11-22T00-53-05-669Z-f5230a` — BROKEN

- **Command:** `node scripts/kane-audit.ts --reuse-capture eligible-60`
- **Store:** `http://127.0.0.1:4173/` (local Node process)
- **Contract:** `kern-demo-free-shipping-v1` v1,
  `specSha256 032dbd00ff1f5c236f8c72be4aeba464bb181e71a7cffc138b22ef3e5a4323f4`
- **Audit JSON:** `.data/audits/2026-11-22T00-53-05-669Z-f5230a/audit.json`
- **Finished:** `2026-11-22T00:59:38.157Z`
- **Overall:** `BROKEN`
- **Runs:** 6 total — 4 live, 2 provided real captures. Every run used the
  unchanged objective hashes below; no fixture or contract was edited.
- **Credits reported by `run_end`:** live `88.956199`, provided captures
  `53.04284`, total `141.999039`. The provided captures were not re-run or
  re-charged in this audit. Balance `109.9357 → 12.01`;
  `97.9257` left the account, of which `88.956199` is itemized in the four live
  run events (the rest is the unitemized balance noted above).
- **Run ID note:** Kane reports `run_id: "run-0"` for every run because each
  run is its own session. The unique identifier is the `session_dir` basename,
  used below. Test Manager URLs are in `audit.json`.

### eligible-60 — BROKEN — provided real captures

Objective hashes: observe
`0a6c2a3c1736f019d6295906162e97dd958bed0552c48005b38c42b5da30c6ca`,
assert
`bac28a215bb8227a1548a5f16d56d169c1f382b6bf6647598a0597c69c15cd8d`.
These are byte-identical to the `bifurcation.flows[0]` recorded in the two
captures, so the provided runs are the same challenge the engine generates.

| Run | Kane session (unique ID) | Exit | Status | result_code / reason_code | Observed subtotal | Observed shipping | Evidence SHA-256 |
|---|---|---:|---|---|---|---|---|
| observe | `4def2d81-cc1e-450e-9ac6-72e61e6e22e3` | 0* | passed | 100 / `success.complete` | `$60.00` | `$9.00` | `946432f6e59d07c492e98e8a47975cbcb320043dcf5ef41a44637329483dad45` |
| assert | `29a8116c-55ae-4a6e-829a-89b12629780e` | 1* | failed | 740 / `assertion_error.confirmed_product_bug` | `$60.00` | `$9.00` | `b15a33b0838a447b261d53f05a47dfb185cdc831db6bf7b84a3c9b77c0b18e79` |

\* The NDJSON captures do not contain process exit codes. These are the values
reported with the captures and are labelled `provided_capture_user_reported`
in `audit.json`. The observe `run_end` is passed and the assert `run_end` is
failed; those facts are in the artifacts.

Oracle expected `0` cents, Kane observed `900` cents. Assert verdict:
`confirmed: true`, `application_issue` / `ui_data_defect` / `major`,
bug title “Eligible $60 cart is charged standard shipping”. Status: **BROKEN**.

### boundary-50 — BROKEN — live

Objective hashes: observe
`943d13847c0f4a99968878343425e5852a45869a947c305514213d03ff5d8b8a`,
assert
`d6fd99ab4c6fc021b68fe9a1ff21b9898df2a39e5bb78a9e043dd700751fe57e`.

| Run | Kane session (unique ID) | Exit | Status | result_code / reason_code | Observed subtotal | Observed shipping | Evidence SHA-256 |
|---|---|---:|---|---|---|---|---|
| observe | `d32b9e35-ad8e-4ec1-816e-cc086a2fda18` | 0 | passed | 100 / `success.complete` | `$50.00` | `$9.00` | `72054121ca02113291b6f476457911631f7a9d0f2e483e0541aa5e1097654298` |
| assert | `fdfab30d-2f96-42cd-a09c-aa6fab6b50c6` | 1 | failed | 740 / `assertion_error.confirmed_product_bug` | `$50.00` | `$9.00` | `4f4b4322a01875f2fd99cb2bb7acfbb44ae298426db44c4563691542e6aa2521` |

Observe duration 56.2 s / 21.1999525 credits; assert duration 72.7 s /
24.063415 credits. Oracle expected `0` cents, Kane observed `900` cents. Assert
verdict: `confirmed: true`, `application_issue` / `ui_data_defect` / `major`,
bug title “$50.00 boundary cart is charged standard shipping”. Status:
**BROKEN**. The assert suggestion explicitly calls for a boundary check at
exactly `$50.00`.

### control-35 — HONORED — live

Objective hashes: observe
`75a02fea8548d919e523f3957e5e3a2f218b6514189f83beb4fcae5333827e75`,
assert
`73cea5ea958c75e2b41fd2904aaec7a50f9d26b6d883a06318d241cd6f5d73e0`.

| Run | Kane session (unique ID) | Exit | Status | result_code / reason_code | Observed subtotal | Observed shipping | Evidence SHA-256 |
|---|---|---:|---|---|---|---|---|
| observe | `8007dfd7-cd09-47db-a13b-b6a7d9ebf25e` | 0 | passed | 100 / `success.complete` | `$35.00` | `$9.00` | `c06d3eaf2a8284c21457114949916659e8a45fc1a033ac5c50dc58a4dc537c48` |
| assert | `53274d6d-57ac-41a3-90bb-f0ab28323308` | 0 | passed | 100 / `success.complete` | `$35.00` | `$9.00` | `d1d07f40f03a0358d78f046cc69ead92cf967baba780f9a8b4f4bfae29f76866` |

Observe duration 46.6 s / 15.8709015 credits; assert duration 74.6 s /
27.82193 credits. Oracle expected `900` cents, Kane observed `900` cents;
the assert run has no verdict because it passed. Status: **HONORED**.

### What this audit proves — and does not

- Proven: the rendered checkout charged `$9.00` for the `$60.00` and exact
  `$50.00` carts, while the contract says `$0.00`; the `$35.00` control was
  charged `$9.00`, matching the policy baseline.
- Proven: Kane's assert run returned a confirmed product-bug verdict for both
  broken carts, and exited 0 for the control.
- Not proven by this pre-repair audit alone: that all shipping is correct, that
  any other promise type works, or that a repair will pass. The repair was
  subsequently attempted and verified in the post-repair audit below.

## 2026-11-23T12:23:27.440Z — credit check — control-35 observe — PASSED

- **Audit:** `2026-11-23T12-23-27-440Z-e4d0ad`
- **Session:** `560a3f63-af35-4426-a236-ca3108b8301a` (`run-0`)
- **Exit:** 0; `run_end` passed; `result_code 100`; `reason_code success.complete`
- **Observed:** subtotal `$35.00`, shipping `$9.00`
- **Credits:** 20.766805
- **Status:** INCONCLUSIVE by design (`--kind observe`, no assert run)
- **Evidence SHA-256:** `a1498c65f7f94b7248e9438262940f48993fd052fccb88751b3344206cd2708c`
  (618630 bytes)
- **Files:** `.data/proof/1-credit-check/`
- **Balance:** `5012.01 → 4988.1726` (reported 20.766805; the delta is 23.8374,
  with 3.070595 unitemized account usage).

This only proves authentication and credit availability. It is not a verdict.

## 2026-11-23T12:27:07.978Z — live eligible-60 — BROKEN

This replaces the user-provided eligible-60 captures in audit
`2026-11-22T00-53-05-669Z-f5230a` with a live run. Audit A is preserved
unedited; only its eligible-60 evidence is superseded, because A's exit codes
were user-reported while these are process-observed. The objective hashes are
identical, so the challenge did not change.

- **Audit:** `2026-11-23T12-27-07-978Z-a0c39f`
- **Store:** pre-repair `main` (`subtotalCents >= 5000 * 100` still present)

| Run | Kane session (unique ID) | Exit | Status | result_code / reason_code | Observed subtotal | Observed shipping | Evidence SHA-256 |
|---|---|---:|---|---|---|---|---|
| observe | `d710ff14-8f08-4a93-994f-3339d0130dfb` | 0 | passed | 100 / `success.complete` | `$60.00` | `$9.00` | `ca9ac2bb4104835668f31c223117a673f18b866329df9424e7ef62765aa79ab2` |
| assert | `1ad1adeb-2294-4ed4-9d3e-bdddb12b1c60` | 1 | failed | 740 / `assertion_error.confirmed_product_bug` | `$60.00` | `$9.00` | `f918dbaee85cb42254c55a7a7bc481d17e238eeac853c5fc3e8917241811965b` |

Observe 19.8454575 credits; assert 28.725905 credits. Assert verdict:
`confirmed: true`, `application_issue` / `ui_data_defect` / `major`, bug title
“Eligible $60 cart is charged standard shipping”. Status: **BROKEN**.

- **Objective hashes:** observe
  `0a6c2a3c1736f019d6295906162e97dd958bed0552c48005b38c42b5da30c6ca`,
  assert
  `bac28a215bb8227a1548a5f16d56d169c1f382b6bf6647598a0597c69c15cd8d`
  — identical to audit A's eligible-60 hashes.
- **Balance:** `4988.1726 → 4934.1572` (reported 48.5713625; the delta is
  54.0154, with 5.4440375 unitemized account usage).

## 2026-11-23T12:35:29.692Z — post-repair full audit `2026-11-23T12-35-29-692Z-48b993` — HONORED

- **Branch:** `repair/free-shipping-threshold` (merged after this audit was written)
- **Command:** `node scripts/kane-audit.ts`
- **Post-repair binding:** `postRepair: true`; `answersAuditId:
  2026-11-22T00-53-05-669Z-f5230a`; `objectiveHashesMatch: true`
- **Objective hashes:** all six match the pre-repair audit exactly:

| Scenario | Observe SHA-256 | Assert SHA-256 |
|---|---|---|
| eligible-60 | `0a6c2a3c1736f019d6295906162e97dd958bed0552c48005b38c42b5da30c6ca` | `bac28a215bb8227a1548a5f16d56d169c1f382b6bf6647598a0597c69c15cd8d` |
| boundary-50 | `943d13847c0f4a99968878343425e5852a45869a947c305514213d03ff5d8b8a` | `d6fd99ab4c6fc021b68fe9a1ff21b9898df2a39e5bb78a9e043dd700751fe57e` |
| control-35 | `75a02fea8548d919e523f3957e5e3a2f218b6514189f83beb4fcae5333827e75` | `73cea5ea958c75e2b41fd2904aaec7a50f9d26b6d883a06318d241cd6f5d73e0` |

- **Audit JSON SHA-256:** `6d9a2c1ddc078166fe32dbdf1b975ebba59a6598bca3bfaf8e7f2a037eec1eb6`
- **Overall:** `HONORED`; every assert exited 0; every evidence pack is present.

| Scenario | Run | Kane session (unique ID) | Exit | Status | result_code / reason_code | Observed subtotal | Observed shipping | Evidence SHA-256 |
|---|---|---|---:|---|---|---|---|---|
| eligible-60 | observe | `4fba85ca-5869-4cad-bd2e-8c645f387dc0` | 0 | passed | 100 / `success.complete` | `$60.00` | `$0.00` | `bde433436c39421b1d01838ad21f858dc72589aec6c3ea91fcd9d6a6bf60c389` |
| eligible-60 | assert | `0c633a16-2427-46de-9bfd-b2be5064e58b` | 0 | passed | 100 / `success.complete` | `$60.00` | `$0.00` | `f8baf0603adaaf2596815e49469b07f61a815982a1ac1b516fbd3f7d4fa81208` |
| boundary-50 | observe | `2909272c-7928-4d51-91cb-1d447165165c` | 0 | passed | 100 / `success.complete` | `$50.00` | `$0.00` | `a5a2bd1251b9f7bffa4bab035416f42b606178fd730cb826fb095e2c37e97f85` |
| boundary-50 | assert | `78ef2183-27a1-4507-a978-f253bd1982be` | 0 | passed | 100 / `success.complete` | `$50.00` | `$0.00` | `855ecaa4ef3a222a85a21544226bde94b8abb6c4b0605838f810f509507ca086` |
| control-35 | observe | `244490ef-7e66-4b45-ad54-b62679e2c7c2` | 0 | passed | 100 / `success.complete` | `$35.00` | `$9.00` | `705e4eeeb5a87340f0129c7b373a10df2076906f1d3a6ce89c70b608b516d889` |
| control-35 | assert | `dd3a1c81-45a5-4f6c-89e3-a87001ab3215` | 0 | passed | 100 / `success.complete` | `$35.00` | `$9.00` | `cce42f1ad08af2f5256a2e84e5b988d764004e98c0f7df53d37b38bb4ace42aa` |

Credits by run: 16.24779, 8.71752, 21.5310425, 26.09917, 9.9782025,
34.5637425. Total reported: **117.137467**.

**Evidence note:** the control-35 observe run wrote `final_state` keys
`merchandise_subtotal` and `shipping` rather than `observed_subtotal` and
`observed_shipping`. The parser read the objective's named `observed_*` memory
values from the same run, which were `$35.00` / `$9.00`. The raw NDJSON and the
copied evidence pack are preserved; no value was substituted.

**Balance:** `4934.1572 → 4796.8299` (reported 117.137467; the delta is
137.3273, with 20.189833 unitemized account usage).

### Spend for this slice

| Phase | Reported credits | Balance delta |
|---|---:|---:|
| Credit check (control observe) | 20.766805 | 23.8374 |
| Live eligible-60 (observe + assert) | 48.5713625 | 54.0154 |
| Post-repair full audit (6 runs) | 117.137467 | 137.3273 |
| **Total** | **186.4756345** | **215.1801** |

- Start balance: **5012.01**
- Remaining balance: **4796.8299**
- Unitemized account usage: **28.7044655** (balance deltas minus reported
  `run_end` credits; not attributed to a specific successful run).

The pre-repair audit A remains preserved and unedited. The live eligible-60
audit B supersedes only A's borrowed eligible-60 evidence. The post-repair
audit C answers A and carries all six identical objective hashes.


