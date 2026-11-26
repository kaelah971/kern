import { createHash } from 'node:crypto';
import { getPreset, PRESET_CARTS } from '../catalog.ts';
import { expectedShippingCents, type PromiseContract } from '../contract.ts';
import { formatUsd } from '../money.ts';

export type ObjectiveKind = 'observe' | 'assert';

export type ScenarioObjectives = {
  scenarioId: string;
  presetLabel: string;
  expectedSubtotalCents: number;
  thresholdCents: number;
  oracleExpectedCents: number;
  observe: string;
  assert: string;
  hashes: {
    observe: string;
    assert: string;
  };
};

export function objectiveSha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

/**
 * Build the exact two objectives for one deterministic cart.
 *
 * The wording is intentionally identical to the real Kane captures in
 * `.data/captures/2026-11-22-kane-store/`. That matters: the audit stores a
 * SHA-256 of the objective text, and a repair is only proven by rerunning the
 * unchanged text. The threshold and expected amount are not hard-coded here:
 * `expectedShippingCents()` reads them from the frozen contract.
 */
export function buildScenarioObjectives(
  contract: PromiseContract,
  scenarioId: string,
  originOverride?: string,
): ScenarioObjectives {
  const preset = getPreset(scenarioId);
  if (!preset) {
    throw new RangeError(`unknown scenario: ${scenarioId}`);
  }

  const oracleExpectedCents = expectedShippingCents(contract, preset.expectedSubtotalCents);
  const origin = `${(originOverride ?? contract.destinationOrigin).replace(/\/+$/, '')}/`;
  const label = preset.label;

  const observe = [
    `Navigate to ${origin} then Open the Kern demo store.`,
    `Click the button labelled 'Load ${label} cart'.`,
    `On the shipping quote page, read the amount shown on the line starting with 'Shipping' and store it as observed_shipping.`,
    `Read the amount shown on the line starting with 'Merchandise subtotal' and store it as observed_subtotal.`,
    `Do not place an order and do not enter any payment details.`,
  ].join('\n');

  const assertObjective = [
    `Navigate to ${origin} then Open the Kern demo store.`,
    `Click the button labelled 'Load ${label} cart'.`,
    `Read the amount shown on the line starting with 'Shipping' and store it as {{observed_shipping}}.`,
    `Read the amount shown on the line starting with 'Merchandise subtotal' and store it as {{observed_subtotal}}.`,
    `Then verify {{observed_shipping}} is ${formatUsd(oracleExpectedCents)}.`,
  ].join('\n');

  return {
    scenarioId,
    presetLabel: label,
    expectedSubtotalCents: preset.expectedSubtotalCents,
    thresholdCents: contract.threshold.cents,
    oracleExpectedCents,
    observe,
    assert: assertObjective,
    hashes: {
      observe: objectiveSha256(observe),
      assert: objectiveSha256(assertObjective),
    },
  };
}

export function buildAllScenarioObjectives(
  contract: PromiseContract,
  originOverride?: string,
): ScenarioObjectives[] {
  return Object.keys(PRESET_CARTS).map((scenarioId) =>
    buildScenarioObjectives(contract, scenarioId, originOverride),
  );
}
