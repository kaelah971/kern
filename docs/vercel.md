# Deploy the read-only proof site

Live: **https://kern-site-mocha.vercel.app**

## Why static

The app is read-only: it renders committed audit JSON. A Vercel Node function was
tried first and failed at runtime with `ERR_MODULE_NOT_FOUND` for
`/var/task/src/app/server.ts`, because the project uses `.ts`-extension ESM imports
that the function builder does not rewrite. Rather than add a bundling step under
deadline pressure, the site is exported to static HTML. Nothing is lost: there is no
write path in the deployed build.

## Build the export

```bash
npm run app:recorded        # KERN_PUBLIC=1 KERN_AUDIT_SOURCE=recorded on :3300
npm run export:static       # writes site/, 8 pages, ~230 KB
```

`KERN_AUDIT_SOURCE=recorded` forces the export to read `recorded/` instead of a
local `.data/`, so every page carries the recorded banner and the public site never
depends on the operator's machine.

## Deploy

```bash
cd site
vercel --prod               # project: kern-site
```

The repository root also keeps a `vercel.json` with `outputDirectory: site`, so
deploying the repo root produces the same static output.

## What is public and what is not

Public: `/`, `/audits`, `/audits/<id>`, `/audits/<id>/receipt`, `/repair/<id>`,
`/runs`. No run controls, no `/check/*` routes (404), no store.

Not deployed: the storefront, `.data/`, the live check, the tunnel.
