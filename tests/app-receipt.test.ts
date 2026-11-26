import test from 'node:test';
import assert from 'node:assert/strict';
import { loadContract } from '../src/lib/contract.ts';
import { readPolicy } from '../src/app/data.ts';
import { receiptStatusStatement, renderReceiptBody } from '../src/app/receipt.ts';
import { BROKEN, HONORED } from './fixtures/audits/fixture.ts';
import { evaluateGate } from '../src/lib/gate.ts';
import { readRepairFacts } from '../src/app/git.ts';

const contract = loadContract();
const policy = readPolicy(process.cwd());

test('status language is scoped and explicit', () => {
  assert.equal(
    receiptStatusStatement('HONORED'),
    'Verified for the tested conditions at the recorded time.',
  );
  assert.match(receiptStatusStatement('BROKEN'), /^BROKEN/);
  assert.match(receiptStatusStatement('INCONCLUSIVE'), /^INCONCLUSIVE/);
  assert.match(receiptStatusStatement('INFRA_ERROR'), /^INFRA_ERROR/);
});

test('a BROKEN receipt says BROKEN and never claims verification, certification or signing', () => {
  const body = renderReceiptBody(BROKEN, contract, policy);
  assert.match(body, /BROKEN/);
  assert.doesNotMatch(body, /verified for the tested conditions/i);
  assert.doesNotMatch(body, /certified/i);
  assert.doesNotMatch(body, /\bsigned\b/i);
  assert.match(body, /does not verify the store/i);
});

test('an HONORED receipt uses the scoped verified phrase', () => {
  const body = renderReceiptBody(HONORED, contract, policy);
  assert.match(body, /verified for the tested conditions at the recorded time/i);
  assert.doesNotMatch(body, /certified/i);
  assert.doesNotMatch(body, /\bsigned\b/i);
});

test('a post-repair receipt names the pre-repair audit it answers', () => {
  assert.equal(HONORED.postRepair, true);
  assert.ok(HONORED.answersAuditId);
  const body = renderReceiptBody(HONORED, contract, policy);
  assert.match(body, new RegExp(HONORED.answersAuditId));
  assert.match(body, /post-repair audit/i);
  assert.match(body, /objective hashes match:\s*<strong>yes<\/strong>/i);
});

test('a post-repair receipt names the patch, approval and gate', () => {
  const gate = evaluateGate(HONORED, contract);
  const repair = readRepairFacts(process.cwd());
  const body = renderReceiptBody(HONORED, contract, policy, { gate, repair });
  assert.match(body, /Repair and gate/);
  assert.match(body, /Patch that passed/);
  assert.match(body, /4c8105f/);
  assert.match(body, /88536a9/);
  assert.match(body, /6\/6/);
  assert.match(body, /Kane gate/);
  assert.match(body, /The agent may not ship until Kane passes the same objectives\./);
  assert.doesNotMatch(body, /certified/i);
  assert.doesNotMatch(body, /signed/i);
});
