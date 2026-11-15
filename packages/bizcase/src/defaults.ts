import type { BusinessCaseInputs } from './types.js';

// Placeholder values for presenter use. They are not benchmarks or vendor prices.
export const HORIZON_MONTHS = 36;
export const MAX_REDUCTION = 0.9;
export const CASE_FACTORS = {
  conservative: { effectiveness: 0.75, investment: 1.25, rampDelta: 3, cash: 0.8 },
  expected: { effectiveness: 1, investment: 1, rampDelta: 0, cash: 1 },
  stretch: { effectiveness: 1.15, investment: 0.9, rampDelta: -1, cash: 1 },
} as const;
export const READINESS_POINTS = { ready: 0, partial: 1, 'not-ready': 2 } as const;
export const GAP_EFFECTIVENESS_PER_POINT = 0.025;
export const GAP_INVESTMENT_PER_POINT = 0.025;
export const MARGINAL_ROI_PERCENT = 50;

/** Returns a new, independent copy of the default inputs on every call. */
export function createDefaultInputs(): BusinessCaseInputs {
  return {
    customerName: '',
    teamSize: 30,
    loadedCostPerFteYear: 80000,
    hoursPerFteMonth: 160,
    dataConstraint: 'public-ok',
    tasks: [
      { id: 'testDesign', name: 'Test design', share: 0.3, difficulty: 'complex' },
      { id: 'scriptDev', name: 'Script development', share: 0.25, difficulty: 'routine' },
      { id: 'execution', name: 'Test execution', share: 0.25, difficulty: 'routine' },
      { id: 'defectAnalysis', name: 'Defect analysis', share: 0.1, difficulty: 'complex' },
      { id: 'reporting', name: 'Reporting', share: 0.1, difficulty: 'routine' },
    ],
    adoption: 0.8,
    cashShare: 0.7,
    retiredCostMonthly: 0,
    rampMonths: 6,
    governanceMonthly: 3000,
    dataReadinessInvestment: 60000,
    governanceSetup: 25000,
    trainingPerFte: 800,
    hybridComplexTier: 'enterprise',
    tiers: {
      local: {
        reductionRoutine: 0.3,
        reductionComplex: 0.1,
        reviewRoutine: 0.2,
        reviewComplex: 0.5,
        usageCostPerAssistedHour: 0,
        platformMonthly: 7000,
        setup: 130000,
      },
      enterprise: {
        reductionRoutine: 0.5,
        reductionComplex: 0.4,
        reviewRoutine: 0.15,
        reviewComplex: 0.25,
        usageCostPerAssistedHour: 2.5,
        platformMonthly: 10000,
        setup: 90000,
      },
      frontier: {
        reductionRoutine: 0.55,
        reductionComplex: 0.55,
        reviewRoutine: 0.15,
        reviewComplex: 0.2,
        usageCostPerAssistedHour: 11,
        platformMonthly: 1000,
        setup: 30000,
      },
    },
    readiness: {
      data: 'ready',
      skills: 'ready',
      sponsorship: 'ready',
      compliance: 'ready',
    },
  };
}
