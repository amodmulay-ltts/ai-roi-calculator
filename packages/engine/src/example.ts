import type { Scenario } from './types.js';
import { DEFAULT_FX_RATES_PER_EUR } from './currency.js';
import { DEFAULT_BCC_RATE_FACTOR, DEFAULT_DELIVERY_PROFILES } from './delivery.js';
import { DEFAULT_LLM_PRICING } from './llm.js';

/**
 * Illustrative example loaded on start: a fictional European insurer's 31-person testing team.
 * Round numbers chosen so each step can be followed by hand; baseline effort equals the team (31 FTE × 160 h).
 */
export function createExampleScenario(): Scenario {
  return {
    id: 'example-northwind',
    name: 'Example: AI-augmented testing at Northwind Insurance',
    clientName: 'Northwind Insurance (fictional)',
    useCase: 'AI-Augmented Software Testing',
    baseCurrency: 'EUR',
    fxRatesPerEur: { ...DEFAULT_FX_RATES_PER_EUR },
    scenarioDate: new Date().toISOString().split('T')[0]!,
    isExample: true,

    globalAssumptions: {
      workingHrsPerFtePerMonth: 160,
      transitionLengthMonths: 3,
      riskReservePercent: { baseline: 0.05, transition: 0.05, mature: 0.05 },
      corporateOverheadPercent: { baseline: 0.12, transition: 0.12, mature: 0.12 },
      overheadRationale: { baseline: '', transition: '', mature: '' },
    },
    timeValue: { horizonMonths: 36, discountRateAnnual: 0.1, wageEscalationAnnual: 0 },
    aiOverheadPercent: {
      baseline: { hitl: 0, rework: 0, dualRun: 0 },
      transition: { hitl: 0.1, rework: 0.05, dualRun: 0.05 },
      mature: { hitl: 0.05, rework: 0.02, dualRun: 0 },
    },

    roles: [
      { id: 'test-manager', name: 'Test Manager', fte: { baseline: 1, transition: 1, mature: 1 }, costPerFte: 11_000, billRatePerFte: 15_000, gradeLevel: 5, isAiImpacted: false },
      { id: 'test-analyst', name: 'QA Test Analyst', fte: { baseline: 20, transition: 20, mature: 13 }, costPerFte: 7_000, billRatePerFte: 9_500, gradeLevel: 2, isAiImpacted: true },
      { id: 'automation-engineer', name: 'Test Automation Engineer', fte: { baseline: 8, transition: 8, mature: 6 }, costPerFte: 8_000, billRatePerFte: 11_000, gradeLevel: 3, isAiImpacted: true },
      { id: 'sdet', name: 'SDET / Framework Engineer', fte: { baseline: 2, transition: 2, mature: 2 }, costPerFte: 9_000, billRatePerFte: 12_500, gradeLevel: 4, isAiImpacted: true },
      { id: 'ai-engineer', name: 'AI Engineer', fte: { baseline: 0, transition: 2, mature: 1.5 }, costPerFte: 10_000, billRatePerFte: 14_000, gradeLevel: 4, isAiImpacted: true },
    ],
    peopleMode: { mode: 'effort-derived' },

    kpis: [
      { id: 'testing-effort-per-release', name: 'Testing effort per release', unit: 'hrs', baseline: 2_300, appliesToFactor: true, isVelocity: false, overrides: {}, volumePerMonth: 2, volumeUnit: 'releases', reviewOverheadApplies: true },
      { id: 'defect-rca-effort', name: 'Defect root-cause analysis effort', unit: 'hrs/defect', baseline: 1.0, appliesToFactor: true, isVelocity: false, overrides: {}, volumePerMonth: 200, volumeUnit: 'defects', reviewOverheadApplies: false },
      { id: 'defect-verification-effort', name: 'Defect verification effort', unit: 'hrs/defect', baseline: 0.8, appliesToFactor: true, isVelocity: false, overrides: {}, volumePerMonth: 200, volumeUnit: 'defects', reviewOverheadApplies: false },
    ],

    costLines: [
      { id: 'existing-tools', name: 'Existing test tool licences', category: 'Tools', monthlyAmount: { baseline: 3_000, transition: 3_000, mature: 3_000 }, chargeable: true, aiSpecific: false },
      { id: 'ai-test-tools', name: 'AI test tool licences', category: 'AI', monthlyAmount: { baseline: 0, transition: 6_000, mature: 6_000 }, chargeable: true, aiSpecific: true },
      { id: 'ai-infra', name: 'Cloud infrastructure for AI', category: 'Infra', monthlyAmount: { baseline: 0, transition: 2_000, mature: 2_000 }, chargeable: true, aiSpecific: true },
      { id: 'governance', name: 'AI governance and reporting', category: 'Governance', monthlyAmount: { baseline: 0, transition: 3_000, mature: 1_500 }, chargeable: true, aiSpecific: false },
      { id: 'training', name: 'Training and change management', category: 'Transition', monthlyAmount: { baseline: 0, transition: 5_000, mature: 0 }, chargeable: true, aiSpecific: false },
    ],
    // Model usage follows the work: requests per release / per defect × tokens × list price
    llmUsage: [
      { id: 'test-generation', name: 'Test design and generation', priceId: 'claude-sonnet-5-5', kpiId: 'testing-effort-per-release', requestsPerUnit: 15_000, inputTokensPerRequest: 8_000, outputTokensPerRequest: 2_000 },
      { id: 'review-agent', name: 'Test review agent', priceId: 'claude-opus-5-5', kpiId: 'testing-effort-per-release', requestsPerUnit: 2_000, inputTokensPerRequest: 30_000, outputTokensPerRequest: 3_000 },
      { id: 'defect-triage', name: 'Defect triage assistant', priceId: 'claude-haiku-4-5', kpiId: 'defect-rca-effort', requestsPerUnit: 10, inputTokensPerRequest: 20_000, outputTokensPerRequest: 1_000 },
    ],
    llmPricing: structuredClone(DEFAULT_LLM_PRICING),
    oneTimeInvestment: [
      { id: 'setup', name: 'Setup and integration', amount: 200_000, month: 0, aiSpecific: true },
      { id: 'enablement', name: 'Training and enablement', amount: 60_000, month: 0, aiSpecific: false },
      { id: 'contingency', name: 'Other / contingency', amount: 40_000, month: 0, aiSpecific: false },
    ],

    // AI cuts testing effort per release by 15% during transition and 30% once mature
    productivityFactor: { mode: 'direct-factor', transition: 0.85, mature: 0.7 },

    primaryModel: 'onshore-ai',
    deliveryProfiles: JSON.parse(JSON.stringify(DEFAULT_DELIVERY_PROFILES)),
    bccRateFactor: DEFAULT_BCC_RATE_FACTOR,
    baselineBccShare: 0,

    costChargeable: 'tco',
    costAvoidanceIncludedInRoi: false,
    costAvoidanceExtraTestCasesPerMonth: 0,
    costAvoidanceExtraScriptsPerMonth: 0,
  };
}
