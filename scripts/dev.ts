/**
 * Start the demo store (4173) and the audit app (3000) together.
 * Ctrl+C stops both; an unexpected exit of either stops the other.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const children: ChildProcess[] = [];
let shuttingDown = false;
let exitCode = 0;

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
    process.exit(exitCode);
  }, 1500);
}

function start(name: string, script: string, port: number): void {
  const child = spawn(process.execPath, [join(ROOT, script)], {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, PORT: String(port) },
    windowsHide: true,
  });
  children.push(child);

  child.once('error', (error) => {
    console.error(`[dev] ${name} failed to start: ${error.message}`);
    exitCode = 1;
    shutdown();
  });

  child.once('exit', (code, signal) => {
    if (shuttingDown) return;
    console.error(
      `[dev] ${name} exited unexpectedly (${signal ?? (code === null ? 'unknown' : String(code))}); stopping the other process.`,
    );
    exitCode = code ?? 1;
    shutdown();
  });
}

console.log('Kern dev');
console.log('  Store: http://127.0.0.1:4173');
console.log('  App:   http://127.0.0.1:3000');
console.log('Press Ctrl+C to stop both.');

start('store', 'src/server.ts', 4173);
start('app', 'src/app/server.ts', 3000);

process.once('SIGINT', () => shutdown());
process.once('SIGTERM', () => shutdown());
