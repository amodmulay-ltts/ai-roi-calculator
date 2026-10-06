/**
 * Core types for the AI ROI Calculator engine
 */

export type State = 'baseline' | 'transition' | 'mature';
export type Currency = 'INR' | 'USD' | 'EUR' | 'GBP' | 'JPY' | 'AED' | 'SGD' | 'AUD' | 'CAD' | 'CHF';
export type ImplementationModel = 'ai-first' | 'ai-bcc' | 'onshore-ai' | 'bcc-only' | 'onshore';

export interface DeliveryProfile {
  /** Share of delivery FTE in the best-cost country, 0–1. */
  bccShare: number;
  /** 0 = no AI; 1 = the AI plan as entered (role FTE, AI cost lines, factor); >1 = deeper than planned. */
  aiAdoption: number;
}
export type ProductivityMode = 'direct-factor' | 'evaluation-derived';

export interface Role {
  id: string;
  name: string;
  fte: Record<State, number>;
  /** Onshore cost per FTE per month. */
  costPerFte: number;
  /** Offshore (BCC) cost per FTE per month; absent = onshore cost × scenario.bccRateFactor. */
  bccCostPerFte?: number;
  /** Whether this role can be moved offshore in BCC models; absent = yes. */
  offshorable?: boolean;
}

export interface CostLine {
  id: string;
  name: string;
  category: string;
  monthlyAmount: Record<State, number>;
  chargeable: boolean;
  /** AI-specific lines scale with AI adoption; others apply whenever the delivery model changes anything. */
  aiSpecific: boolean;
}

export interface OneTimeInvestmentItem {
  id: string;
  name: string;
  amount: number;
  month: number;
  aiSpecific: boolean;
}

export interface LlmPrice {
  id: string;
  label: string;
  /** Price per million input tokens, in LlmPricing.currency. */
  inputPerMTok: number;
  outputPerMTok: number;
}

export interface LlmPricing {
  currency: Currency;
  /** Date the prices were taken from the vendor list (YYYY-MM-DD). */
  asOf: string;
  source: string;
  prices: LlmPrice[];
}

export interface LlmUsage {
  id: string;
  name: string;
  priceId: string;
  /** Workload item whose monthly volume drives the requests; absent = requestsPerUnit is per month. */
  kpiId?: string;
  requestsPerUnit: number;
  inputTokensPerRequest: number;
  outputTokensPerRequest: number;
}

export interface GlobalAssumptions {
  /** Legacy (pre-workload files): migrated to KPI volumes by normalizeScenario. */
  releasesPerMonth?: number;
  workingHrsPerFtePerMonth: number;
  /** Legacy (pre-workload files): migrated to KPI volumes by normalizeScenario. */
  defectsPerMonth?: number;
  transitionLengthMonths: number;
  riskReservePercent: Record<State, number>;
  corporateOverheadPercent: Record<State, number>;
  overheadRationale: Record<State, string>;
}

export interface TimeValue {
  horizonMonths: number;
  discountRateAnnual: number;
  wageEscalationAnnual: number;
}

export interface KpiInput {
  id: string;
  name: string;
  unit: string;
  baseline: number;
  appliesToFactor: boolean;
  isVelocity: boolean;
  overrides: Partial<Record<State, number>>;
  /** Present = workload item: monthly hours = volumePerMonth × KPI value (hours per unit). */
  volumePerMonth?: number;
  /** What one unit of volume is, e.g. "releases", "tickets". */
  volumeUnit?: string;
  /** Whether AI review overhead (HITL, rework, dual run) is added on top of this item's hours. */
  reviewOverheadApplies?: boolean;
  /** Extra demand per month that AI lets the team absorb without hiring (cost avoidance, F7). */
  extraVolumePerMonth?: number;
}

export interface AiOverheadPercent {
  hitl: number;
  rework: number;
  dualRun: number;
}

export interface DirectProductivityFactor {
  mode: 'direct-factor';
  transition: number;
  mature: number;
}

export interface EvaluationDimension {
  name: 'relevance' | 'correctness' | 'hallucination' | 'toolCompletion' | 'governance';
  score: Record<State, number>;
  weight: number;
}

export interface EvaluationTier {
  name: 'llm' | 'multiAgent' | 'multiTurn';
  weight: number;
  dimensions: EvaluationDimension[];
}

export interface ActivityImpact {
  name: 'testDesign' | 'scriptDev' | 'execution' | 'defectRca' | 'reporting';
  effortShare: number;
  maxAiReduction: number;
}

export interface EvaluationProductivityFactor {
  mode: 'evaluation-derived';
  tiers: EvaluationTier[];
  activities: ActivityImpact[];
  adoption: Record<State, number>;
}

export type ProductivityFactor = DirectProductivityFactor | EvaluationProductivityFactor;

export interface PeopleMode {
  mode: 'staffing-plan' | 'effort-derived';
}

export interface Scenario {
  id: string;
  name: string;
  clientName: string;
  useCase: string;
  baseCurrency: Currency;
  fxRatesPerEur: Record<Currency, number>;
  /** Illustrative example with fictional data; shown and exported with an "Example" label. */
  isExample?: boolean;
  /** How role rates are shown and entered; stored as cost per FTE per month either way. */
  rateUnit?: 'hour' | 'month';
  scenarioDate: string;

  // Global settings
  globalAssumptions: GlobalAssumptions;
  timeValue: TimeValue;
  aiOverheadPercent: Record<State, AiOverheadPercent>;

  // Team
  roles: Role[];
  peopleMode: PeopleMode;

  // Effort and KPIs
  kpis: KpiInput[];

  // Costs
  costLines: CostLine[];
  /** AI model usage, costed as requests × tokens × price (AI-specific, scales with adoption). */
  llmUsage: LlmUsage[];
  llmPricing: LlmPricing;
  oneTimeInvestment: OneTimeInvestmentItem[];

  // Productivity
  productivityFactor: ProductivityFactor;

  // Delivery model. Role costPerFte is the onshore rate.
  primaryModel: ImplementationModel;
  deliveryProfiles: Record<ImplementationModel, DeliveryProfile>;
  /** Default BCC cost as a fraction of onshore cost, for roles without their own offshore rate. */
  bccRateFactor: number;
  /** Customer's current BCC share; the baseline is never changed by the delivery model. */
  baselineBccShare: number;

  // Options
  costChargeable: 'tco' | 'chargeable';
  costAvoidanceIncludedInRoi: boolean;
}

// ============ RESULTS ============

export interface EffortCalculation {
  kpi: Record<string, Record<State, number>>;
  /** Hours per workload item (KPI id) per state. */
  workloadHours: Record<string, Record<State, number>>;
  /** Hours of workload items that carry AI review overhead. */
  coreEffort: Record<State, number>;
  aiOverheadHours: Record<State, number>;
  /** Hours of workload items without review overhead. */
  otherEffort: Record<State, number>;
  totalEffort: Record<State, number>;
  effortFte: Record<State, number>;
  /** Staffing plan as entered (after delivery-model adoption scaling), regardless of people mode. */
  planFte: Record<State, number>;
  /** FTE per role (aligned with scenario.roles) that drives people cost in the active people mode. */
  roleFte: Array<Record<State, number>>;
  /** Total of roleFte: the headcount that is costed. */
  staffingFte: Record<State, number>;
  fteGap: Record<State, number>;
  effortSavingPercent: Record<State, number>;
}

export interface CostCalculation {
  peopleCost: Record<State, number>;
  /** AI model usage cost (part of direct OPEX). */
  llmCost: Record<State, number>;
  llmCostByUsage: Record<string, Record<State, number>>;
  llmRequestsPerMonth: Record<string, number>;
  /** Value of the extra demand absorbed without hiring, per month (not part of run cost). */
  costAvoidance: Record<State, number>;
  directOpex: Record<State, number>;
  overhead: Record<State, number>;
  risk: Record<State, number>;
  fullyLoaded: Record<State, number>;
  chargeableDirectOpex: Record<State, number>;
  chargeableOverhead: Record<State, number>;
  chargeableRisk: Record<State, number>;
  chargeableFullyLoaded: Record<State, number>;
}

export interface MonthlyCashFlow {
  month: number;
  runCostFull: number;
  baselineCostFull: number;
  savingFull: number;
  runCostChargeable: number;
  baselineCostChargeable: number;
  savingChargeable: number;
  investmentOutflow: number;
  costAvoidance: number;
  netCashFlow: number;
  cumulativeCashFlow: number;
}

export interface BenefitLedgerLine {
  category: 'volumeEffect' | 'mixEffect' | 'nonPeopleCostDelta' | 'overheadDelta' | 'riskDelta' | 'costAvoidance';
  amount: number;
  notes?: string;
}

export interface FinancialMetrics {
  paybackMonth: number | null;
  paybackNotInHorizon: boolean;
  breakEvenMonth: number | null;
  totalSavingsOverHorizon: number;
  totalInvestment: number;
  roiPercent: number;
  steadyStateAnnualRoi: number;
  npv: number;
  irr: number | null;
  lowestCumulativePosition: number;
  lowestCumulativeMonth: number;
}

export interface Results {
  scenario: Scenario;

  // Effort & KPIs
  effort: EffortCalculation;

  // Costs
  cost: CostCalculation;

  // Monthly forecast
  monthlyForecast: MonthlyCashFlow[];

  // Benefit ledger (mature steady state)
  benefitLedger: BenefitLedgerLine[];

  // Financial metrics
  financialMetrics: FinancialMetrics;

  // Derived
  matureMonthlyAverage: number;
}
