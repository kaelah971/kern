# Kern MCP server

Kern ships a **read-only MCP server** for coding agents. It exposes the frozen
shipping contract, the recorded audits, the shipping gate and the deterministic
promise gate. It does **not** start Kane, edit files or spend Kane credits.

This is not a chat bridge to Kane. Kane remains the browser witness and is run
through the CLI; the MCP server is how an agent reads Kern's proof and gate. That
separation is deliberate: an agent should be able to inspect the evidence
without being able to move the challenge or pay for a run.

## Requirements

- Node.js 24+
- the repository cloned and `npm install` run
- no Kane account for the read-only tools

## Run it

The server uses stdio, so do not run it in a terminal expecting a prompt.
Configure an MCP client to launch it.

Claude Code:

```bash
claude mcp add kern -- node /absolute/path/to/kern/scripts/mcp.ts
```

Any MCP client that accepts a command and arguments:

```json
{
  "mcpServers": {
    "kern": {
      "command": "node",
      "args": ["/absolute/path/to/kern/scripts/mcp.ts"]
    }
  }
}
```

Use the absolute path to this checkout. The server reads `recorded/` relative to
its own module, so it works even when the client starts it from another folder.
You can also start it manually with `npm run mcp` while developing an MCP client.

## Tools

| Tool | What it returns | Kane credits |
|---|---|---:|
| `kern_status` | Contract hash, pre/post recorded audits, shipping gate, four promise classes | 0 |
| `kern_gate` | The shipping gate for a recorded audit; defaults to the newest one | 0 |
| `kern_promise_gate` | Deterministic coverage for percentage, bundle and delivery promises | 0 |
| `kern_audits` | The recorded shipping audits, statuses, run counts and credits | 0 |

`kern_gate` accepts an optional `auditId`; it does not accept a filesystem path.
A closed gate is a valid result, not a tool error.

Example prompts:

- “Check Kern’s gate and tell me which scenario failed.”
- “List the recorded audits and show the post-repair evidence.”
- “Run the deterministic promise gate for discounts, bundles and delivery.”
- “Is the current contract still the one the audit used?”

## No Kane credits

These commands use no Kane credits and need no Kane login:

```bash
npm test
npm run demo
npm run kern -- status
npm run kern -- audits
npm run kern -- gate
npm run kern -- promises
npm run mcp
```

The `npm run demo` path starts the recorded-audit app and the repaired local
store. The public site is static proof; it does not expose a live Kane runner.

## Live Kane runs are separate

A live audit needs the Kane CLI installed, `kane-cli login`, and credits. The MCP
server deliberately has no live-run tool. Use the explicit operator commands:

```bash
npm run gate -- --run
node scripts/kane-audit.ts
node scripts/promise-audit.ts
```

With `--run` or `KERN_LIVE=1`, Kern starts real browser runs and spends credits.
The recorded three-cart shipping audit is six Kane runs and cost about 140
credits; the three new promise classes were checked with 18 Kane runs and cost
**253.342116 credits** in the recorded audit. Credit use varies.

## Read-only boundary

The MCP server:

- reads `recorded/`, the contract and the deterministic implementations;
- does not accept arbitrary URLs, shell commands or audit paths;
- does not start Kane;
- does not edit the contract, tests or recorded evidence;
- does not expose the operator-only live check.

That is the point: the agent can see the gate, but it cannot move the goalposts.
