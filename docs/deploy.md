# Deploy Kern

Kern's public app is a Node web service; the demo store and the Kane worker stay
on the owner's PC. The store is never deployed.

The app is designed to run fine without the worker: the committed
`recorded/` audits remain the permanent proof, and the live panel shows
**engine offline**. Live runs only work when the worker is running on the PC.

## What the two processes do

- **Public app** (`npm run serve`, host `0.0.0.0:$PORT`) — serves the recorded
  proof, the three-cart check panel, the job API, and the live result pages.
- **Worker** (`npm run worker`, owner's PC) — heartbeats to the app, polls one
  job at a time, runs the existing Kane audit engine against
  `http://127.0.0.1:4173`, and posts the audit JSON back.
- **Store** (`npm start`, owner's PC) — stays on `127.0.0.1:4173`; never
  exposed and never deployed.

Job history lives in `.data/public` on the app host and is ephemeral. The two
committed audits in `recorded/` are the permanent exhibit; they are never
overwritten by the job store.

## 1. Preflight

```bash
npm test
npm run typecheck
git status
render blueprints validate render.yaml
```

The repo must be on a public GitHub repository for Render's Blueprint. The
GitHub CLI is authenticated as the owner account; create the public repository
once:

```bash
gh repo create kern --public --source=. --remote=origin --push
```

If a different repository name is used, update the Blueprint connection in the
Render dashboard; the service name can stay `kern`.

## 2. Create the Render web service

Use the Render CLI login (browser) or the dashboard:

```bash
render login
```

In the Render dashboard:

1. **New +** → **Blueprint**.
2. Select the public repository and the `render.yaml` at the root.
3. Name the service `kern`; plan **Free**; region **Oregon** (or nearest).
4. Set:
   - `WORKER_TOKEN` — a long random value. Generate one with
     `openssl rand -hex 32` (PowerShell:
     `[Convert]::ToHexString((1..32 | % { Get-Random -Max 256 }))`).
   - `PUBLIC_BASE_URL` — the final service URL, e.g.
     `https://kern-xxxx.onrender.com`.
   - `MAX_AUDITS_PER_HOUR=3`, `MAX_AUDITS_PER_DAY=20` are already in the
     Blueprint.
5. **Apply** / **Deploy**. Keep the previous deploy so you can roll back.

Equivalent Render API service creation (if you prefer the API): create a
web service from the repo with runtime `node`, build `npm ci`, start
`npm run serve`, health check `/health`, plan `free`, and the same env vars.

Verify:

```bash
curl -i https://<service>.onrender.com/health
curl -s https://<service>.onrender.com/api/engine/status
```

The first response must be `200` with `"ok":true`; the second must report
`"online":false` until the worker heartbeats.

## 3. Run the worker locally

Create `.env` from `.env.example` on the owner's PC. Never commit it.

```bash
cp .env.example .env
```

Set:

```dotenv
PUBLIC_BASE_URL=https://<service>.onrender.com
WORKER_TOKEN=<the same long token as Render>
MAX_AUDITS_PER_HOUR=3
MAX_AUDITS_PER_DAY=20
```

Start the store in one terminal:

```bash
npm start
# Kern demo store: http://127.0.0.1:4173
```

Start the worker in another:

```bash
npm run worker
```

The worker refuses to start if `http://127.0.0.1:4173/health` is not reachable,
and prints how to start the store. It heartbeats every 20 seconds, polls every
3 seconds, and keeps the free Render instance awake with a `/health` request
every 5 minutes. It prints one line per job:

```text
job <job-id> <scenario> <verdict> <credits> credits <seconds>s local audit .data/audits/<audit-id>
```

The raw Kane NDJSON and evidence stay under `.data/audits` on the PC. The public
app receives only the audit JSON, stored in `.data/public/jobs`.

## 4. Phone test on mobile data

1. Turn off Wi-Fi on the phone; use mobile data.
2. Open `https://<service>.onrender.com/`.
3. Confirm the **Check this store** panel says **Engine online** and shows a
   recent heartbeat.
4. Tap **Run this cart** on one cart only (the per-IP limit is 1 per 10 minutes).
5. Watch `queued` → `running` → `done`, then open the **X-Ray** and **receipt**.
6. Confirm the live result has **no** recorded-audit banner and the recorded
   proof below still does.

The first run may take a minute while Kane drives Chrome. Only the three fixed
scenarios are accepted; there is no free-text objective and no URL input.

## 5. Rate and offline behaviour

- Global: 3 accepted jobs per hour, 20 per day.
- Per visitor IP: 1 accepted job per 10 minutes.
- One running job at a time; queued jobs wait.
- Rejections are HTTP `429` with `Retry-After`, a `reason`, and a
  `retryAfterSeconds` body field; the panel shows both.
- If the latest worker heartbeat is older than 60 seconds, the panel says
  **Engine offline**, disables the run buttons, and `POST /api/audits` returns
  `503 engine_offline`. The recorded audits and all static pages keep working.
- If the worker stops mid-job, the 3-minute lease expires and the job becomes
  `expired`; the worker cannot post a result after expiry.

## 6. Rollback

The previous Render deploy is kept. To roll back:

1. Render dashboard → the `kern` service → **Deploys**.
2. Select the previous successful deploy → **Redeploy**.
3. Confirm `/health` and the recorded proof still load.

The worker can stay on the same PC. Job history on the rolled-back instance is
ephemeral and may disappear; the `recorded/` audits are permanent. No store or
contract change is involved.

If Render cannot serve the service after two attempts (build, health, or auth),
**stop**: ship the read-only app (the same app with the worker off). The
recorded proof, X-Ray, receipts, and repair view all work without the worker;
the check panel shows engine offline. Do not burn the deadline on
infrastructure.

## Quick-tunnel fallback (no cloud account)

If Render is not available, the same public app can run on the owner's PC behind
a Cloudflare quick tunnel:

```bash
winget install --id Cloudflare.cloudflared -e
npm run serve
cloudflared tunnel --url http://127.0.0.1:3000
```

Use the printed `https://<random>.trycloudflare.com` URL as `PUBLIC_BASE_URL`
for the worker. The tunnel and worker must stay running; the URL changes when
the tunnel restarts. This is a public site, not a stable production URL; the
Render Blueprint is the stable path.
