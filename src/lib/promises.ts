import { getProduct } from './catalog.ts';

/**
 * Contract-level promise coverage for the next promise classes.
 *
 * These are deterministic checks, not a new Kane browser run. The shipping
 * path in `contract.ts` and the recorded audits remain the real-browser
 * evidence. This module gives the same boundary/control discipline to
 * percentage discounts, bundles and delivery estimates so the next Kane
 * objectives can be built on a tested contract instead of a guess.
 */

export type PromiseType = 'percent_discount' | 'bundle_discount' | 'delivery_estimate';

export type CartItem = {
  productId: string;
  qty: number;
};

export type PercentScenario = {
  kind: 'percent';
  id: string;
  label: string;
  subtotalCents: number;
  expectedDiscountCents: number;
};

export type BundleScenario = {
  kind: 'bundle';
  id: string;
  label: string;
  items: readonly CartItem[];
  expectedDiscountCents: number;
};

export type DeliveryScenario = {
  kind: 'delivery';
  id: string;
  label: string;
  orderAt: string;
  expectedDate: string;
};

export type PromiseScenario = PercentScenario | BundleScenario | DeliveryScenario;

export type ScenarioResult = {
  id: string;
  label: string;
  expected: number | string;
  observed: number | string;
  pass: boolean;
  reasons: string[];
};

export type PromiseResult = {
  id: string;
  type: PromiseType;
  title: string;
  offer: string;
  scenarios: ScenarioResult[];
  pass: boolean;
};

export type CandidateResult = {
  id: string;
  label: string;
  pass: boolean;
  scenarios: ScenarioResult[];
};

export type PromiseResultSet = {
  correct: PromiseResult;
  candidates: CandidateResult[];
  pass: boolean;
};

export type PromiseGate = {
  open: boolean;
  promises: PromiseResultSet[];
  reasons: string[];
};

export type PromiseImplementations = {
  percent: (subtotalCents: number) => number;
  bundle: (items: readonly CartItem[]) => number;
  delivery: (orderAt: string) => string;
};

/* -------------------------------------------------------------------------- */
/* Money                                                                      */
/* -------------------------------------------------------------------------- */

function assertCents(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${label} must be non-negative integer cents, got ${value}`);
  }
}

function assertPercent(value: number): void {
  if (!Number.isSafeInteger(value) || value < 0 || value > 100) {
    throw new RangeError(`percent must be an integer from 0 to 100, got ${value}`);
  }
}

/**
 * 20% off orders over $50, calculated in integer cents. The exact $50.00
 * boundary qualifies (the same inclusive boundary as the shipping promise).
 */
export function percentDiscountCents(
  subtotalCents: number,
  percent = 20,
  thresholdCents = 5_000,
): number {
  assertCents(subtotalCents, 'subtotal');
  assertCents(thresholdCents, 'threshold');
  assertPercent(percent);
  if (subtotalCents < thresholdCents) return 0;
  return Math.floor((subtotalCents * percent) / 100);
}

/**
 * 15% off the tote + notebook bundle. The discount is on merchandise only and
 * only when both products are present. A partial cart gets nothing.
 */
export function bundleSubtotalCents(items: readonly CartItem[]): number {
  let subtotal = 0;
  for (const item of items) {
    if (!Number.isSafeInteger(item.qty) || item.qty < 1) {
      throw new RangeError(`bundle quantity must be a positive integer, got ${item.qty}`);
    }
    const product = getProduct(item.productId);
    if (!product) throw new RangeError(`unknown bundle product: ${item.productId}`);
    subtotal += product.priceCents * item.qty;
  }
  return subtotal;
}

export function bundleDiscountCents(
  items: readonly CartItem[],
  percent = 15,
): number {
  assertPercent(percent);
  const subtotal = bundleSubtotalCents(items);
  const hasTote = items.some((item) => item.productId === 'tote' && item.qty > 0);
  const hasNotebook = items.some((item) => item.productId === 'notebook' && item.qty > 0);
  if (!hasTote || !hasNotebook) return 0;
  return Math.floor((subtotal * percent) / 100);
}

/* -------------------------------------------------------------------------- */
/* Delivery                                                                   */
/* -------------------------------------------------------------------------- */

const DAY_MS = 24 * 60 * 60 * 1000;

function isBusinessDay(date: Date): boolean {
  const day = date.getUTCDay();
  return day >= 1 && day <= 5;
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function nextBusinessDay(date: Date): Date {
  let next = new Date(date.getTime() + DAY_MS);
  while (!isBusinessDay(next)) next = new Date(next.getTime() + DAY_MS);
  return next;
}

function addBusinessDays(date: Date, days: number): Date {
  let next = new Date(date.getTime());
  let remaining = days;
  while (remaining > 0) {
    next = new Date(next.getTime() + DAY_MS);
    if (isBusinessDay(next)) remaining -= 1;
  }
  return next;
}

/**
 * “Order by 2pm UTC on a weekday, delivered in 2 business days.”
 *
 * An order after the cutoff is handed to the next business day. Weekend
 * orders wait for Monday. Weekends are skipped when counting delivery days.
 * This is deterministic and holiday-free; it is a contract fixture, not a
 * carrier estimate.
 */
export function deliveryDateFor(
  orderAt: string,
  options: { cutoffHourUtc?: number; businessDays?: number } = {},
): string {
  const cutoffHourUtc = options.cutoffHourUtc ?? 14;
  const businessDays = options.businessDays ?? 2;
  if (!Number.isInteger(cutoffHourUtc) || cutoffHourUtc < 0 || cutoffHourUtc > 23) {
    throw new RangeError(`cutoffHourUtc must be an integer from 0 to 23, got ${cutoffHourUtc}`);
  }
  if (!Number.isSafeInteger(businessDays) || businessDays < 0) {
    throw new RangeError(`businessDays must be a non-negative integer, got ${businessDays}`);
  }
  const parsed = new Date(orderAt);
  if (Number.isNaN(parsed.getTime())) {
    throw new RangeError(`invalid order timestamp: ${orderAt}`);
  }
  let shipDate = startOfUtcDay(parsed);
  if (!isBusinessDay(shipDate) || parsed.getUTCHours() >= cutoffHourUtc) {
    shipDate = nextBusinessDay(shipDate);
  }
  return addBusinessDays(shipDate, businessDays).toISOString().slice(0, 10);
}

/* -------------------------------------------------------------------------- */
/* Correct implementations                                                    */
/* -------------------------------------------------------------------------- */

export const CORRECT_IMPLEMENTATIONS: PromiseImplementations = {
  percent: (subtotalCents) => percentDiscountCents(subtotalCents, 20, 5_000),
  bundle: (items) => bundleDiscountCents(items, 15),
  delivery: (orderAt) => deliveryDateFor(orderAt, { cutoffHourUtc: 14, businessDays: 2 }),
};

/* -------------------------------------------------------------------------- */
/* Scenarios                                                                  */
/* -------------------------------------------------------------------------- */

export const PERCENT_PROMISE = {
  id: 'percent-20',
  type: 'percent_discount' as const,
  title: '20% off orders over $50',
  offer: 'Take 20% off the after-discount merchandise subtotal when it is $50.00 or more.',
  scenarios: [
    {
      kind: 'percent' as const,
      id: 'percent-60',
      label: '$60.00 eligible',
      subtotalCents: 6_000,
      expectedDiscountCents: 1_200,
    },
    {
      kind: 'percent' as const,
      id: 'percent-50',
      label: '$50.00 boundary',
      subtotalCents: 5_000,
      expectedDiscountCents: 1_000,
    },
    {
      kind: 'percent' as const,
      id: 'percent-35',
      label: '$35.00 control',
      subtotalCents: 3_500,
      expectedDiscountCents: 0,
    },
  ],
} as const;

export const BUNDLE_PROMISE = {
  id: 'bundle-15',
  type: 'bundle_discount' as const,
  title: 'Tote + notebook: 15% off both',
  offer: 'Take 15% off the merchandise subtotal when both the tote and the notebook are in the cart.',
  scenarios: [
    {
      kind: 'bundle' as const,
      id: 'bundle-complete',
      label: 'Tote + notebook',
      items: [
        { productId: 'tote', qty: 1 },
        { productId: 'notebook', qty: 1 },
      ],
      expectedDiscountCents: 900,
    },
    {
      kind: 'bundle' as const,
      id: 'bundle-tote-only',
      label: 'Tote only',
      items: [{ productId: 'tote', qty: 1 }],
      expectedDiscountCents: 0,
    },
    {
      kind: 'bundle' as const,
      id: 'bundle-notebook-only',
      label: 'Notebook only',
      items: [{ productId: 'notebook', qty: 1 }],
      expectedDiscountCents: 0,
    },
  ],
} as const;

export const DELIVERY_PROMISE = {
  id: 'delivery-2day',
  type: 'delivery_estimate' as const,
  title: 'Order by 2pm, delivered in 2 business days',
  offer: 'Orders placed by 2pm UTC on a weekday are delivered in 2 business days. Weekends and the cutoff are respected.',
  scenarios: [
    {
      kind: 'delivery' as const,
      id: 'delivery-before-cutoff',
      label: 'Thursday 13:00 UTC',
      orderAt: '2026-11-26T13:00:00.000Z',
      expectedDate: '2026-11-30',
    },
    {
      kind: 'delivery' as const,
      id: 'delivery-after-cutoff',
      label: 'Thursday 15:00 UTC',
      orderAt: '2026-11-26T15:00:00.000Z',
      expectedDate: '2026-12-01',
    },
    {
      kind: 'delivery' as const,
      id: 'delivery-weekend',
      label: 'Saturday 10:00 UTC',
      orderAt: '2026-11-28T10:00:00.000Z',
      expectedDate: '2026-12-02',
    },
  ],
} as const;

export const PROMISE_DEFINITIONS = [PERCENT_PROMISE, BUNDLE_PROMISE, DELIVERY_PROMISE] as const;

/* -------------------------------------------------------------------------- */
/* Candidates                                                                 */
/* -------------------------------------------------------------------------- */

type Candidate = {
  id: string;
  label: string;
  type: PromiseType;
  implementations: PromiseImplementations;
};

const percentAllCarts: PromiseImplementations = {
  ...CORRECT_IMPLEMENTATIONS,
  percent: (subtotalCents) => percentDiscountCents(subtotalCents, 20, 0),
};

const percentSixtyOnly: PromiseImplementations = {
  ...CORRECT_IMPLEMENTATIONS,
  percent: (subtotalCents) => percentDiscountCents(subtotalCents, 20, 6_000),
};

const percentFlat: PromiseImplementations = {
  ...CORRECT_IMPLEMENTATIONS,
  percent: (subtotalCents) => (subtotalCents >= 5_000 ? 2_000 : 0),
};

const bundleAnyCart: PromiseImplementations = {
  ...CORRECT_IMPLEMENTATIONS,
  bundle: (items) => Math.floor((bundleSubtotalCents(items) * 15) / 100),
};

const bundleFlat: PromiseImplementations = {
  ...CORRECT_IMPLEMENTATIONS,
  bundle: (items) => (bundleDiscountCents(items, 15) > 0 ? 1_500 : 0),
};

const deliveryCalendarDays: PromiseImplementations = {
  ...CORRECT_IMPLEMENTATIONS,
  delivery: (orderAt) => {
    const start = new Date(orderAt);
    if (Number.isNaN(start.getTime())) throw new RangeError('invalid order timestamp');
    return new Date(start.getTime() + 2 * DAY_MS).toISOString().slice(0, 10);
  },
};

const deliveryIgnoreCutoff: PromiseImplementations = {
  ...CORRECT_IMPLEMENTATIONS,
  delivery: (orderAt) => deliveryDateFor(orderAt, { cutoffHourUtc: 23, businessDays: 2 }),
};

const deliveryOneDay: PromiseImplementations = {
  ...CORRECT_IMPLEMENTATIONS,
  delivery: (orderAt) => deliveryDateFor(orderAt, { cutoffHourUtc: 14, businessDays: 1 }),
};

const CANDIDATES: Candidate[] = [
  { id: 'percent-all', label: 'Discount every cart', type: 'percent_discount', implementations: percentAllCarts },
  { id: 'percent-60-only', label: 'Discount only $60+', type: 'percent_discount', implementations: percentSixtyOnly },
  { id: 'percent-flat', label: 'Flat $20 off', type: 'percent_discount', implementations: percentFlat },
  { id: 'bundle-any', label: 'Bundle any cart', type: 'bundle_discount', implementations: bundleAnyCart },
  { id: 'bundle-flat', label: 'Flat $15 off', type: 'bundle_discount', implementations: bundleFlat },
  { id: 'delivery-calendar', label: 'Calendar days', type: 'delivery_estimate', implementations: deliveryCalendarDays },
  { id: 'delivery-ignore-cutoff', label: 'Ignore cutoff', type: 'delivery_estimate', implementations: deliveryIgnoreCutoff },
  { id: 'delivery-one-day', label: 'One business day', type: 'delivery_estimate', implementations: deliveryOneDay },
];

/* -------------------------------------------------------------------------- */
/* Evaluation                                                                 */
/* -------------------------------------------------------------------------- */

function evaluatePercent(
  scenario: PercentScenario,
  impl: PromiseImplementations,
): ScenarioResult {
  const observed = impl.percent(scenario.subtotalCents);
  const pass = observed === scenario.expectedDiscountCents;
  return {
    id: scenario.id,
    label: scenario.label,
    expected: scenario.expectedDiscountCents,
    observed,
    pass,
    reasons: pass
      ? []
      : [`expected ${scenario.expectedDiscountCents} cents, observed ${observed} cents`],
  };
}

function evaluateBundle(
  scenario: BundleScenario,
  impl: PromiseImplementations,
): ScenarioResult {
  const observed = impl.bundle(scenario.items);
  const pass = observed === scenario.expectedDiscountCents;
  return {
    id: scenario.id,
    label: scenario.label,
    expected: scenario.expectedDiscountCents,
    observed,
    pass,
    reasons: pass
      ? []
      : [`expected ${scenario.expectedDiscountCents} cents, observed ${observed} cents`],
  };
}

function evaluateDelivery(
  scenario: DeliveryScenario,
  impl: PromiseImplementations,
): ScenarioResult {
  const observed = impl.delivery(scenario.orderAt);
  const pass = observed === scenario.expectedDate;
  return {
    id: scenario.id,
    label: scenario.label,
    expected: scenario.expectedDate,
    observed,
    pass,
    reasons: pass ? [] : [`expected ${scenario.expectedDate}, observed ${observed}`],
  };
}

function evaluateScenario(
  scenario: PromiseScenario,
  impl: PromiseImplementations,
): ScenarioResult {
  if (scenario.kind === 'percent') return evaluatePercent(scenario, impl);
  if (scenario.kind === 'bundle') return evaluateBundle(scenario, impl);
  return evaluateDelivery(scenario, impl);
}

function evaluatePromise(
  definition: (typeof PROMISE_DEFINITIONS)[number],
  impl: PromiseImplementations,
): PromiseResult {
  const scenarios = definition.scenarios.map((scenario) =>
    evaluateScenario(scenario as PromiseScenario, impl),
  );
  return {
    id: definition.id,
    type: definition.type,
    title: definition.title,
    offer: definition.offer,
    scenarios,
    pass: scenarios.every((scenario) => scenario.pass),
  };
}

function evaluateCandidate(
  candidate: Candidate,
  definitions: readonly (typeof PROMISE_DEFINITIONS)[number][],
): CandidateResult {
  const scenarios = definitions.flatMap((definition) =>
    definition.scenarios.map((scenario) =>
      evaluateScenario(scenario as PromiseScenario, candidate.implementations),
    ),
  );
  return {
    id: candidate.id,
    label: candidate.label,
    pass: scenarios.every((scenario) => scenario.pass),
    scenarios,
  };
}

/**
 * The gate is open only when the correct implementation passes every
 * scenario AND every plausible broken implementation is rejected by at
 * least one scenario. A candidate that passes every scenario closes the gate.
 */
export function evaluatePromiseGate(
  implementations: PromiseImplementations = CORRECT_IMPLEMENTATIONS,
): PromiseGate {
  const promises = PROMISE_DEFINITIONS.map((definition) => {
    const correct = evaluatePromise(definition, implementations);
    const candidates = CANDIDATES
      .filter((candidate) => candidate.type === definition.type)
      .map((candidate) => evaluateCandidate(candidate, [definition]));
    const pass = correct.pass && candidates.every((candidate) => !candidate.pass);
    return { correct, candidates, pass };
  });

  const reasons: string[] = [];
  for (const result of promises) {
    if (!result.correct.pass) {
      for (const scenario of result.correct.scenarios) {
        if (!scenario.pass) {
          reasons.push(`${result.correct.id}: ${scenario.id} — ${scenario.reasons.join('; ')}`);
        }
      }
    }
    for (const candidate of result.candidates) {
      if (candidate.pass) {
        reasons.push(`${result.correct.id}: candidate "${candidate.label}" was not rejected`);
      }
    }
  }

  return {
    open: reasons.length === 0 && promises.every((promise) => promise.pass),
    promises,
    reasons,
  };
}
