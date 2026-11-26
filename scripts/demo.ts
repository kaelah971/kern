/**
 * One-command judge path: the recorded proof app and the real repaired demo
 * store, opened in the browser. This does not run Kane and does not need a Kane
 * account.
 *
 * The app is intentionally not in publicMode: the local Storefront link points
 * at the store on 4173, and the recorded banner remains visible. KERN_LIVE is
 * off so clicking around cannot start a paid Kane run.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const children: ChildProcess[] = [];
let shuttingDown = false;

function shutdown(): void {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) child.kill('SIGTERM');
  }
  setTimeout(() => {
    for (const child of children) {
      if (!child.killed) child.kill('SIGKILL');
    }
    process.exit(0);
  }, 1200);
}

function start(name: string, script: string, port: number, extraEnv: NodeJS.ProcessEnv = {}): ChildProcess {
  const child = spawn(process.execPath, [join(ROOT, script)], {
    cwd: ROOT,
    stdio: 'inherit',
    env: {
      ...process.env,
      ...extraEnv,
      PORT: String(port),
      KERN_PUBLIC: '0',
      KERN_LIVE: '0',
      KERN_AUDIT_SOURCE: 'recorded',
    },
    windowsHide: true,
  });
  children.push(child);
  child.once('error', (error) => {
    console.error(`[demo] ${name} failed to start: ${error.message}`);
    shutdown();
  });
  child.once('exit', (code, signal) => {
    if (shuttingDown) return;
    console.error(
      `[demo] ${name} exited (${signal ?? code ?? 'unknown'}); stopping the demo.`,
    );
    shutdown();
  });
  return child;
}

function openUrl(url: string): void {
  const command =
    process.platform === 'win32'
      ? 'cmd.exe'
      : process.platform === 'darwin'
        ? 'open'
        : 'xdg-open';
  const args =
    process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
  try {
    const opener = spawn(command, args, {
      stdio: 'ignore',
      windowsHide: true,
      detached: true,
    });
    opener.unref();
  } catch (error) {
    console.error(`[demo] could not open ${url}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

console.log('Kern demo');
console.log('  App:   http://127.0.0.1:3000  (recorded audits)');
console.log('  Store: http://127.0.0.1:4173  (repaired store)');
console.log('Press Ctrl+C to stop both. No Kane runs are started.');

start('app', 'src/app/server.ts', 3000, { KERN_PUBLIC: '0', KERN_LIVE: '0', KERN_AUDIT_SOURCE: 'recorded' });
start('store', 'src/server.ts', 4173);

setTimeout(() => {
  if (shuttingDown) return;
  openUrl('http://127.0.0.1:3000');
  openUrl('http://127.0.0.1:4173');
}, 1500).unref();

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
