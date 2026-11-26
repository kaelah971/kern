/**
 * Kern promise gate for the next promise classes.
 *
 * This is deterministic contract coverage, not a new Kane browser run:
 *
 *   npm run promises
 *   npm run --silent promises -- --json
 *
 * It exits 0 only when the correct implementation passes every scenario and
 * every plausible broken implementation is rejected. Run it after a checkout
 * change; a candidate that passes every scenario closes the gate.
 */
import { pathToFileURL } from 'node:url';
import { evaluatePromiseGate } from '../src/lib/promises.ts';
import { formatUsd } from '../src/lib/money.ts';

type Args = { json: boolean; help: boolean };

function parseArgs(argv: string[]): Args {
  const args: Args = { json: false, help: false };
  for (const arg of argv) {
    if (arg === '--json') args.json = true;
    else if (arg === '--help' || arg === '-h') args.help = true;
    else throw new Error(`unknown argument: ${arg}`);
  }
  return args;
}

function usage(): string {
  return `Kern promise gate

Usage:
  npm run promises
  npm run --silent promises -- --json
  npm run promises -- --help

Exit codes:
  0  open: correct implementation passes every scenario; every broken candidate is rejected
  1  closed: a wrong implementation passed, or the correct one failed
  2  usage or infrastructure error

This command is deterministic contract coverage. It does not start Kane and
does not create a new browser evidence run.
`;
}

function show(value: number | string): string {
  return typeof value === 'number' ? formatUsd(value) : value;
}

function main(argv = process.argv.slice(2)): number {
  let args: Args;
  try {
    args = parseArgs(argv);
  } catch (error) {
    console.error(`KERN PROMISES: ${error instanceof Error ? error.message : String(error)}`);
    console.error(usage());
    return 2;
  }
  if (args.help) {
    console.log(usage());
    return 0;
  }

  try {
    const gate = evaluatePromiseGate();
    if (args.json) {
      console.log(JSON.stringify(gate, null, 2));
    } else {
      console.log('KERN PROMISES / deterministic contract coverage');
      console.log('Not a new Kane browser run.');
      console.log('');
      for (const result of gate.promises) {
        console.log(`${result.correct.title}`);
        console.log(`  ${result.correct.offer}`);
        for (const scenario of result.correct.scenarios) {
          console.log(
            `  ${scenario.label.padEnd(24)} expected ${show(scenario.expected).padEnd(12)} observed ${show(scenario.observed).padEnd(12)} ${scenario.pass ? 'PASS' : 'FAIL'}`,
          );
        }
        const rejected = result.candidates
          .map((candidate) => `${candidate.label}: ${candidate.pass ? 'PASS (bad)' : 'REJECT'}`)
          .join(' | ');
        console.log(`  candidates: ${rejected}`);
        console.log(`  ${result.pass ? 'PROMISE COVERAGE: PASS' : 'PROMISE COVERAGE: FAIL'}`);
        console.log('');
      }
      for (const reason of gate.reasons) console.log(`  reason: ${reason}`);
      console.log(`GATE: ${gate.open ? 'OPEN' : 'CLOSED'}`);
    }
    return gate.open ? 0 : 1;
  } catch (error) {
    console.error(`KERN PROMISES: ${error instanceof Error ? error.message : String(error)}`);
    return 2;
  }
}

const isMain =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) process.exitCode = main();
