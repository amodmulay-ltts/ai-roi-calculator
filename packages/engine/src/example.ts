import type { Scenario } from './types.js';
import { DEFAULT_FX_RATES_PER_EUR } from './currency.js';
import { DEFAULT_BCC_RATE_FACTOR, DEFAULT_DELIVERY_PROFILES } from './delivery.js';
import { DEFAULT_LLM_PRICING } from './llm.js';

/** Display name of the example's client, used in menus and copy. */
export const EXAMPLE_CLIENT = 'Vantara Motors (fictional)';

/**
 * Illustrative example loaded on start: a fictional carmaker's 33-person embedded software team (ECU / ADAS).
 * Round numbers chosen so each step can be followed by hand; baseline work equals the team (33 FTE × 160 h).
 * Safety-critical code carries more human review than IT work: 11% on top of the AI-assisted hours once mature.
 */
export function createExampleScenario(): Scenario {
  return {
    id: 'example-vantara',
    name: 'Example: AI-assisted automotive software development at Vantara Motors',
    clientName: EXAMPLE_CLIENT,
    useCase: 'Automotive software development (ECU / ADAS)',
    baseCurrency: 'EUR',
    fxRatesPerEur: { ...DEFAULT_FX_RATES_PER_EUR },
    scenarioDate: new Date().toISOString().split('T')[0]!,
    isExample: true,

    globalAssumptions: {
      workingHrsPerFtePerMonth: 160,
      transitionLengthMonths: 4,
      riskReservePercent: { baseline: 0.05, transition: 0.05, mature: 0.05 },
      corporateOverheadPercent: { baseline: 0.12, transition: 0.12, mature: 0.12 },
      overheadRationale: { baseline: '', transition: '', mature: '' },
    },
    timeValue: { horizonMonths: 36, discountRateAnnual: 0.1, wageEscalationAnnual: 0 },
    // Safety-critical code: more human review than in IT, and a longer dual run
    aiOverheadPercent: {
      baseline: { hitl: 0, rework: 0, dualRun: 0 },
      transition: { hitl: 0.12, rework: 0.06, dualRun: 0.05 },
      mature: { hitl: 0.08, rework: 0.03, dualRun: 0 },
    },

    roles: [
      { id: 'sw-architect', name: 'Software Architect', fte: { baseline: 2, transition: 2, mature: 2 }, costPerFte: 12_000, billRatePerFte: 16_000, gradeLevel: 5, isAiImpacted: true },
      { id: 'senior-embedded', name: 'Senior Embedded Developer', fte: { baseline: 8, transition: 8, mature: 7 }, costPerFte: 10_000, billRatePerFte: 13_500, gradeLevel: 4, isAiImpacted: true },
      { id: 'embedded-dev', name: 'Embedded Developer', fte: { baseline: 12, transition: 12, mature: 8 }, costPerFte: 8_500, billRatePerFte: 11_500, gradeLevel: 3, isAiImpacted: true },
      { id: 'validation-eng', name: 'Test and Validation Engineer', fte: { baseline: 6, transition: 6, mature: 3.5 }, costPerFte: 8_000, billRatePerFte: 11_000, gradeLevel: 3, isAiImpacted: true },
      { id: 'safety-eng', name: 'Functional Safety Engineer', fte: { baseline: 2, transition: 2, mature: 2 }, costPerFte: 11_000, billRatePerFte: 15_000, gradeLevel: 4, isAiImpacted: true },
      { id: 'project-lead', name: 'Project Lead / Product Owner', fte: { baseline: 2, transition: 2, mature: 2 }, costPerFte: 11_500, billRatePerFte: 15_500, gradeLevel: 5, isAiImpacted: false },
      { id: 'devops', name: 'DevOps / CI Engineer', fte: { baseline: 1, transition: 1, mature: 1 }, costPerFte: 9_500, billRatePerFte: 13_000, gradeLevel: 3, isAiImpacted: false },
      { id: 'ai-engineer', name: 'AI Engineer', fte: { baseline: 0, transition: 2, mature: 1.5 }, costPerFte: 11_000, billRatePerFte: 15_000, gradeLevel: 4, isAiImpacted: true },
    ],
    peopleMode: { mode: 'effort-derived' },

    // 40 × 60 + 300 × 3 + 160 × 2 + 60 × 8 + 40 × 12 + 700 = 5,280 h = 33 FTE × 160 h
    kpis: [
      { id: 'requirements', name: 'Software requirements implemented', unit: 'hrs per requirement', baseline: 60, appliesToFactor: true, isVelocity: false, overrides: {}, volumePerMonth: 40, volumeUnit: 'requirements', reviewOverheadApplies: true },
      { id: 'sil-tests', name: 'SIL test cases written and run', unit: 'hrs per test case', baseline: 3, appliesToFactor: true, isVelocity: false, overrides: {}, volumePerMonth: 300, volumeUnit: 'test cases', reviewOverheadApplies: true },
      { id: 'code-reviews', name: 'Safety-relevant code reviews', unit: 'hrs per review', baseline: 2, appliesToFactor: true, isVelocity: false, overrides: {}, volumePerMonth: 160, volumeUnit: 'reviews', reviewOverheadApplies: true },
      { id: 'defects', name: 'Defect analysis and fixing', unit: 'hrs per defect', baseline: 8, appliesToFactor: true, isVelocity: false, overrides: {}, volumePerMonth: 60, volumeUnit: 'defects', reviewOverheadApplies: true },
      { id: 'safety-work-products', name: 'ISO 26262 / ASPICE work products', unit: 'hrs per work product', baseline: 12, appliesToFactor: true, isVelocity: false, overrides: {}, volumePerMonth: 40, volumeUnit: 'work products', reviewOverheadApplies: true },
      { id: 'hil-integration', name: 'HIL testing, integration and coordination', unit: 'hrs per month', baseline: 700, appliesToFactor: false, isVelocity: false, overrides: {}, volumePerMonth: 1, volumeUnit: 'months', reviewOverheadApplies: false },
    ],

    costLines: [
      { id: 'toolchain', name: 'Existing toolchain licences (compilers, static analysis, ALM)', category: 'Tools', monthlyAmount: { baseline: 6_000, transition: 6_000, mature: 6_000 }, chargeable: true, aiSpecific: false },
      { id: 'ai-assistant-seats', name: 'AI coding assistant licences', category: 'AI', monthlyAmount: { baseline: 0, transition: 4_000, mature: 4_000 }, chargeable: true, aiSpecific: true },
      { id: 'private-ai-platform', name: 'Private AI platform (IP-protected hosting)', category: 'Infra', monthlyAmount: { baseline: 0, transition: 5_000, mature: 5_000 }, chargeable: true, aiSpecific: true },
      { id: 'tool-qualification', name: 'AI tool qualification and governance (ISO 26262)', category: 'Governance', monthlyAmount: { baseline: 0, transition: 4_000, mature: 2_000 }, chargeable: true, aiSpecific: true },
      { id: 'training', name: 'Training and change management', category: 'Transition', monthlyAmount: { baseline: 0, transition: 6_000, mature: 0 }, chargeable: true, aiSpecific: false },
    ],

    // Model usage follows the work: requests per requirement / test case / review / work product
    llmUsage: [
      { id: 'coding-assistant', name: 'Coding assistant (C / AUTOSAR)', priceId: 'claude-sonnet-5-5', kpiId: 'requirements', requestsPerUnit: 500, inputTokensPerRequest: 12_000, outputTokensPerRequest: 2_000 },
      { id: 'test-generation', name: 'SIL test generation', priceId: 'claude-sonnet-5-5', kpiId: 'sil-tests', requestsPerUnit: 20, inputTokensPerRequest: 8_000, outputTokensPerRequest: 2_000 },
      { id: 'review-agent', name: 'MISRA and safety review agent', priceId: 'claude-opus-5-5', kpiId: 'code-reviews', requestsPerUnit: 5, inputTokensPerRequest: 30_000, outputTokensPerRequest: 2_000 },
      { id: 'work-product-drafting', name: 'Safety work product drafting', priceId: 'claude-opus-5-5', kpiId: 'safety-work-products', requestsPerUnit: 50, inputTokensPerRequest: 40_000, outputTokensPerRequest: 4_000 },
    ],
    llmPricing: structuredClone(DEFAULT_LLM_PRICING),

    oneTimeInvestment: [
      { id: 'setup', name: 'Private AI platform and toolchain integration', amount: 250_000, month: 0, aiSpecific: true },
      { id: 'qualification', name: 'AI tool qualification and process update (ISO 26262 / ASPICE)', amount: 80_000, month: 0, aiSpecific: true },
      { id: 'enablement', name: 'Training and enablement', amount: 60_000, month: 0, aiSpecific: false },
      { id: 'contingency', name: 'Other / contingency', amount: 40_000, month: 0, aiSpecific: false },
    ],

    // AI cuts the effort per item by 15% during transition and 30% once mature (HIL lab time is not AI-assisted)
    productivityFactor: { mode: 'direct-factor', transition: 0.85, mature: 0.7 },

    primaryModel: 'onshore-ai',
    deliveryProfiles: JSON.parse(JSON.stringify(DEFAULT_DELIVERY_PROFILES)),
    bccRateFactor: DEFAULT_BCC_RATE_FACTOR,
    baselineBccShare: 0,

    costChargeable: 'tco',
    costAvoidanceIncludedInRoi: false,
  };
}
