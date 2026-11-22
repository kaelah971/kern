import test from 'node:test';
import assert from 'node:assert/strict';
import {
  contractSha256,
  evaluateShippingPromise,
  expectedShippingCents,
  loadContract,
} from '../src/lib/contract.ts';

const contract = loadContract();

test('the frozen contract hash matches its canonical payload', () => {
  assert.equal(contract.specSha256, contractSha256(contract));
  assert.equal(contract.specSha256.length, 64);
});

test('the frozen contract carries the approved threshold and both price points', () => {
  assert.equal(contract.threshold.cents, 5_000);
  assert.equal(contract.expectedEligibleShipping.cents, 0);
  assert.equal(contract.expectedIneligibleShipping.cents, 900);
  assert.equal(contract.thresholdBasis, 'after_discount_merchandise_subtotal');
  assert.equal(contract.destinationCountry, 'US');
  assert.equal(contract.shippingMethod, 'standard');
});

test('oracle boundary: 4,999 cents is below the threshold and expects $9.00', () => {
  assert.equal(expectedShippingCents(contract, 4_999), 900);
});

test('oracle boundary: 5,000 cents qualifies and expects $0.00', () => {
  assert.equal(expectedShippingCents(contract, 5_000), 0);
});

test('oracle boundary: 5,001 cents qualifies and expects $0.00', () => {
  assert.equal(expectedShippingCents(contract, 5_001), 0);
});

test('oracle: the $35.00 control expects $9.00', () => {
  assert.equal(expectedShippingCents(contract, 3_500), 900);
});

test('oracle: the $60.00 cart expects $0.00', () => {
  assert.equal(expectedShippingCents(contract, 6_000), 0);
});

test('oracle rejects negative and fractional cents instead of guessing', () => {
  assert.throws(() => expectedShippingCents(contract, -1), RangeError);
  assert.throws(() => expectedShippingCents(contract, 5_000.5), RangeError);
});

test('evaluation reports a broken promise without changing the expectation', () => {
  assert.deepEqual(evaluateShippingPromise(contract, 6_000, 900), {
    expectedCents: 0,
    observedCents: 900,
    verdict: 'BROKEN',
  });
  assert.deepEqual(evaluateShippingPromise(contract, 3_500, 900), {
    expectedCents: 900,
    observedCents: 900,
    verdict: 'HONORED',
  });
});
