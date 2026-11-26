# Agent stop hook

The gate is a command, not a UI badge. A coding agent can run it before it
claims a task is done.

## Claude Code

Add this to the project's `.claude/settings.json` (or merge it into your
existing Stop hook configuration):

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node hooks/claude-code-stop.mjs"
          }
        ]
      }
    ]
  }
}
```

By default the hook evaluates the newest audit under `.data/audits` or
`recorded/`. Point it at a specific run when needed:

```bash
KERN_AUDIT_PATH=.data/audits/<audit-id>/audit.json \
KERN_CONTRACT_PATH=.data/contracts/<contract-id>.json \
  node hooks/claude-code-stop.mjs
```

The hook returns a Claude Code `block` decision when the gate is closed. It
does not start Kane; run the audit first (or use `npm run gate -- --run`).

## Pi / any other agent

Use the same exit contract:

```bash
npm run gate -- --audit <audit.json> || exit 1
```

Or with a compiled contract and preview:

```bash
npm run gate -- --contract .data/contracts/<contract>.json \
  --run --url https://preview.example
```

The agent is not allowed to self-certify. It receives the exact expected and
observed values, the closed gate, and the audit path.
