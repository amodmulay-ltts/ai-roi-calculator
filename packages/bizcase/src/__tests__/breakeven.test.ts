import { describe, it, expect } from 'vitest';
import { createDefaultInputs } from '../defaults.js';
import { breakEvenCashShare, breakEvenEffectiveness } from '../breakeven.js';
import type { BusinessCaseInputs, PostureId } from '../types.js';

/** Section 6.1 mini case, as in calc.test.ts. */
function miniInputs(): BusinessCaseInputs {
  const d = createDefaultInputs();
  d.teamSize = 10;
  d.loadedCostPerFteYear = 96000;
  d.adoption = 1;
  d.cashShare = 1;
  d.retiredCostMonthly = 0;
  d.rampMonths = 1;
  d.governanceMonthly = 0;
  d.dataReadinessInvestment = 0;
  d.governanceSetup = 0;
  d.trainingPerFte = 0;
  d.tasks = [{ id: 'testDesign', name: 'Test design', share: 1, difficulty: 'routine' }];
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

describe('break-even at the section 6.1 mini case', () => {
  it('needs 0.0747 of the assumed effect', () => {
    expect(breakEvenEffectiveness(miniInputs(), 'local')).toBeCloseTo(0.0747, 3);
  });
});

describe('break-even at default inputs (section 6.3)', () => {
  const rows: Array<[PostureId, number | null, number | null]> = [
    ['local', 0.9735, 0.6814],
    ['hybrid', 1.1889, 0.8322],
    ['enterprise', 0.7026, 0.4918],
    ['frontier', 0.9914, 0.694],
  ];
  for (const [posture, effect, cash] of rows) {
    it(`${posture}`, () => {
      expect(breakEvenEffectiveness(createDefaultInputs(), posture)).toBeCloseTo(effect!, 3);
      expect(breakEvenCashShare(createDefaultInputs(), posture)).toBeCloseTo(cash!, 3);
    });
  }
});

describe('break-even edge cases', () => {
  it('returns 0 when the case holds with no effect at all', () => {
    const d = miniInputs();
    d.tiers.local.platformMonthly = 0;
    d.tiers.local.setup = 0;
    expect(breakEvenEffectiveness(d, 'local')).toBe(0);
  });

  it('returns null when the case does not hold even at five times the effect', () => {
    const d = miniInputs();
    d.tiers.local.platformMonthly = 1_000_000;
    expect(breakEvenEffectiveness(d, 'local')).toBeNull();
  });

  it('returns null for cash share when even full cash does not hold', () => {
    const d = miniInputs();
    d.tiers.local.platformMonthly = 1_000_000;
    expect(breakEvenCashShare(d, 'local')).toBeNull();
  });
});
