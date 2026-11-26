/**
 * Export the demo storefront to static HTML under site/store/.
 *
 * The page bodies come from the store's own renderHome/renderCheckout
 * templates and the cart totals come from CartStore + getStandardShippingCents,
 * not from labels or query parameters. The "What Kern saw" values come from
 * the committed recorded audits.
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
  indexFile: string;
};

export type StoreExportOptions = {
  siteDir?: string;
  repoRoot?: string;
};

function findPostRepairAudit(root: string): AuditSummary {
  const index = loadAudits(root);
  const post = index.audits.find((summary) => summary.audit.postRepair === true);
  if (!post) {
    throw new Error(`No post-repair recorded audit with postRepair:true under ${root}`);
  }
  return post;
}

/**
 * Render and write the three fixed cart pages plus the store index.
 * Returns the exact quotes that were exported so tests can assert them.
 */
export function exportStore(options: StoreExportOptions = {}): StoreExportResult {
  const repoRoot = options.repoRoot ?? process.cwd();
  const siteDir = options.siteDir ?? join(repoRoot, 'site');
  const storeDir = join(siteDir, 'store');
  const recordedRoot = recordedAuditRoot(repoRoot);
  const post = findPostRepairAudit(recordedRoot);

  rmSync(storeDir, { recursive: true, force: true });
  mkdirSync(storeDir, { recursive: true });

  const indexHtml = renderHome(0, { staticExport: true });
  const indexFile = join(storeDir, 'index.html');
  writeFileSync(indexFile, indexHtml, 'utf8');

  const pages: StorePage[] = [];

  for (const preset of Object.values(PRESET_CARTS)) {
    const scenario = post.audit.scenarios.find((item) => item.scenarioId === preset.id);
    if (!scenario) {
      throw new Error(`Recorded audit ${post.audit.auditId} has no ${preset.id} scenario`);
    }
    const observedCents = scenario.oracle.observedShippingCents;
    if (typeof observedCents !== 'number') {
      throw new Error(`Recorded audit ${post.audit.auditId} has no observed shipping for ${preset.id}`);
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
        `Current store quote for ${preset.id} is ${formatUsd(
          shippingCents,
        )}, but the recorded audit observed ${formatUsd(
          observedCents,
        )}; refusing to publish a mismatched What Kern saw strip`,
      );
    }

    const promisedCents = scenario.oracle.expectedShippingCents;
    const auditUrl = `/audits/${encodeURIComponent(
      post.audit.auditId,
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
          auditId: post.audit.auditId,
          auditUrl,
          auditLabel: 'Recorded after-repair audit',
        },
      },
    );

    const file = join(storeDir, `${preset.id}.html`);
    writeFileSync(file, html, 'utf8');
    pages.push({
      path: `/store/${preset.id}`,
      file,
      shippingCents,
      promisedCents,
      observedCents,
      verdict: scenario.status,
      auditId: post.audit.auditId,
    });
  }

  return { siteDir, pages, auditId: post.audit.auditId, indexFile };
}

const isMain =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  try {
    const result = exportStore();
    console.log(`exported storefront index -> ${result.indexFile}`);
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
