import { spawn, execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export const STORE_URL = 'http://127.0.0.1:4173/';

export type KaneCommand = {
  command: string;
  argsPrefix: string[];
  description: string;
};

export type RunKind = 'observe' | 'assert';

export type RunArtifacts = {
  scenarioId: string;
  kind: RunKind;
  source: 'live';
  objectivePath: string;
  stdoutPath: string;
  stderrPath: string;
  exitCode: number | null;
  exitCodeSource: 'process';
  timedOut: boolean;
  durationMs: number;
  argv: string[];
};

type SpawnResult = {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
  durationMs: number;
};

let cachedKane: KaneCommand | null = null;

/**
 * Resolve the Kane CLI to its JavaScript entry so we can spawn it with
 * `shell: false` on Windows. The global `kane-cli` shim is a .cmd file, and
 * Windows cannot execute .cmd files without a shell. Spawning the same CLI
 * through `node <bin/kane-cli.cjs>` keeps the argument array and shell:false
 * contract intact.
 */
export function resolveKaneCommand(): KaneCommand {
  if (cachedKane) return cachedKane;

  if (process.env.KANE_CLI_JS) {
    const jsPath = process.env.KANE_CLI_JS;
    if (!existsSync(jsPath)) {
      throw new Error(`KANE_CLI_JS does not exist: ${jsPath}`);
    }
    cachedKane = {
      command: process.execPath,
      argsPrefix: [jsPath],
      description: jsPath,
    };
    return cachedKane;
  }

  const whichCommand = process.platform === 'win32' ? 'where' : 'which';
  let candidates: string[] = [];
  try {
    candidates = execFileSync(whichCommand, ['kane-cli'], {
      encoding: 'utf8',
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    // Fall through to the platform-specific package locations below.
  }

  if (process.platform === 'win32') {
    const searchDirs = new Set<string>();
    for (const candidate of candidates) {
      searchDirs.add(dirname(candidate));
    }
    if (process.env.APPDATA) {
      searchDirs.add(join(process.env.APPDATA, 'npm'));
    }

    for (const base of searchDirs) {
      const packagePath = join(base, 'node_modules', '@testmuai', 'kane-cli', 'package.json');
      if (!existsSync(packagePath)) continue;
      const packageJson = JSON.parse(readFileSync(packagePath, 'utf8')) as {
        bin?: string | Record<string, string>;
      };
      const binRelative =
        typeof packageJson.bin === 'string'
          ? packageJson.bin
          : packageJson.bin?.['kane-cli'];
      if (!binRelative) continue;
      const jsPath = join(dirname(packagePath), binRelative);
      if (!existsSync(jsPath)) continue;
      cachedKane = {
        command: process.execPath,
        argsPrefix: [jsPath],
        description: jsPath,
      };
      return cachedKane;
    }

    throw new Error(
      'Could not resolve the Kane CLI JavaScript entry. Set KANE_CLI_JS to the path of the installed bin/kane-cli.cjs.',
    );
  }

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      cachedKane = {
        command: candidate,
        argsPrefix: [],
        description: candidate,
      };
      return cachedKane;
    }
  }

  cachedKane = { command: 'kane-cli', argsPrefix: [], description: 'kane-cli' };
  return cachedKane;
}

function spawnKane(kane: KaneCommand, args: string[], timeoutMs: number): Promise<SpawnResult> {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const child = spawn(kane.command, [...kane.argsPrefix, ...args], {
      shell: false,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    let timedOut = false;
    let settled = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, timeoutMs);

    const finish = (result: SpawnResult): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };

    child.stdout?.on('data', (chunk: Buffer) => stdoutChunks.push(chunk));
    child.stderr?.on('data', (chunk: Buffer) => stderrChunks.push(chunk));

    child.once('error', (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    });

    child.once('close', (code) => {
      finish({
        stdout: Buffer.concat(stdoutChunks).toString('utf8'),
        stderr: Buffer.concat(stderrChunks).toString('utf8'),
        exitCode: code,
        timedOut,
        durationMs: Date.now() - startedAt,
      });
    });
  });
}

function tail(text: string, length = 1200): string {
  const trimmed = text.trim();
  return trimmed.length <= length ? trimmed : `…${trimmed.slice(-length)}`;
}

async function checkStore(storeUrl: string): Promise<void> {
  const healthUrl = new URL('/health', storeUrl).toString();
  try {
    const response = await fetch(healthUrl, { signal: AbortSignal.timeout(3_000) });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const body = (await response.json()) as { ok?: unknown };
    if (body.ok !== true) {
      throw new Error('health response did not contain ok: true');
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Demo store is not reachable at ${healthUrl}. Start it with "npm start" in another process. (${detail})`,
    );
  }
}

async function checkKaneAuth(kane: KaneCommand): Promise<void> {
  const result = await spawnKane(kane, ['whoami'], 30_000);
  const combined = `${result.stdout}\n${result.stderr}`;
  if (result.timedOut) {
    throw new Error('kane-cli whoami timed out after 30s');
  }
  if (result.exitCode !== 0 || !/Authenticated/.test(combined) || /Not logged in/i.test(combined)) {
    throw new Error(
      `Kane CLI is not authenticated. Run "kane-cli login" first.\n` +
        `whoami exited ${result.exitCode}.\n${tail(combined)}`,
    );
  }
}

/**
 * Fail before any credit is spent if the store or Kane is not ready.
 */
export async function preflightOrThrow(
  storeUrl = STORE_URL,
): Promise<{ kane: KaneCommand; storeUrl: string }> {
  await checkStore(storeUrl);
  const kane = resolveKaneCommand();
  await checkKaneAuth(kane);
  return { kane, storeUrl };
}

export type RunKaneOptions = {
  scenarioId: string;
  kind: RunKind;
  objective: string;
  runDir: string;
  storeUrl?: string;
  maxSteps?: number;
  timeoutSeconds?: number;
};

/**
 * Run one real Kane objective, saving stdout, stderr and the objective text.
 * The caller must call preflightOrThrow() once before the first run.
 */
export async function runKaneObjective(options: RunKaneOptions): Promise<RunArtifacts> {
  const kane = resolveKaneCommand();
  const storeUrl = options.storeUrl ?? STORE_URL;
  const maxSteps = options.maxSteps ?? 40;
  const timeoutSeconds = options.timeoutSeconds ?? 240;

  mkdirSync(options.runDir, { recursive: true });
  const objectivePath = join(options.runDir, `${options.kind}.objective.txt`);
  const stdoutPath = join(options.runDir, `${options.kind}.ndjson`);
  const stderrPath = join(options.runDir, `${options.kind}.stderr.log`);
  writeFileSync(objectivePath, `${options.objective}\n`, 'utf8');

  const argv = [
    'run',
    options.objective,
    '--url',
    storeUrl,
    '--agent',
    '--headless',
    '--max-steps',
    String(maxSteps),
    '--timeout',
    String(timeoutSeconds),
  ];

  const result = await spawnKane(kane, argv, timeoutSeconds * 1000 + 30_000);
  writeFileSync(stdoutPath, result.stdout, 'utf8');
  writeFileSync(stderrPath, result.stderr, 'utf8');

  return {
    scenarioId: options.scenarioId,
    kind: options.kind,
    source: 'live',
    objectivePath,
    stdoutPath,
    stderrPath,
    exitCode: result.exitCode,
    exitCodeSource: 'process',
    timedOut: result.timedOut,
    durationMs: result.durationMs,
    argv: [kane.command, ...kane.argsPrefix, ...argv],
  };
}
