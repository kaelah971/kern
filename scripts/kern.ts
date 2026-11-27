/**
 * Small convenience entry point for humans and agents.
 *
 *   npm run kern -- status
 *   npm run kern -- audits
 *   npm run kern -- gate [--audit <id>] [--json]
 *   npm run kern -- promises
 *   npm run kern -- mcp
 *   npm run kern -- demo
 *
 * The status/audits commands are read-only. gate and promises delegate to the
 * existing CLIs. demo starts the recorded app and repaired store, no Kane run.
 */
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { callTool } from '../src/mcp/server.ts';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

function usage(): string {
  return `Kern

Usage:
  npm run kern -- status
  npm run kern -- audits
  npm run kern -- gate [--audit <id>] [--json]
  npm run kern -- promises
  npm run kern -- mcp
  npm run kern -- demo

status/audits are read-only. gate/promises do not start Kane unless gate is
passed --run. mcp starts the read-only MCP server on stdio. demo starts the
recorded proof app and the repaired local store; it starts no Kane run.
`;
}

async function main(argv = process.argv.slice(2)): Promise<number> {
  const [command, ...rest] = argv;
  if (!command || command === 'help' || command === '--help' || command === '-h') {
    console.log(usage());
    return 0;
  }

  if (command === 'status' || command === 'audits') {
    const result = await callTool(command === 'status' ? 'kern_status' : 'kern_audits');
    if (result.isError) {
      console.error(result.content.map((item) => item.text).join('\n'));
      return 2;
    }
    console.log(result.content.map((item) => item.text).join('\n'));
    return 0;
  }

  if (command === 'gate' || command === 'promises') {
    const script = command === 'gate' ? 'scripts/gate.ts' : 'scripts/promise-check.ts';
    const child = spawnSync(process.execPath, [join(ROOT, script), ...rest], {
      cwd: ROOT,
      stdio: 'inherit',
      windowsHide: true,
    });
    if (child.error) {
      console.error(`kern: ${child.error.message}`);
      return 2;
    }
    return child.status ?? 2;
  }

  if (command === 'mcp') {
    await import('./mcp.ts');
    return 0;
  }

  if (command === 'demo') {
    const child = spawnSync(process.execPath, [join(ROOT, 'scripts/demo.ts'), ...rest], {
      cwd: ROOT,
      stdio: 'inherit',
      windowsHide: true,
    });
    if (child.error) {
      console.error(`kern: ${child.error.message}`);
      return 2;
    }
    return child.status ?? 2;
  }

  console.error(`kern: unknown command ${command}`);
  console.error(usage());
  return 2;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error: unknown) => {
    console.error(`kern: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 2;
  });
