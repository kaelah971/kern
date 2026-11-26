import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { loadAudits } from '../src/app/audits.ts';
import { loadContract } from '../src/lib/contract.ts';
import { evaluateGate, evaluatePatchGauntlet } from '../src/lib/gate.ts';

const index = loadAudits(join(process.cwd(), 'recorded'));
const contract = loadContract();
const post = index.audits.find((summary) => summary.audit.postRepair === true);
const pre = index.audits.find(
  (summary) => summary.audit.auditId === '2026-11-22T00-53-05-669Z-f5230a',
);

test('the gate opens only for the unchanged passing post-repair audit', () => {
  assert.ok(post);
  assert.ok(pre);
  const postGate = evaluateGate(post.audit, contract);
  assert.equal(postGate.open, true, postGate.reasons.join('; '));
  assert.equal(postGate.scenarios.length, 3);
  assert.ok(postGate.scenarios.every((scenario) => scenario.pass));

  const preGate = evaluateGate(pre.audit, contract);
  assert.equal(preGate.open, false);
  assert.ok(preGate.reasons.length >= 2);
  assert.equal(preGate.scenarios.find((scenario) => scenario.scenarioId === 'control-35')?.pass, true);
});

test('the patch gauntlet rejects the obvious wrong fixes and accepts the real one', () => {
  const rows = evaluatePatchGauntlet(contract);
  const byId = new Map(rows.map((row) => [row.id, row]));
  assert.equal(byId.get('correct')?.pass, true);
  assert.equal(byId.get('all-free')?.pass, false);
  assert.equal(byId.get('sixty-only')?.pass, false);
  assert.equal(byId.get('pre-fix')?.pass, false);

  const control = byId.get('all-free')?.cells.find((cell) => cell.scenarioId === 'control-35');
  assert.equal(control?.pass, false);
  const boundary = byId.get('sixty-only')?.cells.find((cell) => cell.scenarioId === 'boundary-50');
  assert.equal(boundary?.pass, false);
  const eligible = byId.get('pre-fix')?.cells.find((cell) => cell.scenarioId === 'eligible-60');
  assert.equal(eligible?.pass, false);
});
