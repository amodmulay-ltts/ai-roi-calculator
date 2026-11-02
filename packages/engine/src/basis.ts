import type { CostCalculation, Scenario, State } from './types.js';

/**
 * The cost lens the scenario uses (F6): total cost of ownership (all lines) or client-chargeable lines only.
 * Every metric, label and export that states a monthly cost should read through these helpers.
 */
export function usesChargeableBasis(scenario: Pick<Scenario, 'costChargeable'>): boolean {
  return scenario.costChargeable === 'chargeable';
}

/** Fully loaded cost per state on the selected lens. */
export function selectedFullyLoaded(cost: CostCalculation, scenario: Pick<Scenario, 'costChargeable'>): Record<State, number> {
  return usesChargeableBasis(scenario) ? cost.chargeableFullyLoaded : cost.fullyLoaded;
}

/** Direct OPEX per state on the selected lens. */
export function selectedDirectOpex(cost: CostCalculation, scenario: Pick<Scenario, 'costChargeable'>): Record<State, number> {
  return usesChargeableBasis(scenario) ? cost.chargeableDirectOpex : cost.directOpex;
}

/** Name of the selected lens, for labels and exports. */
export function costBasisLabel(scenario: Pick<Scenario, 'costChargeable'>): string {
  return usesChargeableBasis(scenario) ? 'Client-chargeable cost' : 'Total cost of ownership (TCO)';
}

/** Every cost row of a state table on the selected lens, so one table never mixes TCO and chargeable rows. */
export interface SelectedCostView {
  directOpex: Record<State, number>;
  overhead: Record<State, number>;
  risk: Record<State, number>;
  fullyLoaded: Record<State, number>;
}

export function selectedCostView(cost: CostCalculation, scenario: Pick<Scenario, 'costChargeable'>): SelectedCostView {
  if (usesChargeableBasis(scenario)) {
    return {
      directOpex: cost.chargeableDirectOpex,
      overhead: cost.chargeableOverhead,
      risk: cost.chargeableRisk,
      fullyLoaded: cost.chargeableFullyLoaded,
    };
  }
  return { directOpex: cost.directOpex, overhead: cost.overhead, risk: cost.risk, fullyLoaded: cost.fullyLoaded };
}
