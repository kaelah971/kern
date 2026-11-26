import test from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { loadAudits, resolveAuditRoot } from '../src/app/audits.ts';
import { readPolicy } from '../src/app/data.ts';
import { renderAuditDetail } from '../src/app/render.ts';
import { renderReceiptBody } from '../src/app/receipt.ts';
import { createAppServer } from '../src/app/server.ts';
import { loadContract } from '../src/lib/contract.ts';
import { BROKEN, HONORED, makeAuditRoot } from './fixtures/audits/fixture.ts';

const contract = loadContract();
const policy = readPolicy(process.cwd());
const recordedRoot = join(process.cwd(), 'recorded');

async function listen(server: Server): Promise<string> {
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve());
  });
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

async function close(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

test('recorded copies are sanitized and marked source: recorded', () => {
  const index = loadAudits(recordedRoot);
  assert.equal(index.audits.length, 2);
  assert.equal(index.errors.length, 0);
  assert.equal(index.incomplete.length, 0);

  for (const summary of index.audits) {
    assert.equal(summary.recorded, true);
    assert.ok(summary.originalAuditSha256);
    const text = readFileSync(
      join(recordedRoot, summary.audit.auditId, 'audit.json'),
      'utf8',
    );
    assert.doesNotMatch(
      text,
      /C:\\\\Users|C:\/Users|\/Users\/|\/home\/|"test_url"|"session_dir"|"rawRunEnd"|"argv"/,
    );
  }

  const recordedC = index.audits.find((summary) => summary.audit.auditId === HONORED.auditId);
  assert.ok(recordedC);
  assert.equal(recordedC.originalAuditSha256, '6d9a2c1ddc078166fe32dbdf1b975ebba59a6598bca3bfaf8e7f2a037eec1eb6');
  assert.equal(recordedC.audit.answersAuditId, BROKEN.auditId);
  assert.equal(recordedC.audit.postRepair, true);
});

test('the recorded banner appears for source: recorded and never for source: live', () => {
  const recordedIndex = loadAudits(recordedRoot);
  const recordedC = recordedIndex.audits.find(
    (summary) => summary.audit.auditId === HONORED.auditId,
  );
  assert.ok(recordedC);

  const liveRoot = makeAuditRoot();
  try {
    const liveIndex = loadAudits(liveRoot);
    const liveC = liveIndex.audits.find(
      (summary) => summary.audit.auditId === HONORED.auditId,
    );
    assert.ok(liveC);
    assert.equal(liveC.recorded, false);

    const recordedPage = renderAuditDetail(recordedC, contract);
    assert.match(recordedPage, /Recorded audit: replay of real runs, not a live session/);
    const recordedSession = (
      recordedC.audit.scenarios[0]?.observe?.parsed as { sessionId?: string } | undefined
    )?.sessionId;
    assert.ok(recordedSession);
    assert.match(recordedPage, new RegExp(recordedSession));

    const livePage = renderAuditDetail(liveC, contract);
    assert.doesNotMatch(livePage, /Recorded audit: replay of real runs, not a live session/);

    const recordedReceipt = renderReceiptBody(recordedC.audit, contract, policy);
    assert.match(recordedReceipt, /Recorded audit: replay of real runs, not a live session/);
    assert.match(recordedReceipt, /\.evidence files themselves are not included/);

    const liveReceipt = renderReceiptBody(liveC.audit, contract, policy);
    assert.doesNotMatch(liveReceipt, /Recorded audit: replay of real runs, not a live session/);
  } finally {
    rmSync(liveRoot, { recursive: true, force: true });
  }
});

test('resolveAuditRoot prefers live .data and falls back to recorded', () => {
  const repo = mkdtempSync(join(tmpdir(), 'kern-resolve-recorded-'));
  const previous = process.env.KERN_RECORDED_ROOT;
  try {
    cpSync(recordedRoot, join(repo, 'recorded'), { recursive: true });
    process.env.KERN_RECORDED_ROOT = join(repo, 'recorded');
    const recorded = resolveAuditRoot(repo);
    assert.equal(recorded.source, 'recorded');
    assert.equal(recorded.root, join(repo, 'recorded'));

    const liveSource = makeAuditRoot();
    try {
      mkdirSync(join(repo, '.data', 'audits'), { recursive: true });
      cpSync(liveSource, join(repo, '.data', 'audits'), { recursive: true });
      const live = resolveAuditRoot(repo);
      assert.equal(live.source, 'live');
      assert.equal(live.root, join(repo, '.data', 'audits'));
    } finally {
      rmSync(liveSource, { recursive: true, force: true });
    }
  } finally {
    if (previous === undefined) delete process.env.KERN_RECORDED_ROOT;
    else process.env.KERN_RECORDED_ROOT = previous;
    rmSync(repo, { recursive: true, force: true });
  }
});

test('a clone with no .data serves the recorded audits with the banner', async () => {
  const repo = mkdtempSync(join(tmpdir(), 'kern-recorded-clone-'));
  const previous = process.env.KERN_RECORDED_ROOT;
  try {
    cpSync(recordedRoot, join(repo, 'recorded'), { recursive: true });
    process.env.KERN_RECORDED_ROOT = join(repo, 'recorded');
    const server = createAppServer({ repoRoot: repo });
    const base = await listen(server);
    try {
      const campaign = await fetch(`${base}/campaign`);
      assert.equal(campaign.status, 200);
      const campaignText = await campaign.text();
      assert.match(campaignText, /Recorded audit: replay of real runs, not a live session/);
      assert.match(campaignText, new RegExp(HONORED.auditId));

      const detail = await fetch(`${base}/audits/${encodeURIComponent(HONORED.auditId)}`);
      assert.equal(detail.status, 200);
      assert.match(
        await detail.text(),
        /Recorded audit: replay of real runs, not a live session/,
      );

      const health = await fetch(`${base}/health`);
      assert.equal(health.status, 200);
      const body = (await health.json()) as { auditSource: string; auditRoot: string };
      assert.equal(body.auditSource, 'recorded');
      assert.equal(body.auditRoot, join(repo, 'recorded'));
    } finally {
      await close(server);
    }
  } finally {
    if (previous === undefined) delete process.env.KERN_RECORDED_ROOT;
    else process.env.KERN_RECORDED_ROOT = previous;
    rmSync(repo, { recursive: true, force: true });
  }
});
