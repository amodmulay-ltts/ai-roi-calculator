import { describe, it, expect } from 'vitest';
import { createDefaultInputs, HORIZON_MONTHS, CASE_FACTORS, MARGINAL_ROI_PERCENT } from '../defaults.js';

describe('createDefaultInputs', () => {
  it('matches the spec defaults', () => {
    const d = createDefaultInputs();
    expect(d.teamSize).toBe(30);
    expect(d.loadedCostPerFteYear).toBe(80000);
    expect(d.hoursPerFteMonth).toBe(160);
    expect(d.dataConstraint).toBe('public-ok');
    expect(d.workTemplateId).toBe('software-testing');
    expect(d.cashShare).toBe(0.7);
    expect(d.retiredCostMonthly).toBe(0);
    expect(d.rampMonths).toBe(6);
    expect(d.governanceMonthly).toBe(3000);
    expect(d.dataReadinessInvestment).toBe(60000);
    expect(d.governanceSetup).toBe(25000);
    expect(d.trainingPerFte).toBe(800);
    expect(d.hybridComplexTier).toBe('enterprise');
    expect(d.readiness).toEqual({ data: 'ready', skills: 'ready', sponsorship: 'ready', compliance: 'ready' });
  });

  it('starts from the software testing template: five phases, each with 80% AI use', () => {
    const d = createDefaultInputs();
    expect(d.phases.map(p => [p.name, p.aiUse])).toEqual([
      ['Design', 0.8],
      ['Build', 0.8],
      ['Execute', 0.8],
      ['Analyse', 0.8],
      ['Report', 0.8],
    ]);
  });

  it('lists the five tasks in order, each in its phase, with shares summing to 1', () => {
    const d = createDefaultInputs();
    expect(d.tasks.map(t => [t.id, t.name, t.phase, t.share, t.difficulty])).toEqual([
      ['testDesign', 'Test design', 'Design', 0.3, 'complex'],
      ['scriptDev', 'Script development', 'Build', 0.25, 'routine'],
      ['execution', 'Test execution', 'Execute', 0.25, 'routine'],
      ['defectAnalysis', 'Defect analysis', 'Analyse', 0.1, 'complex'],
      ['reporting', 'Reporting', 'Report', 0.1, 'routine'],
    ]);
    expect(d.tasks.reduce((s, t) => s + t.share, 0)).toBeCloseTo(1, 10);
  });

  it('sets the three tiers exactly', () => {
    const d = createDefaultInputs();
    expect(d.tiers.local).toEqual({
      reductionRoutine: 0.3,
      reductionComplex: 0.1,
      reviewRoutine: 0.2,
      reviewComplex: 0.5,
      usageCostPerAssistedHour: 0,
      platformMonthly: 7000,
      setup: 130000,
    });
    expect(d.tiers.enterprise).toEqual({
      reductionRoutine: 0.5,
      reductionComplex: 0.4,
      reviewRoutine: 0.15,
      reviewComplex: 0.25,
      usageCostPerAssistedHour: 2.5,
      platformMonthly: 10000,
      setup: 90000,
    });
    expect(d.tiers.frontier).toEqual({
      reductionRoutine: 0.55,
      reductionComplex: 0.55,
      reviewRoutine: 0.15,
      reviewComplex: 0.2,
      usageCostPerAssistedHour: 11,
      platformMonthly: 1000,
      setup: 30000,
    });
  });

  it('returns an independent copy on every call', () => {
    const a = createDefaultInputs();
    a.tasks[0]!.share = 0.9;
    a.tiers.local.setup = 1;
    a.readiness.data = 'not-ready';
    const b = createDefaultInputs();
    expect(b.tasks[0]!.share).toBe(0.3);
    expect(b.tiers.local.setup).toBe(130000);
    expect(b.readiness.data).toBe('ready');
  });

  it('exposes the constants from section 4', () => {
    expect(HORIZON_MONTHS).toBe(36);
    expect(CASE_FACTORS.conservative).toEqual({ effectiveness: 0.75, investment: 1.25, rampDelta: 3, cash: 0.8 });
    expect(CASE_FACTORS.expected).toEqual({ effectiveness: 1, investment: 1, rampDelta: 0, cash: 1 });
    expect(CASE_FACTORS.stretch).toEqual({ effectiveness: 1.15, investment: 0.9, rampDelta: -1, cash: 1 });
    expect(MARGINAL_ROI_PERCENT).toBe(50);
  });
});
