/**
 * Replay the pre-repair defect without leaving the working tree changed.
 *
 * The characterization test in tests/replay/ is excluded from the default
 * `npm test` glob because it asserts the old $9.00 defect. This script:
 *   1. hashes the current src/lib/shipping.ts,
 *   2. writes the pre-fix revision (ed3dbaf) into place,
 *   3. runs only the replay test,
 *   4. restores the original bytes in a finally block,
 *   5. verifies and prints the restored hash.
 *
 * A restore failure exits non-zero even if the replay test passed.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PRE_FIX_SHA = 'ed3dbaf';
const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));
const SHIPPING_PATH = join(REPO_ROOT, 'src', 'lib', 'shipping.ts');
const REPLAY_TEST = join(REPO_ROOT, 'tests', 'replay', 'pre-repair.test.ts');

function sha256(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

if (!existsSync(SHIPPING_PATH)) {
  console.error(`REPLAY ABORTED: missing ${SHIPPING_PATH}`);
  process.exit(1);
}
if (!existsSync(REPLAY_TEST)) {
  console.error(`REPLAY ABORTED: missing ${REPLAY_TEST}`);
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
    const restoredBytes = readFileSync(SHIPPING_PATH);
    const restoredHash = sha256(restoredBytes);
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

// Last-resort restore if the process exits through an unexpected path. The
// finally block below is the primary restore.
process.on('exit', () => {
  if (!restored) restoreOriginal();
});

let testExitCode = 1;

try {
  console.log(`current   src/lib/shipping.ts  sha256 ${originalHash}`);
  const preFix = execFileSync('git', ['show', `${PRE_FIX_SHA}:src/lib/shipping.ts`], {
    cwd: REPO_ROOT,
    encoding: 'buffer',
    windowsHide: true,
  });
  console.log(`pre-fix   ${PRE_FIX_SHA}:src/lib/shipping.ts  sha256 ${sha256(preFix)}`);
  writeFileSync(SHIPPING_PATH, preFix);

  const result = spawnSync(
    process.execPath,
    ['--test', REPLAY_TEST],
    { cwd: REPO_ROOT, stdio: 'inherit', windowsHide: true },
  );
  testExitCode = result.status ?? 1;
} catch (error) {
  console.error(`REPLAY FAILED: ${message(error)}`);
  testExitCode = 1;
} finally {
  restoreOriginal();
}

if (!restored || restoreError !== null) {
  process.exit(1);
}
process.exit(testExitCode);
