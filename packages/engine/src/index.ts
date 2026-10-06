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
  SeatPrice,
  SeatPricing,
  SeatAssignment,
  AiSourcing,
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
export { createExampleScenario, EXAMPLE_CLIENT } from './example.js';
export { AUTOMOTIVE_TEMPLATE, type UseCaseTemplate } from './templates.js';
export { DEFAULT_LLM_PRICING, llmCosts } from './llm.js';
export {
  DEFAULT_SEAT_PRICING,
  seatCosts,
  seatsIncludingUsage,
  aiCostPerDeveloper,
  PER_DEVELOPER_BAND_USD,
  type PerDeveloperCost,
} from './seats.js';
export { SOURCING_PRESETS, sourcingPreset, applySourcing, SELF_HOSTED_LINE_ID, type SourcingPreset } from './sourcing.js';
export { compareDeliveryModels, type ModelComparison } from './compare.js';
export { tornado, paybackGrid, type TornadoResult, type TornadoRow, type PaybackGrid } from './sensitivity.js';
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
  offshoreRate,
} from './delivery.js';
export {
  CURRENCIES,
  DEFAULT_FX_RATES_PER_EUR,
  DEFAULT_FX_RATES_NOTE,
  fxFactor,
  convertScenarioCurrency,
} from './currency.js';
