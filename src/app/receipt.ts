import type { AuditRecord, AuditStatus, RunAudit } from '../lib/audit.ts';
import type { PromiseContract } from '../lib/contract.ts';
import type { PolicyInfo } from './data.ts';
import { formatCents, formatTimestamp } from './data.ts';
import { escapeHtml, layout, sessionId, statusChip } from './render.ts';
import { isRecorded, type RecordedAudit } from './audits.ts';

export function receiptStatusStatement(status: AuditStatus): string {
  switch (status) {
    case 'HONORED':
      return 'Verified for the tested conditions at the recorded time.';
    case 'BROKEN':
      return 'BROKEN. The observed charge did not match the frozen promise.';
    case 'INCONCLUSIVE':
      return 'INCONCLUSIVE. The evidence was not sufficient to verify or break the promise.';
    case 'INFRA_ERROR':
      return 'INFRA_ERROR. The audit did not complete.';
  }
}

function exitText(run: RunAudit | null): string {
  if (!run) return '—';
  return typeof run.artifacts.exitCode === 'number' ? String(run.artifacts.exitCode) : '—';
}

function resultText(run: RunAudit | null): string {
  if (!run) return '—';
  return `${run.parsed.resultCode ?? '—'} / ${run.parsed.reasonCode ?? '—'}`;
}

function scenarioRows(audit: AuditRecord): string {
  return audit.scenarios
    .map(
      (scenario) => `<tr>
  <td>${escapeHtml(scenario.presetLabel)}</td>
  <td class="num">${formatCents(scenario.oracle.expectedShippingCents)}</td>
  <td class="num">${formatCents(scenario.oracle.observedShippingCents)}</td>
  <td>${escapeHtml(
    scenario.assert
      ? `${scenario.assert.parsed.runEndStatus} (exit ${exitText(scenario.assert)})`
      : 'not run',
  )}</td>
  <td>${statusChip(scenario.status)}</td>
</tr>`,
    )
    .join('\n');
}

function runRows(audit: AuditRecord): string {
  const rows: string[] = [];
  for (const scenario of audit.scenarios) {
    for (const run of [scenario.observe, scenario.assert]) {
      if (!run) {
        rows.push(`<tr><td>${escapeHtml(scenario.presetLabel)}</td><td>not run</td><td>—</td><td>—</td><td>—</td><td>—</td></tr>`);
        continue;
      }
      rows.push(`<tr>
  <td>${escapeHtml(scenario.presetLabel)}</td>
  <td>${escapeHtml(run.kind)}</td>
  <td><code class="hash">${escapeHtml(sessionId(run))}</code></td>
  <td>${exitText(run)}</td>
  <td>${escapeHtml(resultText(run))}</td>
  <td><code class="hash">${escapeHtml(run.evidence?.sha256 ?? 'No evidence pack')}</code></td>
</tr>`);
    }
  }
  return rows.join('\n');
}

export function renderReceiptBody(
  audit: AuditRecord,
  contract: PromiseContract,
  policy: PolicyInfo | null,
): string {
  const statement = receiptStatusStatement(audit.overallStatus);
  const hashWarning =
    audit.contract.specSha256 === contract.specSha256
      ? ''
      : `<div class="warning" role="status">The current contract hash differs from the hash recorded by this audit. This receipt speaks to the audit's recorded contract: <code>${escapeHtml(
          audit.contract.specSha256,
        )}</code>.</div>`;

  const policyBlock = policy
    ? `<p><code>${escapeHtml(policy.path)}</code> — ${escapeHtml(contract.baselineSource)}</p>
${
  policy.baselineRule
    ? `<p class="policy-rule">${escapeHtml(policy.baselineRule)}</p>`
    : '<p class="meta">The policy file exists but no $9.00 rule was found.</p>'
}`
    : `<div class="warning" role="status">Policy source not found at <code>docs/store-policy.md</code>. The $9.00 expectation is still recorded in the frozen contract, but its separate policy source is missing on disk.</div>`;

  const recorded = isRecorded(audit);
  const originalAuditSha256 = (audit as RecordedAudit).originalAuditSha256;
  const recordedBanner = recorded
    ? `<div class="recorded-banner" role="status"><strong>Recorded audit: replay of real runs, not a live session.</strong>${originalAuditSha256 ? `<br><span class="meta">Original audit SHA-256: <code class="hash">${escapeHtml(originalAuditSha256)}</code></span>` : ''}</div>`
    : '';
  const hasRecordedEvidence = audit.scenarios.some((scenario) =>
    [scenario.observe, scenario.assert].some(
      (run) => Boolean(run?.evidence?.sha256) && !run?.evidence?.sourcePath && !run?.evidence?.copiedPath,
    ),
  );

  const hasUserReportedExitCodes = audit.scenarios.some((scenario) =>
    [scenario.observe, scenario.assert].some(
      (run) => run?.artifacts.exitCodeSource === 'provided_capture_user_reported',
    ),
  );

  const postRepair = audit.postRepair
    ? audit.answersAuditId
      ? `<p><strong>Post-repair audit.</strong> It answers pre-repair audit <a href="/repair/${encodeURIComponent(
          audit.answersAuditId,
        )}">${escapeHtml(audit.answersAuditId)}</a>. Objective hashes match: <strong>${
          audit.objectiveHashesMatch ? 'yes' : 'no'
        }</strong>.</p>`
      : `<p><strong>Post-repair audit.</strong> No pre-repair audit id is recorded. Objective hashes match: <strong>${audit.objectiveHashesMatch ? 'yes' : 'no'}</strong>.</p>`
    : '';

  const body = `<article class="receipt">
  <header class="receipt-head">
    <p class="eyebrow">Promise Receipt</p>
    <h1>${escapeHtml(audit.auditId)}</h1>
    <p class="receipt-statement">${escapeHtml(statement)}</p>
    <p class="receipt-status">${statusChip(audit.overallStatus)}</p>
  </header>

  ${recordedBanner}
  ${hashWarning}

  <dl class="receipt-grid">
    <div><dt>Contract</dt><dd>${escapeHtml(audit.contract.id)} · v${audit.contract.version}</dd></div>
    <div><dt>Contract spec SHA-256</dt><dd class="hash">${escapeHtml(
      audit.contract.specSha256,
    )}</dd></div>
    <div><dt>Audit started</dt><dd>${formatTimestamp(audit.startedAt)}</dd></div>
    <div><dt>Audit finished</dt><dd>${formatTimestamp(audit.finishedAt)}</dd></div>
    <div><dt>Overall status</dt><dd>${escapeHtml(audit.overallStatus)}</dd></div>
    <div><dt>Runs / credits</dt><dd>${audit.totals.runs} / ${audit.totals.credits.toFixed(2)}</dd></div>
  </dl>

  ${postRepair}

  <section aria-labelledby="receipt-ad">
    <h2 id="receipt-ad">Ad snapshot</h2>
    <p class="quote">${escapeHtml(contract.adTextSnapshot)}</p>
    <p class="meta">The ad wording is preserved as recorded. The merchant's interpretation is a separate field, not a rewrite of this text.</p>
  </section>

  <section aria-labelledby="receipt-policy">
    <h2 id="receipt-policy">Policy reference</h2>
    ${policyBlock}
  </section>

  <section aria-labelledby="receipt-scenarios">
    <h2 id="receipt-scenarios">Scenarios</h2>
    <div class="table-wrap">
      <table>
        <caption class="sr-only">Promised and observed shipping by scenario</caption>
        <thead><tr><th scope="col">Scenario</th><th scope="col" class="num">Promised</th><th scope="col" class="num">Observed</th><th scope="col">Assert</th><th scope="col">Status</th></tr></thead>
        <tbody>${scenarioRows(audit)}</tbody>
      </table>
    </div>
  </section>

  <section aria-labelledby="receipt-runs">
    <h2 id="receipt-runs">Runs</h2>
    <div class="table-wrap">
      <table>
        <caption class="sr-only">Per-run Kane results and evidence hashes</caption>
        <thead><tr><th scope="col">Scenario</th><th scope="col">Run</th><th scope="col">Session</th><th scope="col">Exit</th><th scope="col">Result / reason</th><th scope="col">Evidence SHA-256</th></tr></thead>
        <tbody>${runRows(audit)}</tbody>
      </table>
    </div>
    ${
      hasUserReportedExitCodes
        ? '<p class="meta">Some runs above are provided real captures; their exit codes are user-reported because the NDJSON does not record process exit codes.</p>'
        : ''
    }
    ${
      hasRecordedEvidence
        ? '<p class="meta">The recorded copy keeps the evidence SHA-256 values; the .evidence files themselves are not included.</p>'
        : ''
    }
  </section>

  <section aria-labelledby="receipt-limits">
    <h2 id="receipt-limits">What this does not prove</h2>
    <ul class="not-proven">
      <li>That every promotion, shipping method, market, product or customer segment behaves this way.</li>
      <li>That the store will behave this way later. This is a recorded observation at a recorded time, on the demo storefront.</li>
      <li>That the evidence is a cryptographic signature or a certification. It is a hash-linked evidence record.</li>
      <li>That a real order was placed or a payment was taken. The store stops at the shipping quote.</li>
      ${
        audit.overallStatus === 'BROKEN'
          ? '<li>This receipt records a broken promise. It does not verify the store.</li>'
          : ''
      }
    </ul>
  </section>

  <footer>
    Hash-linked evidence record. Not a signature, not a certificate. The evidence packs are referenced by SHA-256; the raw files stay in the audit directory.
  </footer>
</article>`;

  if (
    audit.overallStatus === 'BROKEN' &&
    /verified for the tested conditions/i.test(body)
  ) {
    throw new Error('Refusing to describe a BROKEN audit as verified');
  }

  return body;
}

export function renderReceiptPage(
  audit: AuditRecord,
  contract: PromiseContract,
  policy: PolicyInfo | null,
  publicMode = false,
): string {
  return layout(
    'Promise Receipt',
    renderReceiptBody(audit, contract, policy),
    'audit',
    publicMode,
  );
}
