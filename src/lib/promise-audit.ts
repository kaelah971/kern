import { createHash, randomBytes } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { join, relative } from 'node:path';
import { formatUsd } from './money.ts';
import {
  BUNDLE_PROMISE,
  DELIVERY_PROMISE,
  PERCENT_PROMISE,
  bundleSubtotalCents,
  type PromiseScenario,
} from './promises.ts';
import { parseNdjson, parseUsdToCents, type RunResult } from './kane/parse.ts';
import { preflightOrThrow, runKaneObjective, STORE_URL } from './kane/runner.ts';

export type PromiseStatus = 'HONORED' | 'BROKEN' | 'INCONCLUSIVE' | 'INFRA_ERROR';
export type PromiseRunKind = 'observe' | 'assert';

export type PromiseEvidence = {
  sha256: string;
  bytes: number;
} | null;

export type PromiseRunAudit = {
  kind: PromiseRunKind;
  objective: { text: string; sha256: string };
  artifacts: {
    exitCode: number | null;
    timedOut: boolean;
    durationMs: number;
    sessionDir: string | null;
    testUrl: string | null;
  };
  evidence: PromiseEvidence;
  parsed: RunResult;
};

export type PromiseScenarioAudit = {
  promiseId: string;
  type: 'percent_discount' | 'bundle_discount' | 'delivery_estimate';
  scenarioId: string;
  label: string;
  expected: number | string;
  observed: number | string | null;
  pagePath: string;
  status: PromiseStatus;
  reasons: string[];
  observe: PromiseRunAudit | null;
  assert: PromiseRunAudit | null;
};

export type PromiseAuditRecord = {
  auditVersion: 1;
  auditId: string;
  startedAt: string;
  finishedAt: string | null;
  partial?: boolean;
  storeUrl: string;
  promises: PromiseScenarioAudit[];
  overallStatus: PromiseStatus;
  totals: {
    runs: number;
    credits: number;
  };
};

type Definition = typeof PERCENT_PROMISE | typeof BUNDLE_PROMISE | typeof DELIVERY_PROMISE;

type Objective = {
  text: string;
  sha256: string;
};

function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

function displayPath(path: string): string {
  return relative(process.cwd(), path).replaceAll('\\', '/');
}

function copyEvidence(parsed: RunResult, runDir: string, kind: PromiseRunKind): PromiseEvidence {
  if (!parsed.evidencePath || !parsed.evidencePath.toLowerCase().endsWith('.evidence')) {
    return null;
  }
  if (!existsSync(parsed.evidencePath)) return null;
  const destination = join(runDir, `${kind}.evidence`);
  copyFileSync(parsed.evidencePath, destination);
  const bytes = readFileSync(destination);
  return {
    sha256: createHash('sha256').update(bytes).digest('hex'),
    bytes: bytes.length,
  };
}

function pagePath(definition: Definition, scenarioId: string): string {
  if (definition.type === 'percent_discount') return `/promise/percent/${scenarioId}`;
  if (definition.type === 'bundle_discount') return `/promise/bundle/${scenarioId}`;
  return `/promise/delivery/${scenarioId}`;
}

function expectedValue(definition: Definition, scenario: PromiseScenario): number | string {
  if (scenario.kind === 'delivery') return scenario.expectedDate;
  return scenario.expectedDiscountCents;
}

function expectedText(definition: Definition, scenario: PromiseScenario): string {
  if (scenario.kind === 'delivery') return scenario.expectedDate;
  return formatUsd(scenario.expectedDiscountCents);
}

function labelText(definition: Definition): { label: string; key: string; extraLabel: string; extraKey: string } {
  if (definition.type === 'percent_discount') {
    return { label: 'Discount', key: 'observed_discount', extraLabel: 'Merchandise subtotal', extraKey: 'observed_subtotal' };
  }
  if (definition.type === 'bundle_discount') {
    return { label: 'Bundle discount', key: 'observed_bundle_discount', extraLabel: 'Merchandise subtotal', extraKey: 'observed_subtotal' };
  }
  return { label: 'Delivery estimate', key: 'observed_delivery', extraLabel: 'Order placed', extraKey: 'observed_order' };
}

function buildObjectives(
  definition: Definition,
  scenario: PromiseScenario,
  storeUrl: string,
): { observe: Objective; assert: Objective } {
  const base = storeUrl.replace(/\/+$/, '');
  const path = pagePath(definition, scenario.id);
  const labels = labelText(definition);
  const expected = expectedText(definition, scenario);

  const observeLines = [
    `Navigate to ${base}${path}`,
    `Read the line starting with '${labels.label}' and store the amount/date shown as ${labels.key}.`,
    `Read the line starting with '${labels.extraLabel}' and store the value shown as ${labels.extraKey}.`,
    `Do not place an order and do not enter any payment details.`,
  ];
  const assertLines = [
    `Navigate to ${base}${path}`,
    `Read the line starting with '${labels.label}' and store the amount/date shown as {{${labels.key}}}.`,
    `Read the line starting with '${labels.extraLabel}' and store the value shown as {{${labels.extraKey}}}.`,
    `Then verify {{${labels.key}}} is ${expected}.`,
  ];
  const observe = observeLines.join('\n');
  const assert = assertLines.join('\n');
  return {
    observe: { text: observe, sha256: sha256(observe) },
    assert: { text: assert, sha256: sha256(assert) },
  };
}

function valueFrom(definition: Definition, scenario: PromiseScenario, parsed: RunResult): {
  value: number | string | null;
  subtotal: number | null;
  errors: string[];
} {
  const errors: string[] = [];
  const labels = labelText(definition);
  const raw = parsed.finalStateStrings[labels.key];
  const subtotalRaw = parsed.finalStateStrings[labels.extraKey];

  if (raw === undefined) errors.push(`${labels.key} is missing from final_state`);

  if (scenario.kind === 'delivery') {
    return {
      value: raw ?? null,
      subtotal: null,
      errors,
    };
  }

  let value: number | null = null;
  if (raw !== undefined) {
    try {
      value = parseUsdToCents(raw);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  let subtotal: number | null = null;
  if (subtotalRaw !== undefined) {
    try {
      subtotal = parseUsdToCents(subtotalRaw);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  if (subtotalRaw === undefined) errors.push(`observed subtotal is missing from final_state`);
  if (scenario.kind === 'percent' && subtotal !== null && subtotal !== scenario.subtotalCents) {
    errors.push(`subtotal ${subtotal} != expected ${scenario.subtotalCents}`);
  }
  if (scenario.kind === 'bundle' && subtotal !== null) {
    const expectedSubtotal = bundleSubtotalCents(scenario.items);
    if (subtotal !== expectedSubtotal) {
      errors.push(`subtotal ${subtotal} != expected ${expectedSubtotal}`);
    }
  }
  return { value, subtotal, errors };
}

function runFailedInfra(parsed: RunResult | null, exitCode: number | null, timedOut: boolean): boolean {
  if (timedOut) return true;
  if (!parsed) return false;
  return !parsed.terminal || parsed.runEndStatus === 'unknown';
}

function classify(
  parsedObserve: RunResult | null,
  parsedAssert: RunResult | null,
  observed: number | string | null,
  expected: number | string,
  observeExit: number | null,
  assertExit: number | null,
  observeEvidence: PromiseEvidence,
  assertEvidence: PromiseEvidence,
  observeTimedOut: boolean,
  assertTimedOut: boolean,
  valueErrors: string[],
): { status: PromiseStatus; reasons: string[] } {
  if (runFailedInfra(parsedObserve, observeExit, observeTimedOut)) {
    return { status: 'INFRA_ERROR', reasons: ['observe run has no terminal run_end or timed out'] };
  }
  if (runFailedInfra(parsedAssert, assertExit, assertTimedOut)) {
    return { status: 'INFRA_ERROR', reasons: ['assert run has no terminal run_end or timed out'] };
  }
  if (!parsedObserve || parsedObserve.runEndStatus !== 'passed' || observeExit !== 0) {
    return { status: 'INCONCLUSIVE', reasons: ['observe did not pass with exit 0'] };
  }
  if (!parsedAssert || assertExit === null) {
    return { status: 'INCONCLUSIVE', reasons: ['assert was not executed'] };
  }
  if (!observeEvidence) return { status: 'INCONCLUSIVE', reasons: ['observe evidence is missing'] };
  if (!assertEvidence) return { status: 'INCONCLUSIVE', reasons: ['assert evidence is missing'] };
  if (valueErrors.length > 0) {
    return { status: 'INCONCLUSIVE', reasons: valueErrors };
  }
  if (observed === null) return { status: 'INCONCLUSIVE', reasons: ['observed value is missing'] };

  const mismatch = observed !== expected;
  const assertPassed = parsedAssert.runEndStatus === 'passed' && assertExit === 0;
  const assertFailed = parsedAssert.runEndStatus === 'failed' && assertExit !== 0;

  if (mismatch) {
    if (!assertFailed || parsedAssert.verdict?.confirmed !== true) {
      return {
        status: 'INCONCLUSIVE',
        reasons: [`observed ${String(observed)} != expected ${String(expected)}, and assert did not confirm a product bug`],
      };
    }
    return {
      status: 'BROKEN',
      reasons: [`observed ${String(observed)} != expected ${String(expected)}; assert confirmed a product bug`],
    };
  }
  if (!assertPassed) {
    return { status: 'INCONCLUSIVE', reasons: ['observed matches, but assert did not pass'] };
  }
  return {
    status: 'HONORED',
    reasons: [`observed ${String(observed)} matches expected ${String(expected)}; assert passed`],
  };
}

export type PromiseAuditOptions = {
  storeUrl?: string;
  kind?: 'observe' | 'assert' | 'both';
  promiseId?: string;
  scenarioId?: string;
  onProgress?: (message: string) => void;
};

const DEFINITIONS: Definition[] = [PERCENT_PROMISE, BUNDLE_PROMISE, DELIVERY_PROMISE];

function makeAuditId(startedAt: string): string {
  return `${startedAt.replace(/[:.]/g, '-')}-${randomBytes(3).toString('hex')}`;
}

export type PromiseAuditOutcome = {
  record: PromiseAuditRecord;
  auditDir: string;
};

export async function runPromiseAudit(
  options: PromiseAuditOptions = {},
): Promise<PromiseAuditOutcome> {
  const log = options.onProgress ?? (() => {});
  const storeUrl = options.storeUrl ?? STORE_URL;
  const kind = options.kind ?? 'both';
  const definitions = options.promiseId
    ? DEFINITIONS.filter((definition) => definition.id === options.promiseId)
    : DEFINITIONS;
  if (definitions.length === 0) {
    throw new Error(`unknown promise: ${options.promiseId ?? ''}`);
  }

  const startedAt = new Date().toISOString();
  const auditId = makeAuditId(startedAt);
  const auditDir = join(process.cwd(), '.data', 'promise-audits', auditId);
  mkdirSync(auditDir, { recursive: true });

  log(`preflight: checking ${storeUrl} and Kane authentication`);
  await preflightOrThrow(storeUrl);
  log('preflight: store reachable, Kane authenticated');

  const scenarios: PromiseScenarioAudit[] = [];

  for (const definition of definitions) {
    const selected = options.scenarioId
      ? definition.scenarios.filter((scenario) => scenario.id === options.scenarioId)
      : definition.scenarios;
    if (options.scenarioId && selected.length === 0) {
      throw new Error(`unknown scenario for ${definition.id}: ${options.scenarioId}`);
    }

    for (const scenario of selected) {
      const objective = buildObjectives(definition, scenario as PromiseScenario, storeUrl);
      const scenarioDir = join(auditDir, definition.id, scenario.id);
      mkdirSync(scenarioDir, { recursive: true });
      const expected = expectedValue(definition, scenario as PromiseScenario);

      let observe: PromiseRunAudit | null = null;
      let assertRun: PromiseRunAudit | null = null;

      if (kind === 'observe' || kind === 'both') {
        log(`[${definition.id}/${scenario.id}] observe: running live`);
        const artifacts = await runKaneObjective({
          scenarioId: scenario.id,
          kind: 'observe',
          objective: objective.observe.text,
          runDir: scenarioDir,
          storeUrl,
          maxSteps: 40,
          timeoutSeconds: 240,
        });
        const parsed = parseNdjson(readFileSync(artifacts.stdoutPath, 'utf8'));
        const evidence = copyEvidence(parsed, scenarioDir, 'observe');
        observe = {
          kind: 'observe',
          objective: objective.observe,
          artifacts: {
            exitCode: artifacts.exitCode,
            timedOut: artifacts.timedOut,
            durationMs: artifacts.durationMs,
            sessionDir: parsed.sessionDir,
            testUrl: parsed.testUrl,
          },
          evidence,
          parsed,
        };
        log(`[${definition.id}/${scenario.id}] observe: exit ${artifacts.exitCode ?? 'null'}, ${parsed.runEndStatus}, credits ${parsed.credits ?? 'n/a'}`);
      }

      if (kind === 'assert' || kind === 'both') {
        log(`[${definition.id}/${scenario.id}] assert: running live`);
        const artifacts = await runKaneObjective({
          scenarioId: scenario.id,
          kind: 'assert',
          objective: objective.assert.text,
          runDir: scenarioDir,
          storeUrl,
          maxSteps: 40,
          timeoutSeconds: 240,
        });
        const parsed = parseNdjson(readFileSync(artifacts.stdoutPath, 'utf8'));
        const evidence = copyEvidence(parsed, scenarioDir, 'assert');
        assertRun = {
          kind: 'assert',
          objective: objective.assert,
          artifacts: {
            exitCode: artifacts.exitCode,
            timedOut: artifacts.timedOut,
            durationMs: artifacts.durationMs,
            sessionDir: parsed.sessionDir,
            testUrl: parsed.testUrl,
          },
          evidence,
          parsed,
        };
        log(`[${definition.id}/${scenario.id}] assert: exit ${artifacts.exitCode ?? 'null'}, ${parsed.runEndStatus}, credits ${parsed.credits ?? 'n/a'}`);
      }

      const value = observe ? valueFrom(definition, scenario as PromiseScenario, observe.parsed) : { value: null, errors: [] };
      const classification = classify(
        observe?.parsed ?? null,
        assertRun?.parsed ?? null,
        value.value,
        expected,
        observe?.artifacts.exitCode ?? null,
        assertRun?.artifacts.exitCode ?? null,
        observe?.evidence ?? null,
        assertRun?.evidence ?? null,
        observe?.artifacts.timedOut ?? false,
        assertRun?.artifacts.timedOut ?? false,
        value.errors,
      );

      scenarios.push({
        promiseId: definition.id,
        type: definition.type,
        scenarioId: scenario.id,
        label: scenario.label,
        expected,
        observed: value.value,
        pagePath: pagePath(definition, scenario.id),
        status: classification.status,
        reasons: classification.reasons,
        observe,
        assert: assertRun,
      });

      log(`[${definition.id}/${scenario.id}] ${classification.status}: ${classification.reasons.join('; ')}`);

      const partial: PromiseAuditRecord = {
        auditVersion: 1,
        auditId,
        startedAt,
        finishedAt: null,
        partial: true,
        storeUrl,
        promises: [...scenarios],
        overallStatus: rollup(scenarios),
        totals: totals(scenarios),
      };
      writeFileSync(join(auditDir, 'audit.partial.json'), `${JSON.stringify(partial, null, 2)}\n`);
    }
  }

  const record: PromiseAuditRecord = {
    auditVersion: 1,
    auditId,
    startedAt,
    finishedAt: new Date().toISOString(),
    storeUrl,
    promises: scenarios,
    overallStatus: rollup(scenarios),
    totals: totals(scenarios),
  };
  writeFileSync(join(auditDir, 'audit.json'), `${JSON.stringify(record, null, 2)}\n`);
  log(`promise audit written: ${displayPath(join(auditDir, 'audit.json'))}`);
  return { record, auditDir };
}

function rollup(scenarios: PromiseScenarioAudit[]): PromiseStatus {
  if (scenarios.some((scenario) => scenario.status === 'BROKEN')) return 'BROKEN';
  if (scenarios.some((scenario) => scenario.status === 'INFRA_ERROR')) return 'INFRA_ERROR';
  if (scenarios.some((scenario) => scenario.status === 'INCONCLUSIVE')) return 'INCONCLUSIVE';
  return 'HONORED';
}

function totals(scenarios: PromiseScenarioAudit[]): PromiseAuditRecord['totals'] {
  const runs = scenarios.flatMap((scenario) => [scenario.observe, scenario.assert].filter((run): run is PromiseRunAudit => run !== null));
  const credits = runs.reduce((sum, run) => sum + (run.parsed.credits ?? 0), 0);
  return {
    runs: runs.length,
    credits: Number(credits.toFixed(6)),
  };
}

export { DEFINITIONS };
