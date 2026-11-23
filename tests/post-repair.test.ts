/**
 * Post-repair acceptance: the real store must match the frozen contract.
 *
 * This file is intentionally absent from the pre-repair revision's commit. It
 * is added on `repair/free-shipping-threshold`; before the fix it fails for the
 * $60.00 and $50.00 carts, and after the fix it passes for all three.
 *
 * The pre-repair characterization test is left untouched. It records the
 * defective quote and will fail on the fixed branch by design.
 */
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createStoreServer } from '../src/server.ts';
import { PRESET_CARTS } from '../src/lib/catalog.ts';
import { expectedShippingCents, loadContract } from '../src/lib/contract.ts';

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
    subtotalCents: Number(subtotalMatch[1]),
    shippingCents: Number(shippingMatch[1]),
  };
}

async function assertStoreMatchesExpectation(
  presetId: keyof typeof PRESET_CARTS,
  expectedShipping: number,
): Promise<void> {
  const cookie = await loadPresetCart(presetId);
  const quote = await readCheckoutQuote(cookie);

  assert.equal(
    quote.subtotalCents,
    PRESET_CARTS[presetId].expectedSubtotalCents,
    `${presetId} subtotal`,
  );
  assert.equal(quote.shippingCents, expectedShipping, `${presetId} shipping`);
  assert.equal(
    quote.shippingCents,
    expectedShippingCents(contract, quote.subtotalCents),
    `${presetId} must match the oracle`,
  );
}

test('post-repair: the $60.00 cart ships free', async () => {
  await assertStoreMatchesExpectation('eligible-60', 0);
});

test('post-repair: the exact $50.00 boundary cart ships free', async () => {
  await assertStoreMatchesExpectation('boundary-50', 0);
});

test('post-repair: the $35.00 control still pays $9.00', async () => {
  await assertStoreMatchesExpectation('control-35', 900);
});
