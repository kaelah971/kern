import {
  BUNDLE_PROMISE,
  DELIVERY_PROMISE,
  PERCENT_PROMISE,
  bundleSubtotalCents,
  bundleDiscountCents,
  deliveryDateFor,
  percentDiscountCents,
} from './promises.ts';
import { formatUsd } from './money.ts';

type Page = { html: string; status: number };

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

const STYLES = `
:root{--paper:#eef0eb;--ink:#0b1512;--muted:#4d5b54;--line:#c7d0c8;--teal:#0f766e;--mint:#7ef0c0;--red:#bd4335;--white:#fff;--sans:Inter,"Helvetica Neue","Segoe UI",Arial,sans-serif;--mono:"IBM Plex Mono",Consolas,monospace}
*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font-family:var(--sans);line-height:1.5}
.banner{background:var(--ink);color:#e8efe9;text-align:center;padding:.55rem 1rem;font-size:.78rem;letter-spacing:.02em}
header{max-width:880px;margin:0 auto;padding:1.3rem 1.2rem .8rem;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:baseline;gap:20px}
.brand{font-weight:900;letter-spacing:.14em;text-decoration:none;color:var(--ink);font-size:1rem}.brand span{display:block;font-family:var(--mono);font-size:.5rem;letter-spacing:.3em;color:var(--muted);font-weight:400}
header a{color:var(--muted);font-size:.78rem;text-decoration:none}main{max-width:880px;margin:0 auto;padding:2rem 1.2rem 4rem}
.kicker{font-family:var(--mono);font-size:.65rem;letter-spacing:.14em;text-transform:uppercase;color:var(--teal)}
h1{font-size:clamp(2rem,4vw,3.2rem);line-height:1.02;letter-spacing:-.05em;margin:.7rem 0 .6rem}
.lead{max-width:650px;color:var(--muted);font-size:1rem;margin:0 0 1.7rem}
.card{background:#fff;border:1px solid var(--line);border-radius:14px;padding:1.2rem 1.3rem;box-shadow:0 12px 30px rgba(11,21,18,.05)}
.card--quote{max-width:620px;border-top:4px solid var(--teal)}
.card h2{font-size:1.15rem;margin:0 0 .2rem;letter-spacing:-.02em}.meta{font-family:var(--mono);font-size:.65rem;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
.line{display:flex;justify-content:space-between;gap:1rem;border-bottom:1px solid #e2e7e1;padding:.8rem 0;font-size:.95rem}.line:last-child{border-bottom:none}.line strong{font-size:1.05rem;font-variant-numeric:tabular-nums}.line--total{font-weight:700;border-top:2px solid var(--ink);border-bottom:none;margin-top:.2rem;padding-top:.9rem}
.line--discount strong{color:var(--teal)}.line--zero strong{color:var(--muted)}.tag{display:inline-flex;gap:6px;align-items:center;font-family:var(--mono);font-size:.6rem;letter-spacing:.08em;text-transform:uppercase;background:#e3f1e8;color:#256b4b;border-radius:99px;padding:5px 8px;margin-top:.8rem}
.note{max-width:620px;margin-top:1rem;font-size:.8rem;color:var(--muted)}.links{display:flex;flex-wrap:wrap;gap:.8rem;margin-top:1.5rem;font-family:var(--mono);font-size:.7rem}.links a{color:var(--teal);text-decoration:none;border-bottom:1px solid #b5d5c4;padding-bottom:2px}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:1rem}.promise{display:block;background:#fff;border:1px solid var(--line);border-radius:10px;padding:1rem;text-decoration:none;color:var(--ink)}.promise b{display:block;font-size:.95rem;line-height:1.2}.promise span{display:block;margin-top:.35rem;font-size:.8rem;color:var(--muted)}.promise em{display:block;margin-top:.6rem;font-family:var(--mono);font-size:.6rem;color:var(--teal);font-style:normal}
footer{max-width:880px;margin:0 auto;padding:1.5rem 1.2rem 3rem;border-top:1px solid var(--line);font-family:var(--mono);font-size:.6rem;line-height:1.5;color:var(--muted)}
`

function shell(title: string, body: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(title)} · Kern Supply Co.</title><style>${STYLES}</style></head><body>
<div class="banner">Promise-lab page · a test fixture for Kane · no payment, no order</div>
<header><a class="brand" href="/">KERN<span>SUPPLY CO.</span></a><a href="/">Back to store</a></header>
<main>${body}</main>
<footer>Kern Supply Co. · test fixture · this page stops at the quote/estimate. No card fields, no order.</footer>
</body></html>`;
}

function line(label: string, value: string, options: { discount?: boolean; zero?: boolean; total?: boolean } = {}): string {
  const classes = ['line'];
  if (options.discount) classes.push('line--discount');
  if (options.zero) classes.push('line--zero');
  if (options.total) classes.push('line--total');
  return `<div class="${classes.join(' ')}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function percentPage(scenarioId: string): Page | null {
  const scenario = PERCENT_PROMISE.scenarios.find((item) => item.id === scenarioId);
  if (!scenario) return null;
  const discount = percentDiscountCents(scenario.subtotalCents, 20, 5_000);
  const total = scenario.subtotalCents - discount;
  const body = `<p class="kicker">Promise lab / percentage discount</p>
<h1>20% off orders over $50.</h1>
<p class="lead">The advertised offer is 20% off the after-discount merchandise subtotal when it is $50.00 or more. This page is the rendered quote Kane can read.</p>
<div class="card card--quote">
<div class="meta">${escapeHtml(PERCENT_PROMISE.id)} · ${escapeHtml(scenario.id)} · USD</div>
<h2>${escapeHtml(scenario.label)}</h2>
${line('Merchandise subtotal', formatUsd(scenario.subtotalCents))}
${line('Discount — 20% off', formatUsd(discount), { discount: true, zero: discount === 0 })}
${line('Total after discount', formatUsd(total), { total: true })}
<span class="tag">rendered quote · no order placed</span>
</div>
<p class="note">Promised discount for this cart: <strong>${formatUsd(scenario.expectedDiscountCents)}</strong>. The boundary is inclusive at exactly $50.00; the $35.00 control gets no discount.</p>
<div class="links"><a href="/promise">All promise pages</a><a href="/">Store</a></div>`;
  return { html: shell('Percentage discount quote', body), status: 200 };
}

function bundlePage(scenarioId: string): Page | null {
  const scenario = BUNDLE_PROMISE.scenarios.find((item) => item.id === scenarioId);
  if (!scenario) return null;
  const subtotal = bundleSubtotalCents(scenario.items);
  const discount = bundleDiscountCents(scenario.items, 15);
  const total = subtotal - discount;
  const body = `<p class="kicker">Promise lab / bundle</p>
<h1>Tote + notebook: 15% off both.</h1>
<p class="lead">The bundle applies only when both products are in the cart. A partial cart pays the normal price.</p>
<div class="card card--quote">
<div class="meta">${escapeHtml(BUNDLE_PROMISE.id)} · ${escapeHtml(scenario.id)} · USD</div>
<h2>${escapeHtml(scenario.label)}</h2>
${line('Merchandise subtotal', formatUsd(subtotal))}
${line('Bundle discount — 15%', formatUsd(discount), { discount: true, zero: discount === 0 })}
${line('Total after bundle', formatUsd(total), { total: true })}
<span class="tag">rendered quote · no order placed</span>
</div>
<p class="note">Promised bundle discount for this cart: <strong>${formatUsd(scenario.expectedDiscountCents)}</strong>. Tote only and notebook only must receive $0.00.</p>
<div class="links"><a href="/promise">All promise pages</a><a href="/">Store</a></div>`;
  return { html: shell('Bundle quote', body), status: 200 };
}

function deliveryPage(scenarioId: string): Page | null {
  const scenario = DELIVERY_PROMISE.scenarios.find((item) => item.id === scenarioId);
  if (!scenario) return null;
  const expected = deliveryDateFor(scenario.orderAt, { cutoffHourUtc: 14, businessDays: 2 });
  const orderLabel = scenario.orderAt.replace('T', ' ').replace('.000Z', ' UTC');
  const body = `<p class="kicker">Promise lab / delivery estimate</p>
<h1>Order by 2pm. Delivered in two business days.</h1>
<p class="lead">Weekends are skipped. An order after the cutoff is handed to the next business day. This page is the rendered estimate Kane can read.</p>
<div class="card card--quote">
<div class="meta">${escapeHtml(DELIVERY_PROMISE.id)} · ${escapeHtml(scenario.id)} · UTC</div>
<h2>${escapeHtml(scenario.label)}</h2>
${line('Order placed', orderLabel)}
${line('Delivery estimate', expected, { discount: true })}
${line('Cutoff', '14:00 UTC')}
${line('Business days', '2')}
<span class="tag">rendered estimate · no order placed</span>
</div>
<p class="note">Promised delivery date for this order: <strong>${escapeHtml(scenario.expectedDate)}</strong>. This fixture is deterministic and holiday-free; it is not a carrier promise.</p>
<div class="links"><a href="/promise">All promise pages</a><a href="/">Store</a></div>`;
  return { html: shell('Delivery estimate', body), status: 200 };
}

export function renderPromisePage(type: string, id: string): Page | null {
  if (type === 'percent') return percentPage(id);
  if (type === 'bundle') return bundlePage(id);
  if (type === 'delivery') return deliveryPage(id);
  return null;
}

export function renderPromiseIndex(): Page {
  const body = `<p class="kicker">Promise lab</p>
<h1>Three more promises, one witness.</h1>
<p class="lead">These are the deterministic quote pages for the next promise classes. Kane can shop them; the same boundary-and-control discipline applies.</p>
<div class="grid">
<a class="promise" href="/promise/percent/percent-60"><b>20% off over $50</b><span>$60 eligible, exact $50, $35 control</span><em>percentage →</em></a>
<a class="promise" href="/promise/bundle/bundle-complete"><b>Tote + notebook bundle</b><span>Complete bundle, tote only, notebook only</span><em>bundle →</em></a>
<a class="promise" href="/promise/delivery/delivery-before-cutoff"><b>2pm / 2 business days</b><span>Before cutoff, after cutoff, weekend</span><em>delivery →</em></a>
</div>
<p class="note">These pages are test fixtures. They stop at the quote or estimate; no payment fields, no order.</p>
<div class="links"><a href="/">Store</a><a href="/promise/percent/percent-60">Start with the discount</a></div>`;
  return { html: shell('Promise lab', body), status: 200 };
}
