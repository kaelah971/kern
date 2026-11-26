import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createAppServer } from '../src/app/server.ts';
import { BROKEN, HONORED, makeAuditRoot } from './fixtures/audits/fixture.ts';

let root: string;
let server: Server;
let baseUrl: string;

async function startServer(auditRoot: string): Promise<{ server: Server; base: string }> {
  const instance = createAppServer({ auditRoot, repoRoot: process.cwd() });
  await new Promise<void>((resolve, reject) => {
    instance.once('error', reject);
    instance.listen(0, '127.0.0.1', () => resolve());
  });
  const address = instance.address() as AddressInfo;
  return { server: instance, base: `http://127.0.0.1:${address.port}` };
}

async function stopServer(instance: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    instance.close((error) => (error ? reject(error) : resolve()));
  });
}

async function get(base: string, path: string): Promise<{ status: number; text: string }> {
  const response = await fetch(`${base}${path}`);
  return { status: response.status, text: await response.text() };
}

before(async () => {
  root = makeAuditRoot();
  ({ server, base: baseUrl } = await startServer(root));
});

after(async () => {
  await stopServer(server);
  rmSync(root, { recursive: true, force: true });
});

test('campaign page shows the ad, the interpretation, the contract and the latest audit', async () => {
  const { status, text } = await get(baseUrl, '/');
  assert.equal(status, 200);
  assert.match(text, /Every ad makes a promise/);
  assert.match(text, /Ad snapshot/);
  assert.match(text, /stated interpretation/);
  assert.match(text, /Frozen contract/);
  assert.match(text, new RegExp(HONORED.auditId));
  assert.match(text, /HONORED/);
  assert.match(text, /Latest audit/);
});

test('runs page lists every real run from the two fixture audits', async () => {
  const { status, text } = await get(baseUrl, '/runs');
  assert.equal(status, 200);
  assert.match(text, /<strong>12<\/strong> runs/);
  assert.match(text, /<strong>259\.14<\/strong> credits/);
  assert.match(text, /<strong>2 broken<\/strong> \/ <strong>4 honored<\/strong>/);
  assert.match(text, new RegExp(BROKEN.auditId));
  assert.match(text, new RegExp(HONORED.auditId));
  assert.doesNotMatch(text, /Recorded audit: replay of real runs, not a live session\./);
  assert.match(text, /href="\/runs"/);
});

test('audit list shows both real records, status and post-repair provenance', async () => {
  const { status, text } = await get(baseUrl, '/audits');
  assert.equal(status, 200);
  assert.match(text, new RegExp(BROKEN.auditId));
  assert.match(text, new RegExp(HONORED.auditId));
  assert.match(text, /BROKEN/);
  assert.match(text, /HONORED/);
  assert.match(text, /Post-repair/);
});

test('Journey X-Ray renders promised and observed lanes with real run provenance', async () => {
  const { status, text } = await get(baseUrl, `/audits/${encodeURIComponent(HONORED.auditId)}`);
  assert.equal(status, 200);
  assert.match(text, /Journey X-Ray/);
  assert.match(text, /Promised/);
  assert.match(text, /Observed/);
  assert.match(text, /kane-cli evidence serve/);

  const observe = HONORED.scenarios[0]?.observe;
  const session = observe?.parsed.sessionDir?.split(/[\\/]/).filter(Boolean).pop();
  assert.ok(session, 'fixture must carry a session id');
  const escapedSession = session
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
  assert.ok(text.includes(escapedSession), 'session id is rendered (HTML-escaped)');
  assert.ok(observe?.evidence?.sha256);
  assert.match(text, new RegExp(observe.evidence.sha256));
});

test('BROKEN detail page shows Kane verdict fields', async () => {
  const { status, text } = await get(baseUrl, `/audits/${encodeURIComponent(BROKEN.auditId)}`);
  assert.equal(status, 200);
  assert.match(text, /Eligible \$60 cart is charged standard shipping/);
  assert.match(text, /Root cause/);
  assert.match(text, /Suggestion/);
  assert.match(text, /Signals/);
});

test('post-repair receipt is scoped and names the pre-repair audit', async () => {
  const { status, text } = await get(
    baseUrl,
    `/audits/${encodeURIComponent(HONORED.auditId)}/receipt`,
  );
  assert.equal(status, 200);
  assert.match(text, /Verified for the tested conditions at the recorded time/);
  assert.ok(HONORED.answersAuditId);
  assert.match(text, new RegExp(HONORED.answersAuditId));
  assert.doesNotMatch(text, /certified/i);
  assert.doesNotMatch(text, /\bsigned\b/i);
});

test('BROKEN receipt never claims verification', async () => {
  const { status, text } = await get(
    baseUrl,
    `/audits/${encodeURIComponent(BROKEN.auditId)}/receipt`,
  );
  assert.equal(status, 200);
  assert.match(text, /BROKEN/);
  assert.doesNotMatch(text, /verified for the tested conditions/i);
});

test('repair page reads the real diff from git and shows the hash comparison', async () => {
  const { status, text } = await get(baseUrl, `/repair/${encodeURIComponent(BROKEN.auditId)}`);
  assert.equal(status, 200);
  assert.match(text, /Closed loop/);
  assert.match(text, /What failed/);
  assert.match(text, /actual diff/);
  assert.match(text, /src\/lib\/shipping\.ts/);
  assert.match(text, /\* 100/);
  assert.match(text, /Unchanged rerun/);
  assert.match(text, new RegExp(HONORED.auditId));
  assert.match(text, /MATCH/);
  assert.match(text, /Agent loop · terminal-driven/);
  assert.match(text, /Pi is the coding agent/);
  assert.match(text, /not an in-app autonomous repair/);
  assert.match(text, /Bounded brief/);
  assert.match(text, /Allowed/);
  assert.match(text, /Forbidden/);
  assert.match(text, /4c8105f/);
  assert.match(text, /88536a9/);
  assert.match(text, /The agent may not ship until Kane passes the same objectives\./);
  assert.match(text, /6\/6/);
  assert.match(text, /OPEN/);
});

test('gate page shows the real audit gate and the patch gauntlet', async () => {
  const { status, text } = await get(baseUrl, '/gate');
  assert.equal(status, 200);
  assert.match(text, /Kern Gate/);
  assert.match(text, /The agent does not decide\. Kane does\./);
  assert.match(text, /Gate status/);
  assert.match(text, /The agent may not ship until Kane passes the same objectives\./);
  assert.match(text, /Patch gauntlet/);
  assert.match(text, /Make all shipping free/);
  assert.match(text, /Free only at \$60\+/);
  assert.match(text, /The audited pre-repair rule/);
  assert.match(text, /REJECT/);
  assert.match(text, /npm run gate/);
  assert.match(text, new RegExp(BROKEN.auditId));
  assert.match(text, new RegExp(HONORED.auditId));
});

test('repair page says when no post-repair audit exists', async () => {
  const onlyBrokenRoot = makeAuditRoot({ honored: false });
  const local = await startServer(onlyBrokenRoot);
  try {
    const { status, text } = await get(
      local.base,
      `/repair/${encodeURIComponent(BROKEN.auditId)}`,
    );
    assert.equal(status, 200);
    assert.match(text, /No post-repair audit yet/);
    assert.doesNotMatch(text, new RegExp(HONORED.auditId));
  } finally {
    await stopServer(local.server);
    rmSync(onlyBrokenRoot, { recursive: true, force: true });
  }
});

test('missing audit routes are 404, not fabricated pages', async () => {
  assert.equal((await get(baseUrl, '/audits/does-not-exist')).status, 404);
  assert.equal((await get(baseUrl, '/audits/does-not-exist/receipt')).status, 404);
  assert.equal((await get(baseUrl, '/repair/does-not-exist')).status, 404);
});

test('health endpoint reports the app and audit root', async () => {
  const response = await fetch(`${baseUrl}/health`);
  assert.equal(response.status, 200);
  const body = (await response.json()) as { ok: boolean; auditRoot: string };
  assert.equal(body.ok, true);
  assert.equal(body.auditRoot, root);
});

test('an empty audit directory renders explicit empty states', async () => {
  const emptyRoot = mkdtempSync(join(tmpdir(), 'kern-empty-audits-'));
  const local = await startServer(emptyRoot);
  try {
    const campaign = await get(local.base, '/');
    assert.equal(campaign.status, 200);
    assert.match(campaign.text, /No audit records yet/);

    const list = await get(local.base, '/audits');
    assert.equal(list.status, 200);
    assert.match(list.text, /No audit records on disk/);
  } finally {
    await stopServer(local.server);
    rmSync(emptyRoot, { recursive: true, force: true });
  }
});
