import type { AuditStatus, RunAudit, ScenarioAudit } from '../lib/audit.ts';
import type { PromiseContract } from '../lib/contract.ts';
import { expectedShippingCents } from '../lib/contract.ts';
import { PRESET_CARTS } from '../lib/catalog.ts';
import type { AuditIndex, AuditSummary } from './audits.ts';
import { latestAudit } from './audits.ts';
import type { DiffResult } from './git.ts';
import type { PolicyInfo } from './data.ts';
import type { LiveSnapshot } from './live.ts';
import {
  formatCents,
  formatTimestamp,
  humanize,
  PRE_FIX_SHA,
  statusClass,
  STOREFRONT_URL,
} from './data.ts';
import { APP_STYLES } from './styles.ts';

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function statusChip(status: AuditStatus): string {
  return `<span class="status ${statusClass(status)}"><span class="status-mark" aria-hidden="true"></span>${escapeHtml(status)}</span>`;
}

export function recordedBanner(summary: AuditSummary | null): string {
  if (!summary?.recorded) return '';
  const original = summary.originalAuditSha256
    ? `<span class="meta">Original audit SHA-256: <code class="hash">${escapeHtml(summary.originalAuditSha256)}</code></span>`
    : '';
  return `<div class="recorded-banner" role="status"><strong>Recorded audit: replay of real runs, not a live session.</strong>${original ? `<br>${original}` : ''}</div>`;
}

function credits(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(2) : '—';
}

function exitCode(run: RunAudit | null): string {
  if (!run) return '—';
  return typeof run.artifacts.exitCode === 'number' ? String(run.artifacts.exitCode) : '—';
}

export function sessionId(run: RunAudit | null): string {
  const explicit = (run?.parsed as { sessionId?: string } | undefined)?.sessionId;
  if (explicit) return explicit;
  const directory = run?.parsed.sessionDir;
  if (!directory) return '—';
  return directory.split(/[\\/]/).filter(Boolean).pop() ?? directory;
}

function evidenceCommand(run: RunAudit | null): string | null {
  const path = run?.evidence?.copiedPath ?? run?.evidence?.sourcePath;
  if (!path) return null;
  const argument = /\s/.test(path) ? `"${path}"` : path;
  return `kane-cli evidence serve ${argument}`;
}

function formatResult(run: RunAudit | null): string {
  if (!run) return '—';
  const result = run.parsed.resultCode;
  const reason = run.parsed.reasonCode;
  return `${result ?? '—'} / ${reason ?? '—'}`;
}

function auditContractWarning(audit: AuditSummary, contract: PromiseContract): string {
  if (audit.audit.contract.specSha256 === contract.specSha256) return '';
  return `<div class="warning" role="status">The current contract hash <code>${escapeHtml(
    contract.specSha256,
  )}</code> differs from the hash recorded by this audit <code>${escapeHtml(
    audit.audit.contract.specSha256,
  )}</code>. Read the audit against its recorded contract, not the current one.</div>`;
}

export function layout(
  title: string,
  body: string,
  current: 'campaign' | 'audits' | 'runs' | 'audit' | 'repair' | 'check' = 'campaign',
  publicMode = false,
  headExtra = '',
): string {
  const navCurrent =
    current === 'campaign'
      ? 'campaign'
      : current === 'runs'
        ? 'runs'
        : current === 'check'
          ? ''
          : 'audits';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${headExtra}
<title>${escapeHtml(title)} · Kern</title>
<style>${APP_STYLES}</style>
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
<header class="site-header">
  <a class="wordmark" href="/">KERN<span>PROMISE AUDIT</span></a>
  <nav aria-label="Main">
    <a href="/"${navCurrent === 'campaign' ? ' aria-current="page"' : ''}>Campaign</a>
    <a href="/audits"${navCurrent === 'audits' ? ' aria-current="page"' : ''}>Audits</a>
    <a href="/runs"${navCurrent === 'runs' ? ' aria-current="page"' : ''}>Runs</a>
    ${publicMode ? '' : `<a href="${STOREFRONT_URL}">Storefront</a>`}
  </nav>
</header>
<main id="main">
${body}
</main>
<footer class="footer">
  <span>${publicMode ? 'Kern · read-only proof site' : 'Kern · local demo · reads <code>.data/audits</code>'}</span>
  <span>Evidence is hash-linked. No screenshots are fabricated.</span>
</footer>
</body>
</html>`;
}

function incompleteWarnings(index: AuditIndex): string {
  const parts: string[] = [];
  if (index.incomplete.length > 0) {
    parts.push(
      `${index.incomplete.length} audit director${index.incomplete.length === 1 ? 'y has' : 'ies have'} no audit.json (incomplete or interrupted): ${index.incomplete
        .map((id) => `<code>${escapeHtml(id)}</code>`)
        .join(', ')}.`,
    );
  }
  if (index.errors.length > 0) {
    parts.push(
      `${index.errors.length} audit file${index.errors.length === 1 ? '' : 's'} could not be read: ${index.errors
        .map((error) => `<code>${escapeHtml(error)}</code>`)
        .join(', ')}.`,
    );
  }
  if (parts.length === 0) return '';
  return `<div class="warning" role="status">${parts.join(' ')}</div>`;
}

function scenarioCards(
  contract: PromiseContract,
  latest: AuditSummary | null,
): string {
  const latestStatuses = new Map<string, AuditStatus>(
    latest?.audit.scenarios.map((scenario) => [scenario.scenarioId, scenario.status]) ?? [],
  );

  return Object.values(PRESET_CARTS)
    .map((preset) => {
      const expected = expectedShippingCents(contract, preset.expectedSubtotalCents);
      const status = latestStatuses.get(preset.id);
      return `<article class="card">
  <p class="eyebrow">${escapeHtml(preset.id)}</p>
  <h3>${escapeHtml(preset.label)}</h3>
  <p class="card-meta">${escapeHtml(preset.description)} · subtotal ${formatCents(
        preset.expectedSubtotalCents,
      )}</p>
  <p class="card-amount">${formatCents(expected)}</p>
  <p class="card-meta">promised standard shipping</p>
  <div class="card-foot">${
    status ? statusChip(status) : '<span class="meta">not in the latest audit</span>'
  }</div>
</article>`;
    })
    .join('\n');
}

function hasLiveRun(summary: AuditSummary): boolean {
  return summary.audit.scenarios.some(
    (scenario) => scenario.observe?.source === 'live' || scenario.assert?.source === 'live',
  );
}

function realAudits(index: AuditIndex): AuditSummary[] {
  return index.audits.filter(hasLiveRun);
}

function realRunCount(index: AuditIndex): number {
  return realAudits(index).reduce(
    (total, summary) =>
      total +
      summary.audit.scenarios.reduce(
        (count, scenario) => count + (scenario.observe ? 1 : 0) + (scenario.assert ? 1 : 0),
        0,
      ),
    0,
  );
}

export function renderCampaign(input: {
  contract: PromiseContract;
  policy: PolicyInfo | null;
  index: AuditIndex;
  publicMode?: boolean;
  live?: LiveSnapshot | null;
}): string {
  const { contract, policy, index, publicMode = false, live = null } = input;
  const latest = latestAudit(index);
  const runCount = realRunCount(index);
  const operatorNote = publicMode
    ? `<div class="read-only-note" role="status">Live checks run on the operator's machine. The runs below are real executions; this deployment only reads them.</div>`
    : '';
  const livePanel = !publicMode && live ? renderLivePanel(live, contract) : '';

  const latestBlock = latest
    ? `${recordedBanner(latest)}<div class="audit-banner">
  <div>
    <p class="eyebrow">Latest audit</p>
    <p>${statusChip(latest.audit.overallStatus)} <a href="/audits/${encodeURIComponent(
      latest.audit.auditId,
    )}">${escapeHtml(latest.audit.auditId)}</a></p>
    <p class="meta">Started ${formatTimestamp(latest.audit.startedAt)} · ${
      latest.audit.totals.runs
    } runs · ${credits(latest.audit.totals.credits)} credits</p>
    ${
      latest.audit.postRepair
        ? `<p class="meta">Post-repair audit of <a href="/repair/${encodeURIComponent(
            latest.audit.answersAuditId ?? '',
          )}">${escapeHtml(latest.audit.answersAuditId ?? 'unknown pre-repair audit')}</a></p>`
        : ''
    }
  </div>
  <div>
    <a class="button" href="/audits/${encodeURIComponent(latest.audit.auditId)}">Open Journey X-Ray</a>
    <a class="button button--secondary" href="/audits/${encodeURIComponent(
      latest.audit.auditId,
    )}/receipt">Promise Receipt</a>
  </div>
</div>
${auditContractWarning(latest, contract)}`
    : `<div class="empty">
  <h3>No audit records yet</h3>
  <p>No <code>audit.json</code> exists under <code>.data/audits</code> or <code>recorded/</code>. Start the store on port 4173, then run <code>node scripts/kane-audit.ts</code>, or restore the committed recorded audits. This page does not mock a result.</p>
</div>`;

  const policyBlock = policy
    ? `<div class="policy">
  <p class="panel-label">Policy source behind the $9.00 baseline</p>
  <p><code>${escapeHtml(policy.path)}</code> — ${escapeHtml(
    contract.baselineSource,
  )}</p>
  ${
    policy.baselineRule
      ? `<p class="policy-rule">${escapeHtml(policy.baselineRule)}</p>`
      : '<p class="meta">The policy file is present but no $9.00 rule was found.</p>'
  }
  <p class="meta">Expected ineligible shipping in the frozen contract: ${formatCents(
    contract.expectedIneligibleShipping.cents,
  )}.</p>
</div>`
    : `<div class="warning" role="status">Policy source not found at <code>docs/store-policy.md</code>. The frozen contract still records the $9.00 expectation, but its separate policy source is missing on disk.</div>`;

  return layout(
    'Campaign',
    `<p class="eyebrow">Campaign · ${escapeHtml(contract.campaignId)}</p>
<div class="hero">
  <div>
    <h1>Every ad makes a promise. The checkout has to keep it.</h1>
    <p class="front-line">“Other tools ask for your website URL. Kern asks for your ad.”</p>
    <p class="front-line">“$60 cart: promised $0.00, charged $9.00.  $35 cart: promised $9.00, charged $9.00.”</p>
    <p class="hero-runs"><a href="/runs">See all ${runCount} real runs</a></p>
    <p class="lede">The campaign freezes the advertised offer as a contract, then checks the rendered shipping quote on three deterministic carts. The ad wording and the merchant's interpretation are kept separate.</p>
  </div>
  <aside class="meta">
    <p><strong>Contract</strong> ${escapeHtml(contract.id)}</p>
    <p><strong>Version</strong> ${contract.version}</p>
    <p><strong>Spec SHA-256</strong><br><span class="hash">${escapeHtml(
      contract.specSha256,
    )}</span></p>
  </aside>
</div>
${operatorNote}
${livePanel}

<div class="grid-two">
  <section class="panel panel--ad" aria-labelledby="ad-heading">
    <p class="panel-label" id="ad-heading">Ad snapshot</p>
    <p class="quote">${escapeHtml(contract.adTextSnapshot)}</p>
  </section>
  <section class="panel panel--interpretation" aria-labelledby="interpretation-heading">
    <p class="panel-label" id="interpretation-heading">Merchant's stated interpretation</p>
    <p class="quote">${escapeHtml(contract.statedInterpretation)}</p>
  </section>
</div>

<section aria-labelledby="contract-heading">
  <h2 id="contract-heading">Frozen contract</h2>
  <dl class="contract-grid">
    <div><dt>Threshold</dt><dd>${formatCents(contract.threshold.cents)}</dd></div>
    <div><dt>Basis</dt><dd>${escapeHtml(humanize(contract.thresholdBasis))}</dd></div>
    <div><dt>Destination</dt><dd>${escapeHtml(contract.destinationCountry)} · ${escapeHtml(
      humanize(contract.shippingMethod),
    )}</dd></div>
    <div><dt>Qualifying shipping</dt><dd>${formatCents(
      contract.expectedEligibleShipping.cents,
    )}</dd></div>
    <div><dt>Below-threshold shipping</dt><dd>${formatCents(
      contract.expectedIneligibleShipping.cents,
    )}</dd></div>
    <div><dt>Contract hash</dt><dd class="hash">${escapeHtml(contract.specSha256)}</dd></div>
  </dl>
</section>

<section aria-labelledby="policy-heading">
  <h2 id="policy-heading">Why $9.00 is a sourced expectation</h2>
  ${policyBlock}
</section>

<section aria-labelledby="scenarios-heading">
  <h2 id="scenarios-heading">The three carts</h2>
  <div class="cards">
${scenarioCards(contract, latest)}
  </div>
</section>

<section aria-labelledby="latest-heading">
  <h2 id="latest-heading">Latest audit</h2>
  ${latestBlock}
  ${incompleteWarnings(index)}
</section>`,
    'campaign',
    publicMode,
  );
}

function liveLimitsLine(live: LiveSnapshot): string {
  return `${live.limits.perHour} per hour · ${live.limits.perDay} per day · one at a time · ${live.limits.minBalanceCredits} credit floor`;
}

function liveStateLine(live: LiveSnapshot): string {
  if (live.state === 'running') {
    return `Running <code>${escapeHtml(live.scenario ?? 'unknown')}</code> since ${formatTimestamp(
      live.startedAt ?? '',
    )} (${live.elapsedSeconds ?? 0}s). <a href="/check/status">Status</a>`;
  }
  if (live.state === 'done' && live.auditUrl) {
    return `Done. <a href="${live.auditUrl}">Open the audit</a>.`;
  }
  if (live.state === 'failed') {
    return `Failed: ${escapeHtml(live.error ?? 'unknown failure')}. <a href="/check/status">Open status and log</a>.`;
  }
  return `Idle. ${live.startsLastHour} of ${live.limits.perHour} starts used this hour; ${live.startsLastDay} of ${live.limits.perDay} today.`;
}

function liveCartCards(contract: PromiseContract, disabled: boolean): string {
  return Object.values(PRESET_CARTS)
    .map((preset) => {
      const expected = expectedShippingCents(contract, preset.expectedSubtotalCents);
      return `<article class="live-card">
  <p class="eyebrow">${escapeHtml(preset.id)}</p>
  <h3>${escapeHtml(preset.label)}</h3>
  <p class="card-meta">${escapeHtml(preset.description)} · subtotal ${formatCents(
        preset.expectedSubtotalCents,
      )}</p>
  <p class="live-promise">promised ${formatCents(expected)} shipping</p>
  <form class="live-start" method="post" action="/check/run">
    <input type="hidden" name="scenario" value="${escapeHtml(preset.id)}">
    <button class="button" type="submit" aria-label="Start check for ${escapeHtml(
      preset.label,
    )}"${disabled ? ' disabled' : ''}>Start check</button>
  </form>
</article>`;
    })
    .join('\n');
}

function renderLivePanel(live: LiveSnapshot, contract: PromiseContract): string {
  const running = live.state === 'running';
  return `<section class="live-panel" aria-labelledby="live-check-heading">
  <div class="live-panel-head">
    <div>
      <p class="eyebrow">Operator · local only</p>
      <h2 id="live-check-heading">Check this store</h2>
    </div>
    <a href="/check/status">Open check console</a>
  </div>
  <p class="live-limits">${liveLimitsLine(live)}</p>
  <p class="live-state live-state--${live.state}">${liveStateLine(live)}</p>
  <div class="live-cards">
${liveCartCards(contract, running)}
  </div>
</section>`;
}

function elapsedLabel(seconds: number): string {
  return seconds === 1 ? '1 second' : `${seconds} seconds`;
}

function renderLiveStatusBody(live: LiveSnapshot, contract: PromiseContract): string {
  const limits = `<p class="live-limits">${liveLimitsLine(live)}</p>
<p class="meta">Starts in the last hour: ${live.startsLastHour} of ${live.limits.perHour}. Starts in the last day: ${live.startsLastDay} of ${live.limits.perDay}.</p>`;

  if (live.state === 'running') {
    return `<p class="eyebrow">Operator · local only</p>
<h1>Check this store</h1>
<p class="live-state live-state--running"><strong>Running</strong> <code>${escapeHtml(
      live.scenario ?? 'unknown',
    )}</code></p>
<dl class="live-facts">
  <div><dt>Started</dt><dd>${formatTimestamp(live.startedAt ?? '')}</dd></div>
  <div><dt>Elapsed</dt><dd>${elapsedLabel(live.elapsedSeconds ?? 0)}</dd></div>
</dl>
<h2>Last line from the check</h2>
${
  live.lastLine
    ? `<pre class="live-last-line">${escapeHtml(live.lastLine)}</pre>`
    : '<p class="meta">No output yet.</p>'
}
<p class="meta">This page refreshes every 3 seconds. It shows only the child's output; elapsed time is not a prediction.</p>`;
  }

  if (live.state === 'done') {
    return `<p class="eyebrow">Operator · local only</p>
<h1>Check this store</h1>
<div class="live-result live-result--done" role="status">
  <p><strong>Done.</strong> The check produced an audit.</p>
  ${
    live.auditUrl
      ? `<p><a class="button" href="${live.auditUrl}">Open the audit</a></p>`
      : '<p class="meta">The child reported success but did not name an audit.</p>'
  }
</div>
<dl class="live-facts">
  <div><dt>Scenario</dt><dd><code>${escapeHtml(live.scenario ?? 'unknown')}</code></dd></div>
  <div><dt>Started</dt><dd>${formatTimestamp(live.startedAt ?? '')}</dd></div>
</dl>
<p><a href="/">Back to campaign</a> · <a href="/check/status">Refresh status</a></p>`;
  }

  if (live.state === 'failed') {
    return `<p class="eyebrow">Operator · local only</p>
<h1>Check this store</h1>
<div class="warning" role="status"><strong>This check failed.</strong> It is not a verified result.</div>
<dl class="live-facts">
  <div><dt>Scenario</dt><dd><code>${escapeHtml(live.scenario ?? 'unknown')}</code></dd></div>
  <div><dt>Started</dt><dd>${formatTimestamp(live.startedAt ?? '')}</dd></div>
  <div><dt>Failure</dt><dd>${escapeHtml(live.error ?? 'unknown failure')}</dd></div>
  <div><dt>Log</dt><dd><code>${escapeHtml(live.logPath ?? 'log path not recorded')}</code></dd></div>
</dl>
<p><a href="/">Back to campaign</a> · <a href="/check/status">Refresh status</a></p>`;
  }

  return `<p class="eyebrow">Operator · local only</p>
<h1>Check this store</h1>
<p>The check runs the real two-run Kane audit for one fixed cart, then records the audit. It does not take free-text objectives.</p>
<h2>What will be checked</h2>
<div class="live-cards">
${liveCartCards(contract, false)}
</div>
${limits}
<p class="meta">The store must answer at http://127.0.0.1:4173/health. The check stops before starting if it does not.</p>`;
}

export function renderLiveStatus(live: LiveSnapshot, contract: PromiseContract): string {
  return layout(
    'Check this store',
    renderLiveStatusBody(live, contract),
    'check',
    false,
    '<meta http-equiv="refresh" content="3">',
  );
}

export function renderAuditList(index: AuditIndex, publicMode = false): string {
  const rows = index.audits
    .map((summary) => {
      const audit = summary.audit;
      const answers = audit.answersAuditId
        ? `<a href="/repair/${encodeURIComponent(audit.answersAuditId)}">${escapeHtml(
            audit.answersAuditId,
          )}</a>`
        : '—';
      return `<tr>
  <td>${formatTimestamp(audit.startedAt)}</td>
  <td><a href="/audits/${encodeURIComponent(audit.auditId)}">${escapeHtml(
        audit.auditId,
      )}</a></td>
  <td>${statusChip(audit.overallStatus)}</td>
  <td>${summary.recorded ? 'Recorded' : 'Live'}</td>
  <td>${audit.postRepair ? 'Yes' : 'No'}</td>
  <td>${answers}</td>
  <td class="num">${audit.totals.runs}</td>
  <td class="num">${credits(audit.totals.credits)}</td>
</tr>`;
    })
    .join('\n');

  const recordedCount = index.audits.filter((summary) => summary.recorded).length;
  const recordedNotice =
    recordedCount > 0
      ? `<div class="recorded-banner" role="status"><strong>Recorded audit: replay of real runs, not a live session.</strong> ${recordedCount} of ${index.audits.length} records below are recorded copies.</div>`
      : '';

  const content =
    index.audits.length === 0
      ? `<div class="empty">
  <h3>No audit records on disk</h3>
  <p>Nothing exists under <code>.data/audits</code> that can be read as an audit. Run the CLI; this page will list the real JSON files, not a placeholder.</p>
</div>`
      : `<div class="table-wrap">
<table>
  <caption class="sr-only">Audit records, newest first</caption>
  <thead>
    <tr><th scope="col">Started</th><th scope="col">Audit</th><th scope="col">Status</th><th scope="col">Source</th><th scope="col">Post-repair</th><th scope="col">Answers</th><th scope="col" class="num">Runs</th><th scope="col" class="num">Credits</th></tr>
  </thead>
  <tbody>
${rows}
  </tbody>
</table>
</div>`;

  return layout(
    'Audits',
    `<p class="eyebrow">All records</p>
<h1>Audits</h1>
<p class="lede">Every readable <code>audit.json</code> under <code>.data/audits</code>, newest first. Missing or unreadable files are called out rather than filled in.</p>
${incompleteWarnings(index)}
${recordedNotice}
${content}`,
    'audits',
    publicMode,
  );
}

function runVerdict(run: RunAudit): string {
  if (run.kind !== 'assert') return '—';
  const verdict = run.parsed.verdict;
  if (verdict) {
    return `${verdict.confirmed ? 'confirmed' : 'unconfirmed'}: ${verdict.bugTitle ?? 'bug'}`;
  }
  if (run.parsed.runEndStatus === 'passed') return 'passed';
  return '—';
}

export function renderRunsList(index: AuditIndex, publicMode = false): string {
  const groups = realAudits(index).map((summary) => {
    const runs: Array<{ scenario: ScenarioAudit; run: RunAudit }> = [];
    for (const scenario of summary.audit.scenarios) {
      if (scenario.observe) runs.push({ scenario, run: scenario.observe });
      if (scenario.assert) runs.push({ scenario, run: scenario.assert });
    }
    return { summary, runs };
  });

  const totalRuns = groups.reduce((total, group) => total + group.runs.length, 0);
  const totalCredits = groups.reduce(
    (total, group) =>
      total +
      group.runs.reduce((sum, row) => sum + (row.run.parsed.credits ?? 0), 0),
    0,
  );
  let broken = 0;
  let honored = 0;
  for (const group of groups) {
    for (const scenario of group.summary.audit.scenarios) {
      if (!scenario.assert) continue;
      if (scenario.status === 'BROKEN') broken += 1;
      else if (scenario.status === 'HONORED') honored += 1;
    }
  }

  const recordedCount = groups.filter((group) => group.summary.recorded).length;
  const recordedNotice =
    recordedCount > 0
      ? `<div class="recorded-banner" role="status"><strong>Recorded audit: replay of real runs, not a live session.</strong> ${recordedCount} of ${groups.length} audits are recorded copies.</div>`
      : '';
  const readOnly = publicMode
    ? `<div class="read-only-note" role="status">Live checks run on the operator's machine. The runs below are real executions; this deployment only reads them.</div>`
    : '';
  const excluded = index.audits.filter(
    (summary) =>
      !hasLiveRun(summary) &&
      summary.audit.scenarios.some((scenario) => scenario.observe || scenario.assert),
  );
  const exclusionNote =
    excluded.length > 0
      ? `<p class="meta">A provided-capture import validation (${excluded
          .map((summary) => `<code>${escapeHtml(summary.audit.auditId)}</code>`)
          .join(', ')}) is excluded: it duplicates the eligible-60 capture and contains no independent Kane execution.</p>`
      : '';

  const tableRows = groups
    .map((group) => {
      const rows = group.runs.map((row, index) => {
        const audit = group.summary.audit;
        const run = row.run;
        const first = index === 0;
        const star =
          run.artifacts.exitCodeSource === 'provided_capture_user_reported' ? '*' : '';
        return `<tr>
  ${
    first
      ? `<td rowspan="${group.runs.length}"><a href="/audits/${encodeURIComponent(
          audit.auditId,
        )}">${escapeHtml(audit.auditId)}</a><br><span class="meta">${escapeHtml(
          audit.overallStatus,
        )} · ${formatTimestamp(audit.startedAt)}</span></td>
  <td rowspan="${group.runs.length}">${audit.postRepair ? 'Yes' : 'No'}</td>`
      : ''
  }
  <td>${escapeHtml(row.scenario.presetLabel)}<br><span class="meta">${escapeHtml(
    row.scenario.scenarioId,
  )}</span></td>
  <td>${escapeHtml(run.kind)}</td>
  <td><code class="hash">${escapeHtml(sessionId(run))}</code></td>
  <td>${run.artifacts.exitCode ?? '—'}${star}</td>
  <td>${escapeHtml(String(run.parsed.resultCode ?? '—'))} / ${escapeHtml(
    run.parsed.reasonCode ?? '—',
  )}</td>
  <td>${typeof run.parsed.duration === 'number' ? `${run.parsed.duration}s` : '—'}</td>
  <td>${credits(run.parsed.credits)}</td>
  <td><code class="hash">${escapeHtml(run.evidence?.sha256 ?? '—')}</code></td>
  <td>${escapeHtml(runVerdict(run))}</td>
</tr>`;
      });
      return `<tbody class="audit-group">${rows.join('\n')}</tbody>`;
    })
    .join('\n');

  return layout(
    'Runs',
    `<p class="eyebrow">Every Kane run</p>
<h1>Runs</h1>
<p class="lede">Every real Kane run in the audit JSON on disk, newest first, grouped by audit. No rows are invented.</p>
${readOnly}
${recordedNotice}
<p class="run-totals"><strong>${totalRuns}</strong> runs · <strong>${totalCredits.toFixed(
      2,
    )}</strong> credits · <strong>${broken} broken</strong> / <strong>${honored} honored</strong></p>
${exclusionNote}
<div class="table-wrap">
<table class="runs-table">
  <caption class="sr-only">Every real Kane run, grouped by audit</caption>
  <thead><tr><th scope="col">Audit</th><th scope="col">Post-repair</th><th scope="col">Scenario</th><th scope="col">Kind</th><th scope="col">Session</th><th scope="col">Exit</th><th scope="col">Result / reason</th><th scope="col">Duration</th><th scope="col">Credits</th><th scope="col">Evidence SHA-256</th><th scope="col">Verdict</th></tr></thead>
  ${tableRows}
</table>
</div>
<p class="meta">Runs marked <strong>*</strong> are provided real captures; their exit codes are user-reported.</p>`,
    'runs',
    publicMode,
  );
}

function verdictBlock(scenario: ScenarioAudit): string {
  const verdict = scenario.assert?.parsed.verdict;
  if (!verdict) {
    return scenario.status === 'BROKEN'
      ? `<section class="verdict"><h3>Kane's verdict</h3><p>The assert run failed, but no parsed verdict exists in this artifact. Do not infer a bug title or severity.</p></section>`
      : `<section class="verdict"><h3>Kane's verdict</h3><p>No product-bug verdict was produced for this scenario.</p></section>`;
  }

  const signals = verdict.signals
    .map(
      (signal) =>
        `<li><code class="hash">${escapeHtml(signal.step ?? '—')}</code> ${escapeHtml(
          signal.kind ?? 'signal',
        )}: ${escapeHtml(signal.excerpt ?? '')}</li>`,
    )
    .join('');

  return `<section class="verdict" aria-labelledby="verdict-${escapeHtml(scenario.scenarioId)}">
  <h3 id="verdict-${escapeHtml(scenario.scenarioId)}">Kane's verdict</h3>
  <dl class="verdict-grid">
    <div><dt>Bug title</dt><dd>${escapeHtml(verdict.bugTitle ?? '—')}</dd></div>
    <div><dt>Severity</dt><dd>${escapeHtml(verdict.severity ?? '—')}</dd></div>
    <div><dt>Family / category</dt><dd>${escapeHtml(verdict.family ?? '—')} / ${escapeHtml(
      verdict.category ?? '—',
    )}</dd></div>
    <div><dt>Confidence</dt><dd>${typeof verdict.confidence === 'number' ? verdict.confidence : '—'}</dd></div>
    <div><dt>Confirmed</dt><dd>${verdict.confirmed === true ? 'Yes' : verdict.confirmed === false ? 'No' : '—'}</dd></div>
    <div><dt>Status</dt><dd>${escapeHtml(verdict.status ?? '—')}</dd></div>
  </dl>
  <p><strong>Root cause.</strong> ${escapeHtml(verdict.rootCause ?? '—')}</p>
  <p><strong>Suggestion.</strong> ${escapeHtml(verdict.suggestion ?? '—')}</p>
  ${
    signals
      ? `<p><strong>Signals</strong></p><ul class="signals">${signals}</ul>`
      : '<p class="meta">No signals were recorded in the verdict.</p>'
  }
</section>`;
}

function runCard(run: RunAudit | null, label: string): string {
  if (!run) {
    return `<article class="run-card">
  <div class="run-head"><h3>${escapeHtml(label)}</h3><span class="status status--inconclusive"><span class="status-mark" aria-hidden="true"></span>NOT RUN</span></div>
  <p class="meta">No ${escapeHtml(label.toLowerCase())} artifact exists in this audit.</p>
</article>`;
  }

  const command = evidenceCommand(run);
  const sourceNote =
    run.source === 'provided_capture'
      ? 'Provided real capture; exit code is user-reported because the NDJSON does not record it.'
      : 'Live run; exit code captured from the process.';

  return `<article class="run-card">
  <div class="run-head">
    <h3>${escapeHtml(label)}</h3>
    <span class="meta">${escapeHtml(run.parsed.runEndStatus)} · exit ${exitCode(run)}</span>
  </div>
  <dl class="run-meta">
    <dt>Source</dt><dd>${escapeHtml(run.source)} — ${escapeHtml(sourceNote)}</dd>
    <dt>Session</dt><dd><code class="hash">${escapeHtml(sessionId(run))}</code></dd>
    <dt>Exit code</dt><dd>${exitCode(run)} (${escapeHtml(run.artifacts.exitCodeSource)})</dd>
    <dt>Result / reason</dt><dd>${escapeHtml(formatResult(run))}</dd>
    <dt>Duration</dt><dd>${typeof run.parsed.duration === 'number' ? `${run.parsed.duration}s` : '—'}</dd>
    <dt>Credits</dt><dd>${credits(run.parsed.credits)}</dd>
    <dt>Objective SHA-256</dt><dd class="hash">${escapeHtml(run.objective.sha256)}</dd>
    <dt>Evidence SHA-256</dt><dd class="hash">${escapeHtml(run.evidence?.sha256 ?? 'No evidence pack recorded')}</dd>
  </dl>
  ${
    command
      ? `<div class="evidence"><p>Evidence pack command</p><code>${escapeHtml(command)}</code></div>`
      : run.evidence?.sha256
        ? `<div class="evidence"><p>Recorded evidence SHA-256; the .evidence file is not included in this recorded copy.</p><code class="hash">${escapeHtml(run.evidence.sha256)}</code></div>`
        : '<p class="meta">No evidence pack is recorded, so no serve command is shown.</p>'
  }
</article>`;
}

function scenarioBlock(scenario: ScenarioAudit, contract: PromiseContract): string {
  const expected =
    scenario.oracle.expectedShippingCents ??
    expectedShippingCents(contract, scenario.expectedSubtotalCents);
  const observed = scenario.oracle.observedShippingCents;
  const promisedText =
    expected === 0
      ? `Free standard shipping at an after-discount merchandise subtotal of ${formatCents(
          contract.threshold.cents,
        )} or more.`
      : `Standard shipping below the ${formatCents(
          contract.threshold.cents,
        )} after-discount merchandise threshold.`;
  const assertText = scenario.assert
    ? `${scenario.assert.parsed.runEndStatus} (exit ${exitCode(scenario.assert)})`
    : 'not run';

  return `<article class="scenario" aria-labelledby="scenario-${escapeHtml(scenario.scenarioId)}">
  <header class="scenario-head">
    <div>
      <h2 id="scenario-${escapeHtml(scenario.scenarioId)}">${escapeHtml(scenario.presetLabel)}</h2>
      <p class="meta">${escapeHtml(scenario.scenarioId)} · after-discount subtotal ${formatCents(
        scenario.expectedSubtotalCents,
      )}</p>
    </div>
    ${statusChip(scenario.status)}
  </header>

  <div class="lanes">
    <section class="lane lane--promised" aria-label="Promised shipping">
      <h3>Promised</h3>
      <p class="lane-amount">${formatCents(expected)}</p>
      <p>${escapeHtml(promisedText)}</p>
      <dl>
        <dt>Expected cents</dt><dd>${expected}</dd>
        <dt>Basis</dt><dd>${escapeHtml(humanize(contract.thresholdBasis))}</dd>
        <dt>Destination</dt><dd>${escapeHtml(contract.destinationCountry)} · standard</dd>
      </dl>
    </section>
    <div class="lane-rule" aria-hidden="true"></div>
    <section class="lane lane--observed lane--${scenario.status.toLowerCase().replaceAll('_', '-')}" aria-label="Observed shipping">
      <h3>Observed</h3>
      <p class="lane-amount">${observed === null ? 'No value' : formatCents(observed)}</p>
      <p>${observed === null ? 'No parsed shipping amount is present in this artifact.' : 'The amount Kane read from the rendered shipping quote.'}</p>
      <dl>
        <dt>Observed cents</dt><dd>${observed ?? '—'}</dd>
        <dt>Assert</dt><dd>${escapeHtml(assertText)}</dd>
        <dt>Status</dt><dd>${escapeHtml(scenario.status)}</dd>
      </dl>
    </section>
  </div>

  ${verdictBlock(scenario)}

  <div class="runs">
    ${runCard(scenario.observe, 'Observe')}
    ${runCard(scenario.assert, 'Assert')}
  </div>

  <div class="scenario-details">
    ${
      scenario.reasons.length > 0
        ? `<p class="meta"><strong>Classification reasons:</strong> ${scenario.reasons
            .map((reason) => escapeHtml(reason))
            .join('; ')}</p>`
        : ''
    }
    ${
      scenario.notes.length > 0
        ? `<p class="meta"><strong>Notes:</strong> ${scenario.notes
            .map((note) => escapeHtml(note))
            .join('; ')}</p>`
        : ''
    }
    <details>
      <summary>Show the exact objective text</summary>
      <p class="meta">Observe SHA-256 <span class="hash">${escapeHtml(
        scenario.objectives.observe.sha256,
      )}</span></p>
      <pre class="diff">${escapeHtml(scenario.objectives.observe.text)}</pre>
      <p class="meta">Assert SHA-256 <span class="hash">${escapeHtml(
        scenario.objectives.assert.sha256,
      )}</span></p>
      <pre class="diff">${escapeHtml(scenario.objectives.assert.text)}</pre>
    </details>
  </div>
</article>`;
}

export function renderAuditDetail(
  summary: AuditSummary,
  contract: PromiseContract,
  publicMode = false,
): string {
  const audit = summary.audit;
  const banner = recordedBanner(summary);
  const postRepair = audit.postRepair
    ? audit.answersAuditId
      ? `<div class="warning" role="status">Post-repair audit. It answers <a href="/repair/${encodeURIComponent(
          audit.answersAuditId,
        )}">${escapeHtml(audit.answersAuditId)}</a>. Objective hashes match: <strong>${
          audit.objectiveHashesMatch ? 'yes' : 'no'
        }</strong>. <a href="/repair/${encodeURIComponent(
          audit.answersAuditId,
        )}">Open the closed loop</a>.</div>`
      : `<div class="warning" role="status">Post-repair audit, but no pre-repair audit id is recorded. Objective hashes match: <strong>${audit.objectiveHashesMatch ? 'yes' : 'no'}</strong>.</div>`
    : '';

  return layout(
    'Journey X-Ray',
    `<p class="eyebrow">Journey X-Ray</p>
<div class="hero">
  <div>
    <h1>What was promised. What the checkout did.</h1>
    <p class="lede">Audit <code>${escapeHtml(audit.auditId)}</code> against contract <code>${escapeHtml(
      audit.contract.id,
    )}</code>.</p>
  </div>
  <div>${statusChip(audit.overallStatus)}</div>
</div>

${banner}
<div class="audit-banner">
  <div>
    <p class="meta"><strong>Started</strong> ${formatTimestamp(audit.startedAt)}</p>
    <p class="meta"><strong>Finished</strong> ${formatTimestamp(audit.finishedAt)}</p>
    <p class="meta"><strong>Contract SHA-256</strong><br><span class="hash">${escapeHtml(
      audit.contract.specSha256,
    )}</span></p>
  </div>
  <div class="meta">
    <p>${audit.totals.runs} runs · ${credits(audit.totals.credits)} credits</p>
    <p><a class="button button--secondary" href="/audits/${encodeURIComponent(
      audit.auditId,
    )}/receipt">Promise Receipt</a></p>
    ${
      !audit.postRepair
        ? `<p><a class="button button--secondary" href="/repair/${encodeURIComponent(
            audit.auditId,
          )}">Closed loop</a></p>`
        : ''
    }
  </div>
</div>
${auditContractWarning(summary, contract)}
${postRepair}

${audit.scenarios.map((scenario) => scenarioBlock(scenario, contract)).join('\n')}`,
    'audit',
  );
}

function renderDiff(diff: string): string {
  const lines = diff.split(/\r?\n/);
  return `<pre class="diff" aria-label="Actual git diff of src/lib/shipping.ts">${lines
    .map((line) => {
      let className = 'diff-line';
      if (
        line.startsWith('diff ') ||
        line.startsWith('index ') ||
        line.startsWith('---') ||
        line.startsWith('+++') ||
        line.startsWith('@@')
      ) {
        className += ' diff-meta';
      } else if (line.startsWith('+')) {
        className += ' diff-add';
      } else if (line.startsWith('-')) {
        className += ' diff-del';
      }
      return `<span class="${className}">${escapeHtml(line) || '&nbsp;'}</span>`;
    })
    .join('\n')}</pre>`;
}

function brokenScenarios(pre: AuditSummary): string {
  const broken = pre.audit.scenarios.filter((scenario) => scenario.status === 'BROKEN');
  if (broken.length === 0) {
    return `<div class="empty"><h3>No broken scenario</h3><p>This pre-repair audit has no BROKEN scenario to repair.</p></div>`;
  }
  return broken
    .map(
      (scenario) => `<article class="scenario">
  <header class="scenario-head">
    <div><h3>${escapeHtml(scenario.presetLabel)}</h3><p class="meta">${escapeHtml(
      scenario.scenarioId,
    )}</p></div>
    ${statusChip(scenario.status)}
  </header>
  <div class="lane lane--promised" style="border-top:0">
    <p class="meta">Promised ${formatCents(scenario.oracle.expectedShippingCents)} · Observed ${formatCents(
      scenario.oracle.observedShippingCents,
    )}</p>
    ${verdictBlock(scenario)}
  </div>
</article>`,
    )
    .join('\n');
}

function hashComparisonTable(post: AuditSummary): string {
  const comparisons = post.audit.objectiveHashComparisons;
  if (!comparisons || comparisons.length === 0) {
    return `<p class="meta">No objective-hash comparison table was recorded in this audit.</p>`;
  }
  const shortHash = (hash: string): string =>
    `<code class="hash" title="${escapeHtml(hash)}">${escapeHtml(hash.slice(0, 12))}</code>`;
  const rows = comparisons
    .map(
      (comparison) => `<tr>
  <td>${escapeHtml(comparison.scenarioId)}<br><span class="meta">${escapeHtml(
    comparison.kind,
  )} · ${comparison.match ? 'MATCH' : 'MISMATCH'}</span></td>
  <td>${shortHash(comparison.preRepairSha256)}</td>
  <td>${shortHash(comparison.postRepairSha256)}</td>
</tr>`,
    )
    .join('\n');
  const matches = comparisons.filter((comparison) => comparison.match).length;
  return `<p><strong>${matches}/${comparisons.length}</strong> objective hashes match.</p>
<div class="table-wrap">
<table class="hash-compare">
  <caption class="sr-only">Pre-repair and post-repair objective hashes</caption>
  <thead><tr><th scope="col">Scenario / run</th><th scope="col">Pre-repair SHA-256</th><th scope="col">Post-repair SHA-256</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
</div>
<p class="meta">First 12 hex characters shown; the complete 64-character values are in the audit artifact (<code>audit.json</code>). Hover a hash for its full value.</p>`;
}

export function renderRepair(input: {
  pre: AuditSummary;
  post: AuditSummary | null;
  diff: DiffResult;
  publicMode?: boolean;
}): string {
  const { pre, post, diff, publicMode = false } = input;
  const banners = `${recordedBanner(pre)}${post ? recordedBanner(post) : ''}`;
  const diffBlock = diff.ok
    ? diff.diff.trim().length > 0
      ? renderDiff(diff.diff)
      : `<div class="empty"><h3>No diff</h3><p>Git returned no diff between <code>${escapeHtml(
          PRE_FIX_SHA,
        )}</code> and HEAD for <code>src/lib/shipping.ts</code>. The bug may already be restored, or HEAD is not the repaired tree.</p></div>`
    : `<div class="warning" role="status">Could not read the diff from git: <code>${escapeHtml(
        diff.error,
      )}</code>. The browser does not retype the patch.</div>`;

  const postBlock = post
    ? `<div class="repair-col">
  <h2>Unchanged rerun</h2>
  <p>${statusChip(post.audit.overallStatus)}</p>
  <p><a href="/audits/${encodeURIComponent(post.audit.auditId)}">${escapeHtml(
      post.audit.auditId,
    )}</a></p>
  <p class="meta">Answers ${escapeHtml(pre.audit.auditId)} · ${post.audit.totals.runs} runs · ${credits(
      post.audit.totals.credits,
    )} credits</p>
  ${hashComparisonTable(post)}
  <p><a class="button button--secondary" href="/audits/${encodeURIComponent(
    post.audit.auditId,
  )}/receipt">Promise Receipt</a></p>
</div>`
    : `<div class="repair-col">
  <h2>Unchanged rerun</h2>
  <div class="empty">
    <h3>No post-repair audit yet</h3>
    <p>No audit in <code>.data/audits</code> declares <code>postRepair: true</code> and answers this pre-repair audit. Nothing is linked because there is nothing to link.</p>
  </div>
</div>`;

  return layout(
    'Closed loop',
    `<p class="eyebrow">Closed loop</p>
<h1>What failed, what changed, what reran.</h1>
<p class="lede">Pre-repair audit <a href="/audits/${encodeURIComponent(
      pre.audit.auditId,
    )}">${escapeHtml(pre.audit.auditId)}</a>. The diff is read from git; the objective hashes are read from the audit artifacts.</p>
${banners}

<div class="repair-grid">
  <section class="repair-col" aria-labelledby="failed-heading">
    <h2 id="failed-heading">What failed</h2>
    <p>${statusChip(pre.audit.overallStatus)}</p>
    <p class="meta">Contract ${escapeHtml(pre.audit.contract.id)} · ${pre.audit.totals.runs} runs</p>
    ${brokenScenarios(pre)}
  </section>

  <section class="repair-col" aria-labelledby="diff-heading">
    <h2 id="diff-heading">The actual diff</h2>
    <p class="meta"><code>git diff ${escapeHtml(
      PRE_FIX_SHA,
    )} HEAD -- src/lib/shipping.ts</code></p>
    ${diffBlock}
  </section>

  ${postBlock}
</div>`,
    'repair',
    publicMode,
  );
}

export function renderNotFound(title: string, message: string, publicMode = false): string {
  return layout(
    title,
    `<p class="eyebrow">Not found</p>
<h1>${escapeHtml(title)}</h1>
<div class="empty"><p>${escapeHtml(message)}</p></div>
<a class="button" href="/">Back to campaign</a>`,
    'campaign',
    publicMode,
  );
}

export function renderServerError(message: string, publicMode = false): string {
  return layout(
    'Something went wrong',
    `<p class="eyebrow">Server error</p>
<h1>The app could not render this page.</h1>
<div class="warning" role="alert"><code>${escapeHtml(message)}</code></div>
<p class="meta">The app reads real files under <code>.data/audits</code> and <code>docs/</code>. It does not substitute a mock.</p>
<a class="button" href="/">Back to campaign</a>`,
    'campaign',
  );
}
