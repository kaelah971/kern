import { execFileSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join, relative } from 'node:path';
import { getPreset, PRESET_CARTS } from './catalog.ts';
import { loadContract, type PromiseContract } from './contract.ts';
import { buildScenarioObjectives, objectiveSha256, type ScenarioObjectives } from './kane/objective.ts';
import {
  isInfraReason,
  parseNdjson,
  type RunResult,
} from './kane/parse.ts';
import {
  preflightOrThrow,
  runKaneObjective,
  STORE_URL,
  type RunKind,
} from './kane/runner.ts';

export type AuditStatus = 'HONORED' | 'BROKEN' | 'INCONCLUSIVE' | 'INFRA_ERROR';

export type EvidenceAudit = {
  sourcePath: string;
  copiedPath: string;
  sha256: string;
  bytes: number;
} | null;

export type RunAudit = {
  kind: RunKind;
  source: 'live' | 'provided_capture';
  objective: {
    text: string;
    sha256: string;
    matchesProvidedCapture?: boolean;
  };
  artifacts: {
    stdoutPath: string;
    stderrPath: string | null;
    objectivePath: string;
    exitCode: number | null;
    exitCodeSource: 'process' | 'provided_capture_user_reported';
    timedOut: boolean;
    durationMs: number | null;
    argv: string[] | null;
  };
  parsed: RunResult;
  evidence: EvidenceAudit;
};

export type ScenarioAudit = {
  scenarioId: string;
  presetLabel: string;
  expectedSubtotalCents: number;
  thresholdCents: number;
  objectives: {
    observe: { text: string; sha256: string };
    assert: { text: string; sha256: string };
    oracleExpectedCents: number;
  };
  observe: RunAudit | null;
  assert: RunAudit | null;
  oracle: {
    expectedShippingCents: number;
    observedShippingCents: number | null;
    observedSubtotalCents: number | null;
  };
  assertVerdict: {
    status: string | null;
    confirmed: boolean | null;
    family: string | null;
    category: string | null;
    severity: string | null;
    rootCause: string | null;
    bugTitle: string | null;
  } | null;
  status: AuditStatus;
  reasons: string[];
  notes: string[];
};

export type ObjectiveHashComparison = {
  scenarioId: string;
  kind: RunKind;
  preRepairSha256: string;
  postRepairSha256: string;
  match: true;
};

export type PostRepairContext = {
  answersAuditId: string;
  preRepairAuditPath: string;
  comparisons: ObjectiveHashComparison[];
};

export type AuditRecord = {
  auditVersion: 1;
  auditId: string;
  startedAt: string;
  finishedAt: string | null;
  partial?: boolean;
  postRepair?: true;
  answersAuditId?: string;
  objectiveHashesMatch?: true;
  objectiveHashComparisons?: ObjectiveHashComparison[];
  storeUrl: string;
  contract: {
    id: string;
    version: number;
    specSha256: string;
    thresholdCents: number;
    expectedEligibleShippingCents: number;
    expectedIneligibleShippingCents: number;
  };
  scenarios: ScenarioAudit[];
  overallStatus: AuditStatus;
  totals: {
    runs: number;
    credits: number;
    liveRuns: number;
    liveCredits: number;
    providedCaptureRuns: number;
    providedCaptureCredits: number;
  };
};

export type ClassificationInput = {
  expectedSubtotalCents: number;
  expectedShippingCents: number;
  observe: RunResult | null;
  assertRun: RunResult | null;
  observeExitCode: number | null;
  assertExitCode: number | null;
  observeTimedOut: boolean;
  assertTimedOut: boolean;
  observeEvidencePresent: boolean;
  assertEvidencePresent: boolean;
};

export type Classification = {
  status: AuditStatus;
  reasons: string[];
  expectedShippingCents: number;
  observedShippingCents: number | null;
  observedSubtotalCents: number | null;
};

export function rollupStatus(statuses: AuditStatus[]): AuditStatus {
  if (statuses.length === 0) return 'INCONCLUSIVE';
  if (statuses.includes('BROKEN')) return 'BROKEN';
  if (statuses.includes('INFRA_ERROR')) return 'INFRA_ERROR';
  if (statuses.includes('INCONCLUSIVE')) return 'INCONCLUSIVE';
  return 'HONORED';
}

/**
 * The status table. Everything fails closed: a missing value, a missing
 * evidence pack, a contradictory assert run or a missing terminal event can
 * never become HONORED.
 */
export function classifyScenario(input: ClassificationInput): Classification {
  const expectedShippingCents = input.expectedShippingCents;
  const observedShippingCents = input.observe?.observedShippingCents ?? null;
  const observedSubtotalCents = input.observe?.observedSubtotalCents ?? null;

  const result = (status: AuditStatus, ...reasons: string[]): Classification => ({
    status,
    reasons,
    expectedShippingCents,
    observedShippingCents,
    observedSubtotalCents,
  });

  const observe = input.observe;
  if (!observe) return result('INCONCLUSIVE', 'observe run was not executed');
  if (input.observeTimedOut) return result('INFRA_ERROR', 'observe run timed out');
  if (!observe.terminal) {
    return result('INFRA_ERROR', 'observe run has no terminal run_end (ERR_NO_TERMINAL)');
  }
  if (observe.runEndStatus === 'unknown') {
    return result('INFRA_ERROR', 'observe run_end has no valid status');
  }
  if (observe.runEndStatus !== 'passed') {
    if (isInfraReason(observe.reasonCode)) {
      return result(
        'INFRA_ERROR',
        `observe run failed for an infrastructure reason (${observe.reasonCode})`,
      );
    }
    return result(
      'INCONCLUSIVE',
      `observe run did not pass (${observe.runEndStatus}, ${observe.reasonCode ?? 'no reason_code'})`,
    );
  }
  if (input.observeExitCode !== 0) {
    return result(
      'INCONCLUSIVE',
      `observe exit code ${input.observeExitCode} contradicts a passed run_end`,
    );
  }
  if (observe.moneyErrors.length > 0) {
    return result('INCONCLUSIVE', ...observe.moneyErrors);
  }
  if (observedSubtotalCents === null) {
    return result('INCONCLUSIVE', 'observe did not return a parseable observed_subtotal');
  }
  if (observedShippingCents === null) {
    return result('INCONCLUSIVE', 'observe did not return a parseable observed_shipping');
  }
  if (observedSubtotalCents !== input.expectedSubtotalCents) {
    return result(
      'INCONCLUSIVE',
      `observe loaded the wrong cart: subtotal ${observedSubtotalCents} cents, expected ${input.expectedSubtotalCents}`,
    );
  }
  if (!input.observeEvidencePresent) {
    return result('INCONCLUSIVE', 'observe evidence pack is missing');
  }

  const assertRun = input.assertRun;
  if (!assertRun) return result('INCONCLUSIVE', 'assert run was not executed');
  if (input.assertTimedOut) return result('INFRA_ERROR', 'assert run timed out');
  if (!assertRun.terminal) {
    return result('INFRA_ERROR', 'assert run has no terminal run_end (ERR_NO_TERMINAL)');
  }
  if (assertRun.runEndStatus === 'unknown') {
    return result('INFRA_ERROR', 'assert run_end has no valid status');
  }
  if (!input.assertEvidencePresent) {
    return result('INCONCLUSIVE', 'assert evidence pack is missing');
  }
  if (assertRun.moneyErrors.length > 0) {
    return result('INCONCLUSIVE', ...assertRun.moneyErrors);
  }
  if (
    assertRun.observedShippingCents !== null &&
    assertRun.observedShippingCents !== observedShippingCents
  ) {
    return result(
      'INCONCLUSIVE',
      `observe and assert disagree on shipping: ${observedShippingCents} vs ${assertRun.observedShippingCents} cents`,
    );
  }

  const assertPassed = assertRun.runEndStatus === 'passed' && input.assertExitCode === 0;
  const assertFailed =
    assertRun.runEndStatus === 'failed' &&
    input.assertExitCode !== null &&
    input.assertExitCode !== 0;
  if (!assertPassed && !assertFailed) {
    return result('INCONCLUSIVE', 'assert run_end status and exit code are inconsistent');
  }
  if (assertRun.runEndStatus === 'failed' && isInfraReason(assertRun.reasonCode)) {
    return result(
      'INFRA_ERROR',
      `assert run failed for an infrastructure reason (${assertRun.reasonCode})`,
    );
  }

  const mismatch = expectedShippingCents !== observedShippingCents;
  if (mismatch) {
    if (!assertFailed) {
      return result('INCONCLUSIVE', 'assert passed while the oracle expects a mismatch');
    }
    if (assertRun.verdict?.confirmed !== true) {
      return result('INCONCLUSIVE', 'assert failed without verdict.confirmed = true');
    }
    return result(
      'BROKEN',
      `oracle expected ${expectedShippingCents} cents; Kane observed ${observedShippingCents}; assert failed with a confirmed verdict`,
    );
  }

  if (!assertPassed) {
    return result(
      'INCONCLUSIVE',
      'assert did not pass while the oracle expects the promise to be honored',
    );
  }
  return result(
    'HONORED',
    `oracle and observation agree at ${observedShippingCents} cents; assert passed`,
  );
}

function displayPath(path: string): string {
  return relative(process.cwd(), path).replaceAll('\\', '/');
}

function sha256File(path: string): { sha256: string; bytes: number } {
  const buffer = readFileSync(path);
  return {
    sha256: createHash('sha256').update(buffer).digest('hex'),
    bytes: buffer.length,
  };
}

function captureEvidence(parsed: RunResult, runDir: string, kind: RunKind): EvidenceAudit {
  const sourcePath = parsed.evidencePath;
  if (!sourcePath) return null;
  if (!sourcePath.toLowerCase().endsWith('.evidence')) return null;
  if (!existsSync(sourcePath)) return null;

  const destination = join(runDir, `${kind}.evidence`);
  copyFileSync(sourcePath, destination);
  const { sha256, bytes } = sha256File(destination);
  return {
    sourcePath,
    copiedPath: displayPath(destination),
    sha256,
    bytes,
  };
}

function extractBifurcationObjective(text: string): string | null {
  for (const line of text.split(/\r?\n/)) {
    if (!line.includes('"type":"bifurcation"')) continue;
    try {
      const event = JSON.parse(line) as { type?: unknown; flows?: unknown };
      if (
        event.type === 'bifurcation' &&
        Array.isArray(event.flows) &&
        typeof event.flows[0] === 'string'
      ) {
        return event.flows[0];
      }
    } catch {
      return null;
    }
  }
  return null;
}

function experimentOptions() {
  return { maxSteps: 40, timeoutSeconds: 240 };
}

async function runLive(
  scenarioId: string,
  objectives: ScenarioObjectives,
  kind: RunKind,
  runDir: string,
  storeUrl: string,
  log: (message: string) => void,
): Promise<RunAudit> {
  log(`[${scenarioId}] ${kind}: running live`);
  const { maxSteps, timeoutSeconds } = experimentOptions();
  const artifacts = await runKaneObjective({
    scenarioId,
    kind,
    objective: objectives[kind],
    runDir,
    storeUrl,
    maxSteps,
    timeoutSeconds,
  });

  const parsed = parseNdjson(readFileSync(artifacts.stdoutPath, 'utf8'));
  const evidence = captureEvidence(parsed, runDir, kind);
  log(
    `[${scenarioId}] ${kind}: exit ${artifacts.exitCode ?? 'null'}, run_end ${parsed.runEndStatus}, credits ${parsed.credits ?? 'n/a'}`,
  );

  return {
    kind,
    source: 'live',
    objective: {
      text: objectives[kind],
      sha256: objectives.hashes[kind],
    },
    artifacts: {
      stdoutPath: displayPath(artifacts.stdoutPath),
      stderrPath: displayPath(artifacts.stderrPath),
      objectivePath: displayPath(artifacts.objectivePath),
      exitCode: artifacts.exitCode,
      exitCodeSource: artifacts.exitCodeSource,
      timedOut: artifacts.timedOut,
      durationMs: artifacts.durationMs,
      argv: artifacts.argv,
    },
    parsed,
    evidence,
  };
}

/**
 * Exit codes are not present inside the NDJSON captures. These values were
 * reported with the captures: observe exited 0, assert exited 1. The audit
 * record labels the source as `provided_capture_user_reported`; they are never
 * presented as process-observed values.
 */
const PROVIDED_CAPTURE_EXIT_CODES: Record<string, { observe: number; assert: number }> = {
  'eligible-60': { observe: 0, assert: 1 },
};

function importProvidedCapture(
  scenarioId: string,
  objectives: ScenarioObjectives,
  runDir: string,
  log: (message: string) => void,
): { observe: RunAudit; assert: RunAudit } {
  const captureDir = join(process.cwd(), '.data', 'captures', '2026-11-22-kane-store');
  const exitCodes = PROVIDED_CAPTURE_EXIT_CODES[scenarioId];
  if (!exitCodes) {
    throw new Error(
      `No recorded exit codes for a provided capture of ${scenarioId}; run this scenario live instead.`,
    );
  }

  const sources = {
    observe: {
      ndjson: join(captureDir, `observe-${scenarioId}.ndjson`),
      stderr: join(captureDir, `observe-${scenarioId}.stderr.log`),
    },
    assert: {
      ndjson: join(captureDir, `assert-${scenarioId}.ndjson`),
      stderr: join(captureDir, `assert-${scenarioId}.stderr.log`),
    },
  };

  for (const [kind, source] of Object.entries(sources)) {
    if (!existsSync(source.ndjson)) {
      throw new Error(`Provided capture is missing for ${scenarioId} ${kind}: ${source.ndjson}`);
    }
  }

  const texts = {
    observe: readFileSync(sources.observe.ndjson, 'utf8'),
    assert: readFileSync(sources.assert.ndjson, 'utf8'),
  };

  for (const kind of ['observe', 'assert'] as const) {
    const capturedObjective = extractBifurcationObjective(texts[kind]);
    if (capturedObjective === null) {
      throw new Error(`Provided ${scenarioId} ${kind} capture has no recorded objective`);
    }
    if (capturedObjective !== objectives[kind]) {
      throw new Error(
        `Provided ${scenarioId} ${kind} capture objective does not match the generated unchanged challenge.\n` +
          `captured sha256 ${objectiveSha256(capturedObjective)}\n` +
          `generated sha256 ${objectives.hashes[kind]}`,
      );
    }
  }

  mkdirSync(runDir, { recursive: true });
  const runs = {} as Record<RunKind, RunAudit>;

  for (const kind of ['observe', 'assert'] as const) {
    const copiedNdjson = join(runDir, `${kind}.ndjson`);
    copyFileSync(sources[kind].ndjson, copiedNdjson);
    let copiedStderr: string | null = null;
    if (existsSync(sources[kind].stderr)) {
      copiedStderr = join(runDir, `${kind}.stderr.log`);
      copyFileSync(sources[kind].stderr, copiedStderr);
    }
    const objectivePath = join(runDir, `${kind}.objective.txt`);
    writeFileSync(objectivePath, `${objectives[kind]}\n`, 'utf8');

    const parsed = parseNdjson(texts[kind]);
    runs[kind] = {
      kind,
      source: 'provided_capture',
      objective: {
        text: objectives[kind],
        sha256: objectives.hashes[kind],
        matchesProvidedCapture: true,
      },
      artifacts: {
        stdoutPath: displayPath(copiedNdjson),
        stderrPath: copiedStderr ? displayPath(copiedStderr) : null,
        objectivePath: displayPath(objectivePath),
        exitCode: exitCodes[kind],
        exitCodeSource: 'provided_capture_user_reported',
        timedOut: false,
        durationMs: null,
        argv: null,
      },
      parsed,
      evidence: captureEvidence(parsed, runDir, kind),
    };
  }

  log(`[${scenarioId}] using provided real capture; objective hash matched for observe and assert`);
  return { observe: runs.observe, assert: runs.assert };
}

function makeAuditId(startedAt: string): string {
  return `${startedAt.replace(/[:.]/g, '-')}-${randomBytes(3).toString('hex')}`;
}

function currentGitBranch(): string | null {
  try {
    const branch = execFileSync('git', ['branch', '--show-current'], {
      encoding: 'utf8',
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return branch || null;
  } catch {
    return null;
  }
}

function findCompletePreRepairAudit(): { record: AuditRecord; path: string } | null {
  const root = join(process.cwd(), '.data', 'audits');
  if (!existsSync(root)) return null;

  const candidates: Array<{ record: AuditRecord; path: string }> = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const path = join(root, entry.name, 'audit.json');
    if (!existsSync(path)) continue;
    try {
      const record = JSON.parse(readFileSync(path, 'utf8')) as AuditRecord;
      if (record.postRepair === true) continue;
      if (record.scenarios.length !== 3) continue;
      if (!record.scenarios.every((scenario) => scenario.observe && scenario.assert)) continue;
      candidates.push({ record, path });
    } catch {
      // Ignore partial or malformed audit records; they cannot anchor a rerun.
    }
  }

  candidates.sort((left, right) => {
    if (left.record.startedAt === right.record.startedAt) {
      return right.record.auditId.localeCompare(left.record.auditId);
    }
    return right.record.startedAt.localeCompare(left.record.startedAt);
  });
  return candidates[0] ?? null;
}

/**
 * A post-repair audit is only a rerun if the exact objective text is unchanged.
 * Compare all six hashes before preflight or any Kane call. A mismatch aborts
 * without spending a credit; the fix is to the generator, never the artifact.
 */
export function resolvePostRepairContext(
  contract: PromiseContract,
  options: { postRepair?: boolean } = {},
): PostRepairContext | null {
  const branch = currentGitBranch();
  const requested = options.postRepair ?? (branch?.startsWith('repair/') ?? false);
  if (!requested) return null;

  const prior = findCompletePreRepairAudit();
  if (!prior) {
    throw new Error(
      'Post-repair audit requested, but no complete pre-repair audit was found in .data/audits. The rerun does not count without the original challenge.',
    );
  }

  const comparisons: ObjectiveHashComparison[] = [];
  for (const scenarioId of Object.keys(PRESET_CARTS)) {
    const objectives = buildScenarioObjectives(contract, scenarioId);
    const priorScenario = prior.record.scenarios.find(
      (scenario) => scenario.scenarioId === scenarioId,
    );
    if (!priorScenario) {
      throw new Error(
        `Pre-repair audit ${prior.record.auditId} has no scenario ${scenarioId}; the rerun does not count.`,
      );
    }

    for (const kind of ['observe', 'assert'] as const) {
      const preRepairSha256 = priorScenario.objectives[kind].sha256;
      const postRepairSha256 = objectives.hashes[kind];
      if (preRepairSha256 !== postRepairSha256) {
        throw new Error(
          `Objective hash changed for ${scenarioId} ${kind}: pre-repair ${preRepairSha256}, current ${postRepairSha256}. The rerun does not count; fix the generator, not the artifact.`,
        );
      }
      comparisons.push({
        scenarioId,
        kind,
        preRepairSha256,
        postRepairSha256,
        match: true,
      });
    }
  }

  return {
    answersAuditId: prior.record.auditId,
    preRepairAuditPath: prior.path,
    comparisons,
  };
}

function summarizeRuns(scenarios: ScenarioAudit[]): AuditRecord['totals'] {
  const runs = scenarios.flatMap((scenario) =>
    [scenario.observe, scenario.assert].filter((run): run is RunAudit => run !== null),
  );
  const sumCredits = (selected: RunAudit[]): number =>
    Number(
      selected.reduce((total, run) => total + (run.parsed.credits ?? 0), 0).toFixed(6),
    );

  const live = runs.filter((run) => run.source === 'live');
  const provided = runs.filter((run) => run.source === 'provided_capture');

  return {
    runs: runs.length,
    credits: sumCredits(runs),
    liveRuns: live.length,
    liveCredits: sumCredits(live),
    providedCaptureRuns: provided.length,
    providedCaptureCredits: sumCredits(provided),
  };
}

function assembleRecord(input: {
  auditId: string;
  startedAt: string;
  finishedAt: string | null;
  contract: PromiseContract;
  scenarios: ScenarioAudit[];
  storeUrl: string;
  partial?: boolean;
  postRepairContext?: PostRepairContext | null;
}): AuditRecord {
  return {
    auditVersion: 1,
    auditId: input.auditId,
    startedAt: input.startedAt,
    finishedAt: input.finishedAt,
    ...(input.partial ? { partial: true } : {}),
    ...(input.postRepairContext
      ? {
          postRepair: true as const,
          answersAuditId: input.postRepairContext.answersAuditId,
          objectiveHashesMatch: true as const,
          objectiveHashComparisons: input.postRepairContext.comparisons,
        }
      : {}),
    storeUrl: input.storeUrl,
    contract: {
      id: input.contract.id,
      version: input.contract.version,
      specSha256: input.contract.specSha256,
      thresholdCents: input.contract.threshold.cents,
      expectedEligibleShippingCents: input.contract.expectedEligibleShipping.cents,
      expectedIneligibleShippingCents: input.contract.expectedIneligibleShipping.cents,
    },
    scenarios: input.scenarios,
    overallStatus: rollupStatus(input.scenarios.map((scenario) => scenario.status)),
    totals: summarizeRuns(input.scenarios),
  };
}

export type AuditOptions = {
  scenarioIds?: string[];
  kind?: 'observe' | 'assert' | 'both';
  reuseCaptureScenarioIds?: string[];
  postRepair?: boolean;
  contractPath?: string;
  storeUrl?: string;
  onProgress?: (message: string) => void;
};

export type AuditOutcome = {
  record: AuditRecord;
  auditDir: string;
};

export async function runAudit(options: AuditOptions = {}): Promise<AuditOutcome> {
  const log = options.onProgress ?? (() => {});
  const contract: PromiseContract = loadContract(options.contractPath);
  const storeUrl = options.storeUrl ?? STORE_URL;
  const kind = options.kind ?? 'both';
  const scenarioIds = options.scenarioIds ?? Object.keys(PRESET_CARTS);
  const reuseIds = new Set(options.reuseCaptureScenarioIds ?? []);

  if (scenarioIds.length === 0) {
    throw new Error('at least one scenario is required');
  }
  for (const scenarioId of scenarioIds) {
    if (!getPreset(scenarioId)) throw new RangeError(`unknown scenario: ${scenarioId}`);
  }
  for (const scenarioId of reuseIds) {
    if (!scenarioIds.includes(scenarioId)) {
      throw new Error(`cannot reuse a capture for a scenario that is not selected: ${scenarioId}`);
    }
    if (kind !== 'both') {
      throw new Error('provided captures can only be reused with --kind both');
    }
  }

  const postRepairContext = resolvePostRepairContext(contract, {
    postRepair: options.postRepair,
  });
  if (postRepairContext) {
    if (scenarioIds.length !== 3) {
      throw new Error('a post-repair rerun must run all three scenarios');
    }
    if (reuseIds.size > 0) {
      throw new Error('a post-repair rerun cannot reuse provided captures');
    }
    log(
      `post-repair: answering ${postRepairContext.answersAuditId}; all six objective hashes match`,
    );
  }

  log(`preflight: checking the store at ${storeUrl} and Kane authentication`);
  await preflightOrThrow(storeUrl);
  log('preflight: store reachable, Kane authenticated');

  const startedAt = new Date().toISOString();
  const auditId = makeAuditId(startedAt);
  const auditDir = join(process.cwd(), '.data', 'audits', auditId);
  mkdirSync(auditDir, { recursive: true });

  const scenarios: ScenarioAudit[] = [];

  for (const scenarioId of scenarioIds) {
    const objectives = buildScenarioObjectives(contract, scenarioId, storeUrl);
    const scenarioDir = join(auditDir, scenarioId);
    mkdirSync(scenarioDir, { recursive: true });
    const notes: string[] = [];

    let observe: RunAudit | null = null;
    let assertRun: RunAudit | null = null;

    if (reuseIds.has(scenarioId)) {
      const imported = importProvidedCapture(scenarioId, objectives, scenarioDir, log);
      observe = imported.observe;
      assertRun = imported.assert;
      notes.push(
        'observe and assert are provided real captures; exit codes are user-reported because the NDJSON does not record them.',
      );
    } else {
      if (kind === 'observe' || kind === 'both') {
        observe = await runLive(scenarioId, objectives, 'observe', scenarioDir, storeUrl, log);
      }

      if (kind === 'assert' || kind === 'both') {
        if (kind === 'both' && observe && !observe.parsed.terminal) {
          notes.push('assert skipped after observe had no terminal run_end');
          log(`[${scenarioId}] assert: skipped because observe had no run_end`);
        } else {
          assertRun = await runLive(scenarioId, objectives, 'assert', scenarioDir, storeUrl, log);
        }
      } else {
        notes.push('assert not requested (--kind observe)');
      }
    }

    if (kind === 'assert') {
      notes.push('observe not requested (--kind assert); status cannot be HONORED or BROKEN');
    }

    const classification = classifyScenario({
      expectedSubtotalCents: objectives.expectedSubtotalCents,
      expectedShippingCents: objectives.oracleExpectedCents,
      observe: observe?.parsed ?? null,
      assertRun: assertRun?.parsed ?? null,
      observeExitCode: observe?.artifacts.exitCode ?? null,
      assertExitCode: assertRun?.artifacts.exitCode ?? null,
      observeTimedOut: observe?.artifacts.timedOut ?? false,
      assertTimedOut: assertRun?.artifacts.timedOut ?? false,
      observeEvidencePresent: observe?.evidence !== null && observe?.evidence !== undefined,
      assertEvidencePresent: assertRun?.evidence !== null && assertRun?.evidence !== undefined,
    });

    const verdict = assertRun?.parsed.verdict;
    const assertVerdict = verdict
      ? {
          status: verdict.status,
          confirmed: verdict.confirmed,
          family: verdict.family,
          category: verdict.category,
          severity: verdict.severity,
          rootCause: verdict.rootCause,
          bugTitle: verdict.bugTitle,
        }
      : null;

    scenarios.push({
      scenarioId,
      presetLabel: objectives.presetLabel,
      expectedSubtotalCents: objectives.expectedSubtotalCents,
      thresholdCents: objectives.thresholdCents,
      objectives: {
        observe: { text: objectives.observe, sha256: objectives.hashes.observe },
        assert: { text: objectives.assert, sha256: objectives.hashes.assert },
        oracleExpectedCents: objectives.oracleExpectedCents,
      },
      observe,
      assert: assertRun,
      oracle: {
        expectedShippingCents: classification.expectedShippingCents,
        observedShippingCents: classification.observedShippingCents,
        observedSubtotalCents: classification.observedSubtotalCents,
      },
      assertVerdict,
      status: classification.status,
      reasons: classification.reasons,
      notes,
    });

    log(`[${scenarioId}] status ${classification.status}: ${classification.reasons.join('; ')}`);

    // A long audit must leave usable evidence if the process dies mid-run.
    const progress = assembleRecord({
      auditId,
      startedAt,
      finishedAt: null,
      contract,
      scenarios,
      storeUrl,
      partial: true,
      postRepairContext,
    });
    writeFileSync(
      join(auditDir, 'audit.partial.json'),
      `${JSON.stringify(progress, null, 2)}\n`,
      'utf8',
    );
  }

  const finishedAt = new Date().toISOString();
  const record = assembleRecord({
    auditId,
    startedAt,
    finishedAt,
    contract,
    scenarios,
    storeUrl,
    postRepairContext,
  });

  writeFileSync(join(auditDir, 'audit.json'), `${JSON.stringify(record, null, 2)}\n`, 'utf8');
  rmSync(join(auditDir, 'audit.partial.json'), { force: true });
  log(`audit written: ${displayPath(join(auditDir, 'audit.json'))}`);

  return { record, auditDir };
}
