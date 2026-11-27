/**
 * Kern MCP server.
 *
 * A deliberately read-only MCP surface over the recorded proof:
 * - no filesystem writes
 * - no Kane runs
 * - no Kane credits
 *
 * The live Kane path stays an explicit operator CLI command (`--run` or
 * `KERN_LIVE=1`). An agent should be able to inspect the gate without being
 * able to spend credits or move the challenge.
 */
import { createInterface } from 'node:readline';
import { formatUsd } from '../lib/money.ts';
import { loadContract } from '../lib/contract.ts';
import { evaluateGate } from '../lib/gate.ts';
import {
  loadAudit,
  loadAudits,
  recordedAuditRoot,
  type AuditSummary,
} from '../app/audits.ts';
import {
  evaluatePromiseGate,
  PROMISE_DEFINITIONS,
} from '../lib/promises.ts';

export type ToolContent = { type: 'text'; text: string };
export type ToolResult = { content: ToolContent[]; isError?: boolean };

type JsonRpcId = string | number | null;
type JsonRpcRequest = {
  jsonrpc?: string;
  id?: JsonRpcId;
  method?: string;
  params?: unknown;
};

type ToolDefinition = {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations: {
    readOnlyHint: boolean;
    destructiveHint: boolean;
    idempotentHint: boolean;
    openWorldHint: boolean;
  };
};

const SERVER_INFO = { name: 'kern-mcp', version: '0.1.0' };
const SUPPORTED_PROTOCOLS = ['2024-11-05', '2025-03-26', '2025-06-18'] as const;
const FALLBACK_PROTOCOL = '2024-11-05';

const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

export const TOOLS: ToolDefinition[] = [
  {
    name: 'kern_status',
    title: 'Kern status',
    description:
      'Read the frozen shipping contract, the recorded pre/post audits and the current shipping gate. Read-only; starts no Kane run and spends no credits.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
    annotations: READ_ONLY,
  },
  {
    name: 'kern_gate',
    title: 'Kern shipping gate',
    description:
      'Evaluate a recorded shipping audit against the frozen contract. Defaults to the newest recorded audit. Returns GATE: OPEN or GATE: CLOSED. Read-only; starts no Kane run.',
    inputSchema: {
      type: 'object',
      properties: {
        auditId: {
          type: 'string',
          description:
            'Optional recorded audit id, for example 2026-11-23T12-35-29-692Z-48b993. Paths are not accepted.',
        },
      },
      additionalProperties: false,
    },
    annotations: READ_ONLY,
  },
  {
    name: 'kern_promise_gate',
    title: 'Kern deterministic promise gate',
    description:
      'Evaluate the percentage-discount, bundle and delivery-estimate contracts against the correct implementation and the broken candidates. This is deterministic coverage, not a new Kane browser run.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
    annotations: READ_ONLY,
  },
  {
    name: 'kern_audits',
    title: 'Kern recorded audits',
    description:
      'List the recorded shipping audits available in this checkout, with status, run count and credits. Read-only.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
    annotations: READ_ONLY,
  },
];

function text(value: string, isError = false): ToolResult {
  return {
    content: [{ type: 'text', text: value }],
    ...(isError ? { isError: true } : {}),
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function shortHash(hash: string): string {
  return hash.length > 20 ? `${hash.slice(0, 16)}…` : hash;
}

function statusText(): string {
  const contract = loadContract();
  const index = loadAudits(recordedAuditRoot());
  const post = index.audits.find((summary) => summary.audit.postRepair === true) ?? null;
  const pre =
    index.audits.find(
      (summary) => summary.audit.postRepair !== true && summary.audit.overallStatus === 'BROKEN',
    ) ?? null;
  const target = post ?? index.audits[0] ?? null;
  const gate = target ? evaluateGate(target.audit, contract) : null;

  const lines = [
    'KERN / read-only status',
    `contract: ${contract.id}`,
    `spec sha256: ${shortHash(contract.specSha256)}`,
    `recorded shipping audits: ${index.audits.length}`,
    `pre-repair: ${pre ? `${pre.audit.auditId} — ${pre.audit.overallStatus}` : 'not present'}`,
    `post-repair: ${post ? `${post.audit.auditId} — ${post.audit.overallStatus}` : 'not present'}`,
    `shipping gate: ${gate ? (gate.open ? 'OPEN' : 'CLOSED') : 'not evaluated'}${
      gate
        ? ` (${gate.scenarios.filter((scenario) => scenario.pass).length}/${gate.scenarios.length} scenarios)`
        : ''
    }`,
    `promise classes: free shipping; ${PROMISE_DEFINITIONS.map((promise) => promise.title).join('; ')}`,
    'documented new-class proof: 2026-11-26T13-53-49-423Z-0525db — 18 runs / 9 scenarios / 9 HONORED',
    'live Kane: not used by this server; no credits spent',
  ];

  if (gate && !gate.open) {
    lines.push('gate reasons:');
    for (const reason of gate.reasons) lines.push(`- ${reason}`);
  }
  return lines.join('\n');
}

function gateText(auditId: string | null): string {
  const contract = loadContract();
  const root = recordedAuditRoot();
  const index = loadAudits(root);
  const summary: AuditSummary | null = auditId
    ? (() => {
        const loaded = loadAudit(auditId, root);
        if (!loaded.ok) throw new Error(loaded.message);
        return loaded.summary;
      })()
    : (index.audits[0] ?? null);

  if (!summary) throw new Error(`no recorded audits under ${root}`);

  const gate = evaluateGate(summary.audit, contract);
  const lines = [
    'KERN GATE / read-only',
    `audit: ${gate.auditId}`,
    `contract: ${gate.contractId} (${shortHash(gate.contractHash)})`,
    '',
  ];
  for (const scenario of gate.scenarios) {
    lines.push(
      `${scenario.scenarioId.padEnd(12)} expected ${formatUsd(
        scenario.expectedCents,
      )}  observed ${
        typeof scenario.observedCents === 'number' ? formatUsd(scenario.observedCents) : '—'
      }  ${scenario.status.padEnd(12)} ${scenario.pass ? 'PASS' : 'BLOCKED'}`,
    );
  }
  if (gate.reasons.length > 0) {
    lines.push('', 'reasons:');
    for (const reason of gate.reasons) lines.push(`- ${reason}`);
  }
  lines.push('', `GATE: ${gate.open ? 'OPEN' : 'CLOSED'}`);
  return lines.join('\n');
}

function promiseGateText(): string {
  const gate = evaluatePromiseGate();
  const lines = [
    'KERN PROMISES / deterministic contract coverage',
    'Not a new Kane browser run. No credits spent.',
    '',
  ];
  for (const result of gate.promises) {
    lines.push(result.correct.title);
    for (const scenario of result.correct.scenarios) {
      const expected =
        typeof scenario.expected === 'number' ? formatUsd(scenario.expected) : scenario.expected;
      const observed =
        typeof scenario.observed === 'number' ? formatUsd(scenario.observed) : scenario.observed;
      lines.push(
        `  ${scenario.label.padEnd(24)} expected ${String(expected).padEnd(
          12,
        )} observed ${String(observed).padEnd(12)} ${scenario.pass ? 'PASS' : 'FAIL'}`,
      );
    }
    const rejected = result.candidates.filter((candidate) => !candidate.pass).length;
    lines.push(
      `  broken candidates rejected: ${rejected}/${result.candidates.length} — ${
        result.pass ? 'PASS' : 'FAIL'
      }`,
    );
    lines.push('');
  }
  for (const reason of gate.reasons) lines.push(`reason: ${reason}`);
  lines.push(`GATE: ${gate.open ? 'OPEN' : 'CLOSED'}`);
  return lines.join('\n');
}

function auditsText(): string {
  const index = loadAudits(recordedAuditRoot());
  if (index.audits.length === 0) return 'No recorded audits found.';
  const lines = ['KERN / recorded shipping audits', ''];
  for (const summary of index.audits) {
    const audit = summary.audit;
    lines.push(
      `${audit.auditId}  ${audit.overallStatus.padEnd(12)}  ${String(
        audit.totals.runs,
      ).padStart(2)} runs  ${audit.totals.credits.toFixed(3)} credits${
        audit.postRepair ? '  post-repair' : ''
      }`,
    );
  }
  return lines.join('\n');
}

export async function callTool(name: string, args: unknown = {}): Promise<ToolResult> {
  const input = asRecord(args);
  if (name === 'kern_status') return text(statusText());
  if (name === 'kern_gate') {
    const rawId = input.auditId;
    if (rawId !== undefined && typeof rawId !== 'string') {
      return text('kern_gate: auditId must be a string', true);
    }
    return text(gateText(rawId ?? null));
  }
  if (name === 'kern_promise_gate') return text(promiseGateText());
  if (name === 'kern_audits') return text(auditsText());
  return text(`Unknown Kern tool: ${name}`, true);
}

function send(message: unknown): void {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

function reply(id: JsonRpcId, result: unknown): void {
  send({ jsonrpc: '2.0', id, result });
}

function replyError(id: JsonRpcId, code: number, message: string): void {
  send({ jsonrpc: '2.0', id, error: { code, message } });
}

function protocolVersion(params: unknown): string {
  const requested = asRecord(params).protocolVersion;
  return typeof requested === 'string' &&
    (SUPPORTED_PROTOCOLS as readonly string[]).includes(requested)
    ? requested
    : FALLBACK_PROTOCOL;
}

async function handleRequest(message: JsonRpcRequest): Promise<void> {
  const hasId = Object.prototype.hasOwnProperty.call(message, 'id');
  const id = message.id ?? null;
  const method = message.method;

  if (typeof method !== 'string') {
    if (hasId) replyError(id, -32600, 'Invalid Request');
    return;
  }

  // Notifications do not receive a response.
  if (!hasId) return;

  if (method === 'initialize') {
    reply(id, {
      protocolVersion: protocolVersion(message.params),
      capabilities: { tools: {} },
      serverInfo: SERVER_INFO,
      instructions:
        'Kern is a read-only promise-verification gate. These tools inspect recorded evidence and deterministic contracts. They never start Kane, never edit files, and never spend credits. GATE: CLOSED is a valid result, not a tool error.',
    });
    return;
  }

  if (method === 'ping') {
    reply(id, {});
    return;
  }

  if (method === 'tools/list') {
    reply(id, { tools: TOOLS });
    return;
  }

  if (method === 'tools/call') {
    const params = asRecord(message.params);
    const name = params.name;
    if (typeof name !== 'string') {
      replyError(id, -32602, 'tools/call requires a tool name');
      return;
    }
    try {
      const result = await callTool(name, params.arguments);
      reply(id, result);
    } catch (error) {
      const messageText = error instanceof Error ? error.message : String(error);
      reply(id, {
        content: [{ type: 'text', text: `${name}: ${messageText}` }],
        isError: true,
      });
    }
    return;
  }

  replyError(id, -32601, `Method not found: ${method}`);
}

export async function runMcpServer(): Promise<void> {
  const reader = createInterface({
    input: process.stdin,
    crlfDelay: Infinity,
  });

  reader.on('line', (line) => {
    if (line.trim().length === 0) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      send({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32700, message: 'Parse error' },
      });
      return;
    }
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      send({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32600, message: 'Invalid Request' },
      });
      return;
    }
    void handleRequest(parsed as JsonRpcRequest).catch((error: unknown) => {
      process.stderr.write(
        `kern-mcp: ${error instanceof Error ? error.stack ?? error.message : String(error)}\n`,
      );
    });
  });

  await new Promise<void>((resolve) => {
    reader.once('close', resolve);
  });
}
