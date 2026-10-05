/**
 * Public API for the AI ROI Calculator engine
 */

export { calculate } from './engine.js';
export type {
  State,
  Currency,
  ImplementationModel,
  DeliveryProfile,
  LlmPrice,
  LlmPricing,
  LlmUsage,
  ProductivityMode,
  Role,
  CostLine,
  OneTimeInvestmentItem,
  GlobalAssumptions,
  TimeValue,
  KpiInput,
  Scenario,
  Results,
  EffortCalculation,
  CostCalculation,
  MonthlyCashFlow,
  BenefitLedgerLine,
  FinancialMetrics,
} from './types.js';

export { createDefaultScenario, normalizeScenario } from './defaults.js';
export { createExampleScenario } from './example.js';
export { DEFAULT_LLM_PRICING, llmCosts } from './llm.js';
export { compareDeliveryModels, type ModelComparison } from './compare.js';
export {
  advise,
  breakEvenRealisation,
  withRealisedEffortReduction,
  formatMoney,
  type Advice,
  type Finding,
  type FindingSeverity,
  type VerdictTone,
} from './advice.js';
export { parseScenario, type ParseScenarioResult } from './schema.js';
export { scenarioToYaml, parseScenarioText } from './serialize.js';
export {
  DELIVERY_MODELS,
  DEFAULT_DELIVERY_PROFILES,
  DEFAULT_BCC_RATE_FACTOR,
  deliveryContext,
  effectiveFte,
  effectiveRate,
} from './delivery.js';
export {
  CURRENCIES,
  DEFAULT_FX_RATES_PER_EUR,
  DEFAULT_FX_RATES_NOTE,
  fxFactor,
  convertScenarioCurrency,
} from './currency.js';
