import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { pathToFileURL } from 'node:url';
import type { AddressInfo } from 'node:net';
import { CartStore } from './lib/cart.ts';
import { getPreset, getProduct } from './lib/catalog.ts';
import { getStandardShippingCents } from './lib/shipping.ts';
import { renderCart, renderCheckout, renderError, renderHome, renderNotFound } from './lib/render.ts';
import { renderPromiseIndex, renderPromisePage } from './lib/promise-render.ts';

const SESSION_COOKIE = 'kern_sid';
const MAX_FORM_BYTES = 64 * 1024;

function sendHtml(res: ServerResponse, status: number, html: string): void {
  const body = Buffer.from(html, 'utf8');
  res.writeHead(status, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': body.length,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy':
      "default-src 'none'; style-src 'unsafe-inline'; img-src data:; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
  });
  res.end(body);
}

function redirect(res: ServerResponse, location: string): void {
  res.writeHead(303, { Location: location, 'Cache-Control': 'no-store' });
  res.end();
}

function readSessionId(req: IncomingMessage): string | null {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === SESSION_COOKIE) {
      const value = rest.join('=');
      return /^[0-9a-f-]{36}$/i.test(value) ? value : null;
    }
  }
  return null;
}

async function readForm(req: IncomingMessage): Promise<URLSearchParams> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_FORM_BYTES) {
      throw new RangeError('form body too large');
    }
    chunks.push(buffer);
  }
  return new URLSearchParams(Buffer.concat(chunks).toString('utf8'));
}

export function createStoreServer(): ReturnType<typeof createHttpServer> {
  const carts = new CartStore();

  function ensureSession(req: IncomingMessage, res: ServerResponse): string {
    const existing = readSessionId(req);
    if (existing && carts.has(existing)) {
      return existing;
    }
    const id = carts.create();
    res.setHeader(
      'Set-Cookie',
      `${SESSION_COOKIE}=${id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`,
    );
    return id;
  }

  async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const method = req.method ?? 'GET';
    const url = new URL(req.url ?? '/', 'http://localhost');
    const path = url.pathname;

    if (method === 'GET' && path === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: true, store: 'kern-demo' }));
      return;
    }

    if (method === 'GET' && path === '/') {
      const sessionId = ensureSession(req, res);
      sendHtml(res, 200, renderHome(carts.itemCount(sessionId)));
      return;
    }

    if (method === 'GET' && path === '/promise') {
      const page = renderPromiseIndex();
      sendHtml(res, page.status, page.html);
      return;
    }

    if (method === 'GET' && path.startsWith('/promise/')) {
      const parts = path.split('/').filter(Boolean);
      if (parts.length === 3) {
        const page = renderPromisePage(parts[1]!, parts[2]!);
        if (page) {
          sendHtml(res, page.status, page.html);
          return;
        }
      }
      sendHtml(res, 404, renderNotFound(0));
      return;
    }

    if (method === 'GET' && path === '/cart') {
      const sessionId = ensureSession(req, res);
      sendHtml(
        res,
        200,
        renderCart({
          lines: carts.lines(sessionId),
          subtotalCents: carts.merchandiseSubtotalCents(sessionId),
          cartCount: carts.itemCount(sessionId),
        }),
      );
      return;
    }

    if (method === 'GET' && path === '/checkout') {
      const sessionId = ensureSession(req, res);
      if (carts.lines(sessionId).length === 0) {
        redirect(res, '/cart');
        return;
      }
      const subtotalCents = carts.merchandiseSubtotalCents(sessionId);
      // The quote is calculated here, on the server, from the real cart. It is
      // not read from a label, a query parameter or client-side state.
      const shippingCents = getStandardShippingCents(subtotalCents);
      sendHtml(
        res,
        200,
        renderCheckout({
          lines: carts.lines(sessionId),
          subtotalCents,
          shippingCents,
          totalCents: subtotalCents + shippingCents,
          cartCount: carts.itemCount(sessionId),
        }),
      );
      return;
    }

    if (method === 'POST' && path === '/cart/add') {
      const form = await readForm(req);
      const productId = form.get('productId') ?? '';
      if (!getProduct(productId)) {
        sendHtml(res, 400, renderError('Unknown product.'));
        return;
      }
      const sessionId = ensureSession(req, res);
      carts.add(sessionId, productId, 1);
      redirect(res, '/cart');
      return;
    }

    if (method === 'POST' && path === '/cart/preset') {
      const form = await readForm(req);
      const presetId = form.get('preset') ?? '';
      if (!getPreset(presetId)) {
        sendHtml(res, 400, renderError('Unknown demo cart.'));
        return;
      }
      const sessionId = ensureSession(req, res);
      carts.setPreset(sessionId, presetId);
      redirect(res, '/checkout');
      return;
    }

    if (method === 'POST' && path === '/cart/clear') {
      const sessionId = ensureSession(req, res);
      carts.clear(sessionId);
      redirect(res, '/cart');
      return;
    }

    const sessionId = readSessionId(req);
    sendHtml(res, 404, renderNotFound(sessionId && carts.has(sessionId) ? carts.itemCount(sessionId) : 0));
  }

  return createHttpServer((req, res) => {
    handle(req, res).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'unexpected error';
      console.error(`[kern-store] ${req.method} ${req.url}: ${message}`);
      if (!res.headersSent) {
        sendHtml(res, error instanceof RangeError ? 400 : 500, renderError(message));
      } else {
        res.end();
      }
    });
  });
}

const isMain = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  const port = Number(process.env.PORT ?? 4173);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`PORT must be an integer between 1 and 65535, got ${process.env.PORT}`);
  }
  const server = createStoreServer();
  server.listen(port, '127.0.0.1', () => {
    const address = server.address() as AddressInfo;
    console.log(`Kern demo store: http://127.0.0.1:${address.port}`);
    console.log(
      getStandardShippingCents(5_000) === 0
        ? 'Shipping policy active: $50.00+ after-discount subtotal ships free.'
        : 'SEEDED DEMO DEFECT ACTIVE: see getStandardShippingCents() in src/lib/shipping.ts',
    );
  });

  const shutdown = (): void => {
    server.close(() => process.exit(0));
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}
