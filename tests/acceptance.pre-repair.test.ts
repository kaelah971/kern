/**
 * Pre-repair acceptance characterization.
 *
 * This file records what the real store currently charges, as observed from
 * the server-rendered checkout page. The seeded defect is deliberate, so the
 * tests assert the defective $9.00 quote AND the independent oracle's $0.00
 * expectation. They are meant to pass before the repair and to prove the
 * mismatch exists. The post-repair challenge is a different test: same carts,
 * same contract, quote must equal the oracle.
 *
 * Do not edit the contract or these expectations to make the defect disappear.
 */
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createStoreServer } from '../src/server.ts';
import { PRESET_CARTS } from '../src/lib/catalog.ts';
import {
  evaluateShippingPromise,
  expectedShippingCents,
  loadContract,
} from '../src/lib/contract.ts';

const contract = loadContract();
let server: Server;
let baseUrl: string;

before(async () => {
  server = createStoreServer();
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve());
  });
  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

async function loadPresetCart(presetId: string): Promise<string> {
  const response = await fetch(`${baseUrl}/cart/preset`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ preset: presetId }).toString(),
    redirect: 'manual',
  });
  assert.equal(response.status, 303, 'preset should redirect to the quote');
  const setCookie = response.headers.getSetCookie?.()[0] ?? response.headers.get('set-cookie');
  assert.ok(setCookie, 'preset must establish a cart session');
  return setCookie.split(';')[0] ?? '';
}

async function readCheckoutQuote(cookie: string): Promise<{
  html: string;
  subtotalCents: number;
  shippingCents: number;
}> {
  const response = await fetch(`${baseUrl}/checkout`, { headers: { cookie } });
  assert.equal(response.status, 200);
  const html = await response.text();

  const subtotalMatch = /data-subtotal-cents="(\d+)"/.exec(html);
  const shippingMatch = /data-shipping-cents="(\d+)"/.exec(html);
  assert.ok(subtotalMatch, 'checkout must render the server subtotal');
  assert.ok(shippingMatch, 'checkout must render the server shipping quote');

  return {
    html,
    subtotalCents: Number(subtotalMatch[1]),
    shippingCents: Number(shippingMatch[1]),
  };
}

test('the three preset carts subtotal exactly $60.00, $50.00 and $35.00', async () => {
  for (const [presetId, preset] of Object.entries(PRESET_CARTS)) {
    const cookie = await loadPresetCart(presetId);
    const quote = await readCheckoutQuote(cookie);
    assert.equal(quote.subtotalCents, preset.expectedSubtotalCents, presetId);
  }
});

test('pre-repair: the real store quotes $9.00 on the $60.00 cart while the oracle says $0.00', async () => {
  const cookie = await loadPresetCart('eligible-60');
  const quote = await readCheckoutQuote(cookie);

  assert.equal(quote.subtotalCents, 6_000);
  assert.match(quote.html, /\$60\.00/);
  assert.equal(quote.shippingCents, 900, 'seeded defect must charge $9.00');
  assert.equal(expectedShippingCents(contract, quote.subtotalCents), 0);
  assert.deepEqual(
    evaluateShippingPromise(contract, quote.subtotalCents, quote.shippingCents),
    { expectedCents: 0, observedCents: 900, verdict: 'BROKEN' },
  );
});

test('pre-repair: the real store quotes $9.00 on the exact $50.00 boundary cart', async () => {
  const cookie = await loadPresetCart('boundary-50');
  const quote = await readCheckoutQuote(cookie);

  assert.equal(quote.subtotalCents, 5_000);
  assert.match(quote.html, /\$50\.00/);
  assert.equal(quote.shippingCents, 900, 'seeded defect must charge $9.00 at the boundary');
  assert.equal(expectedShippingCents(contract, quote.subtotalCents), 0);
  assert.deepEqual(
    evaluateShippingPromise(contract, quote.subtotalCents, quote.shippingCents),
    { expectedCents: 0, observedCents: 900, verdict: 'BROKEN' },
  );
});

test('control: the real store quotes $9.00 on the $35.00 cart and the oracle agrees', async () => {
  const cookie = await loadPresetCart('control-35');
  const quote = await readCheckoutQuote(cookie);

  assert.equal(quote.subtotalCents, 3_500);
  assert.equal(quote.shippingCents, 900);
  assert.equal(expectedShippingCents(contract, quote.subtotalCents), 900);
  assert.equal(
    evaluateShippingPromise(contract, quote.subtotalCents, quote.shippingCents).verdict,
    'HONORED',
  );
});
