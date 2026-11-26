# Publish Kern

This is a checklist and draft copy. Nothing here has been posted.

## 1. Preflight

```bash
npm test
git status
git ls-files .data .testmuai
git ls-files recorded
```

- `npm test` must be green (currently **89 tests**; the replay
  characterization is excluded and runs via `npm run demo:replay-pre-repair`).
- `git status` must be clean.
- `git ls-files .data .testmuai` must print nothing.
- `git ls-files recorded` must list the two `audit.json` files and the README.
- `LICENSE` is MIT.
- The app works without a Kane account because `recorded/` is committed.

## 1b. Clean-clone verification (2026-11-23)

Run from `C:\dev\kern` at commit `515e6cf` (before the fixture sanitation,
static export, storefront and operator check; the recorded fallback is
unchanged in substance). The current suite is **89/89**.

```bash
git clone . ../kern-clone-verify
cd ../kern-clone-verify
npm ci
npm test
PORT=3100 npm run app
```

Result:

- `.data` absent in the clone.
- This historical clone predates the static storefront and operator check. The current suite is **89 tests, 89 pass, 0 fail**.
- `GET /health`: `{"ok":true,"app":"kern","auditRoot":"C:\\dev\\kern-clone-verify\\recorded","auditSource":"recorded"}`.
- `/` 200 with the recorded banner; `/audits` 200 with the banner and exactly
  the two canonical audit IDs.
- Both detail pages and both receipts returned 200 with the banner.
- The BROKEN receipt says BROKEN and does not use the verified phrase; the
  HONORED receipt uses “Verified for the tested conditions at the recorded time”
  and names the pre-repair audit.
- `/repair/2026-11-22T00-53-05-669Z-f5230a` 200 with the banner, the `* 100`
  diff, `MATCH`, and the post-repair audit.
- App log clean: no stack trace, no ENOENT or missing-file request.
- The clone was deleted; it is not committed.

## 2. Secret scan (current tree and history)

No `.env`, access key, Kane token, private key or password was found in tracked
files. The only credential-like match is the generic `username/password` phrase
in `docs/trd.md` (an SSRF policy sentence).

There is one **privacy history** finding, not a credential: four test fixtures
were committed in `ed3dbaf` and `8677948` with the recording machine's home
directory and Kane session paths. The current tree is clean: those fixtures now
use the placeholders `C:\Users\<user>` and `<session-dir>`, and the public
evidence copies in `recorded/` were already sanitized. The literal paths remain
in those earlier commits; history was not rewritten.

The public `recorded/` copies contain no home paths, no `test_url`, no
`session_dir`, no `rawRunEnd`, no `argv` and no evidence paths. They keep the
session IDs, objective/evidence SHA-256 values and Kane verdicts.

Useful scan commands:

```bash
git grep -n -I -E 'Users[\/][^"<]' -- .
git log --all --oneline -- tests/fixtures
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

The public proof site is **https://kern-site-mocha.vercel.app**, the gate is
**https://kern-site-mocha.vercel.app/gate**, and the storefront is
**https://kern-site-mocha.vercel.app/store/**. The operator-only
live check is local; the public site returns 404 for `/check/*`.

For the submission “about” field: the coding agent was **Pi** (terminal-driven),
Kane CLI did the real browser observation and assertion runs, and the deterministic
oracle decided the verdict. The repair was not an in-app autonomous repair. Kern
now also has a local contract compiler, a preview-aware gate CLI, a six-patch
gauntlet, a Claude Code Stop-hook adapter, and a gate-aware receipt.

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
> X-Ray, the agent gate, the diff and the receipt without a Kane account. The
> public storefront is a static export of the same fixture at
> https://kern-site-mocha.vercel.app/store/ (current) and
> https://kern-site-mocha.vercel.app/store/before/eligible-60 (the audited
> revision): [repo link]
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
