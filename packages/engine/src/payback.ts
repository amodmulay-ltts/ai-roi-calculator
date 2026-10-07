import type { Results } from './types.js';

/** Monthly saving once mature, on the cost basis the scenario uses. Negative = costs more than today. */
export function matureMonthlySaving(results: Results): number {
  const { scenario, cost } = results;
  const runCost = scenario.costChargeable === 'chargeable' ? cost.chargeableFullyLoaded : cost.fullyLoaded;
  return runCost.baseline - runCost.mature;
}

/**
 * Why a case does or does not pay back. "Not recovered within the horizon" is only true when there is
 * a saving to recover the investment from; when the change costs more every month than today, the
 * honest statement is that it never pays back, at any horizon.
 */
export type PaybackStatus = 'pays-back' | 'too-slow' | 'never' | 'no-change';

export function paybackStatus(results: Results): PaybackStatus {
  const fm = results.financialMetrics;
  if (fm.paybackMonth === null && !fm.paybackNotInHorizon) return 'no-change';
  if (!fm.paybackNotInHorizon) return 'pays-back';
  return matureMonthlySaving(results) > 0 ? 'too-slow' : 'never';
}

/** Short label for tiles and tables. */
export function paybackLabel(results: Results): string {
  switch (paybackStatus(results)) {
    case 'pays-back':
      return `Month ${results.financialMetrics.paybackMonth}`;
    case 'too-slow':
      return `Not within ${results.scenario.timeValue.horizonMonths} months`;
    case 'never':
      return 'Never';
    case 'no-change':
      return 'No change';
  }
}

/** One-sentence headline for the cash-flow chart. */
export function paybackHeadline(results: Results, money: (v: number) => string): string {
  const saving = matureMonthlySaving(results);
  const horizon = results.scenario.timeValue.horizonMonths;
  switch (paybackStatus(results)) {
    case 'pays-back':
      return `The investment is recovered in month ${results.financialMetrics.paybackMonth}`;
    case 'too-slow':
      return `A saving of ${money(saving)} a month does not recover the investment within ${horizon} months`;
    case 'never':
      return `Once mature this costs ${money(-saving)} a month more than today, so it never pays back`;
    case 'no-change':
      return 'No cash moves: this model keeps today’s setup';
  }
}
