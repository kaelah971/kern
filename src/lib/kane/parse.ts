export const ERR_NO_TERMINAL = 'ERR_NO_TERMINAL';

export type RunEndStatus = 'passed' | 'failed' | 'unknown';

export type MemoryEntry = {
  extractedValue: string | null;
  expectedValue: string | null;
  reasoning: string | null;
};

export type KaneSignal = {
  step: string | null;
  kind: string | null;
  excerpt: string | null;
};

export type KaneVerdict = {
  confirmed: boolean | null;
  status: string | null;
  family: string | null;
  category: string | null;
  severity: string | null;
  rootCause: string | null;
  bugTitle: string | null;
  suggestion: string | null;
  oneLiner: string | null;
  confidence: number | null;
  signals: KaneSignal[];
  raw: Record<string, unknown>;
};

export type RunResult = {
  terminal: boolean;
  error: string | null;
  runEndStatus: RunEndStatus;
  resultCode: number | null;
  reasonCode: string | null;
  finalState: Record<string, unknown>;
  finalStateStrings: Record<string, string>;
  memory: Record<string, MemoryEntry>;
  verdict: KaneVerdict | null;
  sessionDir: string | null;
  testUrl: string | null;
  duration: number | null;
  credits: number | null;
  evidencePath: string | null;
  runId: string | null;
  observedShippingCents: number | null;
  observedSubtotalCents: number | null;
  moneyErrors: string[];
  parseWarnings: string[];
  rawRunEnd: Record<string, unknown> | null;
};

export class MoneyParseError extends Error {
  readonly code = 'ERR_MONEY_FORMAT';
  readonly input: unknown;

  constructor(input: unknown, reason: string) {
    super(`cannot parse USD amount ${JSON.stringify(input)}: ${reason}`);
    this.name = 'MoneyParseError';
    this.input = input;
  }
}

/**
 * Strict USD parsing for values Kane actually rendered.
 *
 * Accepted: "$0.00", "$9.00", "$1,234.56" (surrounding whitespace ignored).
 * Rejected: 9.00, $9, $9.0, $ 9.00, USD 9.00, $9.00 USD, €9.00, -$9.00.
 * Ambiguity is an error, never a guess.
 */
export function parseUsdToCents(value: unknown): number {
  if (typeof value !== 'string') {
    throw new MoneyParseError(value, 'expected a string');
  }
  const trimmed = value.trim();
  const match = /^\$(\d{1,3}(?:,\d{3})*|\d+)\.(\d{2})$/.exec(trimmed);
  if (!match) {
    throw new MoneyParseError(
      value,
      'expected exactly a dollar sign, digits and two decimal places',
    );
  }
  const dollars = Number(match[1]!.replaceAll(',', ''));
  const cents = Number(match[2]);
  const total = dollars * 100 + cents;
  if (!Number.isSafeInteger(total)) {
    throw new MoneyParseError(value, 'amount is outside safe integer cents');
  }
  return total;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function parseMemory(runEnd: Record<string, unknown>): Record<string, MemoryEntry> {
  const context = isRecord(runEnd.context) ? runEnd.context : {};
  const memory = isRecord(context.memory) ? context.memory : {};
  const parsed: Record<string, MemoryEntry> = {};
  for (const [key, value] of Object.entries(memory)) {
    if (!isRecord(value)) continue;
    parsed[key] = {
      extractedValue: stringOrNull(value.extracted_value),
      expectedValue: stringOrNull(value.expected_value),
      reasoning: stringOrNull(value.reasoning),
    };
  }
  return parsed;
}

function parseVerdict(value: unknown): KaneVerdict | null {
  if (!isRecord(value)) return null;
  const rawSignals = Array.isArray(value.signals) ? value.signals : [];
  const signals: KaneSignal[] = rawSignals.filter(isRecord).map((signal) => ({
    step: stringOrNull(signal.step),
    kind: stringOrNull(signal.kind),
    excerpt: stringOrNull(signal.excerpt),
  }));

  return {
    confirmed: typeof value.confirmed === 'boolean' ? value.confirmed : null,
    status: stringOrNull(value.status),
    family: stringOrNull(value.family),
    category: stringOrNull(value.category),
    severity: stringOrNull(value.severity),
    rootCause: stringOrNull(value.root_cause),
    bugTitle: stringOrNull(value.bug_title),
    suggestion: stringOrNull(value.suggestion),
    oneLiner: stringOrNull(value.one_liner),
    confidence: numberOrNull(value.confidence),
    signals,
    raw: value,
  };
}

function parseMoneyValue(value: unknown, field: string, errors: string[]): number | null {
  if (value === undefined) return null;
  try {
    return parseUsdToCents(value);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push(`${field}: ${message}`);
    return null;
  }
}

function emptyResult(parseWarnings: string[]): RunResult {
  return {
    terminal: false,
    error: ERR_NO_TERMINAL,
    runEndStatus: 'unknown',
    resultCode: null,
    reasonCode: null,
    finalState: {},
    finalStateStrings: {},
    memory: {},
    verdict: null,
    sessionDir: null,
    testUrl: null,
    duration: null,
    credits: null,
    evidencePath: null,
    runId: null,
    observedShippingCents: null,
    observedSubtotalCents: null,
    moneyErrors: [],
    parseWarnings,
    rawRunEnd: null,
  };
}

/**
 * Parse Kane's NDJSON output. A run without a terminal `run_end` is
 * ERR_NO_TERMINAL and can never be read as a pass.
 */
export function parseNdjson(text: string): RunResult {
  const parseWarnings: string[] = [];
  let runEnd: Record<string, unknown> | null = null;
  let runEndCount = 0;
  let coveragePack: string | null = null;

  const lines = text.split(/\r?\n/);
  for (const [index, line] of lines.entries()) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let event: unknown;
    try {
      event = JSON.parse(trimmed);
    } catch {
      parseWarnings.push(`line ${index + 1}: invalid JSON`);
      continue;
    }
    if (isRecord(event) && event.type === 'coverage') {
      const pack = event.pack;
      if (typeof pack === 'string') coveragePack = pack;
    }
    if (isRecord(event) && event.type === 'run_end') {
      runEnd = event;
      runEndCount += 1;
    }
  }

  if (!runEnd) {
    return emptyResult(parseWarnings);
  }
  if (runEndCount > 1) {
    parseWarnings.push(`found ${runEndCount} run_end events; using the last one`);
  }

  const statusValue = runEnd.status;
  const runEndStatus: RunEndStatus =
    statusValue === 'passed' || statusValue === 'failed' ? statusValue : 'unknown';

  const finalState = isRecord(runEnd.final_state) ? runEnd.final_state : {};
  const finalStateStrings: Record<string, string> = {};
  for (const [key, value] of Object.entries(finalState)) {
    if (typeof value === 'string') finalStateStrings[key] = value;
  }

  const memory = parseMemory(runEnd);
  const context = isRecord(runEnd.context) ? runEnd.context : {};
  const variables = isRecord(context.variables) ? context.variables : {};
  const variableValue = (name: string): string | undefined => {
    const entry = variables[name];
    return isRecord(entry) && typeof entry.value === 'string' ? entry.value : undefined;
  };

  const moneyErrors: string[] = [];
  let shippingRaw: unknown;
  let shippingSource: string;
  if (Object.hasOwn(finalState, 'observed_shipping')) {
    shippingRaw = finalState.observed_shipping;
    shippingSource = 'final_state.observed_shipping';
  } else if (memory.observed_shipping) {
    shippingRaw = memory.observed_shipping.extractedValue;
    shippingSource = 'context.memory.observed_shipping';
  } else {
    shippingRaw = variableValue('observed_shipping');
    shippingSource = 'context.variables.observed_shipping';
  }

  let subtotalRaw: unknown;
  let subtotalSource: string;
  if (Object.hasOwn(finalState, 'observed_subtotal')) {
    subtotalRaw = finalState.observed_subtotal;
    subtotalSource = 'final_state.observed_subtotal';
  } else if (memory.observed_subtotal) {
    subtotalRaw = memory.observed_subtotal.extractedValue;
    subtotalSource = 'context.memory.observed_subtotal';
  } else {
    subtotalRaw = variableValue('observed_subtotal');
    subtotalSource = 'context.variables.observed_subtotal';
  }

  const observedShippingCents = parseMoneyValue(shippingRaw, shippingSource, moneyErrors);
  const observedSubtotalCents = parseMoneyValue(subtotalRaw, subtotalSource, moneyErrors);

  const coverage = isRecord(runEnd.coverage) ? runEnd.coverage : {};
  const evidencePath = stringOrNull(coverage.pack) ?? coveragePack;

  return {
    terminal: true,
    error: null,
    runEndStatus,
    resultCode: numberOrNull(runEnd.result_code),
    reasonCode: stringOrNull(runEnd.reason_code),
    finalState,
    finalStateStrings,
    memory,
    verdict: parseVerdict(runEnd.verdict),
    sessionDir: stringOrNull(runEnd.session_dir),
    testUrl: stringOrNull(runEnd.test_url),
    duration: numberOrNull(runEnd.duration),
    credits: numberOrNull(runEnd.credits_consumed),
    evidencePath,
    runId: stringOrNull(runEnd.run_id),
    observedShippingCents,
    observedSubtotalCents,
    moneyErrors,
    parseWarnings,
    rawRunEnd: runEnd,
  };
}

const INFRA_REASON_PREFIXES = [
  'auth',
  'setup',
  'infra',
  'timeout',
  'environment',
  'browser_launch',
  'browser_error',
  'cli',
];

export function isInfraReason(reasonCode: string | null): boolean {
  if (!reasonCode) return false;
  return INFRA_REASON_PREFIXES.some(
    (prefix) =>
      reasonCode === prefix ||
      reasonCode.startsWith(`${prefix}.`) ||
      reasonCode.startsWith(`${prefix}_`),
  );
}
