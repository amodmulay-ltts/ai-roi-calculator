import type { FinancialMetrics, Scenario } from './types.js';
import { calculate } from './engine.js';
import { withRealisedEffortReduction } from './advice.js';

export interface TornadoRow {
  id: string;
  label: string;
  /** What the −20% / +20% variation means for this driver. */
  lowLabel: string;
  highLabel: string;
  npvLow: number;
  npvHigh: number;
  /** |npvHigh − npvLow| */
  range: number;
}

export interface TornadoResult {
  baseNpv: number;
  /** Most sensitive first. */
  rows: TornadoRow[];
}

const SWING = 0.2;

type Variation = (s: Scenario, factor: number) => Scenario;

const scaleAiCosts: Variation = (s, f) => ({
  ...s,
  costLines: s.costLines.map(l =>
    l.aiSpecific
      ? { ...l, monthlyAmount: { baseline: l.monthlyAmount.baseline * f, transition: l.monthlyAmount.transition * f, mature: l.monthlyAmount.mature * f } }
      : l
  ),
  llmPricing: {
    ...s.llmPricing,
    prices: s.llmPricing.prices.map(p => ({ ...p, inputPerMTok: p.inputPerMTok * f, outputPerMTok: p.outputPerMTok * f })),
  },
});

const DRIVERS: Array<{ id: string; label: string; vary: Variation; describe: (s: Scenario, f: number) => string }> = [
  {
    id: 'ai-effect',
    label: 'AI effort reduction',
    vary: (s, f) => withRealisedEffortReduction(s, f),
    describe: (_s, f) => `${Math.round(f * 100)}% of the assumed reduction`,
  },
  {
    id: 'ai-costs',
    label: 'AI running costs',
    vary: scaleAiCosts,
    describe: (_s, f) => `${f < 1 ? '−' : '+'}20% AI tools, infrastructure and model prices`,
  },
  {
    id: 'rates',
    label: 'Role rates',
    vary: (s, f) => ({ ...s, roles: s.roles.map(r => ({ ...r, costPerFte: r.costPerFte * f })) }),
    describe: (_s, f) => `${f < 1 ? '−' : '+'}20% cost per FTE`,
  },
  {
    id: 'overhead',
    label: 'Overhead and risk %',
    vary: (s, f) => ({
      ...s,
      globalAssumptions: {
        ...s.globalAssumptions,
        corporateOverheadPercent: scale(s.globalAssumptions.corporateOverheadPercent, f),
        riskReservePercent: scale(s.globalAssumptions.riskReservePercent, f),
      },
    }),
    describe: (_s, f) => `${f < 1 ? '−' : '+'}20% of the percentages`,
  },
  {
    id: 'transition',
    label: 'Transition length',
    vary: (s, f) => ({ ...s, globalAssumptions: { ...s.globalAssumptions, transitionLengthMonths: transitionMonths(s, f) } }),
    describe: (s, f) => `${transitionMonths(s, f)} months`,
  },
  {
    id: 'investment',
    label: 'One-off investment',
    vary: (s, f) => ({ ...s, oneTimeInvestment: s.oneTimeInvestment.map(i => ({ ...i, amount: i.amount * f })) }),
    describe: (_s, f) => `${f < 1 ? '−' : '+'}20%`,
  },
];

function scale<T extends Record<string, number>>(values: T, f: number): T {
  return Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v * f])) as T;
}

function transitionMonths(s: Scenario, f: number): number {
  const base = s.globalAssumptions.transitionLengthMonths;
  const varied = Math.round(base * f);
  // Always move by at least one month so the driver is visible for short transitions
  return Math.max(1, varied === base ? base + (f < 1 ? -1 : 1) : varied);
}

/** NPV when each driver moves −20% / +20% on its own (spec 5.7). */
export function tornado(scenario: Scenario): TornadoResult {
  const baseNpv = calculate(scenario).financialMetrics.npv;
  const rows = DRIVERS.map(d => {
    const npvLow = calculate(d.vary(scenario, 1 - SWING)).financialMetrics.npv;
    const npvHigh = calculate(d.vary(scenario, 1 + SWING)).financialMetrics.npv;
    return {
      id: d.id,
      label: d.label,
      lowLabel: d.describe(scenario, 1 - SWING),
      highLabel: d.describe(scenario, 1 + SWING),
      npvLow,
      npvHigh,
      range: Math.abs(npvHigh - npvLow),
    };
  }).sort((a, b) => b.range - a.range);
  return { baseNpv, rows };
}

export interface PaybackGrid {
  /** Share of the assumed AI effort reduction that materialises, per row. */
  realisation: number[];
  /** Transition length in months, per column. */
  transitionMonths: number[];
  /** cells[row][col]; null = no payback within the horizon. */
  cells: Array<Array<FinancialMetrics['paybackMonth']>>;
  base: { row: number; col: number };
}

/** Payback month for AI effort reduction × transition length (spec 5.7 two-way table). */
export function paybackGrid(scenario: Scenario): PaybackGrid {
  const realisation = [0.6, 0.8, 1, 1.2, 1.4];
  const n = scenario.globalAssumptions.transitionLengthMonths;
  const transition = [...new Set([n - 2, n - 1, n, n + 2, n + 4].map(m => Math.max(1, m)))].sort((a, b) => a - b);
  const cells = realisation.map(share =>
    transition.map(months => {
      const s = withRealisedEffortReduction(scenario, share);
      s.globalAssumptions = { ...s.globalAssumptions, transitionLengthMonths: months };
      const fm = calculate(s).financialMetrics;
      return fm.paybackNotInHorizon ? null : fm.paybackMonth;
    })
  );
  return { realisation, transitionMonths: transition, cells, base: { row: realisation.indexOf(1), col: transition.indexOf(n) } };
}
