import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createAppServer } from '../src/app/server.ts';
import type { JobLimits } from '../src/app/jobs.ts';
import { HONORED } from './fixtures/audits/fixture.ts';

const RECORDED_ROOT = join(process.cwd(), 'recorded');
const C_ID = '2026-11-23T12-35-29-692Z-48b993';
const BANNER = 'Recorded audit: replay of real runs, not a live session.';

type Clock = { now: number };
type App = {
  server: Server;
  base: string;
  clock: Clock;
  stop: () => Promise<void>;
};

async function startApp(options: { limits?: Partial<JobLimits>; clock?: Clock } = {}): Promise<App> {
  const root = mkdtempSync(join(tmpdir(), 'kern-public-'));
  const clock = options.clock ?? { now: Date.parse('2026-11-23T00:00:00.000Z') };
  const server = createAppServer({
    publicMode: true,
    auditRoot: RECORDED_ROOT,
    repoRoot: process.cwd(),
    jobRoot: root,
    workerToken: 'test-token',
    jobLimits: options.limits,
    now: () => clock.now,
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve());
  });
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return {
    server,
    base,
    clock,
    stop: async () => {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
      rmSync(root, { recursive: true, force: true });
    },
  };
}

async function heartbeat(app: App): Promise<void> {
  const response = await fetch(`${app.base}/api/worker/heartbeat`, {
    method: 'POST',
    headers: {
      authorization: 'Bearer test-token',
      'content-type': 'application/json',
    },
    body: '{}',
  });
  assert.equal(response.status, 200);
}

async function postAudit(app: App, scenario: string, ip: string): Promise<Response> {
  return fetch(`${app.base}/api/audits`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': ip,
    },
    body: JSON.stringify({ scenario }),
  });
}

async function nextJob(app: App): Promise<Response> {
  return fetch(`${app.base}/api/jobs/next`, {
    headers: { authorization: 'Bearer test-token' },
  });
}

test('offline engine disables the public panel and rejects a run', async () => {
  const app = await startApp();
  try {
    const home = await fetch(`${app.base}/`);
    assert.equal(home.status, 200);
    const text = await home.text();
    assert.match(text, /Check this store/);
    assert.match(text, /Engine offline/);
    assert.match(text, /runs disabled/);
    assert.match(text, /Recorded audit: replay of real runs, not a live session\./);
    assert.match(text, /Live runs execute on the owner's machine\. One demo store, one promise type\./);
    assert.ok(!text.includes('http://127.0.0.1:4173'), 'no hosted link to the local store');
    assert.ok(!text.includes('>Storefront<'), 'no Storefront link on the public build');

    const status = await fetch(`${app.base}/api/engine/status`);
    assert.equal(status.status, 200);
    const statusBody = (await status.json()) as { online: boolean };
    assert.equal(statusBody.online, false);

    const run = await postAudit(app, 'eligible-60', '203.0.113.1');
    assert.equal(run.status, 503);
    const body = (await run.json()) as { error: string };
    assert.equal(body.error, 'engine_offline');

    const script = await fetch(`${app.base}/assets/public.js`);
    assert.equal(script.status, 200);
    assert.match(await script.text(), /data-check-panel/);
  } finally {
    await app.stop();
  }
});

test('worker endpoints require the bearer token and reject an unknown result', async () => {
  const app = await startApp();
  try {
    assert.equal((await fetch(`${app.base}/api/jobs/next`)).status, 401);
    assert.equal(
      (
        await fetch(`${app.base}/api/jobs/next`, {
          headers: { authorization: 'Bearer wrong' },
        })
      ).status,
      401,
    );

    await heartbeat(app);
    const heartbeatNoAuth = await fetch(`${app.base}/api/worker/heartbeat`, {
      method: 'POST',
      body: '{}',
    });
    assert.equal(heartbeatNoAuth.status, 401);

    const next = await nextJob(app);
    assert.equal(next.status, 204);

    const liveAudit = structuredClone(HONORED);
    delete liveAudit.postRepair;
    delete liveAudit.answersAuditId;
    delete liveAudit.objectiveHashesMatch;
    delete liveAudit.objectiveHashComparisons;

    const unknown = await fetch(`${app.base}/api/jobs/${randomUUID()}/result`, {
      method: 'POST',
      headers: {
        authorization: 'Bearer test-token',
        'content-type': 'application/json',
      },
      body: JSON.stringify(liveAudit),
    });
    assert.equal(unknown.status, 404);
  } finally {
    await app.stop();
  }
});

test('queue -> live result renders without the recorded banner; recorded pages keep it', async () => {
  const app = await startApp();
  try {
    await heartbeat(app);
    const queued = await postAudit(app, 'eligible-60', '203.0.113.10');
    assert.equal(queued.status, 202);
    const queuedBody = (await queued.json()) as { jobId: string; status: string };
    assert.equal(queuedBody.status, 'queued');

    const next = await nextJob(app);
    assert.equal(next.status, 200);
    const nextBody = (await next.json()) as { id: string; scenario: string; leaseExpiresAt: string };
    assert.equal(nextBody.id, queuedBody.jobId);
    assert.equal(nextBody.scenario, 'eligible-60');
    assert.ok(nextBody.leaseExpiresAt);

    const second = await postAudit(app, 'boundary-50', '203.0.113.11');
    assert.equal(second.status, 429);
    assert.ok(second.headers.get('retry-after'));
    const secondBody = (await second.json()) as { reason: string };
    assert.match(secondBody.reason, /already running/);

    const liveAudit = structuredClone(HONORED);
    delete liveAudit.postRepair;
    delete liveAudit.answersAuditId;
    delete liveAudit.objectiveHashesMatch;
    delete liveAudit.objectiveHashComparisons;

    const result = await fetch(`${app.base}/api/jobs/${queuedBody.jobId}/result`, {
      method: 'POST',
      headers: {
        authorization: 'Bearer test-token',
        'content-type': 'application/json',
      },
      body: JSON.stringify(liveAudit),
    });
    assert.equal(result.status, 200);

    const jobResponse = await fetch(`${app.base}/api/audits/${queuedBody.jobId}`);
    assert.equal(jobResponse.status, 200);
    const job = (await jobResponse.json()) as {
      status: string;
      ipHash?: string;
      audit?: { auditId: string };
    };
    assert.equal(job.status, 'done');
    assert.equal(job.ipHash, undefined);
    assert.equal(job.audit?.auditId, HONORED.auditId);

    const livePage = await fetch(`${app.base}/runs/${queuedBody.jobId}`);
    assert.equal(livePage.status, 200);
    const liveText = await livePage.text();
    assert.doesNotMatch(liveText, /Recorded audit: replay of real runs, not a live session\./);
    assert.match(liveText, /Live run\./);
    assert.match(liveText, /HONORED/);
    assert.ok(liveText.includes(`/runs/${queuedBody.jobId}/receipt`));

    const liveReceipt = await fetch(`${app.base}/runs/${queuedBody.jobId}/receipt`);
    assert.equal(liveReceipt.status, 200);
    const receiptText = await liveReceipt.text();
    assert.doesNotMatch(receiptText, /Recorded audit: replay of real runs, not a live session\./);
    assert.match(receiptText, /Verified for the tested conditions at the recorded time/);

    const recordedPage = await fetch(`${app.base}/audits/${C_ID}`);
    assert.equal(recordedPage.status, 200);
    assert.match(await recordedPage.text(), new RegExp(BANNER.replace(/\./g, '\\.')));

    const recordedReceipt = await fetch(`${app.base}/audits/${C_ID}/receipt`);
    assert.equal(recordedReceipt.status, 200);
    assert.match(await recordedReceipt.text(), new RegExp(BANNER.replace(/\./g, '\\.')));
  } finally {
    await app.stop();
  }
});

test('global hourly quota returns 429 with retry-after', async () => {
  const app = await startApp({
    limits: { maxPerHour: 3, maxPerDay: 20, perIpWindowMs: 600_000 },
  });
  try {
    await heartbeat(app);
    for (const ip of ['198.51.100.1', '198.51.100.2', '198.51.100.3']) {
      assert.equal((await postAudit(app, 'eligible-60', ip)).status, 202);
    }
    const rejected = await postAudit(app, 'control-35', '198.51.100.4');
    assert.equal(rejected.status, 429);
    assert.ok(rejected.headers.get('retry-after'));
    const body = (await rejected.json()) as { reason: string; retryAfterSeconds: number };
    assert.match(body.reason, /hourly limit/);
    assert.ok(body.retryAfterSeconds > 0);
  } finally {
    await app.stop();
  }
});

test('an expired job is not returned and its result is rejected', async () => {
  const app = await startApp({
    limits: { maxPerHour: 5, maxPerDay: 10, perIpWindowMs: 600_000, leaseMs: 180_000 },
  });
  try {
    await heartbeat(app);
    const queued = await postAudit(app, 'eligible-60', '192.0.2.1');
    assert.equal(queued.status, 202);
    const { jobId } = (await queued.json()) as { jobId: string };

    const next = await nextJob(app);
    assert.equal(next.status, 200);

    app.clock.now += 180_001;
    assert.equal((await nextJob(app)).status, 204);

    const jobResponse = await fetch(`${app.base}/api/audits/${jobId}`);
    const job = (await jobResponse.json()) as { status: string };
    assert.equal(job.status, 'expired');

    const liveAudit = structuredClone(HONORED);
    delete liveAudit.postRepair;
    delete liveAudit.answersAuditId;
    delete liveAudit.objectiveHashesMatch;
    delete liveAudit.objectiveHashComparisons;

    const result = await fetch(`${app.base}/api/jobs/${jobId}/result`, {
      method: 'POST',
      headers: {
        authorization: 'Bearer test-token',
        'content-type': 'application/json',
      },
      body: JSON.stringify(liveAudit),
    });
    assert.equal(result.status, 409);
  } finally {
    await app.stop();
  }
});
