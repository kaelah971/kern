# Deploy the read-only proof site to Vercel

This deployment is read-only. There is no queue, worker, store connection or
live-check control. It serves the committed `recorded/` audits, the runs table,
the X-Ray and the receipts. The demo store stays local and is never deployed.

The entry point is [`api/index.ts`](../api/index.ts): it exports the existing
`node:http` request handler as Vercel's default function handler and does **not**
call `server.listen()`.

## Import and deploy

1. Push this repository to GitHub:
   `https://github.com/<your-username>/kern`.
2. In Vercel: **Add New… → Project → Import Git Repository**, choose `kern`.
3. Framework Preset: **Other**.
4. Root Directory: `./`.
5. Build Command: leave the default (Vercel detects `api/index.ts`).
6. Output Directory: leave empty.
7. **Environment Variables: none.** The deployment is read-only and the
   function passes `publicMode: true` itself.
8. **Deploy.**

Pushing to `main` redeploys automatically.

After the first deploy, check:

```bash
curl -i https://<project>.vercel.app/health
# 200, {"ok":true,...}

# Open:
https://<project>.vercel.app/
https://<project>.vercel.app/runs
```

`/runs` must show the two committed audits:

- `2026-11-22T00-53-05-669Z-f5230a` — pre-repair, BROKEN
- `2026-11-23T12-35-29-692Z-48b993` — post-repair, HONORED, answers the first

On the deployed copy those two audits contribute **12 runs · 259.14 credits ·
2 broken / 4 honored**. The page shows the recorded-audit banner:

> Recorded audit: replay of real runs, not a live session.

The same read-only line appears on the campaign page (`/`):

> Live checks run on the operator's machine. The runs below are real
> executions; this deployment only reads them.

There are no disabled run buttons pretending to work.

## What is bundled

`vercel.json` includes the files the function reads at runtime:

```json
"includeFiles": [
  "recorded/**",
  "contracts/**",
  "docs/store-policy.md"
]
```

`recorded/` is the permanent exhibit. `contracts/` is the frozen promise.
`docs/store-policy.md` is the separate $9.00 policy source shown on the
campaign page. The health route is rewritten to the same function.

## Audit root resolution

`src/app/audits.ts` does not depend on `process.cwd()` alone:

1. `KERN_RECORDED_ROOT`, if set and present.
2. the repository-relative path from the module
   (`src/app/audits.ts` → `../../recorded`).
3. `process.cwd()/recorded`.

Vercel executes from `/var/task`; the module-relative step and the function
bundle make `recorded/` available there. The local simulation below exercises
the same handler with the cwd moved elsewhere and `KERN_RECORDED_ROOT` set.

## Local simulation (recorded result)

```bash
npm run verify:vercel
```

This copies `src/`, `contracts/`, `docs/`, `recorded/` and `package.json` to a
temp app directory, runs the same request handler from a **different** cwd with
`KERN_RECORDED_ROOT` pointing at the copied `recorded/`, and fetches the four
pages:

```text
/ 200 OK
/runs 200 OK
/audits/2026-11-22T00-53-05-669Z-f5230a 200 OK
/audits/2026-11-22T00-53-05-669Z-f5230a/receipt 200 OK
```

The checks assert:

- `/` contains “See all 12 real runs”, the recorded banner and the read-only line.
- `/runs` contains `<strong>12</strong> runs` and the read-only line.
- the X-Ray and receipt render with the recorded banner.

The actual local app with `.data/audits` has the full set: **15 runs · 328.47
credits · 3 broken / 4 honored**. The deployed read-only copy has 12 because
only the two canonical audits are committed in `recorded/`. The hero link and
totals are computed from the audits present, so they read 15 locally and 12 on
Vercel. No rows are invented.

## Read-only behaviour

- The Vercel function passes `publicMode: true`.
- The operator-only live check is gated by `KERN_LIVE=1`; it is off here, and
  `publicMode` disables it even if the variable were present. `/check`,
  `/check/run` and `/check/status` return 404 on the deployed site.
- The Storefront nav link is removed.
- `/` and `/runs` show the operator-machine line. `/runs` shows it above the
  runs table.
- There are no run controls, no job API, no worker and no live state.
- The local app (`npm run app`) keeps the existing pages and Storefront link.
  `KERN_PUBLIC=1 npm run app` applies the read-only presentation locally.
  `KERN_LIVE=1 npm run app` adds the operator-only check panel and console.

## Rollback

Vercel keeps every deployment. To roll back, open the project → **Deployments**
→ choose the previous successful deployment → **Promote to Production**. This
is a read-only site; no store, contract or recorded audit is affected.
