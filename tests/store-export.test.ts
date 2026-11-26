import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { exportStore } from '../scripts/export-store.ts';

test('the static store export has exactly three quotes: 0, 0 and 900 cents', () => {
  const siteDir = mkdtempSync(join(tmpdir(), 'kern-store-export-'));
  try {
    const result = exportStore({ siteDir, repoRoot: process.cwd() });
    assert.equal(result.pages.length, 3);
    assert.deepEqual(
      result.pages.map((page) => page.shippingCents),
      [0, 0, 900],
    );

    const index = readFileSync(join(siteDir, 'store', 'index.html'), 'utf8');
    const checkout = result.pages.map((page) => readFileSync(page.file, 'utf8'));
    const all = [index, ...checkout].join('\n');

    const quoteMatches = all.match(/data-testid="shipping-quote"/g) ?? [];
    assert.equal(quoteMatches.length, 3);
    assert.deepEqual(
      checkout.map((html) => {
        const match = /data-testid="shipping-quote" data-shipping-cents="(\d+)"/.exec(html);
        assert.ok(match, 'each checkout export must carry its real quote');
        return Number(match[1]);
      }),
      [0, 0, 900],
    );

    for (const html of [index, ...checkout]) {
      assert.match(
        html,
        /Demo storefront\. Not a real shop\. This is the fixture Kern checks\./,
      );
      assert.doesNotMatch(html, /<form/);
      assert.doesNotMatch(html, /href="\/cart"/);
    }

    for (const html of checkout) {
      assert.match(html, /What Kern saw/);
      assert.match(html, /Recorded after-repair audit/);
      assert.match(html, /href="\/audits\/2026-11-23T12-35-29-692Z-48b993#scenario-/);
    }

    assert.match(index, /href="\/store\/eligible-60"/);
    assert.match(index, /href="\/store\/boundary-50"/);
    assert.match(index, /href="\/store\/control-35"/);
    assert.match(index, /Kern Canvas Tote/);
  } finally {
    rmSync(siteDir, { recursive: true, force: true });
  }
});
