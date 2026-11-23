import { execFileSync } from 'node:child_process';
import { PRE_FIX_SHA } from './data.ts';

export type DiffResult =
  | { ok: true; diff: string }
  | { ok: false; error: string };

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
