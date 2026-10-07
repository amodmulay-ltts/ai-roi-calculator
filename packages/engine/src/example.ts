import type { Scenario } from './types.js';
import { DEFAULT_FX_RATES_PER_EUR } from './currency.js';
import { DEFAULT_BCC_RATE_FACTOR, DEFAULT_DELIVERY_PROFILES } from './delivery.js';
import { DEFAULT_LLM_PRICING } from './llm.js';
import { DEFAULT_SEAT_PRICING } from './seats.js';
import { AUTOMOTIVE_TEMPLATE } from './templates.js';

/** Display name of the example's client, used in menus and copy. */
export const EXAMPLE_CLIENT = 'Vantara Motors (fictional)';

/**
 * Illustrative example loaded on start, built from the automotive use-case template:
 * a fictional carmaker's 33-person embedded software team (ECU / ADAS).
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

    // Team, workload and AI model usage come from the automotive use-case template
    roles: structuredClone(AUTOMOTIVE_TEMPLATE.roles),
    kpis: structuredClone(AUTOMOTIVE_TEMPLATE.kpis),
    llmUsage: structuredClone(AUTOMOTIVE_TEMPLATE.llmUsage),
    peopleMode: { mode: 'effort-derived' },


    costLines: [
      { id: 'toolchain', name: 'Existing toolchain licences (compilers, static analysis, ALM)', category: 'Tools', monthlyAmount: { baseline: 6_000, transition: 6_000, mature: 6_000 }, chargeable: true, aiSpecific: false },
      { id: 'private-ai-platform', name: 'Private AI platform (IP-protected hosting)', category: 'Infra', monthlyAmount: { baseline: 0, transition: 5_000, mature: 5_000 }, chargeable: true, aiSpecific: true, sourcing: ['enterprise'] },
      { id: 'tool-qualification', name: 'AI tool qualification and governance (ISO 26262)', category: 'Governance', monthlyAmount: { baseline: 0, transition: 4_000, mature: 2_000 }, chargeable: true, aiSpecific: true },
      { id: 'training', name: 'Training and change management', category: 'Transition', monthlyAmount: { baseline: 0, transition: 6_000, mature: 0 }, chargeable: true, aiSpecific: false },
    ],

    llmPricing: structuredClone(DEFAULT_LLM_PRICING),
    // A private, IP-protected deployment: the enterprise option, platform fee and token premium included
    aiSourcing: 'enterprise',
    tokenPriceFactor: 1.3,
    seatAssignments: structuredClone(AUTOMOTIVE_TEMPLATE.seatAssignments),
    seatPricing: structuredClone(DEFAULT_SEAT_PRICING),

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
