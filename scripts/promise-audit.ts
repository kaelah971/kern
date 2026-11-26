/**
 * Real Kane audit for the new promise classes.
 *
 *   node scripts/promise-audit.ts
 *   node scripts/promise-audit.ts --kind observe --promise percent-20 --scenario percent-60
 *   node scripts/promise-audit.ts --kind assert --promise delivery-2day --scenario delivery-before-cutoff
 *   node scripts/promise-audit.ts --json
 *
 * This spends Kane credits. A full run is 3 promises × 3 scenarios × 2 runs.
 */
import { pathToFileURL } from 'node:url';
import { runPromiseAudit } from '../src/lib/promise-audit.ts';
import { formatUsd } from '../src/lib/money.ts';

type Args = {
  kind: 'observe' | 'assert' | 'both';
  promise: string | undefined;
  scenario: string | undefined;
  url: string | undefined;
  json: boolean;
  help: boolean;
};

function usage(): string {
  return `Kern promise audit

Usage:
  node scripts/promise-audit.ts
  node scripts/promise-audit.ts --kind observe --promise percent-20 --scenario percent-60
  node scripts/promise-audit.ts --kind assert --promise delivery-2day --scenario delivery-before-cutoff
  node scripts/promise-audit.ts --json

Options:
  --kind observe|assert|both   default: both
  --promise <id>               percent-20 | bundle-15 | delivery-2day
  --scenario <id>              a scenario from that promise
  --url <url>                  default http://127.0.0.1:4173/
  --json                       machine-readable audit record
  --help

A full run is 18 real Kane runs and spends credits.
`;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { kind: 'both', promise: undefined, scenario: undefined, url: undefined, json: false, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--json') args.json = true;
    else if (arg === '--help' || arg === '-h') args.help = true;
    else if (arg === '--kind') {
      const value = argv[++index];
      if (value !== 'observe' && value !== 'assert' && value !== 'both') {
        throw new Error('--kind must be observe, assert or both');
      }
      args.kind = value;
    } else if (arg === '--promise') {
      const value = argv[++index];
      if (!value) throw new Error('--promise needs an id');
      args.promise = value;
    } else if (arg === '--scenario') {
      const value = argv[++index];
      if (!value) throw new Error('--scenario needs an id');
      args.scenario = value;
    } else if (arg === '--url') {
      const value = argv[++index];
      if (!value) throw new Error('--url needs a URL');
      const parsed = new URL(value);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new Error('--url must be http(s)');
      }
      args.url = parsed.toString();
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }
  return args;
}

function show(value: number | string | null): string {
  if (value === null) return '—';
  return typeof value === 'number' ? formatUsd(value) : value;
}

async function main(argv = process.argv.slice(2)): Promise<number> {
  let args: Args;
  try {
    args = parseArgs(argv);
  } catch (error) {
    console.error(`KERN PROMISE AUDIT: ${error instanceof Error ? error.message : String(error)}`);
    console.error(usage());
    return 2;
  }
  if (args.help) {
    console.log(usage());
    return 0;
  }

  try {
    const { record, auditDir } = await runPromiseAudit({
      ...(args.kind ? { kind: args.kind } : {}),
      ...(args.promise ? { promiseId: args.promise } : {}),
      ...(args.scenario ? { scenarioId: args.scenario } : {}),
      ...(args.url ? { storeUrl: args.url } : {}),
      onProgress: (message) => console.error(message),
    });
    if (args.json) {
      console.log(JSON.stringify({ ...record, auditDir }, null, 2));
    } else {
      console.log('');
      console.log('KERN PROMISE AUDIT');
      console.log(`audit:     ${record.auditId}`);
      console.log(`store:     ${record.storeUrl}`);
      console.log(`finished:  ${record.finishedAt ?? '—'}`);
      console.log(`overall:   ${record.overallStatus}`);
      console.log(`runs:      ${record.totals.runs} · credits ${record.totals.credits}`);
      console.log('');
      console.log('promise / scenario'.padEnd(42) + 'expected'.padEnd(16) + 'observed'.padEnd(16) + 'status');
      for (const scenario of record.promises) {
        console.log(
          `${scenario.promiseId} / ${scenario.scenarioId}`.padEnd(42) +
            show(scenario.expected).padEnd(16) +
            show(scenario.observed).padEnd(16) +
            scenario.status,
        );
        if (scenario.status !== 'HONORED') {
          for (const reason of scenario.reasons) console.log(`  reason: ${reason}`);
        }
      }
      console.log('');
      console.log(`audit file: ${auditDir}/audit.json`);
    }
    return record.overallStatus === 'HONORED' ? 0 : 1;
  } catch (error) {
    console.error(`KERN PROMISE AUDIT: ${error instanceof Error ? error.message : String(error)}`);
    return 2;
  }
}

const isMain = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) process.exitCode = await main();
