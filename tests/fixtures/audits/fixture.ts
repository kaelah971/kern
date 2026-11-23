import { copyFileSync, mkdirSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AuditRecord } from '../../../src/lib/audit.ts';

export const BROKEN_PATH = new URL('./broken-audit.json', import.meta.url);
export const HONORED_PATH = new URL('./honored-audit.json', import.meta.url);

export const BROKEN = JSON.parse(readFileSync(BROKEN_PATH, 'utf8')) as AuditRecord;
export const HONORED = JSON.parse(readFileSync(HONORED_PATH, 'utf8')) as AuditRecord;

export function makeAuditRoot(options: { honored?: boolean } = {}): string {
  const root = mkdtempSync(join(tmpdir(), 'kern-audit-fixtures-'));
  mkdirSync(join(root, BROKEN.auditId));
  copyFileSync(BROKEN_PATH, join(root, BROKEN.auditId, 'audit.json'));
  if (options.honored !== false) {
    mkdirSync(join(root, HONORED.auditId));
    copyFileSync(HONORED_PATH, join(root, HONORED.auditId, 'audit.json'));
  }
  return root;
}
