# Screenshots

These are real captures of the running Kern app on **2026-11-23**, taken with
headless Chrome against `http://127.0.0.1:3000/` with the live `.data/audits`
records. They are not mockups, not edits, and contain no customer data — the app
has no customers, orders or payment data.

The app was started with:

```bash
npm run app
```

```bash
"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new \
  --disable-gpu --hide-scrollbars --window-size=1440,1600 \
  --screenshot="C:\dev\kern\docs\screenshots\01-campaign.png" \
  "http://127.0.0.1:3000/"

"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new \
  --disable-gpu --hide-scrollbars --window-size=1440,2200 \
  --screenshot="C:\dev\kern\docs\screenshots\02-journey-x-ray.png" \
  "http://127.0.0.1:3000/audits/2026-11-22T00-53-05-669Z-f5230a"

"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new \
  --disable-gpu --hide-scrollbars --window-size=1440,1800 \
  --screenshot="C:\dev\kern\docs\screenshots\03-closed-loop.png" \
  "http://127.0.0.1:3000/repair/2026-11-22T00-53-05-669Z-f5230a"

"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new \
  --disable-gpu --hide-scrollbars --window-size=1440,2000 \
  --screenshot="C:\dev\kern\docs\screenshots\04-receipt.png" \
  "http://127.0.0.1:3000/audits/2026-11-23T12-35-29-692Z-48b993/receipt"
```

Chrome clamps `--window-size` below roughly 500px, so a direct 390px command
renders a clipped desktop layout. The mobile shot therefore uses the committed
DevTools Protocol helper, which sets the device metrics to a real 390×1400
viewport:

```bash
node scripts/capture-mobile-screenshot.ts
```

| File | Dimensions | Bytes | Page |
|---|---|---:|---|
| `01-campaign.png` | 1440×1600 | 244,960 | `/` |
| `02-journey-x-ray.png` | 1440×2200 | 322,006 | `/audits/2026-11-22T00-53-05-669Z-f5230a` |
| `03-closed-loop.png` | 1440×1800 | 312,061 | `/repair/2026-11-22T00-53-05-669Z-f5230a` |
| `04-receipt.png` | 1440×2000 | 224,375 | `/audits/2026-11-23T12-35-29-692Z-48b993/receipt` |
| `05-mobile.png` | 390×1400 | 140,427 | `/` |

All five are under 400 KB. No image was upscaled or edited.

`02-journey-x-ray.png` and `03-closed-loop.png` were recaptured after the
presentation fix: command blocks and the diff now wrap, and the objective-hash
table shows the first 12 hex characters with the full value in a `title`
attribute and the complete hashes in `audit.json`. `04-receipt.png` was not
recaptured because the receipt has no `kane-cli evidence serve` command block;
its evidence hashes already wrap inside the table.

These shots show the recording machine's **live** `.data` records, so the
recorded-audit banner is absent. A public clone has no `.data` and reads
`recorded/`; it shows the banner “Recorded audit: replay of real runs, not a live
session.” The screenshot layout is the same; the banner is the only intentional
difference.
