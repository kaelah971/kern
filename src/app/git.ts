import { execFileSync } from 'node:child_process';
import { PRE_FIX_SHA, REPAIR_COMMIT_SHA, REPAIR_MERGE_SHA } from './data.ts';

export type DiffResult =
  | { ok: true; diff: string }
  | { ok: false; error: string };

export type CommitFact = {
  sha: string;
  shortSha: string;
  subject: string;
  committedAt: string;
  author: string;
  files: string[];
};

export type RepairFacts = {
  fix: CommitFact | null;
  merge: CommitFact | null;
  error: string | null;
};

function readCommit(repoRoot: string, sha: string, withFiles: boolean): CommitFact {
  const metadata = execFileSync(
    'git',
    ['show', '-s', '--format=%H%n%h%n%s%n%aI%n%an', sha],
    {
      cwd: repoRoot,
      encoding: 'utf8',
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  )
    .trim()
    .split('\n');
  const [fullSha, shortSha, subject, committedAt, author] = metadata;
  if (!fullSha || !shortSha || !subject || !committedAt || !author) {
    throw new Error(`git returned incomplete metadata for ${sha}`);
  }
  const files = withFiles
    ? execFileSync('git', ['show', '--name-only', '--format=', sha], {
        cwd: repoRoot,
        encoding: 'utf8',
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      })
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
    : [];
  return { sha: fullSha, shortSha, subject, committedAt, author, files };
}

/**
 * Read the actual repair commit and human merge from git. The public build
 * bakes this into the HTML; the browser never types an agent name or SHA.
 */
export function readRepairFacts(repoRoot: string): RepairFacts {
  try {
    return {
      fix: readCommit(repoRoot, REPAIR_COMMIT_SHA, true),
      merge: readCommit(repoRoot, REPAIR_MERGE_SHA, false),
      error: null,
    };
  } catch (error) {
    return {
      fix: null,
      merge: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Read the actual repair diff from git. The browser never retypes the patch.
 */
export function readShippingDiff(repoRoot: string, preFixSha = PRE_FIX_SHA): DiffResult {
  try {
    const diff = execFileSync(
      'git',
      ['diff', preFixSha, 'HEAD', '--', 'src/lib/shipping.ts'],
      {
        cwd: repoRoot,
        encoding: 'utf8',
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
    return { ok: true, diff };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
}
