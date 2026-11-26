import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CORRECT_IMPLEMENTATIONS,
  bundleDiscountCents,
  deliveryDateFor,
  evaluatePromiseGate,
  percentDiscountCents,
} from '../src/lib/promises.ts';

test('percentage discount: $60 and the exact $50 boundary qualify; the $35 control does not', () => {
  assert.equal(percentDiscountCents(6_000), 1_200);
  assert.equal(percentDiscountCents(5_000), 1_000);
  assert.equal(percentDiscountCents(3_500), 0);
});

test('percentage discount: the threshold is inclusive and absurd cents are rejected', () => {
  assert.equal(percentDiscountCents(4_999), 0);
  assert.equal(percentDiscountCents(5_001), 1_000);
  assert.throws(() => percentDiscountCents(-1), RangeError);
  assert.throws(() => percentDiscountCents(5_000.5), RangeError);
});

test('bundle discount: only the complete tote + notebook bundle gets 15%', () => {
  const complete = [
    { productId: 'tote', qty: 1 },
    { productId: 'notebook', qty: 1 },
  ];
  assert.equal(bundleDiscountCents(complete), 900);
  assert.equal(bundleDiscountCents([{ productId: 'tote', qty: 1 }]), 0);
  assert.equal(bundleDiscountCents([{ productId: 'notebook', qty: 1 }]), 0);
});

test('delivery promise: cutoff, weekend and business-day counting are deterministic', () => {
  assert.equal(deliveryDateFor('2026-11-26T13:00:00.000Z'), '2026-11-30');
  assert.equal(deliveryDateFor('2026-11-26T15:00:00.000Z'), '2026-12-01');
  assert.equal(deliveryDateFor('2026-11-28T10:00:00.000Z'), '2026-12-02');
  assert.throws(() => deliveryDateFor('not-a-date'), RangeError);
});

test('delivery promise: exactly 14:00 UTC is after the cutoff', () => {
  assert.equal(deliveryDateFor('2026-11-26T14:00:00.000Z'), '2026-12-01');
});

test('the promise gate is open with the correct implementations', () => {
  const gate = evaluatePromiseGate();
  assert.equal(gate.open, true);
  assert.deepEqual(gate.reasons, []);
  assert.equal(gate.promises.length, 3);
  assert.ok(gate.promises.every((promise) => promise.pass));
  assert.ok(
    gate.promises.every((promise) =>
      promise.candidates.every((candidate) => candidate.pass === false),
    ),
  );
});

test('the all-carts percentage candidate is rejected by the $35 control', () => {
  const gate = evaluatePromiseGate();
  const percent = gate.promises.find((promise) => promise.correct.id === 'percent-20');
  assert.ok(percent);
  const candidate = percent.candidates.find((item) => item.id === 'percent-all');
  assert.ok(candidate);
  assert.equal(candidate.pass, false);
  assert.ok(candidate.scenarios.some((scenario) => scenario.id === 'percent-35' && !scenario.pass));
});

test('a correct implementation that forgets the $35 control closes the gate', () => {
  const gate = evaluatePromiseGate({
    ...CORRECT_IMPLEMENTATIONS,
    percent: (subtotal) => Math.floor(subtotal / 5),
  });
  assert.equal(gate.open, false);
  assert.ok(gate.reasons.some((reason) => reason.includes('percent-35')));
});

test('a bundle implementation that discounts partial carts closes the gate', () => {
  const gate = evaluatePromiseGate({
    ...CORRECT_IMPLEMENTATIONS,
    bundle: (items) => (items.length > 0 ? 500 : 0),
  });
  assert.equal(gate.open, false);
  assert.ok(gate.reasons.some((reason) => reason.includes('bundle-tote-only')));
});

test('a delivery implementation that ignores the cutoff closes the gate', () => {
  const gate = evaluatePromiseGate({
    ...CORRECT_IMPLEMENTATIONS,
    delivery: () => '2026-11-30',
  });
  assert.equal(gate.open, false);
  assert.ok(gate.reasons.some((reason) => reason.includes('delivery-after-cutoff')));
});
