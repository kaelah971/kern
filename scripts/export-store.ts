/**
 * Export the demo storefront to static HTML under site/store/.
 *
 * The page bodies come from the store's own renderHome/renderCheckout
 * templates and the cart totals come from CartStore + getStandardShippingCents,
 * not from labels or query parameters. The "What Kern saw" values come from
 * the committed recorded audits.
 *
 * The current pages are written to site/store/. The pre-repair pages are
 * written to site/store/before/ by running this script with --before while the
 * audited shipping.ts revision is swapped into place.
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { CartStore } from '../src/lib/cart.ts';
import { PRESET_CARTS } from '../src/lib/catalog.ts';
import { renderCheckout, renderHome } from '../src/lib/render.ts';
import { getStandardShippingCents } from '../src/lib/shipping.ts';
import { formatUsd } from '../src/lib/money.ts';
import {
  loadAudits,
  recordedAuditRoot,
  type AuditSummary,
} from '../src/app/audits.ts';

export type StoreVariant = 'current' | 'before';

export type StorePage = {
  path: string;
  file: string;
  shippingCents: number;
  promisedCents: number;
  observedCents: number;
  verdict: string;
  auditId: string;
};

export type StoreExportResult = {
  siteDir: string;
  pages: StorePage[];
  auditId: string;
  indexFile: string | null;
  variant: StoreVariant;
};

export type StoreExportOptions = {
  siteDir?: string;
  repoRoot?: string;
  variant?: StoreVariant;
};

function findPostRepairAudit(root: string): AuditSummary {
  const index = loadAudits(root);
  const post = index.audits.find((summary) => summary.audit.postRepair === true);
  if (!post) {
    throw new Error(`No post-repair recorded audit with postRepair:true under ${root}`);
  }
  return post;
}

function findPreRepairAudit(root: string, post: AuditSummary): AuditSummary {
  const index = loadAudits(root);
  const pre =
    index.audits.find((summary) => summary.audit.auditId === post.audit.answersAuditId) ??
    index.audits.find(
      (summary) =>
        summary.audit.postRepair !== true && summary.audit.overallStatus === 'BROKEN',
    );
  if (!pre) {
    throw new Error(`No pre-repair recorded audit answers ${post.audit.auditId}`);
  }
  return pre;
}

/**
 * Render and write the three fixed cart pages. The current variant also writes
 * the store index. Returns the exact quotes that were exported so tests can
 * assert them.
 */
export function exportStore(options: StoreExportOptions = {}): StoreExportResult {
  const repoRoot = options.repoRoot ?? process.cwd();
  const siteDir = options.siteDir ?? join(repoRoot, 'site');
  const storeDir = join(siteDir, 'store');
  const variant = options.variant ?? 'current';
  const recordedRoot = recordedAuditRoot(repoRoot);
  const post = findPostRepairAudit(recordedRoot);
  const audit = variant === 'before' ? findPreRepairAudit(recordedRoot, post) : post;
  const outDir = variant === 'before' ? join(storeDir, 'before') : storeDir;

  if (variant === 'before') {
    rmSync(outDir, { recursive: true, force: true });
    mkdirSync(outDir, { recursive: true });
  } else {
    rmSync(storeDir, { recursive: true, force: true });
    mkdirSync(outDir, { recursive: true });
  }

  let indexFile: string | null = null;
  if (variant === 'current') {
    const indexHtml = renderHome(0, { staticExport: true });
    indexFile = join(outDir, 'index.html');
    writeFileSync(indexFile, indexHtml, 'utf8');
  }

  const pages: StorePage[] = [];

  for (const preset of Object.values(PRESET_CARTS)) {
    const scenario = audit.audit.scenarios.find((item) => item.scenarioId === preset.id);
    if (!scenario) {
      throw new Error(`Recorded audit ${audit.audit.auditId} has no ${preset.id} scenario`);
    }
    const observedCents = scenario.oracle.observedShippingCents;
    if (typeof observedCents !== 'number') {
      throw new Error(
        `Recorded audit ${audit.audit.auditId} has no observed shipping for ${preset.id}`,
      );
    }

    const carts = new CartStore();
    const session = carts.create();
    carts.setPreset(session, preset.id);
    const lines = carts.lines(session);
    const subtotalCents = carts.merchandiseSubtotalCents(session);
    const shippingCents = getStandardShippingCents(subtotalCents);
    const totalCents = subtotalCents + shippingCents;
    const cartCount = carts.itemCount(session);

    if (shippingCents !== observedCents) {
      throw new Error(
        `Store quote for ${preset.id} is ${formatUsd(
          shippingCents,
        )}, but the recorded audit observed ${formatUsd(
          observedCents,
        )}; refusing to publish a mismatched What Kern saw strip`,
      );
    }

    const promisedCents = scenario.oracle.expectedShippingCents;
    const auditUrl = `/audits/${encodeURIComponent(
      audit.audit.auditId,
    )}#scenario-${encodeURIComponent(preset.id)}`;
    const html = renderCheckout(
      {
        lines,
        subtotalCents,
        shippingCents,
        totalCents,
        cartCount,
      },
      {
        staticExport: true,
        kernSaw: {
          promisedCents,
          observedCents,
          verdict: scenario.status,
          auditId: audit.audit.auditId,
          auditUrl,
          auditLabel:
            variant === 'before'
              ? 'Recorded pre-repair audit'
              : 'Recorded after-repair audit',
        },
        revision: {
          active: variant === 'before' ? 'before' : 'current',
          currentHref: `/store/${preset.id}`,
          beforeHref: `/store/before/${preset.id}`,
        },
      },
    );

    const file = join(outDir, `${preset.id}.html`);
    writeFileSync(file, html, 'utf8');
    pages.push({
      path: variant === 'before' ? `/store/before/${preset.id}` : `/store/${preset.id}`,
      file,
      shippingCents,
      promisedCents,
      observedCents,
      verdict: scenario.status,
      auditId: audit.audit.auditId,
    });
  }

  return { siteDir, pages, auditId: audit.audit.auditId, indexFile, variant };
}

const isMain =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  try {
    const variant = process.argv.includes('--before') ? 'before' : 'current';
    const result = exportStore({ variant });
    if (result.indexFile) console.log(`exported storefront index -> ${result.indexFile}`);
    for (const page of result.pages) {
      console.log(
        `  ${page.path} -> ${page.file} (shipping ${formatUsd(page.shippingCents)}, ${
          page.verdict
        }, recorded ${page.auditId})`,
      );
    }
  } catch (error) {
    console.error(
      `STORE EXPORT FAILED: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode = 1;
  }
}
