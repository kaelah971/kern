/**
 * Exports the read-only app to static HTML under site/.
 *
 * Why: Vercel's Node function runtime cannot resolve this project's
 * `.ts`-extension ESM imports without a bundling step, and the deployed function
 * crashed with ERR_MODULE_NOT_FOUND. The app is read-only, so a static export is
 * both sufficient and more reliable.
 *
 * Run against a local server started with KERN_PUBLIC=1 and
 * KERN_RECORDED_ROOT=recorded, so every page carries the recorded banner:
 *
 *   KERN_PUBLIC=1 KERN_RECORDED_ROOT=recorded PORT=3300 npm run app
 *   npm run export:static
 *
 * The storefront is written afterwards by scripts/export-store.ts; its fixed
 * cart pages are not fetched from the app.
 */
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const ORIGIN = process.argv[2] ?? 'http://127.0.0.1:3300';
const OUT = join(process.cwd(), 'site');
const MAX_PAGES = 40;

function fileFor(path: string): string {
  if (path === '/') return 'index.html';
  return `${path.replace(/^\//, '')}.html`;
}

function linksIn(html: string): string[] {
  const found = new Set<string>();
  for (const match of html.matchAll(/href="(\/[^"#?]*)"/g)) {
    const path = match[1];
    if (path.startsWith('/check')) continue;
    if (path.startsWith('/health')) continue;
    if (path.startsWith('/store')) continue;
    found.add(path.replace(/\/$/, '') || '/');
  }
  return [...found];
}

function resetOutput(): void {
  mkdirSync(OUT, { recursive: true });
  for (const entry of readdirSync(OUT)) {
    if (entry === '.vercel' || entry === 'vercel.json' || entry === '.gitignore') continue;
    rmSync(join(OUT, entry), { recursive: true, force: true });
  }
}

async function main(): Promise<void> {
  resetOutput();
  const queue = ['/', '/runs', '/audits'];
  const seen = new Set<string>();
  const written: string[] = [];

  while (queue.length > 0 && seen.size < MAX_PAGES) {
    const path = queue.shift() as string;
    if (seen.has(path)) continue;
    seen.add(path);

    const response = await fetch(`${ORIGIN}${path}`);
    if (!response.ok) {
      throw new Error(`${path} returned ${response.status}`);
    }
    const html = await response.text();
    const target = join(OUT, fileFor(path));
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, html, 'utf8');
    written.push(path);

    for (const link of linksIn(html)) {
      if (!seen.has(link)) queue.push(link);
    }
  }

  console.log(`exported ${written.length} pages to site/`);
  for (const path of written) console.log(`  ${path} -> site/${fileFor(path)}`);
}

await main();
