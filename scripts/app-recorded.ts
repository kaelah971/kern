/**
 * Start the public/read-only app from the committed recorded audits on :3300.
 * Cross-platform replacement for the old POSIX env-prefix npm script.
 */
import type { AddressInfo } from 'node:net';
import { createAppServer } from '../src/app/server.ts';
import { resolveAuditRoot } from '../src/app/audits.ts';

process.env.KERN_PUBLIC = '1';
process.env.KERN_AUDIT_SOURCE = 'recorded';

const port = Number(process.env.PORT ?? 3300);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error(`PORT must be an integer between 1 and 65535, got ${process.env.PORT}`);
}

const { root, source } = resolveAuditRoot(process.cwd());
if (source !== 'recorded') {
  throw new Error(`app:recorded expected recorded audits, got ${source} at ${root}`);
}

const server = createAppServer({ auditRoot: root, publicMode: true });
server.listen(port, '127.0.0.1', () => {
  const address = server.address() as AddressInfo;
  console.log(`Kern recorded app: http://127.0.0.1:${address.port}`);
  console.log(`Reading recorded audits from: ${root}`);
});

const shutdown = (): void => {
  server.close(() => process.exit(0));
};
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
