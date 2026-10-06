import type { Currency, Scenario } from './types.js';

export const CURRENCIES: Currency[] = ['EUR', 'USD', 'GBP', 'JPY', 'INR', 'AED', 'SGD', 'AUD', 'CAD', 'CHF'];

// Indicative mid-market rates, units of each currency per 1 EUR. Users edit these per scenario.
export const DEFAULT_FX_RATES_PER_EUR: Record<Currency, number> = {
  EUR: 1,
  USD: 1.16,
  GBP: 0.86,
  JPY: 170,
  INR: 100,
  AED: 4.26,
  SGD: 1.5,
  AUD: 1.78,
  CAD: 1.6,
  CHF: 0.94,
};

export const DEFAULT_FX_RATES_NOTE = 'Indicative rates, not live. Verify before sharing with a client.';

export function fxFactor(from: Currency, to: Currency, ratesPerEur: Record<Currency, number>): number {
  return ratesPerEur[to] / ratesPerEur[from];
}

/** Multiplies every monetary input by `factor` and sets the new currency. Non-monetary inputs are untouched. */
export function convertScenarioCurrency(scenario: Scenario, to: Currency, factor: number): Scenario {
  const money = (v: number) => v * factor;

  return {
    ...scenario,
    baseCurrency: to,
    roles: scenario.roles.map(r => ({
      ...r,
      costPerFte: money(r.costPerFte),
      ...(r.bccCostPerFte !== undefined && { bccCostPerFte: money(r.bccCostPerFte) }),
    })),
    costLines: scenario.costLines.map(l => ({
      ...l,
      monthlyAmount: {
        baseline: money(l.monthlyAmount.baseline),
        transition: money(l.monthlyAmount.transition),
        mature: money(l.monthlyAmount.mature),
      },
    })),
    oneTimeInvestment: scenario.oneTimeInvestment.map(i => ({ ...i, amount: money(i.amount) })),
  };
}
