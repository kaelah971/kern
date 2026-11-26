import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { pathToFileURL } from 'node:url';
import { join, relative } from 'node:path';
import type { AddressInfo } from 'node:net';
import {
  findPostRepairAudit,
  loadAudit,
  loadAudits,
  resolveAuditRoot,
  type AuditSummary,
} from './audits.ts';
import { loadAppContract, readPolicy } from './data.ts';
import { readRepairFacts, readShippingDiff } from './git.ts';
import { getPreset } from '../lib/catalog.ts';
import { evaluateGate, evaluatePatchGauntlet } from '../lib/gate.ts';
import { compileContract, freezeContract } from '../lib/contract-compiler.ts';
import { LiveController, LIVE_SCENARIOS, type LiveControllerOptions } from './live.ts';
import {
  renderAuditDetail,
  renderAuditList,
  renderCampaign,
  renderContractCompiler,
  renderGate,
  renderLiveStatus,
  renderNotFound,
  renderRepair,
  renderRunsList,
  renderServerError,
  renderWhyKane,
} from './render.ts';
import { renderReceiptPage } from './receipt.ts';
import { findLatestPromiseAudit, renderPromiseProof } from './promise-proof.ts';
import { renderLanding } from './landing.ts';

const MAX_ID_LENGTH = 200;
const MAX_FORM_BYTES = 8 * 1024;
const LIVE_ROUTES = new Set(['/check', '/check/status', '/check/run']);

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

function sendText(res: ServerResponse, status: number, text: string): void {
  const body = Buffer.from(text, 'utf8');
  res.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': body.length,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(body);
}

function sendRedirect(res: ServerResponse, status: number, location: string): void {
  res.writeHead(status, {
    Location: location,
    'Cache-Control': 'no-store',
    'Content-Length': 0,
  });
  res.end();
}

function isSameOrigin(req: IncomingMessage): boolean {
  const origin = req.headers.origin;
  const host = req.headers.host;
  if (!origin || !host) return false;
  try {
    const parsed = new URL(origin);
    return parsed.host === host && parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

async function readForm(req: IncomingMessage): Promise<URLSearchParams> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_FORM_BYTES) throw new Error('form body too large');
    chunks.push(buffer);
  }
  return new URLSearchParams(Buffer.concat(chunks).toString('utf8'));
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

function badId(res: ServerResponse, headOnly: boolean, publicMode: boolean): void {
  sendHtml(
    res,
    400,
    renderNotFound('Invalid route', 'The audit id in this URL is not valid.', publicMode),
    headOnly,
  );
}

export type AppServerOptions = {
  auditRoot?: string;
  repoRoot?: string;
  publicMode?: boolean;
  liveMode?: boolean;
  live?: LiveControllerOptions;
  contractRoot?: string;
};

export function createAppRequestHandler(
  options: AppServerOptions = {},
): (req: IncomingMessage, res: ServerResponse) => void {
  const repoRoot = options.repoRoot ?? process.cwd();
  const auditRoot = options.auditRoot ?? resolveAuditRoot(repoRoot).root;
  const publicMode = options.publicMode ?? process.env.KERN_PUBLIC === '1';
  const liveMode = (options.liveMode ?? process.env.KERN_LIVE === '1') && !publicMode;
  const live = liveMode
    ? new LiveController({ repoRoot, ...options.live })
    : null;
  const contractRoot = options.contractRoot ?? join(repoRoot, '.data', 'contracts');

  async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const method = req.method ?? 'GET';
    const headOnly = method === 'HEAD';
    const url = new URL(req.url ?? '/', 'http://localhost');
    const path = url.pathname;

    if (LIVE_ROUTES.has(path) && !liveMode) {
      sendHtml(
        res,
        404,
        renderNotFound('Page not found', `No route exists for ${path}.`, publicMode),
        headOnly,
      );
      return;
    }

    if (path === '/compile' && publicMode) {
      sendHtml(
        res,
        404,
        renderNotFound('Page not found', 'The contract compiler is local-only.', publicMode),
        headOnly,
      );
      return;
    }

    const isLiveRunPost = liveMode && path === '/check/run' && method === 'POST';
    const isCompilePost = !publicMode && path === '/compile' && method === 'POST';
    if (!isLiveRunPost && !isCompilePost && method !== 'GET' && !headOnly) {
      sendHtml(
        res,
        405,
        renderNotFound(
          'Method not allowed',
          liveMode
            ? 'This route does not accept that method.'
            : 'This app serves read-only pages over GET.',
          false,
        ),
        false,
      );
      return;
    }

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

    if (!publicMode && path === '/compile') {
      if (method === 'POST') {
        if (!isSameOrigin(req)) {
          sendText(res, 403, 'Forbidden: the compiler request must come from this local app.');
          return;
        }
        let form: URLSearchParams;
        try {
          form = await readForm(req);
        } catch {
          sendText(res, 400, 'Invalid compiler request.');
          return;
        }
        const values = {
          id: form.get('id') ?? '',
          campaignId: form.get('campaignId') ?? '',
          adTextSnapshot: form.get('adTextSnapshot') ?? '',
          statedInterpretation: form.get('statedInterpretation') ?? '',
          thresholdDollars: form.get('thresholdDollars') ?? '',
          destinationOrigin: form.get('destinationOrigin') ?? '',
          policySource: form.get('policySource') ?? '',
          approvedBy: form.get('approvedBy') ?? '',
        };
        const thresholdCents = Math.round(Number(values.thresholdDollars) * 100);
        try {
          const result = compileContract({
            id: values.id,
            campaignId: values.campaignId,
            adTextSnapshot: values.adTextSnapshot,
            statedInterpretation: values.statedInterpretation,
            thresholdCents,
            destinationOrigin: values.destinationOrigin,
            policySource: values.policySource,
            approvedBy: values.approvedBy,
          });
          const file = freezeContract(result.contract, contractRoot);
          result.file = relative(repoRoot, file).split(String.fromCharCode(92)).join('/');
          sendHtml(res, 200, renderContractCompiler({ current: contract, values, result }));
        } catch (error) {
          sendHtml(
            res,
            400,
            renderContractCompiler({
              current: contract,
              values,
              error: error instanceof Error ? error.message : String(error),
            }),
          );
        }
        return;
      }

      sendHtml(
        res,
        200,
        renderContractCompiler({ current: contract, publicMode: false }),
        headOnly,
      );
      return;
    }

    if (liveMode && live) {
      if (path === '/check') {
        sendRedirect(res, 303, '/check/status');
        return;
      }

      if (path === '/check/status') {
        sendHtml(res, 200, renderLiveStatus(live.snapshot(), contract), headOnly);
        return;
      }

      if (path === '/check/run') {
        if (method !== 'POST') {
          sendHtml(
            res,
            405,
            renderNotFound('Method not allowed', 'This route accepts only POST.', publicMode),
            headOnly,
          );
          return;
        }
        if (!isSameOrigin(req)) {
          sendText(res, 403, 'Forbidden: the check request must come from this local app.');
          return;
        }

        let form: URLSearchParams;
        try {
          form = await readForm(req);
        } catch {
          sendText(res, 400, 'Invalid check request.');
          return;
        }
        const scenario = form.get('scenario') ?? '';
        const preset = getPreset(scenario);
        if (!preset) {
          sendText(
            res,
            400,
            `Unknown scenario. Use one of: ${LIVE_SCENARIOS.join(', ')}.`,
          );
          return;
        }

        const result = await live.start(preset.id);
        if (!result.ok) {
          sendText(res, result.status, result.reason);
          return;
        }
        sendRedirect(res, 303, '/check/status');
        return;
      }
    }

    if (path === '/') {
      const post =
        index.audits.find((summary) => summary.audit.postRepair === true) ?? null;
      const pre =
        post?.audit.answersAuditId
          ? index.audits.find(
              (summary) => summary.audit.auditId === post.audit.answersAuditId,
            ) ?? null
          : null;
      sendHtml(
        res,
        200,
        renderLanding({
          contract,
          index,
          pre,
          post,
          gate: post ? evaluateGate(post.audit, contract) : null,
          publicMode,
        }),
        headOnly,
      );
      return;
    }

    if (path === '/campaign') {
      sendHtml(
        res,
        200,
        renderCampaign({
          contract,
          policy,
          index,
          publicMode,
          live: live ? live.snapshot() : null,
        }),
        headOnly,
      );
      return;
    }

    if (path === '/why-kane') {
      const post =
        index.audits.find((summary) => summary.audit.postRepair === true) ?? null;
      const pre =
        post?.audit.answersAuditId
          ? index.audits.find(
              (summary) => summary.audit.auditId === post.audit.answersAuditId,
            ) ?? null
          : null;
      sendHtml(
        res,
        200,
        renderWhyKane({
          contract,
          index,
          pre,
          post,
          gate: post ? evaluateGate(post.audit, contract) : null,
          publicMode,
        }),
        headOnly,
      );
      return;
    }

    if (path === '/promises') {
      sendHtml(
        res,
        200,
        renderPromiseProof({
          audit: findLatestPromiseAudit(repoRoot),
          publicMode,
          repoRoot,
        }),
        headOnly,
      );
      return;
    }

    if (path === '/gate') {
      const post =
        index.audits.find((summary) => summary.audit.postRepair === true) ?? null;
      const pre =
        post?.audit.answersAuditId
          ? index.audits.find(
              (summary) => summary.audit.auditId === post.audit.answersAuditId,
            ) ?? null
          : null;
      sendHtml(
        res,
        200,
        renderGate({
          contract,
          pre,
          post,
          gate: post ? evaluateGate(post.audit, contract) : null,
          gauntlet: evaluatePatchGauntlet(contract),
          publicMode,
        }),
        headOnly,
      );
      return;
    }

    if (path === '/audits') {
      sendHtml(res, 200, renderAuditList(index, publicMode), headOnly);
      return;
    }

    if (path === '/runs') {
      sendHtml(res, 200, renderRunsList(index, publicMode), headOnly);
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
      const receiptAudit = loaded.summary.audit;
      sendHtml(
        res,
        200,
        renderReceiptPage(
          receiptAudit,
          contract,
          policy,
          publicMode,
          receiptAudit.postRepair
            ? {
                gate: evaluateGate(receiptAudit, contract),
                repair: readRepairFacts(repoRoot),
              }
            : {},
        ),
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
      sendHtml(res, 200, renderAuditDetail(loaded.summary, contract, publicMode), headOnly);
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
          repair: readRepairFacts(repoRoot),
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

  return (req: IncomingMessage, res: ServerResponse): void => {
    handle(req, res).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[kern-app] ${req.method} ${req.url}: ${message}`);
      if (!res.headersSent) {
        sendHtml(res, 500, renderServerError(message, publicMode));
      } else {
        res.end();
      }
    });
  };
}

export function createAppServer(
  options: AppServerOptions = {},
): ReturnType<typeof createHttpServer> {
  return createHttpServer(createAppRequestHandler(options));
}

const isMain =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  const port = Number(process.env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`PORT must be an integer between 1 and 65535, got ${process.env.PORT}`);
  }
  const { root: auditRoot, source } = resolveAuditRoot(process.cwd());
  const server = createAppServer({
    auditRoot,
    publicMode: process.env.KERN_PUBLIC === '1',
  });
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
