import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

export type Money = {
  currency: 'USD';
  cents: number;
};

/**
 * The frozen merchant-approved promise. This file is the single source of the
 * expected values used by the oracle. It is deliberately independent of the
 * store's shipping implementation.
 */
export type PromiseContract = {
  id: string;
  campaignId: string;
  version: number;
  type: 'free_shipping_threshold';
  thresholdBasis: 'after_discount_merchandise_subtotal';
  operator: 'greater_than_or_equal';
  threshold: Money;
  qualifyingProductIds: string[];
  destinationCountry: 'US';
  shippingMethod: 'standard';
  expectedEligibleShipping: Money;
  expectedIneligibleShipping: Money;
  adTextSnapshot: string;
  statedInterpretation: string;
  baselineSource: string;
  destinationOrigin: string;
  approvedAt: string;
  approvedBy: string;
  specSha256: string;
};

export type ShippingVerdict = 'HONORED' | 'BROKEN';

export type ShippingEvaluation = {
  expectedCents: number;
  observedCents: number;
  verdict: ShippingVerdict;
};

export const DEFAULT_CONTRACT_PATH = new URL('../../contracts/demo-promise.json', import.meta.url);

/**
 * Canonical field order for hashing. Adding or reordering a field changes the
 * contract hash and is therefore a new contract version, not a cosmetic edit.
 */
export function canonicalContractPayload(contract: PromiseContract): string {
  return JSON.stringify({
    id: contract.id,
    campaignId: contract.campaignId,
    version: contract.version,
    type: contract.type,
    thresholdBasis: contract.thresholdBasis,
    operator: contract.operator,
    threshold: {
      currency: contract.threshold.currency,
      cents: contract.threshold.cents,
    },
    qualifyingProductIds: [...contract.qualifyingProductIds],
    destinationCountry: contract.destinationCountry,
    shippingMethod: contract.shippingMethod,
    expectedEligibleShipping: {
      currency: contract.expectedEligibleShipping.currency,
      cents: contract.expectedEligibleShipping.cents,
    },
    expectedIneligibleShipping: {
      currency: contract.expectedIneligibleShipping.currency,
      cents: contract.expectedIneligibleShipping.cents,
    },
    adTextSnapshot: contract.adTextSnapshot,
    statedInterpretation: contract.statedInterpretation,
    baselineSource: contract.baselineSource,
    destinationOrigin: contract.destinationOrigin,
    approvedAt: contract.approvedAt,
    approvedBy: contract.approvedBy,
  });
}

export function contractSha256(contract: PromiseContract): string {
  return createHash('sha256').update(canonicalContractPayload(contract), 'utf8').digest('hex');
}

function assertMoney(value: Money, label: string): void {
  if (value.currency !== 'USD') {
    throw new Error(`${label} must be USD`);
  }
  if (!Number.isSafeInteger(value.cents) || value.cents < 0) {
    throw new Error(`${label} must be non-negative integer cents`);
  }
}

export function assertContractShape(contract: PromiseContract): void {
  if (contract.type !== 'free_shipping_threshold') {
    throw new Error(`unsupported promise type: ${contract.type}`);
  }
  if (contract.thresholdBasis !== 'after_discount_merchandise_subtotal') {
    throw new Error(`unsupported threshold basis: ${contract.thresholdBasis}`);
  }
  if (contract.operator !== 'greater_than_or_equal') {
    throw new Error(`unsupported operator: ${contract.operator}`);
  }
  assertMoney(contract.threshold, 'threshold');
  assertMoney(contract.expectedEligibleShipping, 'expectedEligibleShipping');
  assertMoney(contract.expectedIneligibleShipping, 'expectedIneligibleShipping');
  if (contract.destinationCountry !== 'US') {
    throw new Error(`unsupported destination country: ${contract.destinationCountry}`);
  }
  if (contract.shippingMethod !== 'standard') {
    throw new Error(`unsupported shipping method: ${contract.shippingMethod}`);
  }
}

/**
 * Loads the frozen contract and refuses to return it if the canonical payload
 * no longer matches the recorded SHA-256. A mismatch is a hard error, not a
 * warning, because the oracle must never grade against a silently edited
 * promise.
 */
export function loadContract(contractPath: string | URL = DEFAULT_CONTRACT_PATH): PromiseContract {
  const contract = JSON.parse(readFileSync(contractPath, 'utf8')) as PromiseContract;
  assertContractShape(contract);

  if (typeof contract.specSha256 !== 'string' || contract.specSha256.length !== 64) {
    throw new Error('contract specSha256 is missing or malformed');
  }

  const actual = contractSha256(contract);
  if (actual !== contract.specSha256) {
    throw new Error(
      `contract hash mismatch: recorded ${contract.specSha256}, computed ${actual}`,
    );
  }
  return contract;
}

/**
 * The deterministic promise oracle. Given the frozen contract and an
 * after-discount merchandise subtotal in integer cents, return the shipping
 * the customer was promised.
 */
export function expectedShippingCents(contract: PromiseContract, subtotalCents: number): number {
  assertContractShape(contract);
  if (!Number.isSafeInteger(subtotalCents) || subtotalCents < 0) {
    throw new RangeError(`subtotal must be non-negative integer cents, got ${subtotalCents}`);
  }

  return subtotalCents >= contract.threshold.cents
    ? contract.expectedEligibleShipping.cents
    : contract.expectedIneligibleShipping.cents;
}

export function evaluateShippingPromise(
  contract: PromiseContract,
  subtotalCents: number,
  observedShippingCents: number,
): ShippingEvaluation {
  if (!Number.isSafeInteger(observedShippingCents) || observedShippingCents < 0) {
    throw new RangeError(
      `observed shipping must be non-negative integer cents, got ${observedShippingCents}`,
    );
  }
  const expectedCents = expectedShippingCents(contract, subtotalCents);
  return {
    expectedCents,
    observedCents: observedShippingCents,
    verdict: expectedCents === observedShippingCents ? 'HONORED' : 'BROKEN',
  };
}
