/**
 * Film the failing store honestly.
 *
 * This restores the pre-fix shipping file (ed3dbaf), starts the demo store on
 * 4173, and clearly labels it as the revision that was audited. On SIGINT it
 * stops the server, restores the current file and verifies the hash.
 *
 * Narrate this as "the revision that was audited", never as a live audit.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PRE_FIX_SHA = 'ed3dbaf';
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SHIPPING_PATH = join(ROOT, 'src', 'lib', 'shipping.ts');

function sha256(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

if (!existsSync(SHIPPING_PATH)) {
  console.error(`PRE-REPAIR STORE ABORTED: missing ${SHIPPING_PATH}`);
  process.exit(1);
}

const originalBytes = readFileSync(SHIPPING_PATH);
const originalHash = sha256(originalBytes);
let restored = false;
let restoreError: string | null = null;

function restoreOriginal(): boolean {
  if (restored) return true;
  try {
    writeFileSync(SHIPPING_PATH, originalBytes);
    const restoredHash = sha256(readFileSync(SHIPPING_PATH));
    if (restoredHash !== originalHash) {
      throw new Error(`hash mismatch: expected ${originalHash}, got ${restoredHash}`);
    }
    restored = true;
    console.log(`restored  src/lib/shipping.ts  sha256 ${restoredHash}`);
    return true;
  } catch (error) {
    restoreError = message(error);
    console.error(`RESTORE FAILED: ${restoreError}`);
    return false;
  }
}

process.on('exit', () => {
  if (!restored) restoreOriginal();
});

let server: import('node:http').Server | null = null;

try {
  console.log(`current   src/lib/shipping.ts  sha256 ${originalHash}`);
  const preFix = execFileSync('git', ['show', `${PRE_FIX_SHA}:src/lib/shipping.ts`], {
    cwd: ROOT,
    encoding: 'buffer',
    windowsHide: true,
  });
  console.log(`pre-fix   ${PRE_FIX_SHA}:src/lib/shipping.ts  sha256 ${sha256(preFix)}`);
  writeFileSync(SHIPPING_PATH, preFix);

  console.log('PRE-REPAIR REVISION — seeded defect active');
  console.log('This is the revision that was audited, not a live audit.');

  // Import after the file swap so the server loads the pre-fix shipping logic.
  const { createStoreServer } = await import('../src/server.ts');
  server = createStoreServer();
  await new Promise<void>((resolve, reject) => {
    server!.once('error', reject);
    server!.listen(4173, '127.0.0.1', () => resolve());
  });
  console.log('Store: http://127.0.0.1:4173');
  console.log('Load the $60.00 eligible cart and inspect the $9.00 shipping quote.');
  console.log('Press Ctrl+C (or Enter) to stop and restore the fixed file.');

  await new Promise<void>((resolve) => {
    let stopping = false;
    const stop = (): void => {
      if (stopping) return;
      stopping = true;
      restoreOriginal();
      process.stdin.pause();
      const finish = (): void => {
        process.exit(restored && restoreError === null ? 0 : 1);
      };
      if (server) {
        server.close(finish);
        server.closeAllConnections?.();
        setTimeout(finish, 1000);
      } else {
        finish();
      }
    };
    process.on('SIGINT', stop);
    process.on('SIGTERM', stop);
    process.on('SIGBREAK', stop);
    process.stdin.resume();
    process.stdin.once('data', stop);
  });
} catch (error) {
  console.error(`PRE-REPAIR STORE FAILED: ${message(error)}`);
  process.exitCode = 1;
} finally {
  restoreOriginal();
}

if (!restored || restoreError !== null) {
  process.exitCode = 1;
}
