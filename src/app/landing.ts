import type { AuditIndex, AuditSummary } from './audits.ts';
import type { GateResult } from '../lib/gate.ts';
import type { PromiseContract } from '../lib/contract.ts';
import { PRESET_CARTS } from '../lib/catalog.ts';
import { formatCents } from './data.ts';
import { LANDING_STYLES } from './landing-styles.ts';

const README_URL = 'https://github.com/kaelah971/kern#readme';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function renderLanding(input: {
  contract: PromiseContract;
  index: AuditIndex;
  pre: AuditSummary | null;
  post: AuditSummary | null;
  gate: GateResult | null;
  publicMode?: boolean;
}): string {
  const { contract, index, pre, post, gate, publicMode = false } = input;
  const gateOpen = gate?.open === true;
  const preUrl = pre ? `/audits/${encodeURIComponent(pre.audit.auditId)}` : '/audits';
  const postUrl = post ? `/audits/${encodeURIComponent(post.audit.auditId)}` : '/audits';
  const repairUrl = pre ? `/repair/${encodeURIComponent(pre.audit.auditId)}` : '/repair';
  const receiptUrl = post
    ? `/audits/${encodeURIComponent(post.audit.auditId)}/receipt`
    : '/audits';
  const storeUrl = publicMode ? '/store/' : 'http://127.0.0.1:4173/';
  const beforeStoreUrl = publicMode ? '/store/before/eligible-60' : null;
  const firstPreset = PRESET_CARTS['eligible-60'];
  const firstPre = pre?.audit.scenarios.find((scenario) => scenario.scenarioId === firstPreset.id);
  const firstPost = post?.audit.scenarios.find((scenario) => scenario.scenarioId === firstPreset.id);
  const after = firstPost?.oracle.observedShippingCents;
  const comparisons = post?.audit.objectiveHashComparisons ?? [];
  const hashMatches = comparisons.filter((comparison) => comparison.match).length;
  const recordedCount = index.audits.filter((summary) => summary.recorded).length;
  const runCount = index.audits.reduce(
    (total, summary) =>
      total +
      summary.audit.scenarios.reduce(
        (count, scenario) => count + (scenario.observe ? 1 : 0) + (scenario.assert ? 1 : 0),
        0,
      ),
    0,
  );

  const testRows = Object.values(PRESET_CARTS)
    .map((preset) => {
      const preScen = pre?.audit.scenarios.find((scenario) => scenario.scenarioId === preset.id);
      const postScen = post?.audit.scenarios.find((scenario) => scenario.scenarioId === preset.id);
      const promised =
        postScen?.oracle.expectedShippingCents ?? preScen?.oracle.expectedShippingCents ?? 0;
      return `<tr>
  <td>${escapeHtml(preset.label)}</td>
  <td class="num">${formatCents(promised)}</td>
  <td class="num">${formatCents(preScen?.oracle.observedShippingCents)}</td>
  <td class="num">${formatCents(postScen?.oracle.observedShippingCents)}</td>
  <td>${postScen ? `<span class="chip chip-green">${escapeHtml(postScen.status)}</span>` : '<span class="chip chip-red">NO RESULT</span>'}</td>
</tr>`;
    })
    .join('');

  const allPages: Array<[string, string, string]> = [
    ['/why-kane', 'Why Kane', 'the witness'],
    ['/promises', 'Promise proof', '4 classes · 18 runs'],
    ['/campaign', 'Demo app', 'the full proof'],
    ['/gate', 'Gate', 'the decision'],
    ['/audits', 'Audits', 'all records'],
    ['/runs', 'Runs', 'all Kane evidence'],
    [storeUrl, 'Storefront', 'current quotes'],
    [repairUrl, 'Closed loop', 'failure → patch → rerun'],
    [receiptUrl, 'Promise receipt', 'scoped proof'],
    ['https://github.com/kaelah971/kern#readme', 'README', 'the source'],
  ];
  if (beforeStoreUrl) allPages.push([beforeStoreUrl, 'Audited storefront', 'the old $9.00']);
  if (!publicMode) allPages.push(['/compile', 'Contract compiler', 'local-only']);
  const pages = allPages
    .map(
      ([href, label, detail]) =>
        `<a class="page-link" href="${escapeHtml(href)}"${
          href.startsWith('http') ? ' rel="noopener"' : ''
        }>${escapeHtml(label)}<span>${escapeHtml(detail)}</span></a>`,
    )
    .join('');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Kern — the promise firewall for checkout</title>
<style>${LANDING_STYLES}</style>
</head>
<body>
<div class="page">
  <header class="nav">
    <a class="logo" href="/"><span class="logo-mark">K</span>KERN</a>
    <nav class="nav-links" aria-label="Main">
      <a href="#product">Product</a>
      <a href="/why-kane">Why Kane</a>
      <a href="/promises">Promises</a>
      <a href="#tests">Tests</a>
      <a href="/gate">Gate</a>
      <a href="/audits">Audits</a>
      <a href="${storeUrl}">Storefront</a>
      <a href="/runs">Runs</a>
    </nav>
    <div class="nav-actions">
      <a class="nav-ghost" href="${README_URL}" rel="noopener">README</a>
      <a class="nav-cta" href="/campaign">Open demo ↗</a>
    </div>
  </header>

  <main>
    <section class="hero" aria-labelledby="hero-title">
      <div class="badge"><strong>Kane CLI</strong> · the checkout promise gate</div>
      <h1 id="hero-title">An ad makes a promise.<br>The checkout has to<br><span class="accent">keep it.</span></h1>
      <p class="hero-sub">Kern freezes the merchant’s offer, sends Kane through the real rendered checkout, and blocks the agent’s fix until the same promise passes unchanged — across free shipping, percentage discounts, bundles and delivery. No screenshot theater. No self-certified “done.”</p>
      <div class="hero-actions">
        <a class="btn btn-primary" href="/campaign">Open the demo app ↗</a>
        <a class="btn btn-secondary" href="${README_URL}" rel="noopener">Read the README</a>
        <a class="btn btn-secondary" href="/promises">See the promise proof</a>
      </div>
      <div class="hero-meta">
        <span>100/100 tests pass</span>
        <span>4 promise classes</span>
        <span>${runCount + 18} real runs</span>
        <span>9/9 new proof honored</span>
      </div>
      ${
        publicMode
          ? `<p class="operator-note">Live checks run on the operator's machine. The runs below are real executions; this deployment only reads them.</p>`
          : ''
      }
    </section>

    <section class="steps-wrap" aria-label="The closed loop">
      <div class="steps">
        <article class="step-card">
          <div class="step-top"><span class="step-num">01 · Kane finds</span><span class="chip ${
            firstPre?.status === 'BROKEN' ? 'chip-red' : 'chip-green'
          }">${escapeHtml(firstPre?.status ?? 'RECORDED')}</span></div>
          <div class="mini">
            <p class="mini-kicker">$60.00 eligible · recorded checkout</p>
            <div class="mini-row"><span>Promised</span><strong>${formatCents(
              firstPre?.oracle.expectedShippingCents ?? contract.expectedEligibleShipping.cents,
            )}</strong></div>
            <div class="mini-row"><span>Observed</span><strong>${formatCents(
              firstPre?.oracle.observedShippingCents,
            )}</strong></div>
          </div>
          <p class="step-copy">The $60 cart was charged $9.00 while the ad promised free shipping.</p>
          <a class="step-link" href="${preUrl}">Inspect the failed audit →</a>
        </article>

        <article class="step-card">
          <div class="step-top"><span class="step-num">02 · Pi repairs</span><span class="chip chip-green">1 LINE</span></div>
          <div class="mini">
            <p class="mini-kicker">src/lib/shipping.ts</p>
            <div class="mini-code"><span class="del">- if (subtotal &gt;= threshold * 100)</span>
<span class="add">+ if (subtotal &gt;= threshold)</span></div>
          </div>
          <p class="step-copy">The coding agent changed the shipping threshold in the real source, not the expectation.</p>
          <a class="step-link" href="${repairUrl}">Open the repair case →</a>
        </article>

        <article class="step-card">
          <div class="step-top"><span class="step-num">03 · Kane gates</span><span class="chip ${
            gateOpen ? 'chip-green' : 'chip-red'
          }">${gateOpen ? 'GATE OPEN' : 'GATE CLOSED'}</span></div>
          <div class="mini">
            <div class="mini-gate"><span class="mini-big">${
              comparisons.length > 0 ? `${hashMatches}/${comparisons.length}` : '0/6'
            }</span><span class="chip ${
              gateOpen ? 'chip-green' : 'chip-red'
            }">${gateOpen ? 'SHIP' : 'BLOCK'}</span></div>
            <p class="mini-kicker">objective hashes unchanged</p>
            <p class="mini-kicker">after the repair: ${formatCents(after)} shipping</p>
          </div>
          <p class="step-copy">The same six objectives ran against the repaired store. The patch only ships when the gate opens.</p>
          <a class="step-link" href="/gate">Open the gate →</a>
        </article>
      </div>
    </section>

    <section class="principle">
      <div class="avatar" aria-hidden="true">K</div>
      <blockquote>“A patch is not done because it compiles. It is done when the customer gets the promise.”</blockquote>
      <p>The Kern principle · terminal-driven repair, independently gated</p>
    </section>

    <div class="built-with" aria-label="Built with">
      <span>Built with</span>
      <span>KANE CLI</span>
      <span>CHROME</span>
      <span>TESTMU</span>
      <span>SHA-256</span>
      <span>4 PROMISES</span>
      <span>100 TESTS</span>
    </div>

    <section class="section" id="promises" aria-labelledby="promises-heading">
      <div class="section-head">
        <p class="eyebrow">The promise library</p>
        <h2 id="promises-heading">One witness. Four promises.</h2>
        <p>The ad can promise a shipping threshold, a percentage discount, a bundle or a delivery date. Kern gives each one a boundary case and a control.</p>
      </div>
      <div class="promise-grid">
        <article class="promise-card"><span>01 · Shipping</span><h3>$50 threshold</h3><p>$60 and the exact $50 qualify; the $35 control keeps paying $9.</p></article>
        <article class="promise-card"><span>02 · Percentage</span><h3>20% over $50</h3><p>$60 gets $12 off; the exact boundary gets $10; the $35 control gets $0.</p></article>
        <article class="promise-card"><span>03 · Bundle</span><h3>Tote + notebook</h3><p>The complete bundle gets 15%; tote-only and notebook-only get $0.</p></article>
        <article class="promise-card"><span>04 · Delivery</span><h3>2pm / 2 days</h3><p>The cutoff and weekends move the date: Nov 30, Dec 1, Dec 2.</p></article>
      </div>
      <p class="promise-proof-link"><a class="btn btn-secondary" href="/promises">Open the 18-run proof →</a></p>
    </section>

    <section class="section" id="product" aria-labelledby="product-heading">
      <div class="section-head">
        <p class="eyebrow">The product</p>
        <h2 id="product-heading">A promise firewall for AI-generated commerce changes.</h2>
        <p>Most tests check whether the code still works. Kern checks whether the customer still gets what the ad promised.</p>
      </div>
      <div class="feature-grid">
        <article class="feature"><div class="feature-icon">01</div><h3>Four promise classes</h3><p>Free shipping, percentage discounts, bundles and delivery estimates. One witness, one boundary-and-control discipline.</p></article>
        <article class="feature"><div class="feature-icon">02</div><h3>Frozen promise contract</h3><p>The ad and the merchant’s interpretation stay separate. The terms and policy are hash-linked before a run.</p></article>
        <article class="feature"><div class="feature-icon">03</div><h3>Kane in the real checkout</h3><p>Kane reads the rendered price, discount, bundle total or delivery date. The store’s own code never decides whether the promise passed.</p></article>
        <article class="feature"><div class="feature-icon">04</div><h3>Boundary + control</h3><p>Every class gets an eligible case, the exact edge and a control. The offer cannot be “fixed” by giving it to everyone.</p></article>
        <article class="feature"><div class="feature-icon">05</div><h3>An agent gate, not a report</h3><p>The gate exits non-zero. Claude Code can stop-block; Pi can run the same command. The agent cannot self-certify.</p></article>
        <article class="feature"><div class="feature-icon">06</div><h3>Scoped promise proof</h3><p>The promise, observed values, evidence hashes, code change and “what this does not prove” live in one record.</p></article>
      </div>
    </section>

    <section class="section" id="why-kane" aria-labelledby="why-kane-heading">
      <div class="section-head">
        <p class="eyebrow">The witness</p>
        <h2 id="why-kane-heading">Kane CLI is not a checkbox at the end.</h2>
        <p>Kane is the only component that opens the customer checkout and reads the rendered value. Kern freezes the promise and decides; Kane supplies the independent browser truth.</p>
      </div>
      <div class="feature-grid">
        <article class="feature"><div class="feature-icon">01</div><h3>It sees the checkout</h3><p>A unit test can agree with the bug. Kane reads the actual rendered price, discount, bundle total or delivery date the customer sees.</p></article>
        <article class="feature"><div class="feature-icon">02</div><h3>It carries the evidence</h3><p>Every run has a terminal run_end, exit code, extracted values and evidence hash. The gate is built on those artifacts.</p></article>
        <article class="feature"><div class="feature-icon">03</div><h3>It gates the repair</h3><p>Pi can change the source, but not the challenge. Kane reruns the same objectives after a change before the gate can open.</p></article>
      </div>
      <div style="text-align:center;margin-top:18px"><a class="btn btn-secondary" href="/why-kane">Why Kane CLI →</a> <a class="btn btn-secondary" href="/promises">See the 18-run proof →</a></div>
    </section>

    <section class="test-section" id="tests" aria-labelledby="tests-heading">
      <div class="section">
        <div class="section-head">
          <p class="eyebrow">The evidence</p>
          <h2 id="tests-heading">Four promise classes. Two proofs.</h2>
          <p>The first proof is the shipping repair below. The second is 18 real Kane runs across percentage discounts, bundles and delivery.</p>
        </div>
        <div class="table-wrap">
          <table class="test-table">
            <thead><tr><th scope="col">Cart</th><th scope="col" class="num">Promised</th><th scope="col" class="num">Before repair</th><th scope="col" class="num">After repair</th><th scope="col">Gate</th></tr></thead>
            <tbody>${testRows}</tbody>
          </table>
        </div>
        <div class="proof-band">
          <div><p class="eyebrow">The second proof</p><h3>18 real Kane runs. 9/9 scenarios HONORED.</h3><p>Percentage discounts, bundles and delivery estimates — with every session, exit and evidence hash on the public proof page.</p></div>
          <a class="btn btn-primary" href="/promises">Open the promise proof →</a>
        </div>
        <div class="test-note"><span>${recordedCount} recorded shipping audits · ${runCount} shipping runs + 18 promise runs</span><span><a href="/audits">Open the audits</a> · <a href="/promises">Open the promise proof</a></span></div>
      </div>
    </section>

    <section class="section" id="pages" aria-labelledby="pages-heading">
      <div class="section-head">
        <p class="eyebrow">Explore</p>
        <h2 id="pages-heading">Everything is open.</h2>
        <p>The demo app, the gate, the raw audits, the storefront, the receipts and the README.</p>
      </div>
      <div class="pages-grid">${pages}</div>
    </section>
  </main>

  <footer class="footer">
    <span>Kern · evidence, not adjectives. Recorded evidence is labelled in the app.</span>
    <span><a href="${README_URL}" rel="noopener">README</a> · <a href="/campaign">Demo app</a> · <a href="/promises">Promise proof</a> · <a href="/runs">All runs</a></span>
  </footer>
</div>
</body>
</html>`;
}
