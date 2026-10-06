/**
 * Golden tests from Section 10 of the build prompt
 * These must pass with the default values (INR, in-house, staffing-plan mode)
 */

import { describe, it, expect } from 'vitest';
import {
  calculate,
  createDefaultScenario,
  createExampleScenario,
  AUTOMOTIVE_TEMPLATE,
  compareDeliveryModels,
  tornado,
  paybackGrid,
  advise,
  breakEvenRealisation,
  withRealisedEffortReduction,
  convertScenarioCurrency,
  fxFactor,
  DEFAULT_FX_RATES_PER_EUR,
  DELIVERY_MODELS,
  DEFAULT_BCC_RATE_FACTOR,
  normalizeScenario,
  effectiveRate,
  deliveryContext,
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

describe('Example scenario', () => {
  const r = calculate(createExampleScenario());

  it('is built from the automotive use-case template', () => {
    const s = createExampleScenario();
    expect(s.roles).toEqual(AUTOMOTIVE_TEMPLATE.roles);
    expect(s.kpis).toEqual(AUTOMOTIVE_TEMPLATE.kpis);
    expect(s.llmUsage).toEqual(AUTOMOTIVE_TEMPLATE.llmUsage);
    expect(s.baseCurrency).toBe(AUTOMOTIVE_TEMPLATE.rateCurrency);
    // Copies, so editing the example never changes the template
    s.roles[0]!.costPerFte = 1;
    expect(AUTOMOTIVE_TEMPLATE.roles[0]!.costPerFte).not.toBe(1);
  });

  it('is marked as an example and survives save/load with the flag', () => {
    expect(r.scenario.isExample).toBe(true);
    const loaded = parseScenarioText(scenarioToYaml(createExampleScenario()));
    expect(loaded.ok && loaded.scenario.isExample).toBe(true);
  });

  it('tells a simple story: 33 FTE whose work equals the team, 30% less AI-assisted effort, payback in year two', () => {
    expect(r.scenario.useCase).toContain('Automotive');
    expect(r.effort.staffingFte.baseline).toBe(33);
    expect(r.effort.totalEffort.baseline).toBe(33 * 160);
    expect(r.effort.effortFte.baseline).toBeCloseTo(33, 6);
    expect(r.effort.effortSavingPercent.mature).toBeCloseTo(0.3, 6);
    expect(r.financialMetrics.totalInvestment).toBe(430_000);
    expect(r.financialMetrics.paybackMonth).toBeGreaterThan(12);
    expect(r.financialMetrics.paybackMonth).toBeLessThanOrEqual(18);
    expect(r.financialMetrics.npv).toBeGreaterThan(0);
  });

  it('keeps the staffing plan within 5% of the derived team, so no warning shows', () => {
    const gap = Math.abs(r.effort.planFte.mature - r.effort.staffingFte.mature) / r.effort.staffingFte.mature;
    expect(gap).toBeLessThan(0.05);
  });
});

describe('Generic workload', () => {
  it('computes effort from any set of volume × hours items', () => {
    const s = createExampleScenario();
    s.kpis = [
      { id: 'tickets', name: 'Tickets', unit: 'hrs/ticket', baseline: 0.5, appliesToFactor: true, isVelocity: false, overrides: {}, volumePerMonth: 4_000, volumeUnit: 'tickets', reviewOverheadApplies: true },
      { id: 'meetings', name: 'Coordination', unit: 'hrs/month', baseline: 960, appliesToFactor: false, isVelocity: false, overrides: {}, volumePerMonth: 1, reviewOverheadApplies: false },
    ];
    const r = calculate(s);
    const o = s.aiOverheadPercent.mature;
    const factor = s.productivityFactor.mode === 'direct-factor' ? s.productivityFactor.mature : 1;
    expect(r.effort.workloadHours['tickets']!.baseline).toBe(2_000);
    expect(r.effort.totalEffort.baseline).toBe(2_960);
    // tickets drop by the AI factor plus review overhead; coordination is not AI-affected
    expect(r.effort.totalEffort.mature).toBeCloseTo(2_000 * factor * (1 + o.hitl + o.rework + o.dualRun) + 960, 6);
    expect(r.effort.effortSavingPercent.mature).toBeCloseTo(1 - factor, 6);
  });

  it('upgrades files saved with releases/defects per month to workload volumes', () => {
    const legacy = referenceScenario() as any;
    legacy.globalAssumptions.releasesPerMonth = 1;
    legacy.globalAssumptions.defectsPerMonth = 300;
    legacy.kpis.forEach((k: any) => {
      delete k.volumePerMonth;
      delete k.volumeUnit;
      delete k.reviewOverheadApplies;
    });
    const loaded = parseScenario(legacy);
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(calculate(loaded.scenario).financialMetrics.npv).toBeCloseTo(calculate(referenceScenario()).financialMetrics.npv, 4);
  });
});

describe('TCO versus client-chargeable (F6)', () => {
  it('drives savings and metrics from the chosen basis', () => {
    const tco = calculate(referenceScenario());
    const chargeableScenario = referenceScenario();
    chargeableScenario.costChargeable = 'chargeable';
    const chargeable = calculate(chargeableScenario);

    // The reference has a non-chargeable capex line (100,000 a month in transition and mature)
    expect(chargeable.financialMetrics.npv).not.toBeCloseTo(tco.financialMetrics.npv, 0);
    const m = chargeable.monthlyForecast[12]!;
    expect(m.netCashFlow).toBeCloseTo(m.savingChargeable, 6);
    expect(m.baselineCostChargeable).toBeCloseTo(chargeable.cost.chargeableFullyLoaded.baseline, 6);
    expect(chargeable.financialMetrics.totalSavingsOverHorizon).toBeGreaterThan(tco.financialMetrics.totalSavingsOverHorizon);
  });
});

describe('Cost avoidance (F7)', () => {
  const withExtra = (included: boolean) => {
    const s = createExampleScenario();
    s.kpis = s.kpis.map(k => (k.id === 'requirements' ? { ...k, extraVolumePerMonth: 1 } : k));
    s.costAvoidanceIncludedInRoi = included;
    return calculate(s);
  };

  it('values extra demand as hours saved per unit × baseline hourly rate', () => {
    const r = withExtra(false);
    const s = r.scenario;
    const o = s.aiOverheadPercent.mature;
    const factor = s.productivityFactor.mode === 'direct-factor' ? s.productivityFactor.mature : 1;
    const hoursEach = s.kpis.find(k => k.id === 'requirements')!.baseline;
    const rate = r.cost.peopleCost.baseline / (r.effort.staffingFte.baseline * s.globalAssumptions.workingHrsPerFtePerMonth);
    const savedPerRequirement = hoursEach - hoursEach * factor * (1 + o.hitl + o.rework + o.dualRun);
    expect(r.cost.costAvoidance.mature).toBeCloseTo(savedPerRequirement * rate, 4);
    expect(r.benefitLedger.some(l => l.category === 'costAvoidance')).toBe(true);
  });

  it('is excluded from ROI unless switched on', () => {
    const base = calculate(createExampleScenario()).financialMetrics.npv;
    expect(withExtra(false).financialMetrics.npv).toBeCloseTo(base, 4);
    expect(withExtra(true).financialMetrics.npv).toBeGreaterThan(base);
  });
});

describe('Sensitivity (5.7)', () => {
  it('ranks the six business drivers by their NPV swing', () => {
    const s = createExampleScenario();
    const t = tornado(s);
    expect(t.baseNpv).toBeCloseTo(calculate(s).financialMetrics.npv, 6);
    expect(t.rows.map(r => r.id).sort()).toEqual(['ai-costs', 'ai-effect', 'investment', 'overhead', 'rates', 'transition']);
    for (let i = 1; i < t.rows.length; i++) expect(t.rows[i - 1]!.range).toBeGreaterThanOrEqual(t.rows[i]!.range);

    const investment = t.rows.find(r => r.id === 'investment')!;
    expect(investment.npvHigh).toBeLessThan(t.baseNpv);
    const aiEffect = t.rows.find(r => r.id === 'ai-effect')!;
    expect(aiEffect.npvHigh).toBeGreaterThan(aiEffect.npvLow);
  });

  it('shows payback for AI effect × transition length, with the base case in the grid', () => {
    const s = createExampleScenario();
    const g = paybackGrid(s);
    expect(g.cells[g.base.row]![g.base.col]).toBe(calculate(s).financialMetrics.paybackMonth);
    // More of the AI effect never delays payback
    const col = g.cells.map(row => row[g.base.col] ?? Infinity);
    for (let i = 1; i < col.length; i++) expect(col[i]!).toBeLessThanOrEqual(col[i - 1]!);
  });
});

describe('AI model usage cost', () => {
  it('costs requests × tokens × price, converted from USD and following the workload volume', () => {
    const s = createExampleScenario();
    s.llmUsage = [
      { id: 'u', name: 'Generation', priceId: 'claude-sonnet-5-5', kpiId: 'requirements', requestsPerUnit: 1_000, inputTokensPerRequest: 1_000_000, outputTokensPerRequest: 0 },
    ];
    const r = calculate(s);
    // 40 requirements × 1,000 requests × 1M input tokens × $2 / M tok = $80,000 → EUR at the scenario rate
    const expected = (40 * 1_000 * 2) / s.fxRatesPerEur.USD;
    expect(r.cost.llmRequestsPerMonth['u']).toBe(40_000);
    expect(r.cost.llmCost.mature).toBeCloseTo(expected, 6);
    expect(r.cost.llmCost.baseline).toBe(0);

    const doubled = { ...s, kpis: s.kpis.map(k => (k.id === 'requirements' ? { ...k, volumePerMonth: 80 } : k)) };
    expect(calculate(doubled).cost.llmCost.mature).toBeCloseTo(expected * 2, 6);
  });

  it('flows into run cost, scales with AI adoption and keeps the ledger reconciled', () => {
    const base = createExampleScenario();
    const without = calculate({ ...base, llmUsage: [] });
    const withUsage = calculate(base);
    expect(withUsage.cost.directOpex.mature - without.cost.directOpex.mature).toBeCloseTo(withUsage.cost.llmCost.mature, 6);

    const noAi = calculate({ ...base, primaryModel: 'bcc-only' });
    expect(noAi.cost.llmCost.mature).toBe(0);

    const ledger = withUsage.benefitLedger.reduce((sum, l) => sum + l.amount, 0);
    expect(ledger).toBeCloseTo(withUsage.cost.fullyLoaded.baseline - withUsage.cost.fullyLoaded.mature, 2);
  });

  it('uses edited prices from the scenario and survives save/load', () => {
    const s = createExampleScenario();
    const before = calculate(s).cost.llmCost.mature;
    s.llmPricing.prices = s.llmPricing.prices.map(p => ({ ...p, inputPerMTok: p.inputPerMTok * 2, outputPerMTok: p.outputPerMTok * 2 }));
    expect(calculate(s).cost.llmCost.mature).toBeCloseTo(before * 2, 6);

    const loaded = parseScenarioText(scenarioToYaml(s));
    expect(loaded.ok && loaded.scenario.llmPricing).toEqual(s.llmPricing);
  });

  it('flags model prices older than 90 days', () => {
    const s = createExampleScenario();
    s.llmPricing.asOf = '2020-01-01';
    expect(advise(s, calculate(s)).findings.some(f => f.id === 'llm-prices-stale')).toBe(true);
  });
});

describe('Advice', () => {
  const adviceFor = (edit?: (s: Scenario) => void) => {
    const s = createExampleScenario();
    edit?.(s);
    return advise(s, calculate(s));
  };
  const cut = (share: number) => (s: Scenario) => {
    if (s.productivityFactor.mode === 'direct-factor') {
      s.productivityFactor.mature = 1 - share;
      s.productivityFactor.transition = 1 - share / 2;
    }
  };

  it('calls the example strong and states payback and value from the results', () => {
    const a = adviceFor();
    expect(a.tone).toBe('strong');
    expect(a.headline).toContain(`month ${calculate(createExampleScenario()).financialMetrics.paybackMonth}`);
    expect(a.findings.some(f => f.id === 'example')).toBe(true);
  });

  it('separates strong, marginal and negative cases by the effort cut', () => {
    expect(adviceFor(cut(0.25)).tone).toBe('marginal');
    const negative = adviceFor(cut(0.15));
    expect(negative.tone).toBe('negative');
    expect(negative.findings[0]!.severity).toBe('warning');
    expect(negative.findings.some(f => f.id === 'transition-dip')).toBe(false);
  });

  it('reports no change for the status quo without further findings', () => {
    const a = adviceFor(s => (s.primaryModel = 'onshore'));
    expect(a.tone).toBe('no-change');
    expect(a.findings).toHaveLength(0);
  });

  it('finds the share of the AI effect needed to break even, keeping all costs', () => {
    const s = createExampleScenario();
    const share = breakEvenRealisation(s)!;
    expect(share).toBeGreaterThan(0);
    expect(share).toBeLessThan(1);
    expect(calculate(withRealisedEffortReduction(s, share)).financialMetrics.npv).toBeGreaterThanOrEqual(0);
    expect(calculate(withRealisedEffortReduction(s, share - 0.01)).financialMetrics.npv).toBeLessThan(0);
    // Costs are untouched by the test
    expect(withRealisedEffortReduction(s, 0).costLines).toEqual(s.costLines);
  });

  it('flags overrides, a missing overhead rationale and the staffing-plan gap', () => {
    const a = adviceFor(s => {
      s.kpis[0]!.overrides.mature = 1_500;
      s.globalAssumptions.corporateOverheadPercent.mature = 0.15;
      s.roles[1]!.fte.mature = 5;
    });
    const ids = a.findings.map(f => f.id);
    expect(ids).toEqual(expect.arrayContaining(['overrides', 'overhead-rationale', 'fte-gap']));
    expect(a.findings.findIndex(f => f.severity === 'info')).toBeGreaterThan(a.findings.findIndex(f => f.severity === 'warning'));
  });
});

describe('Onshore and offshore rates per role', () => {
  const bccMature = (edit: (s: Scenario) => void) => {
    const s = createExampleScenario();
    s.primaryModel = 'bcc-only';
    edit(s);
    return { s, r: calculate(s) };
  };

  it("blends each role's own onshore and offshore rate by the offshore share", () => {
    const { s, r } = bccMature(sc => {
      sc.roles = sc.roles.map(role => ({ ...role, offshorable: true, bccCostPerFte: 4_000 }));
    });
    const share = s.deliveryProfiles['bcc-only'].bccShare;
    const expected = s.roles.reduce((sum, role, i) => sum + r.effort.roleFte[i]!.mature * ((1 - share) * role.costPerFte + share * 4_000), 0);
    expect(r.cost.peopleCost.mature).toBeCloseTo(expected, 6);
  });

  it('falls back to onshore × default factor when a role has no offshore rate', () => {
    const { s, r } = bccMature(sc => {
      sc.roles = sc.roles.map(role => ({ ...role, offshorable: true, bccCostPerFte: undefined }));
    });
    const share = s.deliveryProfiles['bcc-only'].bccShare;
    const blend = 1 - share + share * s.bccRateFactor;
    const expected = s.roles.reduce((sum, role, i) => sum + r.effort.roleFte[i]!.mature * role.costPerFte * blend, 0);
    expect(r.cost.peopleCost.mature).toBeCloseTo(expected, 6);
  });

  it('keeps roles that cannot be offshored at the onshore rate', () => {
    const { r } = bccMature(() => {});
    const safety = r.scenario.roles.findIndex(role => role.id === 'safety-eng');
    expect(r.scenario.roles[safety]!.offshorable).toBe(false);
    expect(effectiveRate(r.scenario.roles[safety]!, 'mature', deliveryContext(r.scenario))).toBe(r.scenario.roles[safety]!.costPerFte);
  });

  it('converts offshore rates with the currency', () => {
    const s = createExampleScenario();
    s.roles[0]!.bccCostPerFte = 5_000;
    const usd = convertScenarioCurrency(s, 'USD', fxFactor('EUR', 'USD', s.fxRatesPerEur));
    expect(usd.roles[0]!.bccCostPerFte).toBeCloseTo(5_000 * s.fxRatesPerEur.USD, 6);
    expect(usd.roles[1]!.bccCostPerFte).toBeUndefined();
  });
});

describe('Benefit ledger notes', () => {
  it('formats amounts in the scenario currency, not a hardcoded symbol', () => {
    const eur = calculate(createExampleScenario()).benefitLedger;
    expect(eur.every(l => !l.notes.includes('₹'))).toBe(true);
    expect(eur.some(l => l.notes.includes('€'))).toBe(true);

    const inr = calculate(referenceScenario()).benefitLedger;
    expect(inr.some(l => l.notes.includes('₹'))).toBe(true);
    expect(inr.every(l => !l.notes.includes('€'))).toBe(true);
  });
});

describe('Delivery model comparison', () => {
  it('calculates all five models against one baseline and ranks them by NPV', () => {
    const rows = compareDeliveryModels(createExampleScenario());
    expect(rows.map(r => r.model)).toEqual(DELIVERY_MODELS);
    const baseline = rows[0]!.results.cost.fullyLoaded.baseline;
    rows.forEach(r => expect(r.results.cost.fullyLoaded.baseline).toBeCloseTo(baseline, 6));

    const best = rows.find(r => r.rank === 1)!;
    rows.forEach(r => expect(best.results.financialMetrics.npv).toBeGreaterThanOrEqual(r.results.financialMetrics.npv));
    expect(new Set(rows.map(r => r.rank)).size).toBe(5);
  });

  it('matches calculating each model on its own and respects edited profiles', () => {
    const s = createExampleScenario();
    s.deliveryProfiles['ai-bcc'].bccShare = 0.3;
    const row = compareDeliveryModels(s).find(r => r.model === 'ai-bcc')!;
    expect(row.results.financialMetrics).toEqual(calculate({ ...s, primaryModel: 'ai-bcc' }).financialMetrics);
  });

  it('does not change the scenario passed in', () => {
    const s = createExampleScenario();
    compareDeliveryModels(s);
    expect(s.primaryModel).toBe('onshore-ai');
  });
});

describe('IRR', () => {
  it('solves fast-payback cases above 200% instead of capping', () => {
    const fast = createExampleScenario();
    fast.oneTimeInvestment = fast.oneTimeInvestment.map(i => ({ ...i, amount: i.amount * 0.1 }));
    const irr = calculate(fast).financialMetrics.irr!;
    expect(irr).toBeGreaterThan(2);
    // NPV at the solved annual rate is ~0
    const flows = calculate(fast).monthlyForecast.map(m => m.netCashFlow);
    const monthly = Math.pow(1 + irr, 1 / 12) - 1;
    const npv = flows.reduce((sum, f, m) => sum + f / Math.pow(1 + monthly, m), 0);
    expect(Math.abs(npv)).toBeLessThan(1);
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

  it('keeps the rate unit and rejects unknown units', () => {
    const s = edited();
    s.rateUnit = 'hour';
    const loaded = parseScenarioText(scenarioToYaml(s));
    expect(loaded.ok && loaded.scenario.rateUnit).toBe('hour');
    expect(parseScenario({ ...s, rateUnit: 'week' }).ok).toBe(false);
  });

  it('rejects files without any workload item', () => {
    const s = edited();
    s.kpis = [{ id: 'coverage', name: 'Automation coverage', unit: '%', baseline: 40, appliesToFactor: false, isVelocity: false, overrides: {} }];
    const result = parseScenario(s);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]).toContain('workload');
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
