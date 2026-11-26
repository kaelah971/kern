import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const hook = join(process.cwd(), 'hooks', 'claude-code-stop.mjs');

function runHook(auditPath: string): { status: number | null; stdout: string } {
  const result = spawnSync(process.execPath, [hook], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: { ...process.env, KERN_AUDIT_PATH: auditPath },
    windowsHide: true,
  });
  return { status: result.status, stdout: result.stdout.trim() };
}

test('the Claude Code stop hook allows the passing audit', () => {
  const result = runHook('recorded/2026-11-23T12-35-29-692Z-48b993/audit.json');
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Kern gate: OPEN/);
  assert.doesNotMatch(result.stdout, /decision/);
});

test('the Claude Code stop hook blocks a broken audit', () => {
  const result = runHook('recorded/2026-11-22T00-53-05-669Z-f5230a/audit.json');
  assert.equal(result.status, 0);
  const output = JSON.parse(result.stdout) as { decision: string; reason: string };
  assert.equal(output.decision, 'block');
  assert.match(output.reason, /Kern gate is CLOSED/);
  assert.match(output.reason, /observed 900/);
});
