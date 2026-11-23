/**
 * Build sanitized, public copies of the two canonical audits.
 *
 * The originals remain in `.data/audits` (gitignored). This script strips
 * filesystem paths, Test Manager URLs and raw run_end data; it keeps the
 * evidence hashes, objective hashes, verdicts and cents. It refuses to write a
 * copy if any home/absolute path survives.
 *
 * Run with the original `.data` audits present:
 *   node scripts/record-audits.ts
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const AUDIT_IDS = [
  '2026-11-22T00-53-05-669Z-f5230a',
  '2026-11-23T12-35-29-692Z-48b993',
];

const BANNED_KEYS = new Set([
  'sessionDir',
  'testUrl',
  'evidencePath',
  'rawRunEnd',
  'argv',
  'stdoutPath',
  'stderrPath',
  'objectivePath',
  'sourcePath',
  'copiedPath',
  'session_dir',
  'test_url',
  'run_dir',
  'pack',
]);

type Json = Record<string, any>;

function sha256(value: Buffer | string): string {
  return createHash('sha256').update(value).digest('hex');
}

function sessionIdFor(directory: unknown): string | null {
  if (typeof directory !== 'string') return null;
  return directory.split(/[\\/]/).filter(Boolean).pop() ?? null;
}

function stripRun(run: Json | null): void {
  if (!run || typeof run !== 'object') return;

  const parsed = run.parsed;
  if (parsed && typeof parsed === 'object') {
    const sessionId = sessionIdFor(parsed.sessionDir);
    if (sessionId) parsed.sessionId = sessionId;
    delete parsed.sessionDir;
    delete parsed.testUrl;
    delete parsed.evidencePath;
    delete parsed.rawRunEnd;
  }

  if (run.artifacts && typeof run.artifacts === 'object') {
    delete run.artifacts.argv;
    delete run.artifacts.stdoutPath;
    delete run.artifacts.stderrPath;
    delete run.artifacts.objectivePath;
  }

  if (run.evidence && typeof run.evidence === 'object') {
    run.evidence = {
      sha256: run.evidence.sha256,
      bytes: run.evidence.bytes,
    };
  }
}

function findLeaks(value: unknown, path = ''): string[] {
  if (typeof value === 'string') {
    if (/(?:^|[^A-Za-z])[A-Za-z]:[\\/]|\/Users\/|\/home\//.test(value)) {
      return [`${path}: contains a home or absolute path: ${value}`];
    }
    return [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((child, index) => findLeaks(child, `${path}[${index}]`));
  }
  if (value && typeof value === 'object') {
    const leaks: string[] = [];
    for (const [key, child] of Object.entries(value)) {
      if (BANNED_KEYS.has(key)) leaks.push(`${path}.${key}: banned key`);
      leaks.push(...findLeaks(child, `${path}.${key}`));
    }
    return leaks;
  }
  return [];
}

for (const auditId of AUDIT_IDS) {
  const sourcePath = join(ROOT, '.data', 'audits', auditId, 'audit.json');
  if (!existsSync(sourcePath)) {
    console.error(`RECORDING ABORTED: missing original ${sourcePath}`);
    process.exit(1);
  }

  const raw = readFileSync(sourcePath);
  const originalAuditSha256 = sha256(raw);
  const audit = JSON.parse(raw.toString('utf8')) as Json;

  if (!Array.isArray(audit.scenarios)) {
    throw new Error(`${auditId}: scenarios is not an array`);
  }
  for (const scenario of audit.scenarios) {
    stripRun(scenario.observe);
    stripRun(scenario.assert);
  }

  audit.source = 'recorded';
  audit.originalAuditSha256 = originalAuditSha256;

  const leaks = findLeaks(audit);
  if (leaks.length > 0) {
    console.error(`RECORDING ABORTED for ${auditId}: sensitive values survived`);
    for (const leak of leaks) console.error(`  ${leak}`);
    process.exit(1);
  }

  const destination = join(ROOT, 'recorded', auditId, 'audit.json');
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(destination, `${JSON.stringify(audit, null, 2)}\n`, 'utf8');
  const recordedSha256 = sha256(readFileSync(destination));
  console.log(`${auditId}`);
  console.log(`  original audit.json sha256 ${originalAuditSha256}`);
  console.log(`  recorded audit.json sha256 ${recordedSha256}`);
  console.log(`  recorded bytes ${statSync(destination).size}`);
}
