/**
 * Golden tests from Section 10 of the build prompt
 * These must pass with the default values (INR, in-house, staffing-plan mode)
 */

import { describe, it, expect } from 'vitest';
import {
  calculate,
  createDefaultScenario,
  convertScenarioCurrency,
  fxFactor,
  DEFAULT_FX_RATES_PER_EUR,
  DELIVERY_MODELS,
  DEFAULT_BCC_RATE_FACTOR,
  normalizeScenario,
  parseScenario,
  parseScenarioText,
  scenarioToYaml,
} from '../index.js';
import type { ImplementationModel, Scenario } from '../index.js';

/** The spec's golden values are defined in INR with the staffing plan driving people cost. */
const referenceScenario = (): Scenario => {
  const s = createDefaultScenario('INR');
  s.peopleMode = { mode: 'staffing-plan' };
  return s;
};

describe('Golden Tests - Default Scenario', () => {
  const scenario = referenceScenario();
  const results = calculate(scenario);

  it('should calculate baseline people cost', () => {
    expect(results.cost.peopleCost.baseline).toBeCloseTo(19_640_000, 0);
  });

  it('should calculate transition people cost', () => {
    expect(results.cost.peopleCost.transition).toBeCloseTo(21_290_000, 0);
  });

  it('should calculate mature people cost', () => {
    expect(results.cost.peopleCost.mature).toBeCloseTo(17_405_000, 0);
  });

  it('should calculate baseline direct OPEX', () => {
    expect(results.cost.directOpex.baseline).toBeCloseTo(19_640_000, 0);
  });

  it('should calculate transition direct OPEX', () => {
    expect(results.cost.directOpex.transition).toBeCloseTo(22_403_396, 0);
  });

  it('should calculate mature direct OPEX', () => {
    expect(results.cost.directOpex.mature).toBeCloseTo(18_323_357, 0);
  });

  it('should calculate baseline fully loaded OPEX', () => {
    expect(results.cost.fullyLoaded.baseline).toBeCloseTo(23_568_000.0, 2);
  });

  it('should calculate transition fully loaded OPEX', () => {
    expect(results.cost.fullyLoaded.transition).toBeCloseTo(26_884_075.2, 2);
  });

  it('should calculate mature fully loaded OPEX', () => {
    expect(results.cost.fullyLoaded.mature).toBeCloseTo(21_988_028.4, 2);
  });

  it('should calculate mature monthly saving', () => {
    // Monthly saving = Baseline fully loaded - Mature fully loaded
    const expectedSaving = 23_568_000 - 21_988_028.4;
    expect(results.monthlyForecast[36]?.savingFull || 0).toBeCloseTo(expectedSaving, 0);
  });

  it('should have correct baseline effort FTE', () => {
    expect(results.effort.effortFte.baseline).toBeCloseTo(71.13, 1);
  });

  it('should have correct mature effort saving percentage', () => {
    expect(results.effort.effortSavingPercent.mature * 100).toBeCloseTo(17.85, 1);
  });

  it('should count month-0 investment once in the cumulative series', () => {
    expect(results.monthlyForecast[0]!.cumulativeCashFlow).toBe(-10_000_000);
    expect(results.monthlyForecast[12]!.cumulativeCashFlow).toBeCloseTo(9_167_565.6 - 10_000_000, 2);
  });

  it('should calculate payback month correctly', () => {
    expect(results.financialMetrics.paybackMonth).toBe(13);
  });

  it('should calculate ROI % over 36 months', () => {
    expect(results.financialMetrics.roiPercent).toBeCloseTo(370.87, 1);
  });

  it('should calculate NPV at 10% discount rate', () => {
    expect(Math.abs(results.financialMetrics.npv - 29_610_225)).toBeLessThanOrEqual(1);
  });

  it('should have correct total savings over 36 months', () => {
    expect(results.financialMetrics.totalSavingsOverHorizon).toBeCloseTo(47_086_884.0, 0);
  });

  it('should have correct lowest cumulative position', () => {
    expect(results.financialMetrics.lowestCumulativePosition).toBeCloseTo(-5_052_178.8, 0);
  });

  it('should have correct lowest cumulative month', () => {
    expect(results.financialMetrics.lowestCumulativeMonth).toBe(3);
  });

  it('should have correct breakeven month without investment', () => {
    expect(results.financialMetrics.breakEvenMonth).toBe(7);
  });

  it('should calculate benefit ledger volume effect correctly', () => {
    const volumeEffectLine = results.benefitLedger.find(l => l.category === 'volumeEffect');
    expect(volumeEffectLine?.amount).toBeCloseTo(2_727_777.78, 0);
  });

  it('should calculate benefit ledger mix effect correctly', () => {
    const mixEffectLine = results.benefitLedger.find(l => l.category === 'mixEffect');
    expect(mixEffectLine?.amount).toBeCloseTo(-492_777.78, 0);
  });

  it('should have correct staffing FTE by state', () => {
    expect(results.effort.staffingFte.baseline).toBe(72);
    expect(results.effort.staffingFte.transition).toBeCloseTo(75.2, 1);
    expect(results.effort.staffingFte.mature).toBe(62);
  });

  it('should have zero FTE gap in baseline staffing plan mode', () => {
    expect(results.effort.fteGap.baseline).toBeCloseTo(0.87, 1); // 72 - 71.13
  });
});

describe('Edge Cases', () => {
  it('should handle IRR when no positive flows exist', () => {
    const scenario = referenceScenario();
    // Create a scenario with only negative flows
    scenario.timeValue.horizonMonths = 3;
    scenario.oneTimeInvestment[0]!.amount = 100_000_000; // Very large investment

    const results = calculate(scenario);
    expect(results.financialMetrics.irr).toBeNull();
  });

  it('should handle payback beyond horizon', () => {
    const scenario = referenceScenario();
    scenario.timeValue.horizonMonths = 6;
    scenario.oneTimeInvestment[0]!.amount = 500_000_000; // Very large investment

    const results = calculate(scenario);
    expect(results.financialMetrics.paybackNotInHorizon).toBe(true);
  });

});

describe('Effort-derived people mode (F9)', () => {
  const derived = (edit?: (s: Scenario) => void) => {
    const s = createDefaultScenario('INR');
    edit?.(s);
    return calculate(s);
  };

  it('is the default for new scenarios', () => {
    expect(createDefaultScenario().peopleMode.mode).toBe('effort-derived');
  });

  it('keeps the baseline as the actual team and payroll', () => {
    const r = derived();
    const plan = calculate(referenceScenario());
    expect(r.effort.staffingFte.baseline).toBe(72);
    expect(r.cost.peopleCost.baseline).toBeCloseTo(plan.cost.peopleCost.baseline, 6);
  });

  it('scales the team by the workload ratio and spreads it by the plan mix', () => {
    const r = derived();
    const ratio = r.effort.totalEffort.mature / r.effort.totalEffort.baseline;
    expect(r.effort.staffingFte.mature).toBeCloseTo(72 * ratio, 6);
    // role share of the mature team equals its share in the mature staffing plan (QA Functional Tester: 36 of 62)
    const qaIndex = r.scenario.roles.findIndex(x => x.id === 'qa-ft');
    expect(r.effort.roleFte[qaIndex]!.mature / r.effort.staffingFte.mature).toBeCloseTo(36 / 62, 6);
    expect(r.effort.planFte.mature).toBe(62);
  });

  it('lets the AI productivity assumption drive cost and NPV', () => {
    const base = derived();
    const better = derived(s => {
      const kpi = s.kpis.find(k => k.id === 'testing-effort-per-release')!;
      kpi.overrides.mature = 8_000;
    });
    expect(better.effort.staffingFte.mature).toBeLessThan(base.effort.staffingFte.mature);
    expect(better.financialMetrics.npv).toBeGreaterThan(base.financialMetrics.npv);

    const factorOnly = derived(s => {
      s.kpis.forEach(k => (k.overrides = {}));
      (s.productivityFactor as { mature: number }).mature = 0.3;
    });
    const weakerFactor = derived(s => {
      s.kpis.forEach(k => (k.overrides = {}));
      (s.productivityFactor as { mature: number }).mature = 0.6;
    });
    expect(factorOnly.financialMetrics.npv).toBeGreaterThan(weakerFactor.financialMetrics.npv);
  });

  it('keeps the team unchanged when the delivery model has no AI', () => {
    const r = derived(s => (s.primaryModel = 'bcc-only'));
    expect(r.effort.staffingFte.mature).toBeCloseTo(72, 6);
  });
});

describe('Delivery models', () => {
  const withModel = (model: ImplementationModel) => {
    const s = referenceScenario();
    s.primaryModel = model;
    return calculate(s);
  };

  it('never changes the baseline, whichever model is selected', () => {
    const reference = withModel('onshore-ai').cost.fullyLoaded.baseline;
    for (const model of DELIVERY_MODELS) {
      expect(withModel(model).cost.fullyLoaded.baseline).toBeCloseTo(reference, 6);
    }
  });

  it('treats Onshore with the same delivery as today as the status quo', () => {
    const r = withModel('onshore');
    expect(r.cost.fullyLoaded.mature).toBeCloseTo(r.cost.fullyLoaded.baseline, 6);
    expect(r.financialMetrics.totalInvestment).toBe(0);
    expect(r.financialMetrics.totalSavingsOverHorizon).toBeCloseTo(0, 6);
    expect(r.financialMetrics.paybackMonth).toBeNull();
    expect(r.financialMetrics.paybackNotInHorizon).toBe(false);
  });

  it('runs the transition at today\'s location rates and ramps to the target mix', () => {
    const r = withModel('bcc-only');
    expect(r.cost.peopleCost.transition).toBeCloseTo(r.cost.peopleCost.baseline, 2);
    // Transition carries change costs on top of an unchanged team, so month 1 is a net cost
    expect(r.monthlyForecast[1]!.savingFull).toBeLessThan(0);
  });

  it('applies BCC rates without AI: same FTE, blended rate, no AI lines or AI investment', () => {
    const r = withModel('bcc-only');
    const blend = 1 - 0.8 + 0.8 * DEFAULT_BCC_RATE_FACTOR;
    expect(r.effort.staffingFte.mature).toBeCloseTo(r.effort.staffingFte.baseline, 6);
    expect(r.cost.peopleCost.mature).toBeCloseTo(r.cost.peopleCost.baseline * blend, 2);
    expect(r.effort.effortSavingPercent.mature).toBeCloseTo(0, 6);
    // Only the non-AI items remain: training 2,000,000 + contingency 1,000,000
    expect(r.financialMetrics.totalInvestment).toBe(3_000_000);
    expect(r.cost.fullyLoaded.mature).toBeLessThan(r.cost.fullyLoaded.baseline);
  });

  it('ranks AI + BCC above both of its components on mature run cost', () => {
    const aiBcc = withModel('ai-bcc').cost.fullyLoaded.mature;
    expect(aiBcc).toBeLessThan(withModel('onshore-ai').cost.fullyLoaded.mature);
    expect(aiBcc).toBeLessThan(withModel('bcc-only').cost.fullyLoaded.mature);
  });

  it('scales the AI plan by adoption depth for AI-first', () => {
    const plan = withModel('onshore-ai').effort.staffingFte;
    const first = withModel('ai-first').effort.staffingFte;
    const baseline = plan.baseline;
    expect(first.mature).toBeCloseTo(baseline + (plan.mature - baseline) * 1.25, 6);
  });

  it('reads delivery parameters from the scenario so users can edit them', () => {
    const s = referenceScenario();
    s.primaryModel = 'bcc-only';
    s.bccRateFactor = 1;
    const r = calculate(s);
    expect(r.cost.peopleCost.mature).toBeCloseTo(r.cost.peopleCost.baseline, 2);
  });
});

describe('Scenario import normalization', () => {
  it('fills delivery fields and maps unknown legacy models', () => {
    const legacy = referenceScenario() as any;
    delete legacy.deliveryProfiles;
    delete legacy.bccRateFactor;
    delete legacy.baselineBccShare;
    legacy.primaryModel = 'in-house';
    legacy.costLines.forEach((l: any) => delete l.aiSpecific);

    const s = normalizeScenario(legacy);
    expect(s.primaryModel).toBe('onshore-ai');
    expect(s.bccRateFactor).toBe(DEFAULT_BCC_RATE_FACTOR);
    expect(s.costLines.find(l => l.id === 'llm-tokens')!.aiSpecific).toBe(true);
    expect(() => calculate(s)).not.toThrow();
  });
});

describe('Scenario save and load', () => {
  const edited = () => {
    const s = createDefaultScenario('EUR');
    s.name = 'Acme: "AI" testing\nphase 2';
    s.primaryModel = 'ai-bcc';
    s.deliveryProfiles['ai-bcc'].bccShare = 0.6;
    s.roles[0]!.costPerFte = 8123.45;
    s.costLines[0]!.aiSpecific = false;
    s.oneTimeInvestment.push({ id: 'x', name: 'Pilot', amount: 25_000, month: 2, aiSpecific: true });
    return s;
  };

  it('restores every input and the same results from YAML', () => {
    const original = edited();
    const loaded = parseScenarioText(scenarioToYaml(original));
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.scenario).toEqual(original);
    expect(calculate(loaded.scenario).financialMetrics).toEqual(calculate(original).financialMetrics);
  });

  it('reads the JSON export, including the { scenario, results } wrapper', () => {
    const original = edited();
    const json = JSON.stringify({ scenario: original, results: calculate(original) });
    const loaded = parseScenarioText(json);
    expect(loaded.ok && loaded.scenario).toEqual(original);
  });

  it('rejects invalid files with readable errors instead of crashing', () => {
    expect(parseScenarioText('not: [valid').ok).toBe(false);
    expect(parseScenarioText('name: only a name').ok).toBe(false);

    const s = edited() as any;
    s.timeValue.horizonMonths = 1_000_000_000;
    const result = parseScenario(s);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]).toContain('timeValue.horizonMonths');
  });

  it('rejects files missing KPIs the engine needs', () => {
    const s = edited();
    s.kpis = s.kpis.filter(k => k.id !== 'testing-effort-per-release');
    expect(parseScenario(s).ok).toBe(false);
  });
});

describe('Currency Conversion', () => {
  it('should return to original inputs when converting INR → USD → INR at reciprocal rates', () => {
    const original = referenceScenario();
    const rates = original.fxRatesPerEur;
    const usd = convertScenarioCurrency(original, 'USD', fxFactor('INR', 'USD', rates));
    const back = convertScenarioCurrency(usd, 'INR', fxFactor('USD', 'INR', rates));

    expect(back.baseCurrency).toBe('INR');
    back.roles.forEach((r, i) => {
      expect(r.costPerFte).toBeCloseTo(original.roles[i]!.costPerFte, 2);
      expect(r.billRatePerFte).toBeCloseTo(original.roles[i]!.billRatePerFte, 2);
    });
    back.costLines.forEach((l, i) => {
      expect(l.monthlyAmount.mature).toBeCloseTo(original.costLines[i]!.monthlyAmount.mature, 2);
    });
    back.oneTimeInvestment.forEach((inv, i) => {
      expect(inv.amount).toBeCloseTo(original.oneTimeInvestment[i]!.amount, 2);
    });
  });

  it('should scale money but not ratios or months when converting', () => {
    const inr = calculate(createDefaultScenario('INR'));
    const eur = calculate(createDefaultScenario('EUR'));
    const factor = 1 / DEFAULT_FX_RATES_PER_EUR.INR;

    expect(eur.scenario.baseCurrency).toBe('EUR');
    expect(eur.financialMetrics.npv).toBeCloseTo(inr.financialMetrics.npv * factor, 2);
    expect(eur.financialMetrics.paybackMonth).toBe(inr.financialMetrics.paybackMonth);
    expect(eur.financialMetrics.roiPercent).toBeCloseTo(inr.financialMetrics.roiPercent, 6);
    expect(eur.effort.effortFte.baseline).toBeCloseTo(inr.effort.effortFte.baseline, 6);
  });

  it('should leave inputs unchanged on relabel (factor 1)', () => {
    const inr = referenceScenario();
    const relabelled = convertScenarioCurrency(inr, 'EUR', 1);
    expect(relabelled.baseCurrency).toBe('EUR');
    expect(relabelled.roles[0]!.costPerFte).toBe(inr.roles[0]!.costPerFte);
  });
});
