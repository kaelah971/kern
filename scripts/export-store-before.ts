/**
 * Export the pre-repair storefront quotes without leaving shipping.ts changed.
 *
 * This is the same restore-safe pattern as demo-store-pre-repair.ts:
 *   1. hash the current src/lib/shipping.ts,
 *   2. write the ed3dbaf revision into place,
 *   3. run export-store.ts --before in a fresh process (so it imports the buggy
 *      shipping function), writing site/store/before/*.html,
 *   4. restore the original bytes, and
 *   5. verify and print the restored SHA-256.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PRE_FIX_SHA = 'ed3dbaf';
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SHIPPING_PATH = join(ROOT, 'src', 'lib', 'shipping.ts');
const EXPORT_SCRIPT = join(ROOT, 'scripts', 'export-store.ts');

function sha256(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

if (!existsSync(SHIPPING_PATH)) {
  console.error(`PRE-REPAIR STORE EXPORT ABORTED: missing ${SHIPPING_PATH}`);
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

let childStatus = 1;

try {
  console.log(`current   src/lib/shipping.ts  sha256 ${originalHash}`);
  const preFix = execFileSync('git', ['show', `${PRE_FIX_SHA}:src/lib/shipping.ts`], {
    cwd: ROOT,
    encoding: 'buffer',
    windowsHide: true,
  });
  console.log(`pre-fix   ${PRE_FIX_SHA}:src/lib/shipping.ts  sha256 ${sha256(preFix)}`);
  writeFileSync(SHIPPING_PATH, preFix);

  const result = spawnSync(process.execPath, [EXPORT_SCRIPT, '--before'], {
    cwd: ROOT,
    stdio: 'inherit',
    windowsHide: true,
  });
  childStatus = result.status ?? 1;
  if (result.error) {
    console.error(`PRE-REPAIR STORE EXPORT FAILED: ${message(result.error)}`);
    childStatus = 1;
  }
} catch (error) {
  console.error(`PRE-REPAIR STORE EXPORT FAILED: ${message(error)}`);
  childStatus = 1;
} finally {
  restoreOriginal();
}

if (!restored || restoreError !== null) {
  process.exit(1);
}
process.exit(childStatus);
