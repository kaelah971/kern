import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { JobStore } from '../src/app/jobs.ts';
import { HONORED } from './fixtures/audits/fixture.ts';

function makeStore(clock: { now: number }, limits?: ConstructorParameters<typeof JobStore>[0]['limits']) {
  const root = mkdtempSync(join(tmpdir(), 'kern-jobs-'));
  const store = new JobStore({
    root,
    now: () => clock.now,
    limits,
  });
  return { root, store };
}

test('global hourly quota rejects the next job with a retry-after', async () => {
  const clock = { now: Date.parse('2026-11-23T00:00:00.000Z') };
  const { root, store } = makeStore(clock, {
    maxPerHour: 1,
    maxPerDay: 2,
    perIpWindowMs: 600_000,
  });
  try {
    const first = await store.enqueue('eligible-60', 'ip-a');
    assert.equal(first.ok, true);

    const second = await store.enqueue('boundary-50', 'ip-b');
    assert.equal(second.ok, false);
    if (!second.ok) {
      assert.match(second.reason, /hourly limit/);
      assert.ok(second.retryAfterSeconds > 0);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('per-IP quota rejects a second job for ten minutes', async () => {
  const clock = { now: Date.parse('2026-11-23T00:00:00.000Z') };
  const { root, store } = makeStore(clock, {
    maxPerHour: 5,
    maxPerDay: 10,
    perIpWindowMs: 600_000,
  });
  try {
    const first = await store.enqueue('eligible-60', 'ip-a');
    assert.equal(first.ok, true);

    const second = await store.enqueue('boundary-50', 'ip-a');
    assert.equal(second.ok, false);
    if (!second.ok) {
      assert.match(second.reason, /per-IP limit/);
      assert.ok(second.retryAfterSeconds > 0);
    }

    clock.now += 600_001;
    const third = await store.enqueue('control-35', 'ip-a');
    assert.equal(third.ok, true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('one running job at a time, with a three-minute lease that expires', async () => {
  const clock = { now: Date.parse('2026-11-23T00:00:00.000Z') };
  const { root, store } = makeStore(clock, {
    maxPerHour: 5,
    maxPerDay: 10,
    perIpWindowMs: 600_000,
    leaseMs: 180_000,
  });
  try {
    const first = await store.enqueue('eligible-60', 'ip-a');
    clock.now += 1;
    const second = await store.enqueue('boundary-50', 'ip-b');
    assert.equal(first.ok, true);
    assert.equal(second.ok, true);

    const running = await store.next();
    assert.ok(running);
    assert.equal(running.status, 'running');
    assert.ok(running.leaseExpiresAt);
    assert.equal(await store.next(), null, 'no second job while one is running');

    clock.now += 180_001;
    const expired = await store.get(running.id);
    assert.equal(expired?.status, 'expired');

    const next = await store.next();
    assert.ok(next);
    assert.equal(next.scenario, 'boundary-50');

    const late = await store.complete(running.id, HONORED);
    assert.equal(late.ok, false);
    if (!late.ok) assert.equal(late.reason, 'lease_expired');

    const done = await store.complete(next.id, HONORED);
    assert.equal(done.ok, true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a result for an unknown job is rejected', async () => {
  const clock = { now: Date.parse('2026-11-23T00:00:00.000Z') };
  const { root, store } = makeStore(clock);
  try {
    const result = await store.complete(randomUUID(), HONORED);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, 'not_found');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('engine status flips offline after the 60-second heartbeat window', async () => {
  const clock = { now: Date.parse('2026-11-23T00:00:00.000Z') };
  const { root, store } = makeStore(clock);
  try {
    assert.equal(store.engineStatus().online, false);
    await store.heartbeat('test-worker');
    assert.equal(store.engineStatus().online, true);
    clock.now += 60_001;
    assert.equal(store.engineStatus().online, false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
