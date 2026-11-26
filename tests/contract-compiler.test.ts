import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { compileContract, freezeContract } from '../src/lib/contract-compiler.ts';
import { loadContract } from '../src/lib/contract.ts';
import { createAppServer } from '../src/app/server.ts';

const draft = {
  id: 'compiler-test',
  campaignId: 'compiler-campaign',
  adTextSnapshot: 'Free standard shipping over $50.',
  statedInterpretation: 'Inclusive $50 after-discount merchandise subtotal.',
  thresholdCents: 5_000,
  destinationOrigin: 'http://127.0.0.1:4173',
  policySource: 'docs/store-policy.md#sp-01',
  approvedBy: 'test-merchant',
};

test('the compiler freezes a valid contract and generates the three carts', () => {
  const result = compileContract(draft, '2026-11-26T00:00:00.000Z');
  assert.equal(result.contract.threshold.cents, 5_000);
  assert.match(result.contract.specSha256, /^[0-9a-f]{64}$/);
  assert.deepEqual(
    result.cartPlan.map((cart) => [cart.role, cart.subtotalCents, cart.expectedShippingCents]),
    [
      ['eligible', 6_000, 0],
      ['boundary', 5_000, 0],
      ['control', 3_500, 900],
    ],
  );
  assert.deepEqual(result.warnings, []);

  const other = compileContract({ ...draft, id: 'compiler-other', thresholdCents: 6_000 }, '2026-11-26T00:00:00.000Z');
  assert.deepEqual(
    other.cartPlan.map((cart) => [cart.role, cart.subtotalCents]),
    [
      ['eligible', 7_000],
      ['boundary', 6_000],
      ['control', 4_500],
    ],
  );
  assert.equal(other.warnings.length, 1);
});

test('a frozen contract file round-trips through the hash check', () => {
  const root = mkdtempSync(join(tmpdir(), 'kern-contract-'));
  try {
    const result = compileContract(draft, '2026-11-26T00:00:00.000Z');
    const file = freezeContract(result.contract, root);
    assert.ok(existsSync(file));
    const loaded = loadContract(file);
    assert.equal(loaded.specSha256, result.contract.specSha256);
    assert.equal(JSON.parse(readFileSync(file, 'utf8')).id, 'compiler-test');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('the local compiler route writes to the configured contract root; public mode 404s', async () => {
  const auditRoot = mkdtempSync(join(tmpdir(), 'kern-compiler-audits-'));
  const contractRoot = mkdtempSync(join(tmpdir(), 'kern-compiler-contracts-'));
  const server: Server = createAppServer({
    auditRoot,
    contractRoot,
    repoRoot: process.cwd(),
    publicMode: false,
  });
  try {
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const get = await fetch(`${base}/compile`);
    assert.equal(get.status, 200);
    assert.match(await get.text(), /Contract compiler/);

    const body = new URLSearchParams({
      id: 'route-compiler',
      campaignId: 'route-campaign',
      approvedBy: 'tester',
      thresholdDollars: '50.00',
      destinationOrigin: 'http://127.0.0.1:4173',
      policySource: 'docs/store-policy.md#sp-01',
      adTextSnapshot: 'Free standard shipping over $50.',
      statedInterpretation: 'Inclusive $50 after-discount merchandise subtotal.',
    });
    const post = await fetch(`${base}/compile`, {
      method: 'POST',
      headers: {
        origin: base,
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });
    assert.equal(post.status, 200);
    assert.match(await post.text(), /Frozen contract/);
    const file = join(contractRoot, 'route-compiler.json');
    assert.ok(existsSync(file));
    assert.equal(loadContract(file).id, 'route-compiler');

    const publicServer = createAppServer({
      auditRoot,
      contractRoot,
      repoRoot: process.cwd(),
      publicMode: true,
    });
    await new Promise<void>((resolve, reject) => {
      publicServer.once('error', reject);
      publicServer.listen(0, '127.0.0.1', resolve);
    });
    try {
      const publicBase = `http://127.0.0.1:${(publicServer.address() as AddressInfo).port}`;
      assert.equal((await fetch(`${publicBase}/compile`)).status, 404);
    } finally {
      await new Promise<void>((resolve, reject) => {
        publicServer.close((error) => (error ? reject(error) : resolve()));
      });
    }
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    rmSync(auditRoot, { recursive: true, force: true });
    rmSync(contractRoot, { recursive: true, force: true });
  }
});
