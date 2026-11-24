import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import {
  createServer as createHttpServer,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { pathToFileURL } from 'node:url';
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
  isAuditRecord,
  isJobScenario,
  JobStore,
  limitsFromEnv,
  publicJob,
  type Job,
  type JobLimits,
} from './jobs.ts';
import {
  escapeHtml,
  renderAuditDetail,
  renderAuditList,
  renderCampaign,
  renderJobStatus,
  renderNotFound,
  renderRepair,
  renderServerError,
} from './render.ts';
import { renderReceiptPage } from './receipt.ts';

const MAX_ID_LENGTH = 200;
const MAX_JSON_BYTES = 1024 * 1024;
const PUBLIC_SCRIPT = readFileSync(new URL('./public-client.js', import.meta.url));

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
      "default-src 'none'; style-src 'unsafe-inline'; script-src 'self'; connect-src 'self'; img-src data:; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
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

function sendJavaScript(res: ServerResponse): void {
  res.writeHead(200, {
    'Content-Type': 'text/javascript; charset=utf-8',
    'Content-Length': PUBLIC_SCRIPT.length,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(PUBLIC_SCRIPT);
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

function badId(res: ServerResponse, headOnly: boolean, publicMode: boolean): void {
  sendHtml(
    res,
    400,
    renderNotFound('Invalid route', 'The audit id in this URL is not valid.', publicMode),
    headOnly,
  );
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_JSON_BYTES) throw new RangeError('JSON body too large');
    chunks.push(buffer);
  }
  const text = Buffer.concat(chunks).toString('utf8').trim();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new SyntaxError('invalid JSON body');
  }
}

function clientIpHash(req: IncomingMessage): string {
  const forwarded = req.headers['x-forwarded-for'];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const first = raw?.split(',')[0]?.trim();
  const ip = first || req.socket.remoteAddress || 'unknown';
  return createHash('sha256').update(ip).digest('hex').slice(0, 16);
}

function bodyMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export type AppServerOptions = {
  auditRoot?: string;
  repoRoot?: string;
  publicMode?: boolean;
  jobRoot?: string;
  workerToken?: string;
  jobLimits?: Partial<JobLimits>;
  now?: () => number;
};

export function createAppServer(
  options: AppServerOptions = {},
): ReturnType<typeof createHttpServer> {
  const repoRoot = options.repoRoot ?? process.cwd();
  const auditRoot = options.auditRoot ?? resolveAuditRoot(repoRoot).root;
  const publicMode = options.publicMode ?? process.argv.includes('--public');
  const workerToken = options.workerToken ?? process.env.WORKER_TOKEN ?? '';
  const jobStore = new JobStore({
    root: options.jobRoot ?? join(repoRoot, '.data', 'public'),
    limits: options.jobLimits ?? limitsFromEnv(),
    now: options.now,
  });

  function workerConfigured(res: ServerResponse): string | null {
    if (workerToken) return workerToken;
    sendJson(res, 503, {
      error: 'worker_unconfigured',
      reason: 'WORKER_TOKEN is not set on the app',
    });
    return null;
  }

  function workerAuthorized(req: IncomingMessage, token: string): boolean {
    return req.headers.authorization === `Bearer ${token}`;
  }

  async function handleApi(req: IncomingMessage, res: ServerResponse, path: string): Promise<boolean> {
    const method = req.method ?? 'GET';

    if (path === '/api/audits') {
      if (method !== 'POST') {
        sendJson(res, 405, { error: 'method_not_allowed' });
        return true;
      }
      let body: unknown;
      try {
        body = await readJsonBody(req);
      } catch (error) {
        sendJson(res, 400, { error: 'invalid_body', reason: bodyMessage(error) });
        return true;
      }
      const scenario =
        typeof body === 'object' && body !== null
          ? (body as { scenario?: unknown }).scenario
          : undefined;
      if (!isJobScenario(scenario)) {
        sendJson(res, 400, {
          error: 'invalid_scenario',
          reason: 'scenario must be eligible-60, boundary-50 or control-35',
        });
        return true;
      }

      const engine = jobStore.engineStatus();
      if (!engine.online) {
        sendJson(res, 503, {
          error: 'engine_offline',
          reason: 'No worker heartbeat in the last 60 seconds.',
          lastHeartbeat: engine.lastHeartbeat,
        });
        return true;
      }

      const result = await jobStore.enqueue(scenario, clientIpHash(req));
      if (!result.ok) {
        res.setHeader('Retry-After', String(result.retryAfterSeconds));
        sendJson(res, 429, {
          error: 'rate_limited',
          reason: result.reason,
          retryAfterSeconds: result.retryAfterSeconds,
        });
        return true;
      }

      res.setHeader('Location', `/runs/${encodeURIComponent(result.job.id)}`);
      sendJson(res, 202, { jobId: result.job.id, status: 'queued' });
      return true;
    }

    const auditMatch = /^\/api\/audits\/([^/]+)$/.exec(path);
    if (auditMatch) {
      if (method !== 'GET') {
        sendJson(res, 405, { error: 'method_not_allowed' });
        return true;
      }
      const id = decodeId(auditMatch[1]!);
      if (!id) {
        sendJson(res, 404, { error: 'not_found' });
        return true;
      }
      const job = await jobStore.get(id);
      if (!job) {
        sendJson(res, 404, { error: 'not_found' });
        return true;
      }
      sendJson(res, 200, publicJob(job));
      return true;
    }

    if (path === '/api/jobs/next') {
      if (method !== 'GET') {
        sendJson(res, 405, { error: 'method_not_allowed' });
        return true;
      }
      const token = workerConfigured(res);
      if (!token) return true;
      if (!workerAuthorized(req, token)) {
        sendJson(res, 401, { error: 'unauthorized' });
        return true;
      }
      const job = await jobStore.next();
      if (!job) {
        res.writeHead(204, { 'Cache-Control': 'no-store' });
        res.end();
        return true;
      }
      sendJson(res, 200, {
        id: job.id,
        scenario: job.scenario,
        createdAt: job.createdAt,
        leaseExpiresAt: job.leaseExpiresAt,
      });
      return true;
    }

    const resultMatch = /^\/api\/jobs\/([^/]+)\/result$/.exec(path);
    if (resultMatch) {
      if (method !== 'POST') {
        sendJson(res, 405, { error: 'method_not_allowed' });
        return true;
      }
      const token = workerConfigured(res);
      if (!token) return true;
      if (!workerAuthorized(req, token)) {
        sendJson(res, 401, { error: 'unauthorized' });
        return true;
      }
      const id = decodeId(resultMatch[1]!);
      if (!id) {
        sendJson(res, 404, { error: 'not_found' });
        return true;
      }
      let body: unknown;
      try {
        body = await readJsonBody(req);
      } catch (error) {
        sendJson(res, 400, { error: 'invalid_body', reason: bodyMessage(error) });
        return true;
      }
      if (!isAuditRecord(body)) {
        sendJson(res, 400, {
          error: 'invalid_audit',
          reason: 'body must be a Kern audit record',
        });
        return true;
      }
      const result = await jobStore.complete(id, body);
      if (!result.ok) {
        const status = result.reason === 'not_found' ? 404 : result.reason === 'scenario_mismatch' || result.reason === 'invalid_audit' ? 400 : 409;
        sendJson(res, status, { error: result.reason });
        return true;
      }
      sendJson(res, 200, { ok: true, status: 'done' });
      return true;
    }

    const failMatch = /^\/api\/jobs\/([^/]+)\/fail$/.exec(path);
    if (failMatch) {
      if (method !== 'POST') {
        sendJson(res, 405, { error: 'method_not_allowed' });
        return true;
      }
      const token = workerConfigured(res);
      if (!token) return true;
      if (!workerAuthorized(req, token)) {
        sendJson(res, 401, { error: 'unauthorized' });
        return true;
      }
      const id = decodeId(failMatch[1]!);
      if (!id) {
        sendJson(res, 404, { error: 'not_found' });
        return true;
      }
      let body: unknown;
      try {
        body = await readJsonBody(req);
      } catch (error) {
        sendJson(res, 400, { error: 'invalid_body', reason: bodyMessage(error) });
        return true;
      }
      const message =
        typeof body === 'object' && body !== null && typeof (body as { error?: unknown }).error === 'string'
          ? (body as { error: string }).error
          : 'worker failed';
      const result = await jobStore.fail(id, message);
      if (!result.ok) {
        sendJson(res, result.reason === 'not_found' ? 404 : 409, { error: result.reason });
        return true;
      }
      sendJson(res, 200, { ok: true, status: 'failed' });
      return true;
    }

    if (path === '/api/worker/heartbeat') {
      if (method !== 'POST') {
        sendJson(res, 405, { error: 'method_not_allowed' });
        return true;
      }
      const token = workerConfigured(res);
      if (!token) return true;
      if (!workerAuthorized(req, token)) {
        sendJson(res, 401, { error: 'unauthorized' });
        return true;
      }
      let workerId = 'worker';
      try {
        const body = await readJsonBody(req);
        if (typeof body === 'object' && body !== null && typeof (body as { workerId?: unknown }).workerId === 'string') {
          workerId = (body as { workerId: string }).workerId.slice(0, 80);
        }
      } catch (error) {
        sendJson(res, 400, { error: 'invalid_body', reason: bodyMessage(error) });
        return true;
      }
      const heartbeat = await jobStore.heartbeat(workerId);
      sendJson(res, 200, { ok: true, lastSeen: heartbeat.lastSeen });
      return true;
    }

    if (path === '/api/engine/status') {
      if (method !== 'GET') {
        sendJson(res, 405, { error: 'method_not_allowed' });
        return true;
      }
      sendJson(res, 200, jobStore.engineStatus());
      return true;
    }

    sendJson(res, 404, { error: 'not_found' });
    return true;
  }

  async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const method = req.method ?? 'GET';
    const headOnly = method === 'HEAD';
    const url = new URL(req.url ?? '/', 'http://localhost');
    const path = url.pathname;
    const index = loadAudits(auditRoot);

    if (path === '/health') {
      sendJson(res, 200, {
        ok: true,
        app: 'kern',
        publicMode,
        auditRoot,
        auditSource: index.audits.some((summary) => summary.recorded) ? 'recorded' : 'live',
        engineOnline: jobStore.engineStatus().online,
      });
      return;
    }

    if (path.startsWith('/api/')) {
      if (!publicMode) {
        sendJson(res, 404, { error: 'not_found' });
        return;
      }
      await handleApi(req, res, path);
      return;
    }

    if (path === '/assets/public.js') {
      if (!publicMode) {
        sendHtml(res, 404, renderNotFound('Not found', 'That asset is not available.', false), headOnly);
        return;
      }
      sendJavaScript(res);
      return;
    }

    if (path === '/runs' || path.startsWith('/runs/')) {
      if (!publicMode) {
        sendHtml(res, 404, renderNotFound('Not found', 'Live runs are not enabled on this instance.', false), headOnly);
        return;
      }
      if (method !== 'GET' && !headOnly) {
        sendHtml(res, 405, renderNotFound('Method not allowed', 'Live runs are read-only.', true), false);
        return;
      }
      const contract = loadAppContract();
      const policy = readPolicy(repoRoot);
      const runMatch = /^\/runs\/([^/]+)$/.exec(path);
      if (runMatch) {
        const id = decodeId(runMatch[1]!);
        if (!id) {
          sendHtml(res, 400, renderNotFound('Invalid route', 'The run id is not valid.', true), headOnly);
          return;
        }
        const job = await jobStore.get(id);
        if (!job) {
          sendHtml(res, 404, renderNotFound('Live run not found', 'No run exists for that id.', true), headOnly);
          return;
        }
        if (job.status === 'done' && job.audit) {
          const summary: AuditSummary = {
            audit: job.audit,
            path: `job:${job.id}`,
            mtime: job.updatedAt,
            recorded: false,
            originalAuditSha256: null,
          };
          const notice = `<div class="live-note" role="status"><strong>Live run.</strong> This audit ran on the owner's machine. The evidence pack and raw NDJSON stay there; this page renders the posted audit JSON.</div>`;
          sendHtml(
            res,
            200,
            renderAuditDetail(summary, contract, {
              publicMode: true,
              receiptHref: `/runs/${encodeURIComponent(job.id)}/receipt`,
              repairHref: null,
              notice,
            }),
            headOnly,
          );
          return;
        }
        sendHtml(res, 200, renderJobStatus(job, true), headOnly);
        return;
      }

      const receiptMatch = /^\/runs\/([^/]+)\/receipt$/.exec(path);
      if (receiptMatch) {
        const id = decodeId(receiptMatch[1]!);
        if (!id) {
          sendHtml(res, 400, renderNotFound('Invalid route', 'The run id is not valid.', true), headOnly);
          return;
        }
        const job = await jobStore.get(id);
        if (!job) {
          sendHtml(res, 404, renderNotFound('Live run not found', 'No run exists for that id.', true), headOnly);
          return;
        }
        if (job.status !== 'done' || !job.audit) {
          sendHtml(res, 409, renderJobStatus(job, true), headOnly);
          return;
        }
        sendHtml(res, 200, renderReceiptPage(job.audit, contract, policy, true), headOnly);
        return;
      }

      sendHtml(res, 404, renderNotFound('Page not found', 'No live-run route exists for this path.', true), headOnly);
      return;
    }

    if (method !== 'GET' && !headOnly) {
      sendHtml(
        res,
        405,
        renderNotFound('Method not allowed', 'This app serves read-only pages over GET.', publicMode),
        false,
      );
      return;
    }

    const contract = loadAppContract();
    const policy = readPolicy(repoRoot);

    if (path === '/') {
      sendHtml(
        res,
        200,
        renderCampaign({
          contract,
          policy,
          index,
          publicMode,
          engine: publicMode ? jobStore.engineStatus() : null,
        }),
        headOnly,
      );
      return;
    }

    if (path === '/audits') {
      sendHtml(res, 200, renderAuditList(index, publicMode), headOnly);
      return;
    }

    const receiptMatch = /^\/audits\/([^/]+)\/receipt$/.exec(path);
    if (receiptMatch) {
      const id = decodeId(receiptMatch[1]!);
      if (!id) {
        badId(res, headOnly, publicMode);
        return;
      }
      const loaded = loadAudit(id, auditRoot);
      if (!loaded.ok) {
        sendHtml(
          res,
          loadStatus(loaded.reason),
          loaded.reason === 'unreadable'
            ? renderServerError(loaded.message, publicMode)
            : renderNotFound('Receipt not found', loaded.message, publicMode),
          headOnly,
        );
        return;
      }
      sendHtml(
        res,
        200,
        renderReceiptPage(loaded.summary.audit, contract, policy, publicMode),
        headOnly,
      );
      return;
    }

    const auditMatch = /^\/audits\/([^/]+)$/.exec(path);
    if (auditMatch) {
      const id = decodeId(auditMatch[1]!);
      if (!id) {
        badId(res, headOnly, publicMode);
        return;
      }
      const loaded = loadAudit(id, auditRoot);
      if (!loaded.ok) {
        sendHtml(
          res,
          loadStatus(loaded.reason),
          loaded.reason === 'unreadable'
            ? renderServerError(loaded.message, publicMode)
            : renderNotFound('Audit not found', loaded.message, publicMode),
          headOnly,
        );
        return;
      }
      sendHtml(
        res,
        200,
        renderAuditDetail(loaded.summary, contract, { publicMode }),
        headOnly,
      );
      return;
    }

    const repairMatch = /^\/repair\/([^/]+)$/.exec(path);
    if (repairMatch) {
      const id = decodeId(repairMatch[1]!);
      if (!id) {
        badId(res, headOnly, publicMode);
        return;
      }
      const loaded = loadAudit(id, auditRoot);
      if (!loaded.ok) {
        sendHtml(
          res,
          loadStatus(loaded.reason),
          loaded.reason === 'unreadable'
            ? renderServerError(loaded.message, publicMode)
            : renderNotFound('Pre-repair audit not found', loaded.message, publicMode),
          headOnly,
        );
        return;
      }
      const post: AuditSummary | null = findPostRepairAudit(index, loaded.summary.audit.auditId);
      sendHtml(
        res,
        200,
        renderRepair({
          pre: loaded.summary,
          post,
          diff: readShippingDiff(repoRoot),
          publicMode,
        }),
        headOnly,
      );
      return;
    }

    sendHtml(
      res,
      404,
      renderNotFound('Page not found', `No route exists for ${path}.`, publicMode),
      headOnly,
    );
  }

  return createHttpServer((req, res) => {
    handle(req, res).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[kern-app] ${req.method} ${req.url}: ${message}`);
      if (!res.headersSent) {
        if ((req.url ?? '').startsWith('/api/')) {
          sendJson(res, 500, { error: 'internal_error', reason: message });
        } else {
          sendHtml(res, 500, renderServerError(message, publicMode));
        }
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
  const publicMode = process.argv.includes('--public');
  const { root: auditRoot, source } = resolveAuditRoot(process.cwd());
  const server = createAppServer({ auditRoot, publicMode });
  server.listen(port, '0.0.0.0', () => {
    const address = server.address() as AddressInfo;
    console.log(`Kern app (${publicMode ? 'public' : 'local'}): http://0.0.0.0:${address.port}`);
    console.log(`Reading ${source} audits from: ${auditRoot}`);
    if (publicMode) {
      console.log(`Public base URL: ${process.env.PUBLIC_BASE_URL ?? '(not set)'}`);
    }
  });

  const shutdown = (): void => {
    server.close(() => process.exit(0));
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}
