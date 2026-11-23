import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { pathToFileURL } from 'node:url';
import type { AddressInfo } from 'node:net';
import {
  findPostRepairAudit,
  loadAudit,
  loadAudits,
  resolveAuditRoot,
  type AuditSummary,
} from './audits.ts';
import { loadAppContract, readPolicy } from './data.ts';
import { readShippingDiff } from './git.ts';
import {
  renderAuditDetail,
  renderAuditList,
  renderCampaign,
  renderNotFound,
  renderRepair,
  renderServerError,
} from './render.ts';
import { renderReceiptPage } from './receipt.ts';

const MAX_ID_LENGTH = 200;

function sendHtml(
  res: ServerResponse,
  status: number,
  html: string,
  headOnly = false,
): void {
  const body = Buffer.from(html, 'utf8');
  res.writeHead(status, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': body.length,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy':
      "default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
  });
  if (headOnly) res.end();
  else res.end(body);
}

function sendJson(res: ServerResponse, status: number, value: unknown): void {
  const body = Buffer.from(JSON.stringify(value), 'utf8');
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': body.length,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(body);
}

function decodeId(raw: string): string | null {
  try {
    const decoded = decodeURIComponent(raw);
    return decoded.length > 0 && decoded.length <= MAX_ID_LENGTH ? decoded : null;
  } catch {
    return null;
  }
}

function loadStatus(reason: 'missing' | 'invalid-id' | 'unreadable'): number {
  return reason === 'unreadable' ? 500 : 404;
}

function badId(res: ServerResponse, headOnly: boolean): void {
  sendHtml(
    res,
    400,
    renderNotFound('Invalid route', 'The audit id in this URL is not valid.'),
    headOnly,
  );
}

export type AppServerOptions = {
  auditRoot?: string;
  repoRoot?: string;
};

export function createAppServer(
  options: AppServerOptions = {},
): ReturnType<typeof createHttpServer> {
  const repoRoot = options.repoRoot ?? process.cwd();
  const auditRoot = options.auditRoot ?? resolveAuditRoot(repoRoot).root;

  async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const method = req.method ?? 'GET';
    const headOnly = method === 'HEAD';
    if (method !== 'GET' && !headOnly) {
      sendHtml(
        res,
        405,
        renderNotFound('Method not allowed', 'This app serves read-only pages over GET.'),
        false,
      );
      return;
    }

    const url = new URL(req.url ?? '/', 'http://localhost');
    const path = url.pathname;

    const index = loadAudits(auditRoot);

    if (path === '/health') {
      sendJson(res, 200, {
        ok: true,
        app: 'kern',
        auditRoot,
        auditSource: index.audits.some((summary) => summary.recorded) ? 'recorded' : 'live',
      });
      return;
    }

    const contract = loadAppContract();
    const policy = readPolicy(repoRoot);

    if (path === '/') {
      sendHtml(res, 200, renderCampaign({ contract, policy, index }), headOnly);
      return;
    }

    if (path === '/audits') {
      sendHtml(res, 200, renderAuditList(index), headOnly);
      return;
    }

    const receiptMatch = /^\/audits\/([^/]+)\/receipt$/.exec(path);
    if (receiptMatch) {
      const id = decodeId(receiptMatch[1]!);
      if (!id) {
        badId(res, headOnly);
        return;
      }
      const loaded = loadAudit(id, auditRoot);
      if (!loaded.ok) {
        sendHtml(
          res,
          loadStatus(loaded.reason),
          loaded.reason === 'unreadable'
            ? renderServerError(loaded.message)
            : renderNotFound('Receipt not found', loaded.message),
          headOnly,
        );
        return;
      }
      sendHtml(
        res,
        200,
        renderReceiptPage(loaded.summary.audit, contract, policy),
        headOnly,
      );
      return;
    }

    const auditMatch = /^\/audits\/([^/]+)$/.exec(path);
    if (auditMatch) {
      const id = decodeId(auditMatch[1]!);
      if (!id) {
        badId(res, headOnly);
        return;
      }
      const loaded = loadAudit(id, auditRoot);
      if (!loaded.ok) {
        sendHtml(
          res,
          loadStatus(loaded.reason),
          loaded.reason === 'unreadable'
            ? renderServerError(loaded.message)
            : renderNotFound('Audit not found', loaded.message),
          headOnly,
        );
        return;
      }
      sendHtml(res, 200, renderAuditDetail(loaded.summary, contract), headOnly);
      return;
    }

    const repairMatch = /^\/repair\/([^/]+)$/.exec(path);
    if (repairMatch) {
      const id = decodeId(repairMatch[1]!);
      if (!id) {
        badId(res, headOnly);
        return;
      }
      const loaded = loadAudit(id, auditRoot);
      if (!loaded.ok) {
        sendHtml(
          res,
          loadStatus(loaded.reason),
          loaded.reason === 'unreadable'
            ? renderServerError(loaded.message)
            : renderNotFound('Pre-repair audit not found', loaded.message),
          headOnly,
        );
        return;
      }
      const post: AuditSummary | null = findPostRepairAudit(
        index,
        loaded.summary.audit.auditId,
      );
      sendHtml(
        res,
        200,
        renderRepair({
          pre: loaded.summary,
          post,
          diff: readShippingDiff(repoRoot),
        }),
        headOnly,
      );
      return;
    }

    sendHtml(
      res,
      404,
      renderNotFound('Page not found', `No route exists for ${path}.`),
      headOnly,
    );
  }

  return createHttpServer((req, res) => {
    handle(req, res).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[kern-app] ${req.method} ${req.url}: ${message}`);
      if (!res.headersSent) {
        sendHtml(res, 500, renderServerError(message));
      } else {
        res.end();
      }
    });
  });
}

const isMain =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  const port = Number(process.env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`PORT must be an integer between 1 and 65535, got ${process.env.PORT}`);
  }
  const { root: auditRoot, source } = resolveAuditRoot(process.cwd());
  const server = createAppServer({ auditRoot });
  server.listen(port, '127.0.0.1', () => {
    const address = server.address() as AddressInfo;
    console.log(`Kern app: http://127.0.0.1:${address.port}`);
    console.log(`Reading ${source} audits from: ${auditRoot}`);
  });

  const shutdown = (): void => {
    server.close(() => process.exit(0));
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}
