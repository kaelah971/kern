import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { loadContract } from '../src/lib/contract.ts';
import {
  buildScenarioObjectives,
  objectiveSha256,
} from '../src/lib/kane/objective.ts';

const contract = loadContract();

function captureObjective(kind: 'observe' | 'assert'): string {
  const text = readFileSync(
    new URL(`./fixtures/kane/${kind}-eligible-60.ndjson`, import.meta.url),
    'utf8',
  );
  const bifurcation = text
    .split(/\r?\n/)
    .find((line) => line.includes('"type":"bifurcation"'));
  assert.ok(bifurcation, `no bifurcation event in ${kind} capture`);
  const event = JSON.parse(bifurcation) as { flows: string[] };
  return event.flows[0]!;
}

test('objective amounts come from the frozen contract, not the preset label', () => {
  const eligible = buildScenarioObjectives(contract, 'eligible-60');
  const boundary = buildScenarioObjectives(contract, 'boundary-50');
  const control = buildScenarioObjectives(contract, 'control-35');

  assert.equal(eligible.oracleExpectedCents, 0);
  assert.equal(boundary.oracleExpectedCents, 0);
  assert.equal(control.oracleExpectedCents, 900);
  assert.equal(eligible.thresholdCents, 5_000);
  assert.equal(eligible.expectedSubtotalCents, 6_000);
  assert.equal(boundary.expectedSubtotalCents, 5_000);
  assert.equal(control.expectedSubtotalCents, 3_500);

  assert.match(eligible.assert, /Then verify \{\{observed_shipping\}\} is \$0\.00\.$/);
  assert.match(control.assert, /Then verify \{\{observed_shipping\}\} is \$9\.00\.$/);
  assert.match(eligible.observe, /Load \$60\.00 eligible cart/);
  assert.match(boundary.observe, /Load \$50\.00 boundary cart/);
  assert.match(control.observe, /Load \$35\.00 control cart/);
});

test('the generated objective hashes are stable', () => {
  for (const scenario of [buildScenarioObjectives(contract, 'eligible-60')]) {
    assert.equal(scenario.hashes.observe, objectiveSha256(scenario.observe));
    assert.equal(scenario.hashes.assert, objectiveSha256(scenario.assert));
    assert.match(scenario.hashes.observe, /^[0-9a-f]{64}$/);
    assert.match(scenario.hashes.assert, /^[0-9a-f]{64}$/);
  }
});

test('the generated eligible-60 objectives match the provided real captures', () => {
  const objectives = buildScenarioObjectives(contract, 'eligible-60');
  for (const kind of ['observe', 'assert'] as const) {
    const captured = captureObjective(kind);
    assert.equal(captured, objectives[kind], `${kind} objective text`);
    const capturedHash = createHash('sha256').update(captured, 'utf8').digest('hex');
    assert.equal(capturedHash, objectives.hashes[kind], `${kind} objective hash`);
  }
});

test('changing the contract threshold changes the boundary expectation and assert objective', () => {
  const changed = structuredClone(contract);
  changed.threshold.cents = 5_001;

  const original = buildScenarioObjectives(contract, 'boundary-50');
  const after = buildScenarioObjectives(changed, 'boundary-50');

  assert.equal(original.oracleExpectedCents, 0);
  assert.equal(after.oracleExpectedCents, 900);
  assert.notEqual(after.assert, original.assert);
  assert.notEqual(after.hashes.assert, original.hashes.assert);
});

test('changing the destination origin changes both objectives', () => {
  const changed = structuredClone(contract);
  changed.destinationOrigin = 'http://127.0.0.1:9999';

  const original = buildScenarioObjectives(contract, 'control-35');
  const after = buildScenarioObjectives(changed, 'control-35');

  assert.notEqual(after.observe, original.observe);
  assert.notEqual(after.assert, original.assert);
  assert.match(after.observe, /http:\/\/127\.0\.0\.1:9999\//);
  assert.match(after.assert, /http:\/\/127\.0\.0\.1:9999\//);
});
