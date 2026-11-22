import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  classifyScenario,
  rollupStatus,
  type ClassificationInput,
} from '../src/lib/audit.ts';
import { parseNdjson, type RunResult } from '../src/lib/kane/parse.ts';

/**
 * The status table is exercised against the real captured shapes. The real
 * observe and assert results are parsed from the committed captures, then
 * individual fields are overridden to reach each branch. Nothing here is
 * written as an artifact or claimed as a run; the real runs are in
 * docs/proof-ledger.md.
 */
const observeText = readFileSync(
  new URL('./fixtures/kane/observe-eligible-60.ndjson', import.meta.url),
  'utf8',
);
const assertText = readFileSync(
  new URL('./fixtures/kane/assert-eligible-60.ndjson', import.meta.url),
  'utf8',
);

const observe = parseNdjson(observeText);
const assertRun = parseNdjson(assertText);

function baseInput(overrides: Partial<ClassificationInput> = {}): ClassificationInput {
  return {
    expectedSubtotalCents: 6_000,
    expectedShippingCents: 0,
    observe,
    assertRun,
    observeExitCode: 0,
    assertExitCode: 1,
    observeTimedOut: false,
    assertTimedOut: false,
    observeEvidencePresent: true,
    assertEvidencePresent: true,
    ...overrides,
  };
}

test('BROKEN: real observe $9.00, oracle $0.00, confirmed assert failure', () => {
  const result = classifyScenario(baseInput());
  assert.equal(result.status, 'BROKEN');
  assert.equal(result.observedShippingCents, 900);
  assert.equal(result.expectedShippingCents, 0);
  assert.match(result.reasons[0] ?? '', /oracle expected 0 cents/);
});

test('HONORED: observed and expected agree and the assert run passed', () => {
  const honoredObserve: RunResult = { ...observe, observedShippingCents: 0 };
  const honoredAssert: RunResult = {
    ...assertRun,
    runEndStatus: 'passed',
    reasonCode: 'success.complete',
    verdict: null,
    observedShippingCents: 0,
  };
  const result = classifyScenario(
    baseInput({
      observe: honoredObserve,
      assertRun: honoredAssert,
      assertExitCode: 0,
    }),
  );
  assert.equal(result.status, 'HONORED');
});

test('INCONCLUSIVE: observe is missing a shipping value', () => {
  const result = classifyScenario(
    baseInput({ observe: { ...observe, observedShippingCents: null } }),
  );
  assert.equal(result.status, 'INCONCLUSIVE');
});

test('INCONCLUSIVE: observe evidence is missing', () => {
  const result = classifyScenario(baseInput({ observeEvidencePresent: false }));
  assert.equal(result.status, 'INCONCLUSIVE');
});

test('INCONCLUSIVE: observe loaded the wrong subtotal', () => {
  const result = classifyScenario(
    baseInput({ observe: { ...observe, observedSubtotalCents: 5_000 } }),
  );
  assert.equal(result.status, 'INCONCLUSIVE');
});

test('INCONCLUSIVE: observe and assert disagree on the shipping amount', () => {
  const result = classifyScenario(
    baseInput({ assertRun: { ...assertRun, observedShippingCents: 1_000 } }),
  );
  assert.equal(result.status, 'INCONCLUSIVE');
});

test('INCONCLUSIVE: assert passed while the oracle sees a mismatch', () => {
  const passed: RunResult = {
    ...assertRun,
    runEndStatus: 'passed',
    reasonCode: 'success.complete',
    verdict: null,
    observedShippingCents: 900,
  };
  const result = classifyScenario(baseInput({ assertRun: passed, assertExitCode: 0 }));
  assert.equal(result.status, 'INCONCLUSIVE');
});

test('INCONCLUSIVE: assert failed without a confirmed verdict', () => {
  const unconfirmed: RunResult = {
    ...assertRun,
    verdict: { ...assertRun.verdict!, confirmed: false },
  };
  const result = classifyScenario(baseInput({ assertRun: unconfirmed }));
  assert.equal(result.status, 'INCONCLUSIVE');
});

test('INFRA_ERROR: observe has no terminal run_end', () => {
  const result = classifyScenario(
    baseInput({
      observe: { ...observe, terminal: false, error: 'ERR_NO_TERMINAL' },
    }),
  );
  assert.equal(result.status, 'INFRA_ERROR');
});

test('INFRA_ERROR: observe timed out', () => {
  const result = classifyScenario(baseInput({ observeTimedOut: true }));
  assert.equal(result.status, 'INFRA_ERROR');
});

test('INFRA_ERROR: assert has no terminal run_end', () => {
  const result = classifyScenario(
    baseInput({
      assertRun: { ...assertRun, terminal: false, error: 'ERR_NO_TERMINAL' },
    }),
  );
  assert.equal(result.status, 'INFRA_ERROR');
});

test('INFRA_ERROR: assert failed for an infrastructure reason', () => {
  const result = classifyScenario(
    baseInput({ assertRun: { ...assertRun, reasonCode: 'auth.token_expired' } }),
  );
  assert.equal(result.status, 'INFRA_ERROR');
});

test('overall rollup: broken dominates, then infra, then inconclusive, then honored', () => {
  assert.equal(rollupStatus([]), 'INCONCLUSIVE');
  assert.equal(rollupStatus(['HONORED', 'HONORED', 'HONORED']), 'HONORED');
  assert.equal(rollupStatus(['HONORED', 'BROKEN', 'HONORED']), 'BROKEN');
  assert.equal(rollupStatus(['HONORED', 'INCONCLUSIVE', 'HONORED']), 'INCONCLUSIVE');
  assert.equal(rollupStatus(['HONORED', 'INFRA_ERROR']), 'INFRA_ERROR');
  assert.equal(rollupStatus(['BROKEN', 'INFRA_ERROR']), 'BROKEN');
});
