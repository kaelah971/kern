/**
 * Stdio MCP entry point.
 *
 * Configure an MCP client to run:
 *   node /absolute/path/to/kern/scripts/mcp.ts
 *
 * The server is read-only and does not start Kane or spend credits.
 */
import { runMcpServer } from '../src/mcp/server.ts';

await runMcpServer();
