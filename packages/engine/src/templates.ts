import type { Currency, KpiInput, LlmUsage, Role, SeatAssignment } from './types.js';

/**
 * Automotive software (ECU / ADAS) use-case template: team, workload and AI model usage.
 * Single source for the setup template and the built-in example. Rates are European onshore, in EUR.
 */
export interface UseCaseTemplate {
  /** Currency the role rates are authored in. */
  rateCurrency: Currency;
  roles: Role[];
  kpis: KpiInput[];
  llmUsage: LlmUsage[];
  seatAssignments: SeatAssignment[];
}

export const AUTOMOTIVE_ROLES: Role[] = [
  {
    id: 'sw-architect',
    name: 'Software Architect',
    fte: { baseline: 2, transition: 2, mature: 2 },
    costPerFte: 12_000,
  },
  {
    id: 'senior-embedded',
    name: 'Senior Embedded Developer',
    fte: { baseline: 8, transition: 8, mature: 7 },
    costPerFte: 10_000,
  },
  {
    id: 'embedded-dev',
    name: 'Embedded Developer',
    fte: { baseline: 12, transition: 12, mature: 8 },
    costPerFte: 8_500,
  },
  {
    id: 'validation-eng',
    name: 'Test and Validation Engineer',
    fte: { baseline: 6, transition: 6, mature: 3.5 },
    costPerFte: 8_000,
  },
  {
    id: 'safety-eng',
    name: 'Functional Safety Engineer',
    fte: { baseline: 2, transition: 2, mature: 2 },
    costPerFte: 11_000,
    // Stays onshore in BCC models: safety sign-off and assessor contact
    offshorable: false,
  },
  {
    id: 'project-lead',
    name: 'Project Lead / Product Owner',
    fte: { baseline: 2, transition: 2, mature: 2 },
    costPerFte: 11_500,
    // Stays onshore in BCC models: customer-facing leadership
    offshorable: false,
  },
  {
    id: 'devops',
    name: 'DevOps / CI Engineer',
    fte: { baseline: 1, transition: 1, mature: 1 },
    costPerFte: 9_500,
  },
  {
    id: 'ai-engineer',
    name: 'AI Engineer',
    fte: { baseline: 0, transition: 2, mature: 1.5 },
    costPerFte: 11_000,
  },
];

// 40 × 60 + 300 × 3 + 160 × 2 + 60 × 8 + 40 × 12 + 700 = 5,280 h = 33 FTE × 160 h
export const AUTOMOTIVE_WORKLOAD: KpiInput[] = [
  {
    id: 'requirements',
    name: 'Software requirements implemented',
    unit: 'hrs per requirement',
    baseline: 60,
    appliesToFactor: true,
    isVelocity: false,
    overrides: {},
    volumePerMonth: 40,
    volumeUnit: 'requirements',
    reviewOverheadApplies: true,
  },
  {
    id: 'sil-tests',
    name: 'SIL test cases written and run',
    unit: 'hrs per test case',
    baseline: 3,
    appliesToFactor: true,
    isVelocity: false,
    overrides: {},
    volumePerMonth: 300,
    volumeUnit: 'test cases',
    reviewOverheadApplies: true,
  },
  {
    id: 'code-reviews',
    name: 'Safety-relevant code reviews',
    unit: 'hrs per review',
    baseline: 2,
    appliesToFactor: true,
    isVelocity: false,
    overrides: {},
    volumePerMonth: 160,
    volumeUnit: 'reviews',
    reviewOverheadApplies: true,
  },
  {
    id: 'defects',
    name: 'Defect analysis and fixing',
    unit: 'hrs per defect',
    baseline: 8,
    appliesToFactor: true,
    isVelocity: false,
    overrides: {},
    volumePerMonth: 60,
    volumeUnit: 'defects',
    reviewOverheadApplies: true,
  },
  {
    id: 'safety-work-products',
    name: 'ISO 26262 / ASPICE work products',
    unit: 'hrs per work product',
    baseline: 12,
    appliesToFactor: true,
    isVelocity: false,
    overrides: {},
    volumePerMonth: 40,
    volumeUnit: 'work products',
    reviewOverheadApplies: true,
  },
  {
    id: 'hil-integration',
    name: 'HIL testing, integration and coordination',
    unit: 'hrs per month',
    baseline: 700,
    appliesToFactor: false,
    isVelocity: false,
    overrides: {},
    volumePerMonth: 1,
    volumeUnit: 'months',
    reviewOverheadApplies: false,
  },
];

// Model usage follows the work: requests per requirement / test case / review / work product
export const AUTOMOTIVE_LLM_USAGE: LlmUsage[] = [
  {
    id: 'coding-assistant',
    name: 'Coding assistant (C / AUTOSAR)',
    priceId: 'claude-sonnet-5-5',
    kpiId: 'requirements',
    requestsPerUnit: 500,
    inputTokensPerRequest: 12_000,
    outputTokensPerRequest: 2_000,
  },
  {
    id: 'test-generation',
    name: 'SIL test generation',
    priceId: 'claude-sonnet-5-5',
    kpiId: 'sil-tests',
    requestsPerUnit: 20,
    inputTokensPerRequest: 8_000,
    outputTokensPerRequest: 2_000,
  },
  {
    id: 'review-agent',
    name: 'MISRA and safety review agent',
    priceId: 'claude-opus-5-5',
    kpiId: 'code-reviews',
    requestsPerUnit: 5,
    inputTokensPerRequest: 30_000,
    outputTokensPerRequest: 2_000,
  },
  {
    id: 'work-product-drafting',
    name: 'Safety work product drafting',
    priceId: 'claude-opus-5-5',
    kpiId: 'safety-work-products',
    requestsPerUnit: 50,
    inputTokensPerRequest: 40_000,
    outputTokensPerRequest: 4_000,
  },
];

// Enterprise seats for the hands-on engineering roles; usage is billed on top at API rates
export const AUTOMOTIVE_SEATS: SeatAssignment[] = [
  {
    id: 'engineer-seats',
    name: 'AI coding assistant seats (engineers)',
    seatPriceId: 'claude-enterprise',
    roleIds: ['sw-architect', 'senior-embedded', 'embedded-dev', 'validation-eng', 'safety-eng', 'devops', 'ai-engineer'],
    // A vendor product: self-hosting an open-weight model does not buy these
    sourcing: ['frontier', 'enterprise'],
  },
];

export const AUTOMOTIVE_TEMPLATE: UseCaseTemplate = {
  rateCurrency: 'EUR',
  roles: AUTOMOTIVE_ROLES,
  kpis: AUTOMOTIVE_WORKLOAD,
  llmUsage: AUTOMOTIVE_LLM_USAGE,
  seatAssignments: AUTOMOTIVE_SEATS,
};
