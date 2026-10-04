/**
 * Default values from Section 4 of the build prompt
 * These reproduce the Excel model exactly
 */

import type { Scenario, Role, CostLine, KpiInput, AiOverheadPercent, Currency } from './types.js';
import { DEFAULT_FX_RATES_PER_EUR, convertScenarioCurrency, fxFactor } from './currency.js';
import { DEFAULT_DELIVERY_PROFILES, DEFAULT_BCC_RATE_FACTOR, DELIVERY_MODELS } from './delivery.js';

/** Files saved before generic workload: testing KPIs took their volumes from releases/defects per month. */
function migrateLegacyWorkload(s: Scenario): Scenario['kpis'] {
  if (s.kpis.some(k => k.volumePerMonth !== undefined)) return s.kpis;
  const releases = s.globalAssumptions.releasesPerMonth ?? 1;
  const defects = s.globalAssumptions.defectsPerMonth ?? 0;
  const legacy: Record<string, Partial<Scenario['kpis'][number]>> = {
    'testing-effort-per-release': { volumePerMonth: releases, volumeUnit: 'releases', reviewOverheadApplies: true },
    'defect-rca-effort': { volumePerMonth: defects, volumeUnit: 'defects', reviewOverheadApplies: false },
    'defect-verification-effort': { volumePerMonth: defects, volumeUnit: 'defects', reviewOverheadApplies: false },
  };
  return s.kpis.map(k => ({ ...k, ...legacy[k.id] }));
}

/** Fills fields missing from scenario files saved by older versions. Use at import boundaries. */
export function normalizeScenario(input: Scenario): Scenario {
  const legacy = input as Partial<Scenario> & Scenario;
  return {
    ...legacy,
    fxRatesPerEur: { ...DEFAULT_FX_RATES_PER_EUR, ...legacy.fxRatesPerEur },
    primaryModel: DELIVERY_MODELS.includes(legacy.primaryModel) ? legacy.primaryModel : 'onshore-ai',
    deliveryProfiles: { ...JSON.parse(JSON.stringify(DEFAULT_DELIVERY_PROFILES)), ...legacy.deliveryProfiles },
    bccRateFactor: legacy.bccRateFactor ?? DEFAULT_BCC_RATE_FACTOR,
    baselineBccShare: legacy.baselineBccShare ?? 0,
    kpis: migrateLegacyWorkload(legacy),
    costLines: legacy.costLines.map(l => ({ ...l, aiSpecific: l.aiSpecific ?? l.category === 'AI' })),
    oneTimeInvestment: legacy.oneTimeInvestment.map(i => ({ ...i, aiSpecific: i.aiSpecific ?? true })),
  };
}

export const DEFAULT_GLOBAL_ASSUMPTIONS = {
  workingHrsPerFtePerMonth: 172,
  transitionLengthMonths: 3,
  riskReservePercent: {
    baseline: 0.08,
    transition: 0.08,
    mature: 0.06,
  },
  corporateOverheadPercent: {
    baseline: 0.12,
    transition: 0.12,
    mature: 0.14,
  },
  overheadRationale: {
    baseline: '',
    transition: '',
    mature: 'Higher shared-services allocation for the AI CoC, platform governance and specialist roles.',
  },
};

export const DEFAULT_TIME_VALUE = {
  horizonMonths: 36,
  discountRateAnnual: 0.1,
  wageEscalationAnnual: 0,
};

export const DEFAULT_AI_OVERHEAD_PERCENT: Record<string, AiOverheadPercent> = {
  transition: {
    hitl: 0.08,
    rework: 0.04,
    dualRun: 0.035,
  },
  mature: {
    hitl: 0.05,
    rework: 0.021,
    dualRun: 0,
  },
};

export const DEFAULT_ONE_TIME_INVESTMENT = [
  {
    id: '1',
    name: 'Setup and integration',
    amount: 7_000_000,
    month: 0,
    aiSpecific: true,
  },
  {
    id: '2',
    name: 'Training and enablement',
    amount: 2_000_000,
    month: 0,
    aiSpecific: false,
  },
  {
    id: '3',
    name: 'Other / contingency',
    amount: 1_000_000,
    month: 0,
    aiSpecific: false,
  },
];

export const DEFAULT_ROLES: Role[] = [
  {
    id: 'tm-dl',
    name: 'Test Manager / Delivery Lead',
    fte: { baseline: 1, transition: 1.2, mature: 1 },
    costPerFte: 350_000,
    billRatePerFte: 600_000,
    gradeLevel: 5,
    isAiImpacted: true,
  },
  {
    id: 'qa-ft',
    name: 'QA Functional Tester',
    fte: { baseline: 44, transition: 42, mature: 36 },
    costPerFte: 260_000,
    billRatePerFte: 380_000,
    gradeLevel: 2,
    isAiImpacted: true,
  },
  {
    id: 'ae',
    name: 'Automation Engineer',
    fte: { baseline: 15, transition: 15, mature: 12 },
    costPerFte: 260_000,
    billRatePerFte: 450_000,
    gradeLevel: 3,
    isAiImpacted: true,
  },
  {
    id: 'sdet-fe',
    name: 'SDET / Framework Engineer',
    fte: { baseline: 4, transition: 4, mature: 3 },
    costPerFte: 320_000,
    billRatePerFte: 520_000,
    gradeLevel: 4,
    isAiImpacted: true,
  },
  {
    id: 'domain-sme',
    name: 'Domain SME',
    fte: { baseline: 6, transition: 5, mature: 4 },
    costPerFte: 350_000,
    billRatePerFte: 600_000,
    gradeLevel: 4,
    isAiImpacted: true,
  },
  {
    id: 'ai-eng',
    name: 'AI Engineer / Prompt Engineer',
    fte: { baseline: 0, transition: 3, mature: 2 },
    costPerFte: 420_000,
    billRatePerFte: 700_000,
    gradeLevel: 4,
    isAiImpacted: true,
  },
  {
    id: 'data-ke',
    name: 'Data / Knowledge Engineer',
    fte: { baseline: 0, transition: 2, mature: 1.5 },
    costPerFte: 420_000,
    billRatePerFte: 650_000,
    gradeLevel: 3,
    isAiImpacted: true,
  },
  {
    id: 'devops-ce',
    name: 'DevOps / Cloud Engineer',
    fte: { baseline: 1, transition: 2, mature: 1.5 },
    costPerFte: 350_000,
    billRatePerFte: 600_000,
    gradeLevel: 3,
    isAiImpacted: false,
  },
  {
    id: 'pmo-ra',
    name: 'PMO / Reporting Analyst',
    fte: { baseline: 1, transition: 1, mature: 1 },
    costPerFte: 220_000,
    billRatePerFte: 420_000,
    gradeLevel: 2,
    isAiImpacted: false,
  },
];

export const DEFAULT_COST_LINES: CostLine[] = [
  {
    id: 'llm-tokens',
    name: 'LLM tokens',
    category: 'AI',
    monthlyAmount: { baseline: 0, transition: 5_039, mature: 10_000 },
    chargeable: true,
    aiSpecific: true,
  },
  {
    id: 'agent-orch',
    name: 'Agent orchestrator licence',
    category: 'AI',
    monthlyAmount: { baseline: 0, transition: 0, mature: 0 },
    chargeable: true,
    aiSpecific: true,
  },
  {
    id: 'vector-db',
    name: 'Vector DB / knowledge base',
    category: 'AI',
    monthlyAmount: { baseline: 0, transition: 0, mature: 0 },
    chargeable: true,
    aiSpecific: true,
  },
  {
    id: 'ai-monitoring',
    name: 'AI monitoring and evaluation',
    category: 'AI',
    monthlyAmount: { baseline: 0, transition: 8_332, mature: 8_332 },
    chargeable: true,
    aiSpecific: true,
  },
  {
    id: 'cloud-compute',
    name: 'Cloud compute (AI/automation)',
    category: 'Infra',
    monthlyAmount: { baseline: 0, transition: 149_043, mature: 149_043 },
    chargeable: true,
    aiSpecific: true,
  },
  {
    id: 'storage-backup',
    name: 'Storage / backup / DR',
    category: 'Infra',
    monthlyAmount: { baseline: 0, transition: 150_982, mature: 150_982 },
    chargeable: true,
    aiSpecific: true,
  },
  {
    id: 'test-mgmt',
    name: 'Test management / automation licences',
    category: 'Tools',
    monthlyAmount: { baseline: 0, transition: 0, mature: 0 },
    chargeable: true,
    aiSpecific: false,
  },
  {
    id: 'security-compliance',
    name: 'Security / compliance tools',
    category: 'Tools',
    monthlyAmount: { baseline: 0, transition: 0, mature: 0 },
    chargeable: true,
    aiSpecific: false,
  },
  {
    id: 'governance',
    name: 'Governance and client reporting',
    category: 'Governance',
    monthlyAmount: { baseline: 0, transition: 300_000, mature: 300_000 },
    chargeable: true,
    aiSpecific: false,
  },
  {
    id: 'capex-amort',
    name: 'Capex amortization',
    category: 'Capex',
    monthlyAmount: { baseline: 0, transition: 100_000, mature: 100_000 },
    chargeable: false,
    aiSpecific: true,
  },
  {
    id: 'transition-premium',
    name: 'Transition premium',
    category: 'Transition',
    monthlyAmount: { baseline: 0, transition: 300_000, mature: 150_000 },
    chargeable: true,
    aiSpecific: false,
  },
  {
    id: 'training-change',
    name: 'Training and change management',
    category: 'Transition',
    monthlyAmount: { baseline: 0, transition: 100_000, mature: 50_000 },
    chargeable: true,
    aiSpecific: false,
  },
];

export const DEFAULT_KPIS: KpiInput[] = [
  {
    id: 'total-tc',
    name: 'Total test cases',
    unit: 'count',
    baseline: 15_253,
    appliesToFactor: false,
    isVelocity: false,
    overrides: {},
  },
  {
    id: 'manual-tc',
    name: 'Manual test cases',
    unit: 'count',
    baseline: 9_091,
    appliesToFactor: false,
    isVelocity: false,
    overrides: {},
  },
  {
    id: 'auto-coverage',
    name: 'Automation coverage',
    unit: '%',
    baseline: 0.404, // derived = (15253 - 9091) / 15253
    appliesToFactor: false,
    isVelocity: false,
    overrides: {},
  },
  {
    id: 'tc-creation-effort',
    name: 'Test case creation effort',
    unit: 'hrs/TC',
    baseline: 1.15,
    appliesToFactor: true,
    isVelocity: false,
    overrides: {},
  },
  {
    id: 'automation-script-effort',
    name: 'Automation script creation effort',
    unit: 'hrs/script',
    baseline: 4.0,
    appliesToFactor: true,
    isVelocity: false,
    overrides: {},
  },
  {
    id: 'testing-effort-per-release',
    name: 'Testing effort per release',
    unit: 'hrs',
    volumePerMonth: 1,
    volumeUnit: 'releases',
    reviewOverheadApplies: true,
    baseline: 12_040,
    appliesToFactor: true,
    isVelocity: false,
    overrides: {
      transition: 11_356,
      mature: 9_891,
    },
  },
  {
    id: 'defect-rca-effort',
    name: 'Defect RCA effort',
    unit: 'hrs/defect',
    volumePerMonth: 300,
    volumeUnit: 'defects',
    reviewOverheadApplies: false,
    baseline: 0.25,
    appliesToFactor: true,
    isVelocity: false,
    overrides: {},
  },
  {
    id: 'defect-verification-effort',
    name: 'Defect verification effort',
    unit: 'hrs/defect',
    volumePerMonth: 300,
    volumeUnit: 'defects',
    reviewOverheadApplies: false,
    baseline: 0.4,
    appliesToFactor: true,
    isVelocity: false,
    overrides: {
      transition: 0.3668,
      mature: 0.3337,
    },
  },
  {
    id: 'tc-creation-velocity',
    name: 'Test case creation velocity',
    unit: 'TC/tester/week',
    baseline: 35,
    appliesToFactor: true,
    isVelocity: true,
    overrides: {},
  },
  {
    id: 'script-creation-velocity',
    name: 'Script creation velocity',
    unit: 'scripts/eng/week',
    baseline: 10,
    appliesToFactor: true,
    isVelocity: true,
    overrides: {},
  },
  {
    id: 'regression-duration',
    name: 'Regression run duration',
    unit: 'machine hrs/cycle',
    baseline: 5_782,
    appliesToFactor: false,
    isVelocity: false,
    overrides: {},
  },
  {
    id: 'regression-runs-per-month',
    name: 'Regression runs per month',
    unit: 'count',
    baseline: 4,
    appliesToFactor: false,
    isVelocity: false,
    overrides: {},
  },
];

/** Reference amounts are authored in INR (source Excel) and converted to `currency`. */
export function createDefaultScenario(currency: Currency = 'EUR'): Scenario {
  const reference = createInrReferenceScenario();
  if (currency === 'INR') return reference;
  return convertScenarioCurrency(
    reference,
    currency,
    fxFactor('INR', currency, reference.fxRatesPerEur)
  );
}

function createInrReferenceScenario(): Scenario {
  return {
    id: 'default',
    name: 'AI-Augmented Testing – Reference (LTTS)',
    clientName: 'Client Name',
    useCase: 'AI-Augmented Software Testing',
    baseCurrency: 'INR',
    fxRatesPerEur: { ...DEFAULT_FX_RATES_PER_EUR },
    scenarioDate: new Date().toISOString().split('T')[0],

    globalAssumptions: { ...DEFAULT_GLOBAL_ASSUMPTIONS },
    timeValue: { ...DEFAULT_TIME_VALUE },
    aiOverheadPercent: {
      baseline: { hitl: 0, rework: 0, dualRun: 0 },
      transition: { ...DEFAULT_AI_OVERHEAD_PERCENT.transition },
      mature: { ...DEFAULT_AI_OVERHEAD_PERCENT.mature },
    },

    roles: JSON.parse(JSON.stringify(DEFAULT_ROLES)),
    peopleMode: { mode: 'effort-derived' },

    kpis: JSON.parse(JSON.stringify(DEFAULT_KPIS)),

    costLines: JSON.parse(JSON.stringify(DEFAULT_COST_LINES)),
    oneTimeInvestment: JSON.parse(JSON.stringify(DEFAULT_ONE_TIME_INVESTMENT)),

    productivityFactor: {
      mode: 'direct-factor',
      transition: 0.5801,
      mature: 0.3864,
    },

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
