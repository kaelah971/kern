# Publish Kern

This is a checklist and draft copy. Nothing here has been posted.

## 1. Preflight

```bash
npm test
git status
git ls-files .data .testmuai
git ls-files recorded
```

- `npm test` must be green (61 tests at the time of writing; the replay
  characterization is excluded and runs via `npm run demo:replay-pre-repair`).
- `git status` must be clean.
- `git ls-files .data .testmuai` must print nothing.
- `git ls-files recorded` must list the two `audit.json` files and the README.
- `LICENSE` is MIT.
- The app works without a Kane account because `recorded/` is committed.

## 2. Secret scan (result of the current tree and history)

No `.env`, access key, Kane token, private key or password was found in tracked
files. The only credential-like match is the generic `username/password` phrase
in `docs/trd.md` (an SSRF policy sentence).

There is one **privacy** finding, not a credential: four committed test fixtures
contain the recording machine's home path `C:\Users\emman` and Kane session
paths:

- `tests/fixtures/audits/broken-audit.json`
- `tests/fixtures/audits/honored-audit.json`
- `tests/fixtures/kane/assert-eligible-60.ndjson`
- `tests/fixtures/kane/observe-eligible-60.ndjson`

They were committed in `ed3dbaf` and `8677948`. History has not been rewritten.
The public evidence copies in `recorded/` are sanitized: no home paths, no
`test_url`, no `session_dir`, no `rawRunEnd`, no `argv`, no evidence paths. The
recorded copies keep the session IDs, objective/evidence SHA-256 values and
Kane verdicts.

If the recording username must not appear in the public repository, sanitize
those four test fixtures in a **new commit** (and update the tests that use
their `sessionDir` fields), or keep the fixtures out of the public tree. Do not
rewrite history. The recorded audits are already safe to publish.

Useful scan commands:

```bash
git grep -n -I 'emman' -- .
git log --all --oneline -G 'Users.{0,4}emman' -- .
git grep -n -I -E '(access[_-]?key|accessKey|client_secret|password|AKIA|BEGIN [A-Z ]*PRIVATE KEY)' -- .
git ls-files | grep -Ei '(^|/)\.env|\.testmuai|^\.data/'
```

## 3. Create the public repository

With the GitHub CLI:

```bash
gh repo create kern --public --source=. --remote=origin --push
```

Without `gh`:

```bash
git remote add origin git@github.com:<your-github-user>/kern.git
git branch -M main
git push -u origin main
```

If `origin` already exists:

```bash
git remote set-url origin git@github.com:<your-github-user>/kern.git
git push -u origin main
```

After the push, verify the public clone:

```bash
git ls-remote --heads origin
```

Open the GitHub repository page and confirm:

- `recorded/2026-11-22T00-53-05-669Z-f5230a/audit.json` is present.
- `recorded/2026-11-23T12-35-29-692Z-48b993/audit.json` is present.
- `.data/` is absent.
- The README renders the proof table and the five-minute path.

## 4. Post 1 — build story

> **I built Kern: a verifier for the promise an ad makes at checkout**
>
> A demo store advertised free standard shipping over $50. A $60 cart was
> charged $9. Kane's observe run read the rendered $60.00 subtotal and $9.00
> shipping. A separate live $60 audit
> (`2026-11-23T12-27-07-978Z-a0c39f`) repeated it, and its assert run expected
> $0.00 and returned a confirmed product-bug verdict
> (`result_code 740`, `assertion_error.confirmed_product_bug`).
>
> The full pre-repair audit
> (`2026-11-22T00-53-05-669Z-f5230a`) is BROKEN: $60.00 → $9.00, exact $50.00 →
> $9.00, both against a $0.00 promise; the $35.00 control paid $9.00, correctly.
> (The $60 row in that full audit is a provided real capture; the separate live
> $60 audit above repeats it. The $50 and $35 rows are live.)
>
> The repair was one line: remove a `* 100` that compared cents to dollars.
>
> I reran the same six objectives unchanged. The post-repair audit
> (`2026-11-23T12-35-29-692Z-48b993`) is HONORED: $60.00 → $0.00, $50.00 →
> $0.00, $35.00 → $9.00. All six objective SHA-256 values match the pre-repair
> audit; every assert exited 0.
>
> The app replays recorded copies of the two audits, so you can inspect the
> X-Ray, the diff and the receipt without a Kane account:
> [repo link]
>
> Limits: one demo store, one promise type, USD/US; evidence is hash-linked,
> not signed; verified for the tested conditions, not certified.

## 5. Post 2 — the control cart

> **The $35 control is the cart that keeps a free-shipping fix honest**
>
> A lazy fix makes all shipping free. That passes the $60 eligible cart and
> fails the control: the $35 cart is below the $50 threshold and must keep
> paying $9.
>
> In the pre-repair audit the $35 cart paid $9 correctly, while the live exact
> $50 boundary paid $9 against a $0 promise. (The $60 row is a provided real
> capture; a live $60 run repeats it.) After the repair, the unchanged six-run
> rerun shows $60/$50 → $0 and $35 → $9. The six objective hashes are identical,
> so the challenge did not move.
>
> The exact $50 boundary is the other guard: a fix that only frees $60 and up
> would pass the original $60 test and fail there.
>
> Receipt language: verified for the tested conditions at the recorded time.
> Not certified, not signed — hash-linked.
>
> [repo link]

Do not post either draft until the repository URL is live and the public clone
has been checked.
