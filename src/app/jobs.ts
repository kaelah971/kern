import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { AuditRecord, AuditStatus } from '../lib/audit.ts';
import { PRESET_CARTS, type PresetId } from '../lib/catalog.ts';

export type JobScenario = PresetId;
export type JobStatus = 'queued' | 'running' | 'done' | 'failed' | 'expired';

export type Job = {
  id: string;
  scenario: JobScenario;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
  ipHash: string;
  runningAt?: string;
  leaseExpiresAt?: string;
  finishedAt?: string;
  audit?: AuditRecord;
  error?: string;
};

export type PublicJob = Omit<Job, 'ipHash'>;

export type JobLimits = {
  maxPerHour: number;
  maxPerDay: number;
  perIpWindowMs: number;
  leaseMs: number;
  onlineWindowMs: number;
};

export const DEFAULT_JOB_LIMITS: JobLimits = {
  maxPerHour: 3,
  maxPerDay: 20,
  perIpWindowMs: 10 * 60_000,
  leaseMs: 3 * 60_000,
  onlineWindowMs: 60_000,
};

export function limitsFromEnv(env: NodeJS.ProcessEnv = process.env): JobLimits {
  const positive = (name: string, fallback: number): number => {
    const value = Number(env[name]);
    return Number.isInteger(value) && value > 0 ? value : fallback;
  };
  return {
    ...DEFAULT_JOB_LIMITS,
    maxPerHour: positive('MAX_AUDITS_PER_HOUR', DEFAULT_JOB_LIMITS.maxPerHour),
    maxPerDay: positive('MAX_AUDITS_PER_DAY', DEFAULT_JOB_LIMITS.maxPerDay),
  };
}

export type EngineStatus = {
  online: boolean;
  lastHeartbeat: string | null;
  staleAfterSeconds: number;
  limits: Pick<JobLimits, 'maxPerHour' | 'maxPerDay' | 'perIpWindowMs'>;
};

export type EnqueueResult =
  | { ok: true; job: Job }
  | { ok: false; reason: string; retryAfterSeconds: number };

export type MutationFailure = 'not_found' | 'not_running' | 'lease_expired' | 'scenario_mismatch' | 'invalid_audit';
export type MutationResult =
  | { ok: true; job: Job }
  | { ok: false; reason: MutationFailure; job?: Job };

const AUDIT_STATUSES = new Set<AuditStatus>(['HONORED', 'BROKEN', 'INCONCLUSIVE', 'INFRA_ERROR']);
const JOB_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function isJobScenario(value: unknown): value is JobScenario {
  return typeof value === 'string' && Object.hasOwn(PRESET_CARTS, value);
}

export function isAuditRecord(value: unknown): value is AuditRecord {
  if (typeof value !== 'object' || value === null) return false;
  const audit = value as Partial<AuditRecord>;
  return (
    typeof audit.auditId === 'string' &&
    typeof audit.overallStatus === 'string' &&
    AUDIT_STATUSES.has(audit.overallStatus as AuditStatus) &&
    Array.isArray(audit.scenarios) &&
    typeof audit.contract === 'object' &&
    audit.contract !== null
  );
}

export function publicJob(job: Job): PublicJob {
  const { ipHash: _ipHash, ...rest } = job;
  return rest;
}

export class JobStore {
  readonly limits: JobLimits;
  readonly #root: string;
  readonly #jobsDir: string;
  readonly #heartbeatPath: string;
  readonly #now: () => number;
  #lock: Promise<unknown> = Promise.resolve();

  constructor(options: {
    root: string;
    limits?: Partial<JobLimits>;
    now?: () => number;
  }) {
    this.#root = options.root;
    this.limits = { ...DEFAULT_JOB_LIMITS, ...options.limits };
    this.#now = options.now ?? Date.now;
    this.#jobsDir = join(this.#root, 'jobs');
    this.#heartbeatPath = join(this.#root, 'heartbeat.json');
    mkdirSync(this.#jobsDir, { recursive: true });
  }

  #nowIso(): string {
    return new Date(this.#now()).toISOString();
  }

  #withLock<T>(operation: () => T | Promise<T>): Promise<T> {
    const run = this.#lock.then(operation, operation);
    this.#lock = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  #jobPath(id: string): string | null {
    return JOB_ID.test(id) ? join(this.#jobsDir, `${id}.json`) : null;
  }

  #readJob(id: string): Job | null {
    const path = this.#jobPath(id);
    if (!path || !existsSync(path)) return null;
    try {
      const job = JSON.parse(readFileSync(path, 'utf8')) as Job;
      if (
        job.id !== id ||
        !isJobScenario(job.scenario) ||
        typeof job.createdAt !== 'string' ||
        typeof job.ipHash !== 'string'
      ) {
        return null;
      }
      return job;
    } catch {
      return null;
    }
  }

  #listJobs(): Job[] {
    if (!existsSync(this.#jobsDir)) return [];
    const jobs: Job[] = [];
    for (const name of readdirSync(this.#jobsDir)) {
      if (!name.endsWith('.json')) continue;
      const job = this.#readJob(name.slice(0, -5));
      if (job) jobs.push(job);
    }
    return jobs.sort((left, right) =>
      left.createdAt === right.createdAt
        ? left.id.localeCompare(right.id)
        : left.createdAt.localeCompare(right.createdAt),
    );
  }

  #writeJob(job: Job): void {
    const path = this.#jobPath(job.id);
    if (!path) throw new Error(`invalid job id: ${job.id}`);
    const temporary = `${path}.tmp-${process.pid}-${randomUUID()}`;
    writeFileSync(temporary, `${JSON.stringify(job, null, 2)}\n`, 'utf8');
    renameSync(temporary, path);
  }

  #expireStale(jobs: Job[]): Job[] {
    const now = this.#now();
    for (const job of jobs) {
      if (
        job.status === 'running' &&
        job.leaseExpiresAt &&
        Date.parse(job.leaseExpiresAt) < now
      ) {
        job.status = 'expired';
        job.error = 'lease expired before the worker posted a result';
        job.updatedAt = this.#nowIso();
        this.#writeJob(job);
      }
    }
    return jobs;
  }

  #retrySeconds(targetMs: number): number {
    return Math.max(1, Math.ceil((targetMs - this.#now()) / 1000));
  }

  async enqueue(scenario: JobScenario, ipHash: string): Promise<EnqueueResult> {
    return this.#withLock(() => {
      const now = this.#now();
      const jobs = this.#expireStale(this.#listJobs());

      const running = jobs.find(
        (job) =>
          job.status === 'running' &&
          job.leaseExpiresAt &&
          Date.parse(job.leaseExpiresAt) >= now,
      );
      if (running) {
        return {
          ok: false,
          reason: 'an audit is already running',
          retryAfterSeconds: this.#retrySeconds(Date.parse(running.leaseExpiresAt!)),
        };
      }

      const perIp = jobs.filter(
        (job) => job.ipHash === ipHash && now - Date.parse(job.createdAt) < this.limits.perIpWindowMs,
      );
      if (perIp.length > 0) {
        const until = Math.max(
          ...perIp.map((job) => Date.parse(job.createdAt) + this.limits.perIpWindowMs),
        );
        return {
          ok: false,
          reason: 'per-IP limit (1 per 10 minutes) reached',
          retryAfterSeconds: this.#retrySeconds(until),
        };
      }

      const hourly = jobs.filter(
        (job) => now - Date.parse(job.createdAt) < 3_600_000,
      );
      if (hourly.length >= this.limits.maxPerHour) {
        const until = Math.min(
          ...hourly.map((job) => Date.parse(job.createdAt) + 3_600_000),
        );
        return {
          ok: false,
          reason: `global hourly limit (${this.limits.maxPerHour}/hour) reached`,
          retryAfterSeconds: this.#retrySeconds(until),
        };
      }

      const daily = jobs.filter(
        (job) => now - Date.parse(job.createdAt) < 86_400_000,
      );
      if (daily.length >= this.limits.maxPerDay) {
        const until = Math.min(
          ...daily.map((job) => Date.parse(job.createdAt) + 86_400_000),
        );
        return {
          ok: false,
          reason: `global daily limit (${this.limits.maxPerDay}/day) reached`,
          retryAfterSeconds: this.#retrySeconds(until),
        };
      }

      const at = this.#nowIso();
      const job: Job = {
        id: randomUUID(),
        scenario,
        status: 'queued',
        createdAt: at,
        updatedAt: at,
        ipHash,
      };
      this.#writeJob(job);
      return { ok: true, job };
    });
  }

  async get(id: string): Promise<Job | null> {
    return this.#withLock(() => {
      const job = this.#readJob(id);
      if (!job) return null;
      this.#expireStale([job]);
      return job;
    });
  }

  async next(): Promise<Job | null> {
    return this.#withLock(() => {
      const now = this.#now();
      const jobs = this.#expireStale(this.#listJobs());
      const running = jobs.find(
        (job) =>
          job.status === 'running' &&
          job.leaseExpiresAt &&
          Date.parse(job.leaseExpiresAt) >= now,
      );
      if (running) return null;

      const queued = jobs.find((job) => job.status === 'queued');
      if (!queued) return null;

      queued.status = 'running';
      queued.runningAt = this.#nowIso();
      queued.leaseExpiresAt = new Date(now + this.limits.leaseMs).toISOString();
      queued.updatedAt = queued.runningAt;
      this.#writeJob(queued);
      return queued;
    });
  }

  async complete(id: string, audit: AuditRecord): Promise<MutationResult> {
    return this.#withLock(() => {
      const job = this.#readJob(id);
      if (!job) return { ok: false, reason: 'not_found' };
      this.#expireStale([job]);
      if (job.status === 'expired') return { ok: false, reason: 'lease_expired', job };
      if (job.status !== 'running') return { ok: false, reason: 'not_running', job };
      if (!isAuditRecord(audit)) return { ok: false, reason: 'invalid_audit', job };
      if (!audit.scenarios.some((scenario) => scenario.scenarioId === job.scenario)) {
        return { ok: false, reason: 'scenario_mismatch', job };
      }

      job.status = 'done';
      job.audit = audit;
      job.finishedAt = this.#nowIso();
      job.updatedAt = job.finishedAt;
      job.error = undefined;
      this.#writeJob(job);
      return { ok: true, job };
    });
  }

  async fail(id: string, error: string): Promise<MutationResult> {
    return this.#withLock(() => {
      const job = this.#readJob(id);
      if (!job) return { ok: false, reason: 'not_found' };
      this.#expireStale([job]);
      if (job.status === 'expired') return { ok: false, reason: 'lease_expired', job };
      if (job.status !== 'running' && job.status !== 'queued') {
        return { ok: false, reason: 'not_running', job };
      }

      job.status = 'failed';
      job.error = error.slice(0, 1000);
      job.finishedAt = this.#nowIso();
      job.updatedAt = job.finishedAt;
      this.#writeJob(job);
      return { ok: true, job };
    });
  }

  async heartbeat(workerId = 'worker'): Promise<{ lastSeen: string }> {
    return this.#withLock(() => {
      const lastSeen = this.#nowIso();
      const path = this.#heartbeatPath;
      const temporary = `${path}.tmp-${process.pid}-${randomUUID()}`;
      writeFileSync(temporary, `${JSON.stringify({ lastSeen, workerId }, null, 2)}\n`, 'utf8');
      renameSync(temporary, path);
      return { lastSeen };
    });
  }

  engineStatus(): EngineStatus {
    let lastHeartbeat: string | null = null;
    try {
      const heartbeat = JSON.parse(readFileSync(this.#heartbeatPath, 'utf8')) as {
        lastSeen?: unknown;
      };
      if (typeof heartbeat.lastSeen === 'string') lastHeartbeat = heartbeat.lastSeen;
    } catch {
      // No heartbeat yet.
    }
    const age = lastHeartbeat ? this.#now() - Date.parse(lastHeartbeat) : Number.POSITIVE_INFINITY;
    return {
      online: age >= 0 && age < this.limits.onlineWindowMs,
      lastHeartbeat,
      staleAfterSeconds: Math.round(this.limits.onlineWindowMs / 1000),
      limits: {
        maxPerHour: this.limits.maxPerHour,
        maxPerDay: this.limits.maxPerDay,
        perIpWindowMs: this.limits.perIpWindowMs,
      },
    };
  }
}
