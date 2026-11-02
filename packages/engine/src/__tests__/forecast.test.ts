/**
 * Behaviour tests for the monthly forecast: what escalates, which cost basis is used, and when the ramp ends.
 */

import { describe, it, expect } from 'vitest';
import { calculate, createDefaultScenario, createExampleScenario } from '../index.js';
import type { Scenario } from '../index.js';

const withEscalation = (rate: number): Scenario => {
  const s = createExampleScenario();
  s.timeValue = { ...s.timeValue, wageEscalationAnnual: rate };
  return s;
};

describe('Wage escalation applies to labour only', () => {
  const base = calculate(withEscalation(0));
  const escalated = calculate(withEscalation(0.1));
  // Month 13 is the first month after the first 12 months, so escalation has been applied once
  const m = 13;

  it('leaves the run cost unchanged when escalation is zero', () => {
    expect(base.monthlyForecast[m]!.runCostFull).toBeCloseTo(base.cost.fullyLoaded.mature, 6);
  });

  it('raises labour by the escalation rate and keeps non-labour flat', () => {
    const { peopleCost, directOpex } = escalated.cost;
    const nonLabourMature = directOpex.mature - peopleCost.mature;
    const overhead = escalated.scenario.globalAssumptions.corporateOverheadPercent.mature;
    const risk = escalated.scenario.globalAssumptions.riskReservePercent.mature;

    const expected = (peopleCost.mature * 1.1 + nonLabourMature) * (1 + overhead + risk);
    expect(escalated.monthlyForecast[m]!.runCostFull).toBeCloseTo(expected, 4);
  });

  it('adds escalation only on the labour part, scaled by overhead and risk', () => {
    const { peopleCost } = base.cost;
    const overhead = base.scenario.globalAssumptions.corporateOverheadPercent.mature;
    const risk = base.scenario.globalAssumptions.riskReservePercent.mature;

    const extra = escalated.monthlyForecast[m]!.runCostFull - base.monthlyForecast[m]!.runCostFull;
    expect(extra).toBeCloseTo(0.1 * peopleCost.mature * (1 + overhead + risk), 4);
  });

  it('escalates the baseline labour and not its non-labour lines', () => {
    const { peopleCost, directOpex } = escalated.cost;
    const nonLabourBaseline = directOpex.baseline - peopleCost.baseline;
    const overhead = escalated.scenario.globalAssumptions.corporateOverheadPercent.baseline;
    const risk = escalated.scenario.globalAssumptions.riskReservePercent.baseline;

    const expected = (peopleCost.baseline * 1.1 + nonLabourBaseline) * (1 + overhead + risk);
    expect(escalated.monthlyForecast[m]!.baselineCostFull).toBeCloseTo(expected, 4);
  });

  it('does not change the non-labour part of the run cost in any month', () => {
    // With no labour in the scenario, the escalation rate must not change any month's run cost
    const withoutLabour = (rate: number): Scenario => {
      const s = withEscalation(rate);
      s.roles = s.roles.map(r => ({ ...r, costPerFte: 0, bccCostPerFte: 0 }));
      return s;
    };
    const noLabour = calculate(withoutLabour(0.25));
    const noLabourBase = calculate(withoutLabour(0));
    for (const month of noLabour.monthlyForecast) {
      if (month.month === 0) continue;
      expect(month.runCostFull).toBeCloseTo(noLabourBase.monthlyForecast[month.month]!.runCostFull, 4);
    }
  });
});

describe('Transition ramp boundary', () => {
  const r = calculate(createExampleScenario());
  const n = r.scenario.globalAssumptions.transitionLengthMonths;
  const { transition, mature } = r.cost.fullyLoaded;

  it('month 1 starts at the transition level', () => {
    expect(r.monthlyForecast[1]!.runCostFull).toBeCloseTo(transition, 6);
  });

  it('month N is still ramping, one step short of mature', () => {
    const expected = transition + (mature - transition) * ((n - 1) / n);
    expect(r.monthlyForecast[n]!.runCostFull).toBeCloseTo(expected, 6);
    expect(r.monthlyForecast[n]!.runCostFull).not.toBeCloseTo(mature, 6);
  });

  it('month N+1 is the first month at the mature level', () => {
    expect(r.monthlyForecast[n + 1]!.runCostFull).toBeCloseTo(mature, 6);
  });
});

describe('Cost basis drives the forecast', () => {
  it('uses chargeable cost for the baseline and run cost when chargeable is selected', () => {
    const s = createExampleScenario();
    s.costChargeable = 'chargeable';
    const r = calculate(s);
    const m = r.monthlyForecast[12]!;
    expect(m.runCostChargeable).toBeCloseTo(r.cost.chargeableFullyLoaded.mature, 6);
    expect(m.baselineCostChargeable).toBeCloseTo(r.cost.chargeableFullyLoaded.baseline, 6);
    expect(m.netCashFlow).toBeCloseTo(m.savingChargeable, 6);
  });
});

describe('Selected cost basis reaches every reader', () => {
  const chargeableOf = (s: Scenario): Scenario => ({ ...s, costChargeable: 'chargeable' });

  it('uses the chargeable lens for the mature average, monthly saving and cost rows', async () => {
    // The reference scenario carries a non-chargeable capex line, so the two lenses really differ
    const tco = calculate(createDefaultScenario());
    const chargeable = calculate(chargeableOf(createDefaultScenario()));
    expect(chargeable.cost.chargeableFullyLoaded.mature).toBeLessThan(tco.cost.fullyLoaded.mature);

    expect(tco.matureMonthlyAverage).toBeCloseTo(tco.cost.fullyLoaded.mature, 6);
    expect(chargeable.matureMonthlyAverage).toBeCloseTo(chargeable.cost.chargeableFullyLoaded.mature, 6);

    const { matureMonthlySaving } = await import('../index.js');
    expect(matureMonthlySaving(chargeable)).toBeCloseTo(
      chargeable.cost.chargeableFullyLoaded.baseline - chargeable.cost.chargeableFullyLoaded.mature,
      6
    );
  });

  it('selects one consistent set of cost rows for each lens', async () => {
    const { selectedCostView } = await import('../index.js');
    const r = calculate(createDefaultScenario());
    const tcoView = selectedCostView(r.cost, { costChargeable: 'tco' });
    const chargeableView = selectedCostView(r.cost, { costChargeable: 'chargeable' });

    expect(tcoView.fullyLoaded).toEqual(r.cost.fullyLoaded);
    expect(tcoView.overhead).toEqual(r.cost.overhead);
    expect(chargeableView.overhead).toEqual(r.cost.chargeableOverhead);
    expect(chargeableView.risk).toEqual(r.cost.chargeableRisk);
    expect(chargeableView.directOpex).toEqual(r.cost.chargeableDirectOpex);
    // Each lens reconciles: direct + overhead + risk = fully loaded
    for (const view of [tcoView, chargeableView]) {
      for (const state of ['baseline', 'transition', 'mature'] as const) {
        expect(view.directOpex[state] + view.overhead[state] + view.risk[state]).toBeCloseTo(view.fullyLoaded[state], 6);
      }
    }
  });

  it('labels the lens so exports can state it', async () => {
    const { costBasisLabel } = await import('../index.js');
    expect(costBasisLabel({ costChargeable: 'tco' })).toMatch(/total cost of ownership/i);
    expect(costBasisLabel({ costChargeable: 'chargeable' })).toMatch(/client-chargeable/i);
  });
});
