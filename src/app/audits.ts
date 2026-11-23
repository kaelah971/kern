import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import type { AuditRecord, AuditStatus } from '../lib/audit.ts';

const STATUSES = new Set<AuditStatus>(['HONORED', 'BROKEN', 'INCONCLUSIVE', 'INFRA_ERROR']);

export type AuditSummary = {
  audit: AuditRecord;
  path: string;
  mtime: string;
};

export type AuditIndex = {
  audits: AuditSummary[];
  /** Directories with no audit.json, e.g. an interrupted run. */
  incomplete: string[];
  /** Directories whose audit.json exists but could not be read. */
  errors: string[];
};

export type AuditLoad =
  | { ok: true; summary: AuditSummary }
  | { ok: false; reason: 'missing' | 'invalid-id' | 'unreadable'; message: string };

export function defaultAuditRoot(repoRoot = process.cwd()): string {
  return join(repoRoot, '.data', 'audits');
}

function isSafeId(id: string): boolean {
  return /^[0-9A-Za-z][0-9A-Za-z._-]*$/.test(id) && !id.includes('..');
}

function parseAuditFile(path: string): AuditRecord {
  const parsed = JSON.parse(readFileSync(path, 'utf8')) as AuditRecord;
  if (typeof parsed.auditId !== 'string' || parsed.auditId.length === 0) {
    throw new Error('auditId is missing');
  }
  if (!STATUSES.has(parsed.overallStatus)) {
    throw new Error(`unknown overallStatus: ${String(parsed.overallStatus)}`);
  }
  if (!Array.isArray(parsed.scenarios)) {
    throw new Error('scenarios is not an array');
  }
  if (typeof parsed.contract !== 'object' || parsed.contract === null) {
    throw new Error('contract is missing');
  }
  return parsed;
}

function sortNewestFirst(audits: AuditSummary[]): AuditSummary[] {
  return audits.sort((left, right) => {
    if (left.audit.startedAt === right.audit.startedAt) {
      return right.audit.auditId.localeCompare(left.audit.auditId);
    }
    return right.audit.startedAt.localeCompare(left.audit.startedAt);
  });
}

export function loadAudits(root = defaultAuditRoot()): AuditIndex {
  if (!existsSync(root)) {
    return { audits: [], incomplete: [], errors: [] };
  }

  const audits: AuditSummary[] = [];
  const incomplete: string[] = [];
  const errors: string[] = [];

  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const path = join(root, entry.name, 'audit.json');
    if (!existsSync(path)) {
      incomplete.push(entry.name);
      continue;
    }
    try {
      audits.push({
        audit: parseAuditFile(path),
        path,
        mtime: statSync(path).mtime.toISOString(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${entry.name}: ${message}`);
    }
  }

  return {
    audits: sortNewestFirst(audits),
    incomplete: incomplete.sort(),
    errors,
  };
}

export function loadAudit(id: string, root = defaultAuditRoot()): AuditLoad {
  if (!isSafeId(id)) {
    return { ok: false, reason: 'invalid-id', message: `Invalid audit id: ${id}` };
  }
  const rootPath = resolve(root);
  const file = resolve(rootPath, id, 'audit.json');
  if (!file.startsWith(`${rootPath}${sep}`)) {
    return { ok: false, reason: 'invalid-id', message: `Audit id escapes the audit root: ${id}` };
  }
  if (!existsSync(file)) {
    return {
      ok: false,
      reason: 'missing',
      message: `No audit.json for ${id} in ${rootPath}`,
    };
  }
  try {
    return {
      ok: true,
      summary: {
        audit: parseAuditFile(file),
        path: file,
        mtime: statSync(file).mtime.toISOString(),
      },
    };
  } catch (error) {
    return {
      ok: false,
      reason: 'unreadable',
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

export function latestAudit(index: AuditIndex): AuditSummary | null {
  return index.audits[0] ?? null;
}

export function findPostRepairAudit(index: AuditIndex, preAuditId: string): AuditSummary | null {
  return (
    index.audits.find(
      (summary) =>
        summary.audit.postRepair === true && summary.audit.answersAuditId === preAuditId,
    ) ?? null
  );
}
