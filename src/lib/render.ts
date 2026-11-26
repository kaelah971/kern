import { PRESET_CARTS, PRODUCTS } from './catalog.ts';
import type { CartLineView } from './cart.ts';
import { formatUsd } from './money.ts';
import { STORE_DESIGN } from './store-design.ts';

export type KernSaw = {
  promisedCents: number;
  observedCents: number;
  verdict: string;
  auditId: string;
  auditUrl: string;
  auditLabel: string;
};

export type StoreRenderOptions = {
  staticExport?: boolean;
  kernSaw?: KernSaw;
  revision?: {
    active: 'current' | 'before';
    currentHref: string;
    beforeHref: string;
  };
};

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

const STYLES = `
:root {
  --paper: #f5efe4;
  --paper-2: #fbf7ef;
  --ink: #201c16;
  --muted: #6d6252;
  --line: #d8cbb6;
  --accent: #a93f24;
  --accent-dark: #7e2b16;
  --accent-surface: #f6e4dc;
  --serif: Georgia, 'Times New Roman', serif;
  --sans: system-ui, -apple-system, 'Segoe UI', sans-serif;
}
* { box-sizing: border-box; }
html { background: var(--paper); }
body {
  margin: 0;
  color: var(--ink);
  font-family: var(--sans);
  font-size: 16px;
  line-height: 1.55;
  background:
    radial-gradient(circle at 12% 8%, rgba(255,255,255,.65), transparent 34rem),
    var(--paper);
}
a { color: inherit; }
.demo-banner {
  background: var(--ink);
  color: var(--paper-2);
  border-bottom: 4px solid var(--accent);
  padding: .55rem 1rem;
  text-align: center;
  font-size: .82rem;
  font-weight: 600;
  letter-spacing: .035em;
}
.site-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1.5rem;
  max-width: 1080px;
  margin: 0 auto;
  padding: 1.5rem 1.25rem 1rem;
  border-bottom: 1px solid var(--line);
}
.wordmark {
  font-family: var(--serif);
  font-size: 1.35rem;
  letter-spacing: .16em;
  text-decoration: none;
  font-weight: 700;
}
.wordmark span {
  display: block;
  font-family: var(--sans);
  font-size: .58rem;
  letter-spacing: .34em;
  color: var(--muted);
  font-weight: 500;
}
nav { display: flex; gap: 1.25rem; font-size: .9rem; }
nav a { text-decoration: none; border-bottom: 1px solid transparent; }
nav a:hover { border-bottom-color: var(--ink); }
main { max-width: 1080px; margin: 0 auto; padding: 2.25rem 1.25rem 4rem; }
h1, h2, h3 { font-family: var(--serif); line-height: 1.15; font-weight: 600; }
h1 { font-size: clamp(2rem, 4vw, 2.9rem); margin: 0 0 1rem; }
h2 { font-size: 1.45rem; margin: 0 0 .75rem; }
h3 { font-size: 1.15rem; margin: 0 0 .35rem; }
p { margin: 0 0 1rem; }
.promise {
  border: 1px solid var(--line);
  border-left: 5px solid var(--accent);
  background: var(--paper-2);
  padding: .95rem 1.1rem;
  font-size: .98rem;
  margin-bottom: 2.25rem;
}
.promise strong { white-space: nowrap; }
.intro { max-width: 42rem; color: var(--muted); }
.demo-carts {
  margin: 2rem 0 2.5rem;
  padding: 1.25rem;
  border: 1px dashed var(--line);
  background: rgba(255,255,255,.28);
}
.demo-carts h2 { font-size: 1.1rem; margin-bottom: .25rem; }
.demo-carts p { color: var(--muted); font-size: .9rem; margin-bottom: 1rem; }
.preset-row { display: flex; flex-wrap: wrap; gap: .6rem; }
.preset-row form { margin: 0; }
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1.25rem;
}
.card {
  border: 1px solid var(--line);
  background: var(--paper-2);
  padding: 1rem;
  display: flex;
  flex-direction: column;
}
.swatch {
  height: 132px;
  margin: -.25rem -.25rem 1rem;
  background: var(--swatch);
  border: 1px solid rgba(32,28,22,.12);
}
.card p { color: var(--muted); font-size: .9rem; flex: 1; }
.price {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  letter-spacing: .01em;
}
.card .price { margin-bottom: .85rem; }
button, .button {
  display: inline-block;
  border: 1px solid var(--ink);
  background: var(--ink);
  color: var(--paper-2);
  font: inherit;
  font-size: .88rem;
  font-weight: 600;
  letter-spacing: .04em;
  padding: .55rem .95rem;
  cursor: pointer;
  text-decoration: none;
}
button:hover, .button:hover { background: var(--accent-dark); border-color: var(--accent-dark); }
button.secondary {
  background: transparent;
  color: var(--ink);
  font-weight: 500;
}
button.secondary:hover { background: var(--ink); color: var(--paper-2); }
table { width: 100%; border-collapse: collapse; margin: 1.5rem 0; }
th, td { text-align: left; padding: .8rem .5rem; border-bottom: 1px solid var(--line); }
th { font-size: .72rem; letter-spacing: .12em; text-transform: uppercase; color: var(--muted); }
td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
.subtotal-line {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem .5rem;
  border-bottom: 1px solid var(--line);
  font-weight: 600;
}
.actions { display: flex; gap: .75rem; flex-wrap: wrap; margin-top: 1.5rem; }
.summary {
  max-width: 34rem;
  border: 1px solid var(--line);
  background: var(--paper-2);
  padding: 1.25rem;
  margin: 1.75rem 0 1.25rem;
}
.summary-row {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: .55rem 0;
  border-bottom: 1px solid rgba(216,203,182,.65);
}
.summary-row:last-child { border-bottom: 0; }
.summary-row.total { font-weight: 700; font-size: 1.05rem; padding-top: .9rem; }
.summary-row .amount { font-variant-numeric: tabular-nums; }
.line-items { margin: 0 0 .75rem; padding: 0 0 .75rem; border-bottom: 1px solid var(--line); }
.line-item { display: flex; justify-content: space-between; gap: 1rem; font-size: .9rem; color: var(--muted); padding: .2rem 0; }
.kern-saw {
  max-width: 34rem;
  border: 1px solid var(--line);
  border-left: 5px solid var(--accent);
  background: var(--paper-2);
  padding: 1.1rem 1.2rem;
  margin: 1.5rem 0 1.25rem;
}
.kern-saw h2 { font-size: 1.1rem; margin: 0 0 .6rem; }
.kern-saw-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: .75rem;
  margin: .75rem 0;
}
.kern-saw-grid dt {
  font-size: .66rem;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: var(--muted);
  font-weight: 700;
}
.kern-saw-grid dd {
  margin: .15rem 0 0;
  font-family: var(--serif);
  font-size: 1.25rem;
  font-variant-numeric: tabular-nums;
}
.kern-saw .verdict-text { font-family: var(--sans); font-size: .9rem; font-weight: 700; letter-spacing: .06em; }
.kern-saw .source { margin: 0; font-size: .82rem; color: var(--muted); }
.revision-toggle {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: .45rem;
  border: 1px solid var(--line);
  background: var(--paper-2);
  padding: .35rem .45rem;
  margin: 0 0 1rem;
  font-size: .82rem;
}
.revision-toggle > span { color: var(--muted); padding: 0 .25rem; }
.revision-toggle a {
  text-decoration: none;
  padding: .3rem .6rem;
  border: 1px solid transparent;
}
.revision-toggle a[aria-current="page"] {
  border-color: var(--ink);
  background: var(--ink);
  color: var(--paper-2);
  font-weight: 600;
}
.revision-note {
  max-width: 34rem;
  border: 1px solid var(--accent);
  background: var(--accent-surface);
  padding: .75rem .9rem;
  margin: 0 0 1.25rem;
  font-size: .86rem;
}
.stop-note {
  max-width: 34rem;
  border-left: 3px solid var(--accent);
  padding: .25rem 0 .25rem .85rem;
  color: var(--muted);
  font-size: .88rem;
}
.empty { color: var(--muted); padding: 1.5rem 0; }
footer {
  max-width: 1080px;
  margin: 0 auto;
  padding: 1.25rem;
  border-top: 1px solid var(--line);
  color: var(--muted);
  font-size: .78rem;
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}
` + STORE_DESIGN;

function layout(
  title: string,
  body: string,
  cartCount: number,
  options: StoreRenderOptions = {},
): string {
  const cartLabel = cartCount > 0 ? `Cart (${cartCount})` : 'Cart';
  const staticExport = options.staticExport === true;
  const homeHref = staticExport ? '/store/' : '/';
  const nav = staticExport
    ? `<nav><a href="/store/">Shop</a><a href="/">Kern proof site</a></nav>`
    : `<nav><a href="/">Shop</a><a href="/cart">${cartLabel}</a></nav>`;
  const banner = `<div class="demo-banner" role="note">Demo storefront. Not a real shop. This is the fixture Kern checks.</div>`;
  const footer = staticExport
    ? `<footer>
  <span>Kern Supply Co. static demo storefront · not a real shop</span>
  <span>Checkout stops at the shipping quote. No payment, no order.</span>
</footer>`
    : `<footer>
  <span>Kern Supply Co. demo storefront · local only</span>
  <span>Checkout stops at the shipping quote. No payment, no order.</span>
</footer>`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} · Kern Supply Co.</title>
<style>${STYLES}</style>
</head>
<body>
<div class="store-frame">
${banner}
<header class="site-header">
  <a class="wordmark" href="${homeHref}"><span class="logo-mark">K</span>KERN <span class="wordmark-sub">SUPPLY CO.</span></a>
  ${nav}
</header>
<main>
${body}
</main>
${footer}
</div>
</body>
</html>`;
}

function productCard(product: (typeof PRODUCTS)[number], staticExport = false): string {
  const action = staticExport
    ? ''
    : `<form method="post" action="/cart/add">
    <input type="hidden" name="productId" value="${escapeHtml(product.id)}">
    <button type="submit" aria-label="Add ${escapeHtml(product.name)} to cart">Add to cart</button>
  </form>`;
  return `<article class="card">
  <div class="swatch" style="--swatch:${escapeHtml(product.swatch)}" role="img" aria-label="${escapeHtml(product.name)}"></div>
  <h3>${escapeHtml(product.name)}</h3>
  <p>${escapeHtml(product.description)}</p>
  <div class="price">${formatUsd(product.priceCents)}</div>
  ${action}
</article>`;
}

export function renderHome(cartCount: number, options: StoreRenderOptions = {}): string {
  const staticExport = options.staticExport === true;
  const presets = Object.values(PRESET_CARTS)
    .map((preset) =>
      staticExport
        ? `<a class="button secondary" href="/store/${escapeHtml(
            preset.id,
          )}">View ${escapeHtml(preset.label)} quote</a>`
        : `<form method="post" action="/cart/preset">
      <input type="hidden" name="preset" value="${escapeHtml(preset.id)}">
      <button class="secondary" type="submit">Load ${escapeHtml(preset.label)} cart</button>
    </form>`,
    )
    .join('\n');

  return layout(
    'Shop',
    `<section class="promise">
  <strong>Free standard shipping on US orders of $50.00 or more.</strong>
  After-discount merchandise subtotal, USD, standard shipping.
</section>
<p class="intro">Small-batch goods for people who keep notebooks, carry totes, and cook without measuring. Prices in USD.</p>
<section class="demo-carts" aria-labelledby="demo-heading">
  <h2 id="demo-heading">${staticExport ? 'Fixed demo carts' : 'Demo fixtures'}</h2>
  <p>${
    staticExport
      ? `Three fixed carts rendered by the store's own shipping function. Each link opens a static shipping quote.`
      : 'Deterministic carts for the Kern challenge. Each one loads a real cart and lands on the server-calculated shipping quote.'
  }</p>
  <div class="preset-row">
${presets}
  </div>
</section>
<section aria-labelledby="products-heading">
  <h2 id="products-heading">Goods</h2>
  <div class="grid">
${PRODUCTS.map((product) => productCard(product, staticExport)).join('\n')}
  </div>
</section>`,
    cartCount,
    options,
  );
}

export function renderCart(input: {
  lines: CartLineView[];
  subtotalCents: number;
  cartCount: number;
}): string {
  if (input.lines.length === 0) {
    return layout(
      'Cart',
      `<h1>Your cart</h1>
<p class="empty">Your cart is empty.</p>
<a class="button" href="/">Browse goods</a>`,
      input.cartCount,
    );
  }

  const rows = input.lines
    .map(
      (line) => `<tr>
  <td>${escapeHtml(line.product.name)}</td>
  <td class="num">${line.qty}</td>
  <td class="num">${formatUsd(line.lineTotalCents)}</td>
</tr>`,
    )
    .join('\n');

  return layout(
    'Cart',
    `<h1>Your cart</h1>
<table>
  <thead>
    <tr><th>Item</th><th class="num">Qty</th><th class="num">Line total</th></tr>
  </thead>
  <tbody>
${rows}
  </tbody>
</table>
<div class="subtotal-line">
  <span>Merchandise subtotal (after discounts)</span>
  <span data-testid="subtotal" data-subtotal-cents="${input.subtotalCents}">${formatUsd(input.subtotalCents)}</span>
</div>
<div class="actions">
  <a class="button" href="/checkout">Continue to shipping quote</a>
  <a class="button secondary" href="/">Keep shopping</a>
</div>`,
    input.cartCount,
  );
}

function kernSawStrip(saw: KernSaw): string {
  return `<section class="kern-saw" aria-labelledby="kern-saw-heading">
  <p class="eyebrow" style="font-size:.66rem;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);font-weight:700;margin:0 0 .35rem">From the recorded audit</p>
  <h2 id="kern-saw-heading">What Kern saw</h2>
  <dl class="kern-saw-grid">
    <div><dt>Promised</dt><dd data-kern-saw-promised-cents="${saw.promisedCents}">${formatUsd(
      saw.promisedCents,
    )}</dd></div>
    <div><dt>Observed</dt><dd data-kern-saw-observed-cents="${saw.observedCents}">${formatUsd(
      saw.observedCents,
    )}</dd></div>
    <div><dt>Verdict</dt><dd class="verdict-text">${escapeHtml(saw.verdict)}</dd></div>
  </dl>
  <p class="source">${escapeHtml(saw.auditLabel)} · <a href="${escapeHtml(
    saw.auditUrl,
  )}">${escapeHtml(saw.auditId)}</a></p>
</section>`;
}

function revisionToggle(revision: NonNullable<StoreRenderOptions['revision']>): string {
  return `<nav class="revision-toggle" aria-label="Store revision">
  <span>Revision</span>
  <a href="${escapeHtml(revision.currentHref)}"${
    revision.active === 'current' ? ' aria-current="page"' : ''
  }>After the repair</a>
  <a href="${escapeHtml(revision.beforeHref)}"${
    revision.active === 'before' ? ' aria-current="page"' : ''
  }>The revision Kern audited</a>
</nav>`;
}

export function renderCheckout(
  input: {
    lines: CartLineView[];
    subtotalCents: number;
    shippingCents: number;
    totalCents: number;
    cartCount: number;
  },
  options: StoreRenderOptions = {},
): string {
  const staticExport = options.staticExport === true;
  const items = input.lines
    .map(
      (line) => `<div class="line-item">
  <span>${escapeHtml(line.product.name)} × ${line.qty}</span>
  <span>${formatUsd(line.lineTotalCents)}</span>
</div>`,
    )
    .join('\n');

  const shippingLabel = input.shippingCents === 0 ? 'Free' : 'Standard (3–5 business days)';
  const toggle = options.revision ? revisionToggle(options.revision) : '';
  const revisionNote =
    options.revision?.active === 'before'
      ? `<div class="revision-note" role="note">You are viewing the pre-repair revision that Kern audited. It is not the current store.</div>`
      : '';
  const saw = options.kernSaw ? kernSawStrip(options.kernSaw) : '';
  const actions = staticExport
    ? `<a class="button secondary" href="/store/">Back to demo store</a>`
    : `<a class="button secondary" href="/cart">Back to cart</a>`;

  return layout(
    'Shipping quote',
    `<h1>Shipping quote</h1>
<p class="intro">US destination · standard shipping · USD</p>
${toggle}
${revisionNote}
<div class="summary">
  <div class="line-items">
${items}
  </div>
  <div class="summary-row">
    <span>Merchandise subtotal (after discounts)</span>
    <span class="amount" data-testid="subtotal" data-subtotal-cents="${input.subtotalCents}">${formatUsd(input.subtotalCents)}</span>
  </div>
  <div class="summary-row">
    <span>Shipping — ${shippingLabel}</span>
    <span class="amount" data-testid="shipping-quote" data-shipping-cents="${input.shippingCents}">${formatUsd(input.shippingCents)}</span>
  </div>
  <div class="summary-row total">
    <span>Total before tax</span>
    <span class="amount" data-testid="total" data-total-cents="${input.totalCents}">${formatUsd(input.totalCents)}</span>
  </div>
</div>
${saw}
<p class="stop-note">This demo stops at the shipping quote. There are no payment fields, no card data, and no order is placed.</p>
<div class="actions">
  ${actions}
</div>`,
    input.cartCount,
    options,
  );
}

export function renderNotFound(cartCount: number): string {
  return layout(
    'Not found',
    `<h1>Not found</h1>
<p>That page does not exist in the demo store.</p>
<a class="button" href="/">Back to shop</a>`,
    cartCount,
  );
}

export function renderError(message: string, cartCount = 0): string {
  return layout(
    'Something went wrong',
    `<h1>Something went wrong</h1>
<p>${escapeHtml(message)}</p>
<a class="button" href="/">Back to shop</a>`,
    cartCount,
  );
}
