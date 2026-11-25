import { spawn, type ChildProcess } from 'node:child_process';
import { createWriteStream, mkdirSync, readFileSync, type WriteStream } from 'node:fs';
import { basename, dirname, isAbsolute, join, relative } from 'node:path';
import type { PresetId } from '../lib/catalog.ts';
import { PRESET_CARTS } from '../lib/catalog.ts';
import { resolveKaneCommand } from '../lib/kane/runner.ts';

export const LIVE_LIMITS = {
  perHour: 3,
  perDay: 20,
  minBalanceCredits: 120,
  watchdogMs: 5 * 60 * 1000,
} as const;

export const LIVE_SCENARIOS = Object.keys(PRESET_CARTS) as PresetId[];

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export type LiveState = 'idle' | 'running' | 'done' | 'failed';

export type LiveSnapshot = {
  state: LiveState;
  scenario: PresetId | null;
  startedAt: string | null;
  elapsedSeconds: number | null;
  lastLine: string;
  pid: number | null;
  auditId: string | null;
  auditUrl: string | null;
  error: string | null;
  logPath: string | null;
  limits: {
    perHour: number;
    perDay: number;
    minBalanceCredits: number;
    oneAtATime: true;
  };
  startsLastHour: number;
  startsLastDay: number;
};

export type LiveStartResult =
  | { ok: true; runId: string }
  | { ok: false; status: 409 | 429 | 503; reason: string };

type CompletedRun = {
  state: 'done' | 'failed';
  scenario: PresetId;
  startedAt: number;
  lastLine: string;
  auditId: string | null;
  error: string | null;
  logPath: string;
};

type ActiveRun = {
  runId: string;
  scenario: PresetId;
  startedAt: number;
  pid: number | null;
  child: ChildProcess;
  lastLine: string;
  output: string;
  stdoutPath: string;
  stderrPath: string;
  logPath: string;
  timer: NodeJS.Timeout;
  timedOut: boolean;
  finished: boolean;
  stdoutStream: WriteStream;
  stderrStream: WriteStream;
};

export type LiveControllerOptions = {
  repoRoot?: string;
  logRoot?: string;
  readBalance?: () => Promise<number>;
  storeHealthy?: () => Promise<boolean>;
  spawnRun?: (scenario: PresetId) => ChildProcess;
  killTree?: (pid: number) => void;
  now?: () => number;
  watchdogMs?: number;
  perHour?: number;
  perDay?: number;
  minBalanceCredits?: number;
};

function defaultKillTree(pid: number): void {
  if (process.platform === 'win32') {
    try {
      spawn('taskkill', ['/PID', String(pid), '/T', '/F'], {
        stdio: 'ignore',
        windowsHide: true,
      });
    } catch {
      // The child.kill('SIGKILL') fallback below still runs.
    }
    return;
  }

  try {
    process.kill(-pid, 'SIGKILL');
  } catch {
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      // The process may already be gone.
    }
  }
}

function defaultStoreHealthy(): Promise<boolean> {
  return new Promise((resolve) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2_000);
    fetch('http://127.0.0.1:4173/health', { signal: controller.signal })
      .then((response) => resolve(response.ok))
      .catch(() => resolve(false))
      .finally(() => clearTimeout(timer));
  });
}

function defaultReadBalance(): Promise<number> {
  return new Promise((resolve, reject) => {
    let kane: ReturnType<typeof resolveKaneCommand>;
    try {
      kane = resolveKaneCommand();
    } catch (error) {
      reject(error);
      return;
    }

    const child = spawn(kane.command, [...kane.argsPrefix, 'balance'], {
      shell: false,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    let settled = false;
    const finish = (error: Error | null, credits?: number): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(error);
      else resolve(credits ?? 0);
    };
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      finish(new Error('kane-cli balance timed out after 20 seconds'));
    }, 20_000);

    child.stdout?.on('data', (chunk: Buffer) => stdout.push(chunk));
    child.stderr?.on('data', (chunk: Buffer) => stderr.push(chunk));
    child.once('error', (error: Error) => finish(error));
    child.once('close', (code: number | null) => {
      const text = `${Buffer.concat(stdout).toString('utf8')}\n${Buffer.concat(
        stderr,
      ).toString('utf8')}`;
      if (code !== 0) {
        finish(new Error(`kane-cli balance exited with code ${code ?? 'null'}: ${text.trim()}`));
        return;
      }
      const match = /(?:available\s+)?credits?\s*[:=]?\s*([\d,]+(?:\.\d+)?)/i.exec(text);
      if (!match) {
        finish(new Error(`could not parse kane-cli balance output: ${text.trim()}`));
        return;
      }
      const credits = Number(match[1]!.replaceAll(',', ''));
      if (!Number.isFinite(credits)) {
        finish(new Error(`invalid kane-cli balance output: ${text.trim()}`));
        return;
      }
      finish(null, credits);
    });
  });
}

function auditIdFromLogs(text: string): string | null {
  const pathMatch = /Audit JSON:\s*(.+?audit\.json)/.exec(text);
  if (pathMatch) {
    const id = basename(dirname(pathMatch[1]!.trim()));
    if (id && id !== '.' && id !== '..') return id;
  }
  const idMatch = /^Audit:\s*(\S+)\s*$/m.exec(text);
  if (idMatch) return idMatch[1]!;
  return null;
}

function displayPath(repoRoot: string, path: string): string {
  const rel = relative(repoRoot, path);
  return rel && !rel.startsWith('..') && !isAbsolute(rel) ? rel.replaceAll('\\', '/') : path;
}

/**
 * State for the operator-only live check. Everything here is reached only when
 * the app was built with live mode enabled; a public deployment never creates
 * this controller.
 */
export class LiveController {
  private readonly repoRoot: string;
  private readonly logRoot: string;
  private readonly readBalance: () => Promise<number>;
  private readonly storeHealthy: () => Promise<boolean>;
  private readonly spawnRun: (scenario: PresetId) => ChildProcess;
  private readonly killTree: (pid: number) => void;
  private readonly now: () => number;
  private readonly watchdogMs: number;
  private readonly perHour: number;
  private readonly perDay: number;
  private readonly minBalanceCredits: number;

  private history: number[] = [];
  private active: ActiveRun | null = null;
  private completed: CompletedRun | null = null;
  private starting = false;

  constructor(options: LiveControllerOptions = {}) {
    this.repoRoot = options.repoRoot ?? process.cwd();
    this.logRoot = options.logRoot ?? join(this.repoRoot, '.data', 'live');
    this.readBalance = options.readBalance ?? defaultReadBalance;
    this.storeHealthy = options.storeHealthy ?? defaultStoreHealthy;
    this.now = options.now ?? Date.now;
    this.watchdogMs = options.watchdogMs ?? LIVE_LIMITS.watchdogMs;
    this.perHour = options.perHour ?? LIVE_LIMITS.perHour;
    this.perDay = options.perDay ?? LIVE_LIMITS.perDay;
    this.minBalanceCredits = options.minBalanceCredits ?? LIVE_LIMITS.minBalanceCredits;
    this.killTree = options.killTree ?? defaultKillTree;
    this.spawnRun =
      options.spawnRun ??
      ((scenario) =>
        spawn(
          process.execPath,
          [join(this.repoRoot, 'scripts', 'kane-audit.ts'), '--scenario', scenario],
          {
            cwd: this.repoRoot,
            env: process.env,
            stdio: ['ignore', 'pipe', 'pipe'],
            windowsHide: true,
            detached: process.platform !== 'win32',
          },
        ));
  }

  snapshot(now = this.now()): LiveSnapshot {
    const startsLastHour = this.history.filter((startedAt) => now - startedAt < HOUR_MS).length;
    const startsLastDay = this.history.filter((startedAt) => now - startedAt < DAY_MS).length;
    const limits = {
      perHour: this.perHour,
      perDay: this.perDay,
      minBalanceCredits: this.minBalanceCredits,
      oneAtATime: true as const,
    };

    if (this.active) {
      return {
        state: 'running',
        scenario: this.active.scenario,
        startedAt: new Date(this.active.startedAt).toISOString(),
        elapsedSeconds: Math.max(0, Math.floor((now - this.active.startedAt) / 1000)),
        lastLine: this.active.lastLine,
        pid: this.active.pid,
        auditId: null,
        auditUrl: null,
        error: null,
        logPath: this.active.logPath,
        limits,
        startsLastHour,
        startsLastDay,
      };
    }

    if (this.completed) {
      return {
        state: this.completed.state,
        scenario: this.completed.scenario,
        startedAt: new Date(this.completed.startedAt).toISOString(),
        elapsedSeconds: null,
        lastLine: this.completed.lastLine,
        pid: null,
        auditId: this.completed.auditId,
        auditUrl: this.completed.auditId
          ? `/audits/${encodeURIComponent(this.completed.auditId)}`
          : null,
        error: this.completed.error,
        logPath: this.completed.logPath,
        limits,
        startsLastHour,
        startsLastDay,
      };
    }

    return {
      state: 'idle',
      scenario: null,
      startedAt: null,
      elapsedSeconds: null,
      lastLine: '',
      pid: null,
      auditId: null,
      auditUrl: null,
      error: null,
      logPath: null,
      limits,
      startsLastHour,
      startsLastDay,
    };
  }

  private nextAllowed(now: number): number | null {
    const hourly = this.history.filter((startedAt) => now - startedAt < HOUR_MS);
    const daily = this.history.filter((startedAt) => now - startedAt < DAY_MS);
    let next: number | null = null;

    if (hourly.length >= this.perHour) {
      const expiring = hourly[hourly.length - this.perHour]! + HOUR_MS;
      next = next === null ? expiring : Math.max(next, expiring);
    }
    if (daily.length >= this.perDay) {
      const expiring = daily[daily.length - this.perDay]! + DAY_MS;
      next = next === null ? expiring : Math.max(next, expiring);
    }
    return next;
  }

  async start(scenario: PresetId): Promise<LiveStartResult> {
    if (this.active || this.starting) {
      const active = this.active;
      const detail = active
        ? ` (${active.scenario}, started ${new Date(active.startedAt).toISOString()})`
        : '';
      return { ok: false, status: 409, reason: `A check is already running${detail}.` };
    }

    this.starting = true;
    try {
      const now = this.now();
      const next = this.nextAllowed(now);
      if (next !== null) {
        return {
          ok: false,
          status: 429,
          reason: `Rate limit: ${this.perHour} checks per hour and ${this.perDay} per day. Next check allowed at ${new Date(next).toISOString()}.`,
        };
      }

      let credits: number;
      try {
        credits = await this.readBalance();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          ok: false,
          status: 503,
          reason: `Could not read the Kane balance: ${message}`,
        };
      }
      if (!Number.isFinite(credits)) {
        return {
          ok: false,
          status: 503,
          reason: 'Could not read the Kane balance: the CLI returned a non-numeric value.',
        };
      }
      if (credits < this.minBalanceCredits) {
        return {
          ok: false,
          status: 503,
          reason: `Kane balance is ${credits.toFixed(2)} credits, below the ${this.minBalanceCredits.toFixed(2)} credit floor. Top up before starting a check.`,
        };
      }

      let healthy = false;
      try {
        healthy = await this.storeHealthy();
      } catch {
        healthy = false;
      }
      if (!healthy) {
        return {
          ok: false,
          status: 503,
          reason: 'The demo store is not answering at http://127.0.0.1:4173/health. Start it before running a check.',
        };
      }

      if (this.active) {
        return { ok: false, status: 409, reason: 'A check is already running.' };
      }

      const startedAt = this.now();
      const stamp = new Date(startedAt).toISOString().replaceAll(':', '-').replaceAll('.', '-');
      const runId = `${stamp}-${scenario}`;
      const runDir = join(this.logRoot, runId);
      mkdirSync(runDir, { recursive: true });
      const stdoutPath = join(runDir, 'stdout.log');
      const stderrPath = join(runDir, 'stderr.log');
      const logPath = displayPath(this.repoRoot, stderrPath);
      const stdoutStream = createWriteStream(stdoutPath, { flags: 'a' });
      const stderrStream = createWriteStream(stderrPath, { flags: 'a' });

      let child: ChildProcess;
      try {
        child = this.spawnRun(scenario);
      } catch (error) {
        stdoutStream.end();
        stderrStream.end();
        const message = error instanceof Error ? error.message : String(error);
        return { ok: false, status: 503, reason: `Could not start the check: ${message}` };
      }

      const active: ActiveRun = {
        runId,
        scenario,
        startedAt,
        pid: child.pid ?? null,
        child,
        lastLine: '',
        output: '',
        stdoutPath,
        stderrPath,
        logPath,
        timer: setTimeout(() => undefined, 0),
        timedOut: false,
        finished: false,
        stdoutStream,
        stderrStream,
      };
      clearTimeout(active.timer);
      this.active = active;
      this.completed = null;
      this.history.push(startedAt);

      this.wire(active);
      if (this.active === active) {
        active.timer = setTimeout(() => {
          if (this.active !== active || active.timedOut) return;
          active.timedOut = true;
          this.fail(active, 'timed out');
          if (active.pid !== null) {
            try {
              this.killTree(active.pid);
            } catch {
              // The direct kill below is the fallback.
            }
          }
          try {
            child.kill('SIGKILL');
          } catch {
            // The process may already be gone.
          }
        }, this.watchdogMs);
      }

      return { ok: true, runId };
    } finally {
      this.starting = false;
    }
  }

  private wire(active: ActiveRun): void {
    const child = active.child;
    let stdoutTail = '';
    let stderrTail = '';
    let lastStream: 'stdout' | 'stderr' = 'stdout';

    const updateLastLine = (line: string): void => {
      if (line.trim().length > 0) active.lastLine = line;
    };

    child.stdout?.on('data', (chunk: Buffer | string) => {
      if (active.finished) return;
      const text = chunk.toString();
      active.output += text;
      lastStream = 'stdout';
      active.stdoutStream.write(text);
      const parts = `${stdoutTail}${text}`.split(/\r?\n/);
      stdoutTail = parts.pop() ?? '';
      for (const line of parts) updateLastLine(line);
    });
    child.stderr?.on('data', (chunk: Buffer | string) => {
      if (active.finished) return;
      const text = chunk.toString();
      active.output += text;
      lastStream = 'stderr';
      active.stderrStream.write(text);
      const parts = `${stderrTail}${text}`.split(/\r?\n/);
      stderrTail = parts.pop() ?? '';
      for (const line of parts) updateLastLine(line);
    });

    const closeStreams = (): void => {
      if (active.finished) return;
      active.finished = true;
      const finalTail = lastStream === 'stdout' ? stdoutTail : stderrTail;
      if (finalTail.trim().length > 0) active.lastLine = finalTail;
      active.stdoutStream.end();
      active.stderrStream.end();
    };

    child.once('error', (error: Error) => {
      if (this.active !== active) return;
      closeStreams();
      this.fail(active, `child process error: ${error.message}`);
    });

    child.once('close', (code: number | null, signal: NodeJS.Signals | null) => {
      if (this.active !== active) return;
      closeStreams();
      clearTimeout(active.timer);

      if (active.timedOut) return;

      const logs = `${active.output}\n${this.readLog(active.stdoutPath)}\n${this.readLog(
        active.stderrPath,
      )}`;
      const auditId = auditIdFromLogs(logs);
      const ended = signal ? ` (signal ${signal})` : '';
      if (code !== 0) {
        const last = active.lastLine ? `: ${active.lastLine}` : '';
        this.fail(active, `child exited with code ${code ?? 'null'}${ended}${last}`);
        return;
      }
      if (!auditId) {
        this.fail(active, 'child exited 0 without recording an audit');
        return;
      }

      this.completed = {
        state: 'done',
        scenario: active.scenario,
        startedAt: active.startedAt,
        lastLine: active.lastLine,
        auditId,
        error: null,
        logPath: active.logPath,
      };
      this.active = null;
    });
  }

  private readLog(path: string): string {
    try {
      return readFileSync(path, 'utf8');
    } catch {
      return '';
    }
  }

  private fail(active: ActiveRun, message: string): void {
    if (this.active !== active) return;
    clearTimeout(active.timer);
    if (!active.finished) {
      active.finished = true;
      active.stdoutStream.end();
      active.stderrStream.end();
    }
    this.completed = {
      state: 'failed',
      scenario: active.scenario,
      startedAt: active.startedAt,
      lastLine: active.lastLine,
      auditId: null,
      error: message,
      logPath: active.logPath,
    };
    this.active = null;
  }
}
