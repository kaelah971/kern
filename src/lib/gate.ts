import type { AuditRecord, ScenarioAudit } from './audit.ts';
import {
  expectedShippingCents,
  type PromiseContract,
} from './contract.ts';
import { PRESET_CARTS } from './catalog.ts';
import {
  FREE_SHIPPING_THRESHOLD_CENTS,
  STANDARD_SHIPPING_CENTS,
  getStandardShippingCents,
} from './shipping.ts';

export type GateScenario = {
  scenarioId: string;
  label: string;
  expectedCents: number;
  observedCents: number | null;
  status: string;
  pass: boolean;
  reasons: string[];
};

export type GateResult = {
  open: boolean;
  auditId: string;
  contractId: string;
  contractHash: string;
  scenarios: GateScenario[];
  reasons: string[];
};

function scenarioReasons(
  scenario: ScenarioAudit,
  expectedCents: number,
): string[] {
  const reasons: string[] = [];
  const observed = scenario.oracle.observedShippingCents;
  if (typeof observed !== 'number') reasons.push('no observed shipping value');
  if (observed !== expectedCents) {
    reasons.push(`observed ${observed ?? 'missing'} != expected ${expectedCents}`);
  }
  if (scenario.oracle.expectedShippingCents !== expectedCents) {
    reasons.push(
      `audit expected ${scenario.oracle.expectedShippingCents} != current contract ${expectedCents}`,
    );
  }
  if (scenario.status !== 'HONORED') reasons.push(`audit status is ${scenario.status}`);
  if (scenario.observe?.source !== 'live') reasons.push('observe run is not live');
  if (scenario.assert?.source !== 'live') reasons.push('assert run is not live');
  if (scenario.observe?.parsed.runEndStatus !== 'passed') reasons.push('observe did not pass');
  if (scenario.assert?.parsed.runEndStatus !== 'passed') reasons.push('assert did not pass');
  if (scenario.observe?.artifacts.exitCode !== 0) reasons.push('observe exit is not 0');
  if (scenario.assert?.artifacts.exitCode !== 0) reasons.push('assert exit is not 0');
  if (!scenario.observe?.evidence) reasons.push('observe evidence is missing');
  if (!scenario.assert?.evidence) reasons.push('assert evidence is missing');
  return reasons;
}

/**
 * Evaluate a completed audit against the current frozen contract. This is the
 * gate the coding agent must pass; it uses the audit evidence, not the store's
 * internal shipping function.
 */
export function evaluateGate(audit: AuditRecord, contract: PromiseContract): GateResult {
  const reasons: string[] = [];
  if (audit.contract.id !== contract.id) {
    reasons.push(`audit contract ${audit.contract.id} != ${contract.id}`);
  }
  if (audit.contract.specSha256 !== contract.specSha256) {
    reasons.push('audit contract hash differs from the current frozen contract');
  }
  if (audit.overallStatus !== 'HONORED') {
    reasons.push(`audit overall status is ${audit.overallStatus}`);
  }

  const scenarios: GateScenario[] = [];
  for (const preset of Object.values(PRESET_CARTS)) {
    const scenario = audit.scenarios.find((item) => item.scenarioId === preset.id);
    if (!scenario) {
      reasons.push(`missing scenario ${preset.id}`);
      scenarios.push({
        scenarioId: preset.id,
        label: preset.label,
        expectedCents: expectedShippingCents(contract, preset.expectedSubtotalCents),
        observedCents: null,
        status: 'MISSING',
        pass: false,
        reasons: ['scenario is missing from the audit'],
      });
      continue;
    }
    const expected = expectedShippingCents(contract, scenario.expectedSubtotalCents);
    const reasonsForScenario = scenarioReasons(scenario, expected);
    const pass = reasonsForScenario.length === 0;
    if (!pass) {
      reasons.push(
        `${preset.id}: ${reasonsForScenario.join('; ')}`,
      );
    }
    scenarios.push({
      scenarioId: preset.id,
      label: preset.label,
      expectedCents: expected,
      observedCents: scenario.oracle.observedShippingCents,
      status: scenario.status,
      pass,
      reasons: reasonsForScenario,
    });
  }

  return {
    open: reasons.length === 0,
    auditId: audit.auditId,
    contractId: contract.id,
    contractHash: contract.specSha256,
    scenarios,
    reasons,
  };
}

export type GauntletCell = {
  scenarioId: string;
  label: string;
  expectedCents: number;
  observedCents: number;
  pass: boolean;
};

export type GauntletRow = {
  id: string;
  label: string;
  description: string;
  cells: GauntletCell[];
  pass: boolean;
};

const CANDIDATES: Array<{
  id: string;
  label: string;
  description: string;
  shipping: (subtotalCents: number) => number;
}> = [
  {
    id: 'correct',
    label: 'Correct cents comparison',
    description: 'The actual repaired rule: compare the cents subtotal to the cents threshold.',
    shipping: getStandardShippingCents,
  },
  {
    id: 'all-free',
    label: 'Make all shipping free',
    description: 'Plausible shortcut: remove the shipping charge everywhere.',
    shipping: () => 0,
  },
  {
    id: 'sixty-only',
    label: 'Free only at $60+',
    description: 'Plausible overfit: pass the visible $60 cart, miss the exact $50 boundary.',
    shipping: (subtotalCents) => (subtotalCents >= 6_000 ? 0 : STANDARD_SHIPPING_CENTS),
  },
  {
    id: 'ui-only',
    label: 'Label the charge as Free',
    description: 'A UI-only hide: the label changes, but the customer is still charged $9.00.',
    shipping: () => STANDARD_SHIPPING_CENTS,
  },
  {
    id: 'control-regression',
    label: 'Fix the threshold, free the control',
    description: 'Makes $60 and $50 free but accidentally gives the $35 control free shipping too.',
    shipping: (subtotalCents) =>
      subtotalCents === 3_500 ? 0 : getStandardShippingCents(subtotalCents),
  },
  {
    id: 'pre-fix',
    label: 'The audited pre-repair rule',
    description: 'The actual seeded defect: compare cents to a dollar-denominated threshold.',
    shipping: (subtotalCents) =>
      subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS * 100 ? 0 : STANDARD_SHIPPING_CENTS,
  },
];

/**
 * Contract-level patch gauntlet. It uses the same cart subtotals and the same
 * deterministic oracle as the storefront; it is not a new Kane browser run.
 */
export function evaluatePatchGauntlet(contract: PromiseContract): GauntletRow[] {
  return CANDIDATES.map((candidate) => {
    const cells = Object.values(PRESET_CARTS).map((preset) => {
      const expectedCents = expectedShippingCents(contract, preset.expectedSubtotalCents);
      const observedCents = candidate.shipping(preset.expectedSubtotalCents);
      return {
        scenarioId: preset.id,
        label: preset.label,
        expectedCents,
        observedCents,
        pass: expectedCents === observedCents,
      };
    });
    return {
      id: candidate.id,
      label: candidate.label,
      description: candidate.description,
      cells,
      pass: cells.every((cell) => cell.pass),
    };
  });
}
