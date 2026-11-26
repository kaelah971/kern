#!/usr/bin/env node
/**
 * Claude Code Stop-hook adapter for the Kern gate.
 *
 * It does not start Kane. It evaluates the latest completed audit (or
 * KERN_AUDIT_PATH / KERN_CONTRACT_PATH) against the frozen contract. If the
 * gate is closed, it returns a Claude Code block decision instead of letting
 * the coding agent mark the task done.
 *
 * This is a sample hook. Review it before enabling it in your own settings.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Consume the hook payload so Claude Code's pipe does not backpressure.
try {
  readFileSync(0, 'utf8');
} catch {
  // No stdin is fine.
}

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const gateScript = join(ROOT, 'scripts', 'gate.ts');
const args = [gateScript, '--json'];
if (process.env.KERN_AUDIT_PATH) args.push('--audit', process.env.KERN_AUDIT_PATH);
if (process.env.KERN_CONTRACT_PATH) args.push('--contract', process.env.KERN_CONTRACT_PATH);

const result = spawnSync(process.execPath, args, {
  cwd: ROOT,
  encoding: 'utf8',
  windowsHide: true,
});

if (result.error) {
  console.log(
    JSON.stringify({
      decision: 'block',
      reason: `Kern gate could not run: ${result.error.message}`,
    }),
  );
  process.exit(0);
}

let gate = null;
try {
  gate = JSON.parse(result.stdout);
} catch {
  // Fall through to the error branch.
}

if (gate?.open === true && result.status === 0) {
  // Allow the stop. Print a short line for the hook log.
  console.log('Kern gate: OPEN');
  process.exit(0);
}

const reasons = Array.isArray(gate?.reasons) && gate.reasons.length > 0
  ? gate.reasons.join('; ')
  : (result.stderr || result.stdout || 'gate closed').trim();
console.log(
  JSON.stringify({
    decision: 'block',
    reason: `Kern gate is CLOSED. ${reasons}. Run the named audit and pass the gate before marking this done.`,
  }),
);
process.exit(0);
