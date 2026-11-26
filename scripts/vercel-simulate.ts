import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Simulate Vercel's function layout:
 *   - copy the app source, contracts, docs and recorded/ to a temp dir,
 *   - run a request listener with cwd set to a different temp dir,
 *   - point KERN_RECORDED_ROOT at the copied recorded/ directory.
 *
 * The request handler is the same one api/index.ts exports. No server.listen
 * is used inside the app module; this script starts a local listener only to
 * exercise the handler.
 */
const sourceRoot = fileURLToPath(new URL('..', import.meta.url));
const appRoot = mkdtempSync(join(tmpdir(), 'kern-vercel-app-'));
const cwdRoot = mkdtempSync(join(tmpdir(), 'kern-vercel-cwd-'));

try {
  for (const name of ['src', 'contracts', 'docs', 'recorded', 'package.json']) {
    cpSync(join(sourceRoot, name), join(appRoot, name), { recursive: true });
  }

  const driver = String.raw`
import { createServer } from 'node:http';
import { createAppRequestHandler } from './src/app/server.ts';

const handler = createAppRequestHandler({ publicMode: true });
const server = createServer(handler);
await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolve);
});
const address = server.address();
const base = 'http://127.0.0.1:' + address.port;
const checks = [
  ['/', [/An ad makes a promise/, /Open the demo app/, /Read the README/, /Live checks run on the operator's machine/]],
  ['/campaign', [/Every ad makes a promise/, /Recorded audit: replay of real runs/, /See all 12 real runs/]],
  ['/runs', [/<strong>12<\/strong> runs/, /Live checks run on the operator's machine/]],
  ['/gate', [/Kern Gate/, /Patch gauntlet/, /Gate status/]],
  ['/audits/2026-11-22T00-53-05-669Z-f5230a', [/Journey X-Ray/, /Recorded audit: replay of real runs/]],
  ['/audits/2026-11-22T00-53-05-669Z-f5230a/receipt', [/Promise Receipt/, /Recorded audit: replay of real runs/]],
];
let failed = false;
for (const [path, patterns] of checks) {
  const response = await fetch(base + path);
  const text = await response.text();
  const ok = response.status === 200 && patterns.every((pattern) => pattern.test(text));
  console.log(path + ' ' + response.status + ' ' + (ok ? 'OK' : 'MISSING expected content'));
  if (!ok) failed = true;
}
await new Promise((resolve) => server.close(resolve));
process.exitCode = failed ? 1 : 0;
`;
  writeFileSync(join(appRoot, 'driver.mjs'), driver, 'utf8');

  const result = spawnSync(process.execPath, [join(appRoot, 'driver.mjs')], {
    cwd: cwdRoot,
    env: {
      ...process.env,
      KERN_RECORDED_ROOT: join(appRoot, 'recorded'),
      KERN_PUBLIC: '1',
    },
    encoding: 'utf8',
  });

  process.stdout.write(result.stdout ?? '');
  process.stderr.write(result.stderr ?? '');
  process.exitCode = result.status ?? 1;
} finally {
  rmSync(appRoot, { recursive: true, force: true });
  rmSync(cwdRoot, { recursive: true, force: true });
}
