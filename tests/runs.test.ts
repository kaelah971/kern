import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { loadAudits } from '../src/app/audits.ts';
import { loadContract } from '../src/lib/contract.ts';
import { readPolicy } from '../src/app/data.ts';
import { renderCampaign, renderRunsList } from '../src/app/render.ts';

const recordedRoot = join(process.cwd(), 'recorded');
const index = loadAudits(recordedRoot);
const contract = loadContract();
const policy = readPolicy(process.cwd());

test('the /runs page shows the 12 recorded runs, totals and recorded banner', () => {
  const html = renderRunsList(index, true);
  assert.match(html, /<strong>12<\/strong> runs/);
  assert.match(html, /<strong>259\.14<\/strong> credits/);
  assert.match(html, /<strong>2 broken<\/strong> \/ <strong>4 honored<\/strong>/);
  assert.match(html, /Recorded audit: replay of real runs, not a live session\./);
  assert.match(
    html,
    /Live checks run on the operator's machine\. The runs below are real executions; this deployment only reads them\./,
  );
  assert.match(html, /2026-11-22T00-53-05-669Z-f5230a/);
  assert.match(html, /2026-11-23T12-35-29-692Z-48b993/);
  assert.match(html, /eligible-60/);
  assert.match(html, /boundary-50/);
  assert.match(html, /control-35/);
  assert.match(html, /observe/);
  assert.match(html, /assert/);
  assert.match(html, /href="\/runs"/);
});

test('the read-only line is public-only; the local page keeps the runs', () => {
  const local = renderRunsList(index, false);
  assert.doesNotMatch(local, /Live checks run on the operator's machine/);
  assert.match(local, /<strong>12<\/strong> runs/);
});

test('the front page has the two-line difference and the dynamic runs link', () => {
  const html = renderCampaign({ contract, policy, index, publicMode: true });
  assert.match(
    html,
    /Other tools ask for your website URL\. Kern asks for your ad\./,
  );
  assert.match(
    html,
    /\$60 cart: promised \$0\.00, charged \$9\.00\.\s+\$35 cart: promised \$9\.00, charged \$9\.00\./,
  );
  assert.match(html, /See all 12 real runs/);
  assert.match(html, /href="\/runs"/);
  assert.doesNotMatch(html, />Storefront</);
});
