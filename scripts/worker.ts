/**
 * Kern public worker.
 *
 * Runs on the owner's PC, next to the demo store on 4173. It polls the hosted
 * app for one job at a time, runs the existing audit engine for that fixed
 * scenario, posts the audit JSON back, and keeps the raw Kane artifacts under
 * .data/audits locally.
 */
import { setTimeout as sleep } from 'node:timers/promises';
import { runAudit } from '../src/lib/audit.ts';

const STORE_URL = 'http://127.0.0.1:4173/health';
const TOKEN = process.env.WORKER_TOKEN ?? '';
const BASE_URL = (process.env.PUBLIC_BASE_URL ?? 'http://127.0.0.1:3000').replace(/\/+$/, '');
const WORKER_ID = `kern-worker-${process.pid}`;

type NextJob = { id: string; scenario: 'eligible-60' | 'boundary-50' | 'control-35' };

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function api(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<{ status: number; ok: boolean; body: any }> {
  const headers: Record<string, string> = { authorization: `Bearer ${TOKEN}` };
  if (options.body !== undefined) headers['content-type'] = 'application/json';
  const response = await fetch(`${BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: AbortSignal.timeout(30_000),
  });
  let body: any = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  return { status: response.status, ok: response.ok, body };
}

async function checkStore(): Promise<void> {
  try {
    const response = await fetch(STORE_URL, { signal: AbortSignal.timeout(3_000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
  } catch (error) {
    console.error(
      `Store is not reachable at ${STORE_URL} (${message(error)}). Start it with: npm start`,
    );
    process.exit(1);
  }
}

async function heartbeat(): Promise<void> {
  try {
    const result = await api('/api/worker/heartbeat', {
      method: 'POST',
      body: { workerId: WORKER_ID },
    });
    if (!result.ok) console.error(`heartbeat ${result.status}`);
  } catch (error) {
    console.error(`heartbeat failed: ${message(error)}`);
  }
}

async function keepAlive(): Promise<void> {
  try {
    const response = await fetch(`${BASE_URL}/health`, { signal: AbortSignal.timeout(15_000) });
    console.log(`keepalive ${response.status} ${BASE_URL}/health`);
  } catch (error) {
    console.log(`keepalive failed ${BASE_URL}/health: ${message(error)}`);
  }
}

async function nextJob(): Promise<NextJob | null> {
  const result = await api('/api/jobs/next');
  if (result.status === 204) return null;
  if (!result.ok) {
    throw new Error(`next job failed: ${result.status} ${JSON.stringify(result.body)}`);
  }
  return result.body as NextJob;
}

async function postResult(id: string, audit: unknown): Promise<void> {
  const result = await api(`/api/jobs/${encodeURIComponent(id)}/result`, {
    method: 'POST',
    body: audit,
  });
  if (!result.ok) {
    throw new Error(`result post failed: ${result.status} ${JSON.stringify(result.body)}`);
  }
}

async function postFailure(id: string, error: string): Promise<void> {
  try {
    const result = await api(`/api/jobs/${encodeURIComponent(id)}/fail`, {
      method: 'POST',
      body: { error },
    });
    if (!result.ok) console.error(`failure post ${result.status} for job ${id}`);
  } catch (postError) {
    console.error(`failure post failed for job ${id}: ${message(postError)}`);
  }
}

async function main(): Promise<void> {
  await checkStore();
  if (!TOKEN) {
    console.error('WORKER_TOKEN is not set. Copy .env.example to .env and set the same token as the hosted app.');
    process.exit(1);
  }

  console.log(`Kern worker ${WORKER_ID}`);
  console.log(`Public app: ${BASE_URL}`);
  console.log('Store: http://127.0.0.1:4173 (stop at the shipping quote)');
  console.log('Heartbeat every 20s; keepalive every 5m; one job at a time.');

  await heartbeat();
  setInterval(() => void heartbeat(), 20_000);
  setInterval(() => void keepAlive(), 5 * 60_000);

  while (true) {
    let job: NextJob | null = null;
    try {
      job = await nextJob();
    } catch (error) {
      console.error(`job poll failed: ${message(error)}`);
      await sleep(5_000);
      continue;
    }

    if (!job) {
      await sleep(3_000);
      continue;
    }

    const started = Date.now();
    try {
      const { record, auditDir } = await runAudit({
        scenarioIds: [job.scenario],
        kind: 'both',
      });
      await postResult(job.id, record);
      console.log(
        `job ${job.id} ${job.scenario} ${record.overallStatus} ${record.totals.credits} credits ${(
          (Date.now() - started) / 1000
        ).toFixed(1)}s local audit ${auditDir}`,
      );
    } catch (error) {
      const reason = message(error);
      console.error(`job ${job.id} ${job.scenario} failed: ${reason}`);
      await postFailure(job.id, reason);
    }

    await sleep(3_000);
  }
}

main().catch((error: unknown) => {
  console.error(`worker stopped: ${message(error)}`);
  process.exitCode = 1;
});
