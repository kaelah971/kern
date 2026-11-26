# Deploy the proof site and demo storefront

Live: **https://tryoutkern.vercel.app**

## Why static

The app is read-only: it renders committed audit JSON. A Vercel Node function was
tried first and failed at runtime with `ERR_MODULE_NOT_FOUND` for
`/var/task/src/app/server.ts`, because the project uses `.ts`-extension ESM imports
that the function builder does not rewrite. Rather than add a bundling step under
deadline pressure, the site is exported to static HTML. Nothing is lost: there is no
write path in the deployed build.

## Build the export

```bash
npm run app:recorded        # public recorded app on :3300
npm run export:static       # writes site/: 10 proof pages + 4 current + 3 pre-repair pages
```

`KERN_AUDIT_SOURCE=recorded` forces the export to read `recorded/` instead of a
local `.data/`, so every proof page carries the recorded banner and the public site
never depends on the operator's machine. The store pages are static fixtures with
the recorded "What Kern saw" strip.

## Deploy

```bash
cd site
vercel --prod               # project: kern-site
```

The repository root also keeps a `vercel.json` with `outputDirectory: site`, so
deploying the repo root produces the same static output.

## What is public and what is not

Public: `/` (landing), `/campaign` (demo app), `/gate`, `/audits`, `/audits/<id>`, `/audits/<id>/receipt`,
`/repair/<id>`, `/runs`, `/store/`, `/store/eligible-60`,
`/store/boundary-50`, `/store/control-35`, and the labelled pre-repair pages
under `/store/before/<cart>`. No run controls, no `/check/*` routes (404), no
POST forms in the store export.

Not deployed: the live store server on 4173, `.data/`, the live check, the tunnel.
