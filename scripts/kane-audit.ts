import { runAudit, type AuditRecord, type ScenarioAudit } from '../src/lib/audit.ts';
import { PRESET_CARTS } from '../src/lib/catalog.ts';
import { formatUsd } from '../src/lib/money.ts';

type Kind = 'observe' | 'assert' | 'both';

function usage(): string {
  return `Kern Kane audit

Usage:
  node scripts/kane-audit.ts [options]

Options:
  --scenario <id>        Run one scenario: ${Object.keys(PRESET_CARTS).join(', ')}
  --kind <kind>          observe | assert | both (default: both)
  --reuse-capture <id>   Use the provided real capture for <id> instead of
                         spending credits. Requires --kind both and an
                         objective-hash match. Only eligible-60 is available.
  -h, --help             Show this help
`;
}

function fail(message: string): never {
  throw new Error(message);
}

function parseArgs(argv: string[]): {
  scenario: string | undefined;
  kind: Kind;
  reuse: string[];
} {
  let scenario: string | undefined;
  let kind: Kind = 'both';
  const reuse: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      console.log(usage());
      process.exit(0);
    }
    if (arg === '--scenario') {
      const value = argv[++index];
      if (!value) fail('--scenario needs an id');
      if (!Object.hasOwn(PRESET_CARTS, value)) {
        fail(`unknown scenario "${value}"; choose ${Object.keys(PRESET_CARTS).join(', ')}`);
      }
      scenario = value;
      continue;
    }
    if (arg === '--kind') {
      const value = argv[++index];
      if (value !== 'observe' && value !== 'assert' && value !== 'both') {
        fail(`--kind must be observe, assert or both; got "${value ?? ''}"`);
      }
      kind = value;
      continue;
    }
    if (arg === '--reuse-capture') {
      const value = argv[++index];
      if (!value) fail('--reuse-capture needs a scenario id');
      if (!Object.hasOwn(PRESET_CARTS, value)) {
        fail(`unknown scenario "${value}"; choose ${Object.keys(PRESET_CARTS).join(', ')}`);
      }
      reuse.push(value);
      continue;
    }
    fail(`unknown argument "${arg}"`);
  }

  return { scenario, kind, reuse };
}

function pad(value: string, width: number): string {
  return value + ' '.repeat(Math.max(0, width - value.length));
}

function verdictText(scenario: ScenarioAudit): string {
  const verdict = scenario.assertVerdict;
  if (!verdict) return '—';
  const parts = [
    verdict.confirmed === true ? 'confirmed' : verdict.confirmed === false ? 'unconfirmed' : 'unknown',
    verdict.family ?? '—',
    verdict.category ?? '—',
    verdict.severity ?? '—',
  ];
  return parts.join(' / ');
}

function printTable(record: AuditRecord): void {
  const headers = ['Scenario', 'Expected', 'Observed', 'Assert', 'Verdict', 'Status'];
  const rows = record.scenarios.map((scenario) => {
    const expected = formatUsd(scenario.oracle.expectedShippingCents);
    const observed =
      scenario.oracle.observedShippingCents === null
        ? '—'
        : formatUsd(scenario.oracle.observedShippingCents);
    const assertText = scenario.assert
      ? `${scenario.assert.parsed.runEndStatus} (exit ${scenario.assert.artifacts.exitCode ?? 'null'})`
      : 'not run';
    return [scenario.scenarioId, expected, observed, assertText, verdictText(scenario), scenario.status];
  });

  const widths = headers.map((header, column) =>
    Math.max(header.length, ...rows.map((row) => row[column]!.length)),
  );
  const line = (cells: string[]): string =>
    cells.map((cell, column) => pad(cell, widths[column]!)).join('  ');

  console.log(line(headers));
  console.log(widths.map((width) => '-'.repeat(width)).join('  '));
  for (const row of rows) console.log(line(row));
}

async function main(): Promise<void> {
  const { scenario, kind, reuse } = parseArgs(process.argv.slice(2));
  const { record, auditDir } = await runAudit({
    scenarioIds: scenario ? [scenario] : undefined,
    kind,
    reuseCaptureScenarioIds: reuse,
    onProgress: (message) => console.error(message),
  });

  console.log('');
  printTable(record);
  console.log('');
  console.log(`Audit:      ${record.auditId}`);
  console.log(`Contract:   ${record.contract.id} (${record.contract.specSha256.slice(0, 16)}…)`);
  console.log(`Overall:    ${record.overallStatus}`);
  console.log(
    `Runs:       ${record.totals.runs} (live ${record.totals.liveRuns}, provided ${record.totals.providedCaptureRuns})`,
  );
  console.log(
    `Credits:    ${record.totals.credits} (live ${record.totals.liveCredits}, provided ${record.totals.providedCaptureCredits})`,
  );
  console.log(`Audit JSON: ${auditDir.replaceAll('\\', '/')}/audit.json`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`AUDIT ABORTED: ${message}`);
  process.exitCode = 1;
});
