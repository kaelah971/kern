import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { AuditRecord } from '../src/lib/audit.ts';

/**
 * Pins the pre-repair boundary-50 output quirk: the assert run's final_state is
 * empty; the observed $9.00 is only in the run memory. The parser reads that
 * value, and the raw NDJSON remains the source of truth. This is an observed
 * Kane recording, not a second observation.
 */
const recorded = JSON.parse(
  readFileSync(
    new URL('../recorded/2026-11-22T00-53-05-669Z-f5230a/audit.json', import.meta.url),
    'utf8',
  ),
) as AuditRecord;

test('pre-repair boundary-50: empty assert final_state, observed $9.00 in memory', () => {
  const scenario = recorded.scenarios.find((item) => item.scenarioId === 'boundary-50');
  assert.ok(scenario);

  assert.equal(scenario.status, 'BROKEN');
  assert.equal(scenario.observe?.parsed.finalStateStrings.observed_shipping, '$9.00');
  assert.deepEqual(scenario.assert?.parsed.finalState, {});
  assert.equal(scenario.assert?.parsed.runEndStatus, 'failed');
  assert.equal(scenario.assert?.parsed.resultCode, 740);
  assert.equal(scenario.assert?.parsed.reasonCode, 'assertion_error.confirmed_product_bug');
  assert.equal(scenario.assert?.parsed.observedShippingCents, 900);
  assert.equal(
    scenario.assert?.parsed.memory.observed_shipping?.extractedValue,
    '$9.00',
  );
  assert.equal(scenario.assert?.parsed.verdict?.confirmed, true);
  assert.equal(scenario.oracle.expectedShippingCents, 0);
  assert.equal(scenario.oracle.observedShippingCents, 900);
});
