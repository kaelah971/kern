import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ChildProcess } from 'node:child_process';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createAppServer } from '../src/app/server.ts';
import type { LiveControllerOptions } from '../src/app/live.ts';

class FakeChild extends EventEmitter {
  pid: number;
  stdout = new PassThrough();
  stderr = new PassThrough();
  killed = false;

  constructor(pid: number) {
    super();
    this.pid = pid;
  }

  kill(_signal?: NodeJS.Signals): boolean {
    this.killed = true;
    return true;
  }
}

type Harness = {
  base: string;
  server: Server;
  root: string;
  logRoot: string;
  children: FakeChild[];
  kills: number[];
  close: () => Promise<void>;
};

async function startLive(
  overrides: Partial<LiveControllerOptions> = {},
  app: { publicMode?: boolean; liveMode?: boolean } = {},
): Promise<Harness> {
  const root = mkdtempSync(join(tmpdir(), 'kern-live-audits-'));
  const logRoot = mkdtempSync(join(tmpdir(), 'kern-live-logs-'));
  const children: FakeChild[] = [];
  const kills: number[] = [];

  const live: LiveControllerOptions = {
    repoRoot: process.cwd(),
    logRoot,
    readBalance: async () => 200,
    storeHealthy: async () => true,
    spawnRun: () => {
      const child = new FakeChild(4200 + children.length);
      children.push(child);
      return child as unknown as ChildProcess;
    },
    killTree: (pid) => kills.push(pid),
    watchdogMs: 60_000,
    ...overrides,
  };

  const instance = createAppServer({
    auditRoot: root,
    repoRoot: process.cwd(),
    liveMode: app.liveMode ?? true,
    publicMode: app.publicMode ?? false,
    live,
  });
  await new Promise<void>((resolve, reject) => {
    instance.once('error', reject);
    instance.listen(0, '127.0.0.1', resolve);
  });
  const address = instance.address() as AddressInfo;
  const base = `http://127.0.0.1:${address.port}`;

  return {
    base,
    server: instance,
    root,
    logRoot,
    children,
    kills,
    close: async () => {
      await new Promise<void>((resolve, reject) => {
        instance.close((error) => (error ? reject(error) : resolve()));
      });
      rmSync(root, { recursive: true, force: true });
      rmSync(logRoot, { recursive: true, force: true });
    },
  };
}

async function get(base: string, path: string): Promise<{ status: number; text: string }> {
  const response = await fetch(`${base}${path}`, { redirect: 'manual' });
  return { status: response.status, text: await response.text() };
}

async function postRun(
  base: string,
  scenario: string,
  origin: string | null = base,
): Promise<Response> {
  const headers: Record<string, string> = {
    'content-type': 'application/x-www-form-urlencoded',
  };
  if (origin !== null) headers.origin = origin;
  return fetch(`${base}/check/run`, {
    method: 'POST',
    redirect: 'manual',
    headers,
    body: new URLSearchParams({ scenario }).toString(),
  });
}

function finishChild(
  child: FakeChild,
  auditId = 'live-test-audit',
  output = `Audit JSON: .data/audits/${auditId}/audit.json\n`,
): void {
  child.stdout.write(output);
  child.stdout.end();
  child.stderr.end();
  child.emit('close', 0, null);
}

test('without KERN_LIVE the three check routes do not exist', async () => {
  const harness = await startLive({}, { liveMode: false });
  try {
    assert.equal((await get(harness.base, '/check')).status, 404);
    assert.equal((await get(harness.base, '/check/status')).status, 404);
    assert.equal((await get(harness.base, '/check/run')).status, 404);
    assert.equal((await postRun(harness.base, 'eligible-60')).status, 404);

    const home = await get(harness.base, '/');
    assert.equal(home.status, 200);
    assert.doesNotMatch(home.text, /Check this store/);
    assert.doesNotMatch(home.text, /Live checks run on the operator's machine/);
    assert.equal(harness.children.length, 0);
  } finally {
    await harness.close();
  }
});

test('with KERN_LIVE unset in the environment the routes still do not exist', async () => {
  const previous = process.env.KERN_LIVE;
  delete process.env.KERN_LIVE;
  const root = mkdtempSync(join(tmpdir(), 'kern-live-env-'));
  const instance = createAppServer({
    auditRoot: root,
    repoRoot: process.cwd(),
    publicMode: false,
  });
  try {
    await new Promise<void>((resolve, reject) => {
      instance.once('error', reject);
      instance.listen(0, '127.0.0.1', resolve);
    });
    const address = instance.address() as AddressInfo;
    const base = `http://127.0.0.1:${address.port}`;
    assert.equal((await get(base, '/check')).status, 404);
    assert.equal((await get(base, '/check/status')).status, 404);
    assert.equal((await postRun(base, 'eligible-60')).status, 404);
  } finally {
    await new Promise<void>((resolve, reject) => {
      instance.close((error) => (error ? reject(error) : resolve()));
    });
    rmSync(root, { recursive: true, force: true });
    if (previous === undefined) delete process.env.KERN_LIVE;
    else process.env.KERN_LIVE = previous;
  }
});

test('public mode never gets the live routes or the local panel', async () => {
  const harness = await startLive({}, { liveMode: true, publicMode: true });
  try {
    assert.equal((await get(harness.base, '/check/status')).status, 404);
    assert.equal((await postRun(harness.base, 'eligible-60')).status, 404);

    const home = await get(harness.base, '/');
    assert.match(
      home.text,
      /Live checks run on the operator's machine\. The runs below are real executions; this deployment only reads them\./,
    );
    assert.doesNotMatch(home.text, /Check this store/);
    assert.doesNotMatch(home.text, /action="\/check\/run"/);
    assert.equal(harness.children.length, 0);
  } finally {
    await harness.close();
  }
});

test('an unknown scenario is rejected before any child starts', async () => {
  const harness = await startLive();
  try {
    const response = await postRun(harness.base, 'free-text-objective');
    assert.equal(response.status, 400);
    assert.match(await response.text(), /Unknown scenario/);
    assert.equal(harness.children.length, 0);
  } finally {
    await harness.close();
  }
});

test('a non-same-origin check request is refused', async () => {
  const harness = await startLive();
  try {
    const crossOrigin = await postRun(harness.base, 'eligible-60', 'http://evil.example');
    assert.equal(crossOrigin.status, 403);
    assert.match(await crossOrigin.text(), /Forbidden/);

    const noOrigin = await postRun(harness.base, 'eligible-60', null);
    assert.equal(noOrigin.status, 403);

    const httpsOrigin = new URL(harness.base);
    httpsOrigin.protocol = 'https:';
    const wrongScheme = await postRun(harness.base, 'eligible-60', httpsOrigin.origin);
    assert.equal(wrongScheme.status, 403);
    assert.equal(harness.children.length, 0);
  } finally {
    await harness.close();
  }
});

test('a second request while a child is running returns 409', async () => {
  const harness = await startLive();
  try {
    const first = await postRun(harness.base, 'eligible-60');
    assert.equal(first.status, 303);
    assert.equal(first.headers.get('location'), '/check/status');
    assert.equal(harness.children.length, 1);

    const second = await postRun(harness.base, 'boundary-50');
    assert.equal(second.status, 409);
    assert.match(await second.text(), /already running/);
    assert.equal(harness.children.length, 1);

    finishChild(harness.children[0]!);
  } finally {
    await harness.close();
  }
});

test('the fourth start in an hour is refused with the next allowed time', async () => {
  const harness = await startLive();
  try {
    for (let index = 0; index < 3; index += 1) {
      const response = await postRun(harness.base, 'eligible-60');
      assert.equal(response.status, 303);
      finishChild(harness.children[index]!, `live-test-${index}`);
    }

    const fourth = await postRun(harness.base, 'eligible-60');
    assert.equal(fourth.status, 429);
    const reason = await fourth.text();
    assert.match(reason, /Next check allowed at/);
    assert.match(reason, /T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
    assert.equal(harness.children.length, 3);
  } finally {
    await harness.close();
  }
});

test('a balance below 120 credits is refused with the real number', async () => {
  const harness = await startLive({ readBalance: async () => 50 });
  try {
    const response = await postRun(harness.base, 'eligible-60');
    assert.equal(response.status, 503);
    const reason = await response.text();
    assert.match(reason, /50\.00 credits/);
    assert.match(reason, /120\.00/);
    assert.equal(harness.children.length, 0);
  } finally {
    await harness.close();
  }
});

test('an unavailable demo store is refused', async () => {
  const harness = await startLive({ storeHealthy: async () => false });
  try {
    const response = await postRun(harness.base, 'eligible-60');
    assert.equal(response.status, 503);
    assert.match(await response.text(), /demo store is not answering/);
    assert.equal(harness.children.length, 0);
  } finally {
    await harness.close();
  }
});

test('a watchdog timeout kills the tree, records timed out, and never verifies', async () => {
  const harness = await startLive({ watchdogMs: 20 });
  try {
    const response = await postRun(harness.base, 'eligible-60');
    assert.equal(response.status, 303);
    await new Promise((resolve) => setTimeout(resolve, 70));

    const page = await get(harness.base, '/check/status');
    assert.equal(page.status, 200);
    assert.match(page.text, /timed out/);
    assert.match(page.text, /This check failed\./);
    assert.match(page.text, /not a verified result/);
    assert.match(page.text, /stderr\.log/);
    assert.doesNotMatch(page.text, /Open the audit/);
    assert.doesNotMatch(page.text, /Done\./);
    assert.equal(harness.kills.length, 1);
    assert.equal(harness.children[0]?.killed, true);
    assert.equal(harness.children[0]?.pid, harness.kills[0]);
  } finally {
    await harness.close();
  }
});

test('the check UI shows idle, running, and done states without invented steps', async () => {
  const harness = await startLive();
  try {
    const redirect = await fetch(`${harness.base}/check`, { redirect: 'manual' });
    assert.equal(redirect.status, 303);
    assert.equal(redirect.headers.get('location'), '/check/status');

    const idle = await get(harness.base, '/check/status');
    assert.equal(idle.status, 200);
    assert.match(idle.text, /meta http-equiv="refresh" content="3"/);
    assert.match(idle.text, /Check this store/);
    assert.match(idle.text, /3 per hour/);
    assert.match(idle.text, /20 per day/);
    assert.match(idle.text, /eligible-60/);
    assert.match(idle.text, /boundary-50/);
    assert.match(idle.text, /control-35/);
    assert.equal((idle.text.match(/>Start check<\/button>/g) ?? []).length, 3);
    assert.doesNotMatch(idle.text, /<progress/);

    const home = await get(harness.base, '/campaign');
    assert.match(home.text, /Check this store/);
    assert.match(home.text, /3 per hour/);
    assert.match(home.text, /20 per day/);
    assert.match(home.text, /Idle\./);
    assert.doesNotMatch(home.text, /Live checks run on the operator's machine/);

    const started = await postRun(harness.base, 'boundary-50');
    assert.equal(started.status, 303);
    const child = harness.children[0]!;
    child.stdout.write('Observing <progress> 50% through the fixed cart.\n');

    const running = await get(harness.base, '/check/status');
    assert.equal(running.status, 200);
    assert.match(running.text, /Running<\/strong> <code>boundary-50<\/code>/);
    assert.match(running.text, /Started/);
    assert.match(running.text, /Elapsed/);
    assert.match(running.text, /Observing &lt;progress&gt; 50% through the fixed cart\./);
    assert.doesNotMatch(running.text, /<progress>/);
    assert.match(running.text, /meta http-equiv="refresh" content="3"/);

    const homeRunning = await get(harness.base, '/campaign');
    assert.match(homeRunning.text, /Running <code>boundary-50<\/code>/);
    assert.match(homeRunning.text, /disabled/);

    finishChild(child, 'live-ui-audit', 'Audit JSON: .data/audits/live-ui-audit/audit.json\n');
    const done = await get(harness.base, '/check/status');
    assert.equal(done.status, 200);
    assert.match(done.text, /Done\./);
    assert.match(done.text, /href="\/audits\/live-ui-audit"/);
    assert.doesNotMatch(done.text, /Running<\/strong> <code>/);
  } finally {
    await harness.close();
  }
});

test('the live child log path is under .data/live when the default root is used', async () => {
  const liveRoot = mkdtempSync(join(tmpdir(), 'kern-live-default-'));
  const harness = await startLive({ logRoot: undefined, repoRoot: liveRoot, watchdogMs: 20 });
  try {
    const response = await postRun(harness.base, 'control-35');
    assert.equal(response.status, 303);
    await new Promise((resolve) => setTimeout(resolve, 70));

    const page = await get(harness.base, '/check/status');
    assert.match(page.text, /\.data\/live\//);
    assert.match(page.text, /stderr\.log/);
  } finally {
    await harness.close();
    rmSync(liveRoot, { recursive: true, force: true });
  }
});
