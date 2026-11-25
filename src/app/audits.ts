import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AuditRecord, AuditStatus } from '../lib/audit.ts';

const STATUSES = new Set<AuditStatus>(['HONORED', 'BROKEN', 'INCONCLUSIVE', 'INFRA_ERROR']);

export type RecordedAudit = AuditRecord & {
  source?: 'recorded';
  originalAuditSha256?: string;
};

export function isRecorded(audit: AuditRecord): boolean {
  return (audit as RecordedAudit).source === 'recorded';
}

export type AuditSummary = {
  audit: RecordedAudit;
  path: string;
  mtime: string;
  recorded: boolean;
  originalAuditSha256: string | null;
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

export function recordedAuditRoot(repoRoot = process.cwd()): string {
  const fromEnv = process.env.KERN_RECORDED_ROOT;
  if (fromEnv && existsSync(fromEnv)) return fromEnv;

  // src/app/audits.ts -> repository root -> recorded/. Vercel's cwd is
  // /var/task, but the function bundle keeps this module-relative path.
  const moduleRelative = fileURLToPath(new URL('../../recorded', import.meta.url));
  if (existsSync(moduleRelative)) return moduleRelative;

  return join(repoRoot, 'recorded');
}

function hasAuditJson(root: string): boolean {
  try {
    return readdirSync(root, { withFileTypes: true }).some(
      (entry) => entry.isDirectory() && existsSync(join(root, entry.name, 'audit.json')),
    );
  } catch {
    return false;
  }
}

/**
 * Prefer live `.data/audits` evidence when it exists. A public clone has no
 * `.data`, so fall back to the committed, sanitized `recorded/` copies.
 */
export function resolveAuditRoot(
  repoRoot = process.cwd(),
): { root: string; source: 'live' | 'recorded' } {
  // An explicit source wins. `KERN_AUDIT_SOURCE=recorded` is how the static
  // export builds the public site from the committed copies even when local
  // .data/ evidence exists on the build machine.
  if (process.env.KERN_AUDIT_SOURCE === 'recorded') {
    const recordedOnly = recordedAuditRoot(repoRoot);
    if (hasAuditJson(recordedOnly)) return { root: recordedOnly, source: 'recorded' };
  }

  const live = defaultAuditRoot(repoRoot);
  if (hasAuditJson(live)) return { root: live, source: 'live' };

  const recorded = recordedAuditRoot(repoRoot);
  if (hasAuditJson(recorded)) return { root: recorded, source: 'recorded' };

  return { root: live, source: 'live' };
}

function isSafeId(id: string): boolean {
  return /^[0-9A-Za-z][0-9A-Za-z._-]*$/.test(id) && !id.includes('..');
}

function parseAuditFile(path: string): RecordedAudit {
  const parsed = JSON.parse(readFileSync(path, 'utf8')) as RecordedAudit;
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
      const parsed = parseAuditFile(path);
      audits.push({
        audit: parsed,
        path,
        mtime: statSync(path).mtime.toISOString(),
        recorded: parsed.source === 'recorded',
        originalAuditSha256: parsed.originalAuditSha256 ?? null,
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
    const parsed = parseAuditFile(file);
    return {
      ok: true,
      summary: {
        audit: parsed,
        path: file,
        mtime: statSync(file).mtime.toISOString(),
        recorded: parsed.source === 'recorded',
        originalAuditSha256: parsed.originalAuditSha256 ?? null,
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
