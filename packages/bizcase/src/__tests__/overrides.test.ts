import { describe, it, expect } from 'vitest';
import { createDefaultInputs } from '../defaults.js';
import { calculateCase, optionCosts } from '../calc.js';
import { compareAll } from '../compare.js';
import { isBusinessCaseInputs, validateInputs } from '../validate.js';

describe('per-option figures', () => {
  it('change nothing when there are no overrides', () => {
    const d = createDefaultInputs();
    const r = calculateCase(d, 'enterprise', 'expected');
    expect(r.investment).toBe(199000);
    expect(r.netValue36).toBeCloseTo(418400, 6);
    expect(optionCosts(d, 'enterprise').governanceMonthly).toBe(3000);
  });

  it('change one option only: governance for enterprise leaves the other options alone', () => {
    const base = createDefaultInputs();
    const d = createDefaultInputs();
    d.optionOverrides = { enterprise: { governanceMonthly: 5000 } };
    const e = calculateCase(d, 'enterprise', 'expected');
    expect(e.platformAndGovernancePerMonth).toBe(15000);
    expect(calculateCase(d, 'local', 'expected').netValue36).toBeCloseTo(calculateCase(base, 'local', 'expected').netValue36, 9);
    expect(calculateCase(d, 'frontier', 'expected').netValue36).toBeCloseTo(calculateCase(base, 'frontier', 'expected').netValue36, 9);
  });

  it('apply every shared figure to its option: data readiness, governance setup, training and cost removed', () => {
    const d = createDefaultInputs();
    d.optionOverrides = { frontier: { dataReadinessInvestment: 0, governanceSetup: 0, trainingPerFte: 0, retiredCostMonthly: 1000 } };
    const r = calculateCase(d, 'frontier', 'expected');
    expect(r.investment).toBeCloseTo(30000, 6); // platform setup only
    expect(r.retiredCostPerMonth).toBe(1000);
  });

  it('let Hybrid have its own platform, setup and usage rate, instead of local plus the stronger model', () => {
    const d = createDefaultInputs();
    const derived = calculateCase(d, 'hybrid', 'expected');
    expect(optionCosts(d, 'hybrid').platformMonthly).toBe(17000);
    expect(optionCosts(d, 'hybrid').setup).toBe(220000);
    d.optionOverrides = { hybrid: { platformMonthly: 12000, setup: 100000, usageCostPerAssistedHour: 0 } };
    const r = calculateCase(d, 'hybrid', 'expected');
    expect(r.usageCostPerMonth).toBe(0);
    expect(r.platformAndGovernancePerMonth).toBe(15000);
    expect(r.investmentLines[0]!.amount).toBe(100000);
    expect(r.investment).toBeLessThan(derived.investment);
  });

  it('are ignored for the tier figures of local, enterprise and frontier, which are edited in the tiers', () => {
    const d = createDefaultInputs();
    d.optionOverrides = { enterprise: { platformMonthly: 1, setup: 1, usageCostPerAssistedHour: 1 } };
    expect(calculateCase(d, 'enterprise', 'expected').netValue36).toBeCloseTo(418400, 6);
  });

  it('are reached by compareAll, so the cards and the chart follow them', () => {
    const d = createDefaultInputs();
    d.optionOverrides = { local: { governanceMonthly: 0 } };
    expect(compareAll(d).local.expected.platformAndGovernancePerMonth).toBe(7000);
  });

  it('must not be negative, and old saved data without them is still accepted', () => {
    const d = createDefaultInputs();
    expect(isBusinessCaseInputs(d)).toBe(true);
    d.optionOverrides = { local: { governanceMonthly: -1 } };
    expect(validateInputs(d).map(i => i.field)).toContain('optionOverrides.local.governanceMonthly');
  });
});
