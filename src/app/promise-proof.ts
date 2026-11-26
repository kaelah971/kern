import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { layout } from './render.ts';
import { formatUsd } from '../lib/money.ts';
import type { PromiseAuditRecord, PromiseRunAudit, PromiseScenarioAudit } from '../lib/promise-audit.ts';

const STYLE = `<style>
  .promise-proof-head{display:flex;justify-content:space-between;gap:24px;align-items:flex-start;margin-bottom:1.4rem}
  .promise-proof-head h1{max-width:760px;margin-bottom:.6rem}
  .proof-status{font-family:var(--mono);font-size:.7rem;letter-spacing:.12em;text-transform:uppercase;border:1px solid #b8d3c2;background:#e3f1e8;color:#256b4b;border-radius:99px;padding:.55rem .8rem;white-space:nowrap}
  .proof-meta{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:1px;border:1px solid var(--line);border-radius:12px;overflow:hidden;background:var(--line);margin:1.4rem 0}
  .proof-meta div{background:var(--paper-2);padding:.8rem .9rem;min-height:68px}
  .proof-meta dt{font-family:var(--mono);font-size:.55rem;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-bottom:.3rem}
  .proof-meta dd{margin:0;font-size:.9rem;font-weight:700;overflow-wrap:anywhere}
  .proof-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:1rem 0 1.5rem}
  .proof-summary article{background:#fff;border:1px solid var(--line);border-radius:12px;padding:1rem;border-top:4px solid var(--teal)}
  .proof-summary h2{font-size:1rem;margin:.35rem 0 .5rem}
  .proof-summary p{font-size:.78rem;color:var(--muted);margin:.2rem 0}
  .promise-block{margin:1.6rem 0;border:1px solid var(--line);border-radius:12px;background:#fff;overflow:hidden}
  .promise-block h2{font-size:1.1rem;margin:0;padding:1rem 1.1rem .2rem}
  .promise-block .offer{padding:0 1.1rem 1rem;color:var(--muted);font-size:.82rem}
  .scenario-table{width:100%;border-collapse:collapse;font-size:.8rem}
  .scenario-table th{background:var(--ink);color:#dce9df;text-align:left;font-family:var(--mono);font-size:.56rem;letter-spacing:.08em;text-transform:uppercase;padding:.6rem .7rem}
  .scenario-table td{border-top:1px solid #e1e7e1;padding:.65rem .7rem;vertical-align:top}
  .scenario-table td:nth-child(2),.scenario-table td:nth-child(3){white-space:nowrap}
  .scenario-table td strong{font-size:.86rem}
  .scenario-table .pass{color:#256b4b;font-family:var(--mono);font-size:.6rem;letter-spacing:.06em}
  .runline{display:block;margin-top:.35rem;font-family:var(--mono);font-size:.56rem;line-height:1.5;color:#7e8d83;overflow-wrap:anywhere}
  .runline b{color:var(--ink);font-weight:500}
  .status--verified{color:#256b4b;font-family:var(--mono);font-size:.6rem;letter-spacing:.06em}
  .status--broken{color:var(--red);font-family:var(--mono);font-size:.6rem;letter-spacing:.06em}
  .status--inconclusive{color:#8a6b2e;font-family:var(--mono);font-size:.6rem;letter-spacing:.06em}
  .proof-notes{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:1.4rem}
  .proof-notes div{border:1px solid var(--line);border-radius:10px;background:var(--paper-2);padding:1rem}
  .proof-notes h2{font-size:1rem;margin:.2rem 0 .5rem}
  .proof-notes p{font-size:.8rem;line-height:1.5;color:var(--muted)}
  .proof-notes b{color:var(--ink)}
  .proof-links{display:flex;gap:16px;flex-wrap:wrap;margin-top:1.2rem;font-family:var(--mono);font-size:.7rem}
  .proof-links a{color:var(--teal);text-decoration:none;border-bottom:1px solid #b5d5c4}
  @media(max-width:760px){.proof-meta{grid-template-columns:1fr 1fr}.proof-summary{grid-template-columns:1fr}.proof-notes{grid-template-columns:1fr}.promise-proof-head{display:block}.proof-status{display:inline-block;margin-top:.6rem}.scenario-table{font-size:.72rem;display:block;overflow-x:auto}}
</style>`;

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function value(value: number | string | null): string {
  if (value === null) return '—';
  return typeof value === 'number' ? formatUsd(value) : value;
}

function session(run: PromiseRunAudit | null): string {
  if (!run) return '—';
  const dir = run.parsed.sessionDir;
  if (!dir) return '—';
  return dir.split(/[\\/]/).filter(Boolean).pop() ?? dir;
}

function evidence(run: PromiseRunAudit | null): string {
  if (!run?.evidence) return 'missing';
  return `${run.evidence.sha256.slice(0, 16)}… (${run.evidence.bytes.toLocaleString('en-US')} B)`;
}

function runLine(run: PromiseRunAudit | null, label: string): string {
  if (!run) return `<span class="runline"><b>${label}:</b> not run</span>`;
  return `<span class="runline"><b>${label}:</b> session ${escapeHtml(session(run))} · exit ${run.artifacts.exitCode ?? '—'} · ${escapeHtml(run.parsed.runEndStatus)} · evidence ${escapeHtml(evidence(run))} · obj ${escapeHtml(run.objective.sha256.slice(0, 12))}…</span>`;
}

function statusClass(status: string): string {
  if (status === 'HONORED') return 'status--verified';
  if (status === 'BROKEN') return 'status--broken';
  return 'status--inconclusive';
}

function block(scenario: PromiseScenarioAudit): string {
  return `<tr>
<td><strong>${escapeHtml(scenario.label)}</strong><span class="runline">${escapeHtml(scenario.scenarioId)}</span></td>
<td>${escapeHtml(value(scenario.expected))}</td>
<td>${escapeHtml(value(scenario.observed))}</td>
<td><span class="${statusClass(scenario.status)}">${escapeHtml(scenario.status)}</span></td>
<td>${runLine(scenario.observe, 'observe')}${runLine(scenario.assert, 'assert')}</td>
</tr>`;
}

function promiseBlock(promiseId: string, title: string, offer: string, scenarios: PromiseScenarioAudit[]): string {
  return `<section class="promise-block"><h2>${escapeHtml(title)}</h2><p class="offer">${escapeHtml(offer)}</p>
<table class="scenario-table"><thead><tr><th>Scenario</th><th>Expected</th><th>Kane observed</th><th>Result</th><th>Evidence</th></tr></thead><tbody>
${scenarios.map(block).join('\n')}
</tbody></table></section>`;
}

export function findLatestPromiseAudit(repoRoot = process.cwd()): PromiseAuditRecord | null {
  const root = join(repoRoot, '.data', 'promise-audits');
  if (!existsSync(root)) return null;
  const candidates: PromiseAuditRecord[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const path = join(root, entry.name, 'audit.json');
    if (!existsSync(path)) continue;
    try {
      const record = JSON.parse(readFileSync(path, 'utf8')) as PromiseAuditRecord;
      if (record.auditVersion !== 1 || !Array.isArray(record.promises)) continue;
      if (record.promises.length === 0) continue;
      candidates.push(record);
    } catch {
      // Ignore partial or malformed records.
    }
  }
  candidates.sort((left, right) => {
    const leftTime = left.finishedAt ?? left.startedAt;
    const rightTime = right.finishedAt ?? right.startedAt;
    return rightTime.localeCompare(leftTime);
  });
  return candidates[0] ?? null;
}

export function renderPromiseProof(input: {
  audit: PromiseAuditRecord | null;
  publicMode?: boolean;
  repoRoot?: string;
}): string {
  const { audit, publicMode = false } = input;
  const head = `<p class="kicker">Promise proof</p>
<div class="promise-proof-head"><div><h1>Three promises.<br>One real browser witness.</h1></div><span class="proof-status">${audit ? escapeHtml(audit.overallStatus) : 'NO AUDIT'}</span></div>
<p class="intro">Kane CLI shopped the percentage-discount, bundle and delivery pages in a real browser. These are the recorded observations, not a mock and not a new live session.</p>`;

  if (!audit) {
    return layout(
      'Promise proof',
      `${head}<div class="empty"><h2>No promise audit yet</h2><p>Run <code>node scripts/promise-audit.ts</code> locally, then reload this page.</p></div>`,
      'promises',
      publicMode,
      STYLE,
    );
  }

  const promises = [PERCENT_TITLE, BUNDLE_TITLE, DELIVERY_TITLE];
  const order = ['percent-20', 'bundle-15', 'delivery-2day'];
  const blocks = order.map((id) => {
    const meta = promises.find((item) => item.id === id);
    const scenarios = audit.promises.filter((promise) => promise.promiseId === id);
    return meta && scenarios.length > 0
      ? promiseBlock(id, meta.title, meta.offer, scenarios)
      : '';
  }).join('\n');
  const allHonored = audit.overallStatus === 'HONORED';
  const passed = audit.promises.filter((promise) => promise.status === 'HONORED').length;

  const body = `${head}
<dl class="proof-meta">
  <div><dt>Audit</dt><dd>${escapeHtml(audit.auditId)}</dd></div>
  <div><dt>Finished</dt><dd>${escapeHtml(audit.finishedAt ?? audit.startedAt)}</dd></div>
  <div><dt>Runs / credits</dt><dd>${audit.totals.runs} · ${audit.totals.credits}</dd></div>
  <div><dt>Result</dt><dd>${passed} / ${audit.promises.length} scenarios honored</dd></div>
</dl>
<div class="proof-summary">
  <article><div class="kicker">Percentage discount</div><h2>${passed >= 3 ? 'The $35 control stayed undiscounted.' : 'Check the scenario table.'}</h2><p>$60 → $12.00 off; exact $50 → $10.00; $35 → $0.00.</p></article>
  <article><div class="kicker">Bundle</div><h2>The partial carts got nothing.</h2><p>Tote + notebook → $9.00 off; tote only → $0.00; notebook only → $0.00.</p></article>
  <article><div class="kicker">Delivery</div><h2>The cutoff moved the date.</h2><p>Thu 13:00 → Nov 30; Thu 15:00 → Dec 1; Sat 10:00 → Dec 2.</p></article>
</div>
${blocks}
<div class="proof-notes">
  <div><div class="kicker">What this proves</div><h2>Real browser observations.</h2><p>Kane opened the real test pages, read the rendered values and independently asserted them. The ${allHonored ? 'overall audit is HONORED' : 'audit needs review'}. Each scenario has a Kane session, exit code, evidence hash and objective hash.</p><p><b>Kane CLI 0.10.6</b> · TestMu AI · ${audit.totals.runs} real runs.</p></div>
  <div><div class="kicker">What this does not prove</div><h2>A narrow, honest scope.</h2><p>One test storefront, one recorded time, fixed scenarios. No real orders, payments, refunds or fulfilment. The percentage and bundle rules use fixed carts; delivery is a deterministic UTC fixture, holiday-free. This is not a signed certificate, not a carrier promise and not proof for every customer.</p><p>This static page is generated from the audit; it does not start Kane.</p></div>
</div>
<div class="proof-links"><a href="/">Store proof site</a><a href="/gate">Shipping gate</a><a href="https://github.com/kaelah971/kern">Repo</a></div>`;

  return layout('Promise proof', body, 'promises', publicMode, STYLE);
}

const PERCENT_TITLE = {
  id: 'percent-20',
  title: '20% off orders over $50',
  offer: 'After-discount merchandise subtotal. The exact $50.00 boundary qualifies; the $35.00 control does not.',
};
const BUNDLE_TITLE = {
  id: 'bundle-15',
  title: 'Tote + notebook: 15% off both',
  offer: 'Only the complete bundle. A cart with one of the two products pays the normal price.',
};
const DELIVERY_TITLE = {
  id: 'delivery-2day',
  title: 'Order by 2pm, delivered in 2 business days',
  offer: 'Weekends are skipped. An order after 14:00 UTC is handed to the next business day. Dates are UTC, holiday-free fixtures.',
};
