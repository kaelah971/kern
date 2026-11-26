import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PRODUCTS, PRESET_CARTS } from './catalog.ts';
import {
  assertContractShape,
  contractSha256,
  expectedShippingCents,
  type PromiseContract,
} from './contract.ts';
import { formatUsd } from './money.ts';

export type ContractDraft = {
  id: string;
  campaignId: string;
  adTextSnapshot: string;
  statedInterpretation: string;
  thresholdCents: number;
  destinationOrigin: string;
  policySource: string;
  approvedBy: string;
  version?: number;
};

export type CartPlan = {
  role: 'eligible' | 'boundary' | 'control';
  label: string;
  subtotalCents: number;
  expectedShippingCents: number;
};

export type CompiledContract = {
  contract: PromiseContract;
  cartPlan: CartPlan[];
  warnings: string[];
  file: string | null;
};

function requireText(value: string, label: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`${label} is required`);
  return trimmed;
}

function safeId(value: string): string {
  const id = requireText(value, 'Contract id');
  if (!/^[a-z0-9][a-z0-9._-]*$/i.test(id) || id.includes('..')) {
    throw new Error('Contract id must contain only letters, numbers, dots, underscores or dashes');
  }
  return id;
}

function normalizeOrigin(value: string): string {
  const raw = requireText(value, 'Destination origin');
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error('Destination origin must be an absolute http(s) URL');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Destination origin must be http(s)');
  }
  if (parsed.username || parsed.password) {
    throw new Error('Destination origin must not contain credentials');
  }
  return `${parsed.origin}${parsed.pathname.replace(/\/+$/, '')}`;
}

export function compileContract(
  draft: ContractDraft,
  approvedAt = new Date().toISOString(),
): CompiledContract {
  const id = safeId(draft.id);
  const campaignId = requireText(draft.campaignId, 'Campaign id');
  const adTextSnapshot = requireText(draft.adTextSnapshot, 'Ad snapshot');
  const statedInterpretation = requireText(
    draft.statedInterpretation,
    'Stated interpretation',
  );
  const policySource = requireText(draft.policySource, 'Policy source');
  const approvedBy = requireText(draft.approvedBy, 'Approved by');
  if (!Number.isSafeInteger(draft.thresholdCents) || draft.thresholdCents < 0) {
    throw new Error('Threshold must be a non-negative integer number of cents');
  }
  if (draft.thresholdCents < 1_500) {
    throw new Error('Threshold must be at least $15.00 so the control cart can be generated');
  }
  if (!Number.isSafeInteger(draft.version ?? 1) || (draft.version ?? 1) < 1) {
    throw new Error('Version must be a positive integer');
  }

  const contract: PromiseContract = {
    id,
    campaignId,
    version: draft.version ?? 1,
    type: 'free_shipping_threshold',
    thresholdBasis: 'after_discount_merchandise_subtotal',
    operator: 'greater_than_or_equal',
    threshold: { currency: 'USD', cents: draft.thresholdCents },
    qualifyingProductIds: PRODUCTS.map((product) => product.id),
    destinationCountry: 'US',
    shippingMethod: 'standard',
    expectedEligibleShipping: { currency: 'USD', cents: 0 },
    expectedIneligibleShipping: { currency: 'USD', cents: 900 },
    adTextSnapshot,
    statedInterpretation,
    baselineSource: policySource,
    destinationOrigin: normalizeOrigin(draft.destinationOrigin),
    approvedAt,
    approvedBy,
    specSha256: '',
  };
  assertContractShape(contract);
  contract.specSha256 = contractSha256(contract);

  const eligible = draft.thresholdCents + 1_000;
  const control = draft.thresholdCents - 1_500;
  const planItems: Array<Omit<CartPlan, 'label' | 'expectedShippingCents'>> = [
    { role: 'eligible', subtotalCents: eligible },
    { role: 'boundary', subtotalCents: draft.thresholdCents },
    { role: 'control', subtotalCents: control },
  ];
  const cartPlan: CartPlan[] = planItems.map((item) => ({
    ...item,
    label: `${formatUsd(item.subtotalCents)} ${item.role}`,
    expectedShippingCents: expectedShippingCents(contract, item.subtotalCents),
  }));

  const known: Array<[CartPlan['role'], number]> = [
    ['eligible', PRESET_CARTS['eligible-60'].expectedSubtotalCents],
    ['boundary', PRESET_CARTS['boundary-50'].expectedSubtotalCents],
    ['control', PRESET_CARTS['control-35'].expectedSubtotalCents],
  ];
  const matchesKnownStore = known.every(
    ([role, cents]) => cartPlan.find((item) => item.role === role)?.subtotalCents === cents,
  );
  const warnings = matchesKnownStore
    ? []
    : [
        'The local demo store has fixed $60/$50/$35 carts. This contract requires a store fixture with the generated subtotals before it can be audited locally.',
      ];

  return { contract, cartPlan, warnings, file: null };
}

export function freezeContract(contract: PromiseContract, root: string): string {
  mkdirSync(root, { recursive: true });
  const file = join(root, `${safeId(contract.id)}.json`);
  writeFileSync(file, `${JSON.stringify(contract, null, 2)}\n`, 'utf8');
  return file;
}
