import { describe, it, expect } from 'vitest';
import { createDefaultInputs } from '../defaults.js';
import { calculateCase } from '../calc.js';
import type { BusinessCaseInputs, PostureId } from '../types.js';

/** Section 6.1: one routine task, hand-checkable. */
function miniInputs(): BusinessCaseInputs {
  const d = createDefaultInputs();
  d.teamSize = 10;
  d.loadedCostPerFteYear = 96000;
  d.phases = [{ name: 'Design', aiUse: 1 }];
  d.cashShare = 1;
  d.retiredCostMonthly = 0;
  d.rampMonths = 1;
  d.governanceMonthly = 0;
  d.dataReadinessInvestment = 0;
  d.governanceSetup = 0;
  d.trainingPerFte = 0;
  d.tasks = [{ id: 'testDesign', name: 'Test design', phase: 'Design', share: 1, difficulty: 'routine' }];
  d.tiers.local = {
    reductionRoutine: 0.5,
    reductionComplex: 0.5,
    reviewRoutine: 0.2,
    reviewComplex: 0.2,
    usageCostPerAssistedHour: 0,
    platformMonthly: 1000,
    setup: 50000,
  };
  return d;
}

describe('calculateCase: section 6.1 hand-checkable mini case', () => {
  const r = calculateCase(miniInputs(), 'local', 'expected');

  it('matches each stated value', () => {
    expect(r.netHoursSavedPerMonth).toBeCloseTo(640, 6);
    expect(r.capacityFte).toBeCloseTo(4, 6);
    expect(r.capacityValuePerMonth).toBeCloseTo(32000, 6);
    expect(r.countedSavingPerMonth).toBeCloseTo(32000, 6);
    expect(r.redeployedValuePerMonth).toBeCloseTo(0, 6);
    expect(r.platformAndGovernancePerMonth).toBeCloseTo(1000, 6);
    expect(r.steadyNetPerMonth).toBeCloseTo(31000, 6);
    expect(r.investment).toBeCloseTo(50000, 6);
    expect(r.paybackMonth).toBe(2);
    expect(r.netValue36).toBeCloseTo(1066000, 6);
    expect(r.roiPercent).toBeCloseTo(2132, 6);
  });

  it('starts the cumulative series at minus the investment and has 37 points', () => {
    expect(r.cumulative).toHaveLength(37);
    expect(r.cumulative[0]).toBeCloseTo(-50000, 6);
    expect(r.cumulative[2]).toBeCloseTo(12000, 6);
  });
});

/** Section 6.2: default inputs, expected case, all four postures. */
describe('calculateCase: section 6.2 default inputs', () => {
  const inputs = createDefaultInputs();
  const rows: Array<{
    posture: PostureId;
    netHours: number;
    capacityFte: number;
    capacityValue: number;
    counted: number;
    redeployed: number;
    usage: number;
    platformGov: number;
    steadyNet: number;
    investment: number;
    payback: number | null;
    netValue36: number;
    roi: number;
    verdict: string;
  }> = [
    { posture: 'local', netHours: 629.76, capacityFte: 3.94, capacityValue: 26240, counted: 18368, redeployed: 7872, usage: 0, platformGov: 10000, steadyNet: 8368, investment: 239000, payback: 35, netValue36: 16328, roi: 6.8, verdict: 'marginal' },
    { posture: 'hybrid', netHours: 1013.76, capacityFte: 6.34, capacityValue: 42240, counted: 29568, redeployed: 12672, usage: 3840, platformGov: 20000, steadyNet: 5728, investment: 329000, payback: null, netValue36: -187112, roi: -56.9, verdict: 'negative' },
    { posture: 'enterprise', netHours: 1440, capacityFte: 9, capacityValue: 60000, counted: 42000, redeployed: 18000, usage: 9600, platformGov: 13000, steadyNet: 19400, investment: 199000, payback: 15, netValue36: 418400, roi: 210.3, verdict: 'positive' },
    { posture: 'frontier', netHours: 1752.96, capacityFte: 10.96, capacityValue: 73040, counted: 51128, redeployed: 21912, usage: 42240, platformGov: 4000, steadyNet: 4888, investment: 139000, payback: 33, netValue36: 14748, roi: 10.6, verdict: 'marginal' },
  ];

  for (const row of rows) {
    describe(row.posture, () => {
      const r = calculateCase(inputs, row.posture, 'expected');
      it('reproduces the section 6.2 row', () => {
        expect(r.netHoursSavedPerMonth).toBeCloseTo(row.netHours, 2);
        expect(r.capacityFte).toBeCloseTo(row.capacityFte, 2);
        expect(r.capacityValuePerMonth).toBeCloseTo(row.capacityValue, 2);
        expect(r.countedSavingPerMonth).toBeCloseTo(row.counted, 2);
        expect(r.redeployedValuePerMonth).toBeCloseTo(row.redeployed, 2);
        expect(r.usageCostPerMonth).toBeCloseTo(row.usage, 2);
        expect(r.platformAndGovernancePerMonth).toBeCloseTo(row.platformGov, 2);
        expect(r.steadyNetPerMonth).toBeCloseTo(row.steadyNet, 2);
        expect(r.investment).toBeCloseTo(row.investment, 2);
        expect(r.paybackMonth).toBe(row.payback);
        expect(r.netValue36).toBeCloseTo(row.netValue36, 2);
        expect(r.roiPercent === null ? null : Math.round(r.roiPercent * 10) / 10).toBe(row.roi);
        expect(r.verdict).toBe(row.verdict);
      });
      it('adds up the investment lines to the investment', () => {
        const sum = r.investmentLines.reduce((s, l) => s + l.amount, 0);
        expect(sum).toBe(r.investment);
      });
    });
  }

  it('uses the enterprise tier for complex hybrid work and the local tier for routine work', () => {
    const r = calculateCase(inputs, 'hybrid', 'expected');
    // Platform setup: local 130000 + enterprise 90000; training and the rest as in section 4
    expect(r.investmentLines.map(l => [l.label, l.amount])).toEqual([
      ['Platform setup', 220000],
      ['Data readiness', 60000],
      ['Governance setup', 25000],
      ['Training', 24000],
    ]);
  });
});
