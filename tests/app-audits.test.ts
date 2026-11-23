import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  findPostRepairAudit,
  latestAudit,
  loadAudit,
  loadAudits,
} from '../src/app/audits.ts';
import { BROKEN, HONORED, makeAuditRoot } from './fixtures/audits/fixture.ts';

function cleanup(root: string): void {
  rmSync(root, { recursive: true, force: true });
}

test('reads the real BROKEN and HONORED audits newest first', () => {
  const root = makeAuditRoot();
  try {
    const index = loadAudits(root);
    assert.equal(index.audits.length, 2);
    assert.equal(index.audits[0]?.audit.auditId, HONORED.auditId);
    assert.equal(index.audits[0]?.audit.overallStatus, 'HONORED');
    assert.equal(index.audits[1]?.audit.auditId, BROKEN.auditId);
    assert.equal(index.audits[1]?.audit.overallStatus, 'BROKEN');
    assert.equal(index.incomplete.length, 0);
    assert.equal(index.errors.length, 0);
    assert.equal(latestAudit(index)?.audit.auditId, HONORED.auditId);
  } finally {
    cleanup(root);
  }
});

test('finds the post-repair audit that answers the pre-repair audit', () => {
  const root = makeAuditRoot();
  try {
    const index = loadAudits(root);
    const post = findPostRepairAudit(index, BROKEN.auditId);
    assert.equal(post?.audit.auditId, HONORED.auditId);
    assert.equal(post?.audit.answersAuditId, BROKEN.auditId);
    assert.equal(post?.audit.objectiveHashesMatch, true);
  } finally {
    cleanup(root);
  }
});

test('loads one audit and rejects missing or unsafe ids', () => {
  const root = makeAuditRoot();
  try {
    const loaded = loadAudit(HONORED.auditId, root);
    assert.equal(loaded.ok, true);
    if (loaded.ok) {
      assert.equal(loaded.summary.audit.overallStatus, 'HONORED');
    }

    const missing = loadAudit('2026-01-01T00-00-00-000Z-missing', root);
    assert.equal(missing.ok, false);
    if (!missing.ok) {
      assert.equal(missing.reason, 'missing');
      assert.match(missing.message, /No audit\.json/);
    }

    const unsafe = loadAudit('../outside', root);
    assert.equal(unsafe.ok, false);
    if (!unsafe.ok) {
      assert.equal(unsafe.reason, 'invalid-id');
    }
  } finally {
    cleanup(root);
  }
});

test('a missing audit directory is an empty state, not an error', () => {
  const root = join(tmpdir(), `kern-missing-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const index = loadAudits(root);
  assert.deepEqual(index, { audits: [], incomplete: [], errors: [] });
});

test('unreadable files are reported and valid audits still load', () => {
  const root = makeAuditRoot();
  try {
    mkdirSync(join(root, 'bad-audit'));
    writeFileSync(join(root, 'bad-audit', 'audit.json'), '{ not json', 'utf8');
    mkdirSync(join(root, 'interrupted-audit'));

    const index = loadAudits(root);
    assert.equal(index.audits.length, 2);
    assert.equal(index.errors.length, 1);
    assert.match(index.errors[0] ?? '', /bad-audit/);
    assert.ok(index.incomplete.includes('interrupted-audit'));
  } finally {
    cleanup(root);
  }
});
