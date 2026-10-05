import type { Role, Scenario } from '@ai-roi-calc/engine';

export type RateUnit = 'hour' | 'month';

export const rateUnitOf = (scenario: Scenario): RateUnit => scenario.rateUnit ?? 'month';

/** A role's cost rate in the chosen unit; the engine stores cost per FTE per month. */
export function displayRate(role: Role, unit: RateUnit, hoursPerFte: number): number {
  return unit === 'hour' ? role.costPerFte / hoursPerFte : role.costPerFte;
}

/** Monthly cost per FTE from a rate entered in the chosen unit. */
export function monthlyFromRate(rate: number, unit: RateUnit, hoursPerFte: number): number {
  return unit === 'hour' ? rate * hoursPerFte : rate;
}

export const rateSuffix = (unit: RateUnit) => (unit === 'hour' ? '/ hour' : '/ month');
