/**
 * Kern gate CLI.
 *
 * Evaluates a completed audit against the current frozen contract and exits 0
 * only when the gate is open. It does not start Kane unless --run is passed.
 *
 *   npm run gate
 *   npm run gate -- --audit recorded/<audit-id>/audit.json
 *   npm run gate -- --run
 *   npm run gate -- --json
 *
 * A coding agent can use the exit code as a stop gate:
 *   npm run gate -- --audit <path> || exit 1
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { AuditRecord } from '../src/lib/audit.ts';
import { loadContract } from '../src/lib/contract.ts';
import { evaluateGate } from '../src/lib/gate.ts';
import { defaultAuditRoot, loadAudits, resolveAuditRoot } from '../src/app/audits.ts';
import { formatUsd } from '../src/lib/money.ts';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

type Args = { audit: string | null; run: boolean; json: boolean; help: boolean };

function parseArgs(argv: string[]): Args {
  const args: Args = { audit: null, run: false, json: false, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--run') args.run = true;
    else if (arg === '--json') args.json = true;
    else if (arg === '--help' || arg === '-h') args.help = true;
    else if (arg === '--audit') {
      const next = argv[index + 1];
      if (!next) throw new Error('--audit requires a path');
      args.audit = next;
      index += 1;
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }
  return args;
}

function readAudit(path: string): AuditRecord {
  const target = statSync(path).isDirectory() ? join(path, 'audit.json') : path;
  if (!existsSync(target)) throw new Error(`audit file not found: ${target}`);
  const parsed = JSON.parse(readFileSync(target, 'utf8')) as AuditRecord;
  if (typeof parsed.auditId !== 'string' || !Array.isArray(parsed.scenarios)) {
    throw new Error(`not an audit record: ${target}`);
  }
  return parsed;
}

function latestAuditPath(root: string): string {
  const index = loadAudits(root);
  if (index.audits.length === 0) throw new Error(`no audit records under ${root}`);
  return index.audits[0]!.path;
}

function usage(): string {
  return `Kern gate

Usage:
  npm run gate                         # newest audit under .data/audits or recorded/
  npm run gate -- --audit <path>       # specific audit.json or audit directory
  npm run gate -- --run                # run a real Kane audit first (spends credits)
  npm run gate -- --json               # machine-readable result
  npm run gate -- --help

Exit codes:
  0  gate open
  1  gate closed
  2  usage or infrastructure error
`;
}

export function main(argv = process.argv.slice(2)): number {
  let args: Args;
  try {
    args = parseArgs(argv);
  } catch (error) {
    console.error(`KERN GATE: ${error instanceof Error ? error.message : String(error)}`);
    console.error(usage());
    return 2;
  }
  if (args.help) {
    console.log(usage());
    return 0;
  }

  try {
    if (args.run) {
      console.error('KERN GATE: --run starts a real Kane audit and spends credits.');
      const audit = spawnSync(
        process.execPath,
        [join(ROOT, 'scripts', 'kane-audit.ts')],
        { cwd: ROOT, stdio: 'inherit', windowsHide: true },
      );
      if (audit.error) throw audit.error;
      if (audit.status !== 0) {
        console.error(`KERN GATE: audit failed with exit ${audit.status ?? 'unknown'}`);
        return 2;
      }
    }

    let auditPath: string;
    if (args.audit) {
      auditPath = resolve(ROOT, args.audit);
    } else if (args.run) {
      auditPath = latestAuditPath(defaultAuditRoot(ROOT));
    } else {
      auditPath = latestAuditPath(resolveAuditRoot(ROOT).root);
    }

    const audit = readAudit(auditPath);
    const contract = loadContract();
    const gate = evaluateGate(audit, contract);

    if (args.json) {
      console.log(JSON.stringify(gate, null, 2));
    } else {
      console.log('KERN GATE');
      console.log(`audit:     ${gate.auditId}`);
      console.log(`contract:  ${gate.contractId} (${gate.contractHash.slice(0, 16)}…)`);
      for (const scenario of gate.scenarios) {
        console.log(
          `  ${scenario.scenarioId.padEnd(12)} expected ${formatUsd(
            scenario.expectedCents,
          )}  observed ${
            typeof scenario.observedCents === 'number'
              ? formatUsd(scenario.observedCents)
              : '—'
          }  ${scenario.status.padEnd(12)} ${scenario.pass ? 'PASS' : 'BLOCKED'}`,
        );
      }
      if (gate.reasons.length > 0) {
        console.log('reasons:');
        for (const reason of gate.reasons) console.log(`  - ${reason}`);
      }
      console.log(`GATE: ${gate.open ? 'OPEN' : 'CLOSED'}`);
    }
    return gate.open ? 0 : 1;
  } catch (error) {
    console.error(`KERN GATE: ${error instanceof Error ? error.message : String(error)}`);
    return 2;
  }
}

const isMain =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  process.exitCode = main();
}
