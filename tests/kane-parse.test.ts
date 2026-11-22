import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  isInfraReason,
  MoneyParseError,
  parseNdjson,
  parseUsdToCents,
} from '../src/lib/kane/parse.ts';

const observeText = readFileSync(
  new URL('./fixtures/kane/observe-eligible-60.ndjson', import.meta.url),
  'utf8',
);
const assertText = readFileSync(
  new URL('./fixtures/kane/assert-eligible-60.ndjson', import.meta.url),
  'utf8',
);

test('observe capture: a real passed run with parsed values and evidence', () => {
  const run = parseNdjson(observeText);

  assert.equal(run.terminal, true);
  assert.equal(run.error, null);
  assert.equal(run.runEndStatus, 'passed');
  assert.equal(run.resultCode, 100);
  assert.equal(run.reasonCode, 'success.complete');
  assert.deepEqual(run.finalStateStrings, {
    url: 'http://127.0.0.1:4173/checkout',
    observed_subtotal: '$60.00',
    observed_shipping: '$9.00',
  });
  assert.equal(run.observedSubtotalCents, 6_000);
  assert.equal(run.observedShippingCents, 900);
  assert.equal(run.runId, 'run-0');
  assert.match(run.sessionDir ?? '', /4def2d81-cc1e-450e-9ac6-72e61e6e22e3/);
  assert.match(run.testUrl ?? '', /^https:\/\/test-manager\.lambdatest\.com\//);
  assert.equal(run.duration, 61.6);
  assert.equal(run.credits, 21.776589999999995);
  assert.match(run.evidencePath ?? '', /\.evidence$/);
  assert.equal(run.verdict, null);
  assert.deepEqual(run.moneyErrors, []);
});

test('assert capture: a real failed run with a confirmed product-bug verdict', () => {
  const run = parseNdjson(assertText);

  assert.equal(run.terminal, true);
  assert.equal(run.runEndStatus, 'failed');
  assert.equal(run.resultCode, 740);
  assert.equal(run.reasonCode, 'assertion_error.confirmed_product_bug');
  assert.deepEqual(run.finalState, {});
  assert.deepEqual(run.finalStateStrings, {});
  assert.equal(run.verdict?.confirmed, true);
  assert.equal(run.verdict?.status, 'failed');
  assert.equal(run.verdict?.family, 'application_issue');
  assert.equal(run.verdict?.category, 'ui_data_defect');
  assert.equal(run.verdict?.severity, 'major');
  assert.match(run.verdict?.bugTitle ?? '', /Eligible \$60 cart/);
  assert.match(run.verdict?.rootCause ?? '', /shipping charge/);
  assert.ok((run.verdict?.signals.length ?? 0) >= 3);
  assert.equal(run.observedSubtotalCents, 6_000);
  assert.equal(run.observedShippingCents, 900);
  assert.equal(run.credits, 31.26625);
  assert.match(run.evidencePath ?? '', /\.evidence$/);
  assert.deepEqual(run.moneyErrors, []);
});

test('a capture without run_end is ERR_NO_TERMINAL and never a pass', () => {
  // Derived from the real observe capture by trimming its final line. No
  // terminal event is invented.
  const lines = observeText.trimEnd().split(/\r?\n/);
  const truncated = `${lines.slice(0, -1).join('\n')}\n`;

  const run = parseNdjson(truncated);
  assert.equal(run.terminal, false);
  assert.equal(run.error, 'ERR_NO_TERMINAL');
  assert.equal(run.runEndStatus, 'unknown');
  assert.equal(run.observedShippingCents, null);
  assert.equal(run.observedSubtotalCents, null);
});

test('money parser accepts only unambiguous USD amounts', () => {
  const accepted: Array<[string, number]> = [
    ['$0.00', 0],
    ['$9.00', 900],
    ['$50.00', 5_000],
    ['$1,234.56', 123_456],
    ['  $9.00  ', 900],
  ];
  for (const [input, expected] of accepted) {
    assert.equal(parseUsdToCents(input), expected, input);
  }
});

test('money parser rejects missing symbols, missing cents and extra currency text', () => {
  const rejected = [
    '9.00',
    '$9',
    '$9.0',
    '$9.000',
    '$ 9.00',
    'USD 9.00',
    '$9.00 USD',
    '€9.00',
    '-$9.00',
    '$9.00 extra',
    '$1,23.45',
    '',
    'nine dollars',
  ];
  for (const input of rejected) {
    assert.throws(
      () => parseUsdToCents(input),
      (error: unknown) => error instanceof MoneyParseError && error.code === 'ERR_MONEY_FORMAT',
      input,
    );
  }
  assert.throws(() => parseUsdToCents(900), MoneyParseError);
  assert.throws(() => parseUsdToCents(null), MoneyParseError);
});

test('infrastructure reason codes are recognized without swallowing product failures', () => {
  assert.equal(isInfraReason('assertion_error.confirmed_product_bug'), false);
  assert.equal(isInfraReason('success.complete'), false);
  assert.equal(isInfraReason('auth.token_expired'), true);
  assert.equal(isInfraReason('setup.browser_missing'), true);
  assert.equal(isInfraReason('timeout'), true);
  assert.equal(isInfraReason(null), false);
});
