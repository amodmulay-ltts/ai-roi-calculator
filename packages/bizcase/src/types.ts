export type TierId = 'local' | 'enterprise' | 'frontier';
export type PostureId = 'local' | 'hybrid' | 'enterprise' | 'frontier';
export type CaseId = 'conservative' | 'expected' | 'stretch';
export type Difficulty = 'routine' | 'complex';
export type DataConstraint = 'public-ok' | 'restricted' | 'sovereign';
export type ReadinessAnswer = 'ready' | 'partial' | 'not-ready';
export type Verdict = 'positive' | 'marginal' | 'negative';

export interface TaskMix {
  id: 'testDesign' | 'scriptDev' | 'execution' | 'defectAnalysis' | 'reporting';
  name: string;
  /** Share of in-scope effort, 0..1. All shares must sum to 1. */
  share: number;
  difficulty: Difficulty;
}

export interface TierAssumptions {
  /** Fraction of a routine task's effort AI removes before review, 0..1. */
  reductionRoutine: number;
  reductionComplex: number;
  /** Fraction of the removed effort that comes back as human review and rework, 0..1. */
  reviewRoutine: number;
  reviewComplex: number;
  /** EUR per hour of AI-assisted work. */
  usageCostPerAssistedHour: number;
  /** EUR per month: licences, infrastructure, operations. */
  platformMonthly: number;
  /** EUR one-time. */
  setup: number;
}

export interface Readiness {
  data: ReadinessAnswer;
  skills: ReadinessAnswer;
  sponsorship: ReadinessAnswer;
  compliance: ReadinessAnswer;
}

export interface BusinessCaseInputs {
  customerName: string;
  teamSize: number;               // FTE in scope, > 0
  loadedCostPerFteYear: number;   // EUR per year, > 0
  hoursPerFteMonth: number;       // default 160, > 0
  dataConstraint: DataConstraint;
  tasks: TaskMix[];               // exactly the 5 tasks, in the order of section 4
  adoption: number;               // share of task hours where AI is used at maturity, 0..1
  cashShare: number;              // share of released capacity counted as real savings, 0..1
  retiredCostMonthly: number;     // EUR per month of cost removed outright (tools, contractors), >= 0
  rampMonths: number;             // integer 1..24: months to full effect
  governanceMonthly: number;      // EUR per month, >= 0
  dataReadinessInvestment: number;// EUR one-time, >= 0
  governanceSetup: number;        // EUR one-time, >= 0
  trainingPerFte: number;         // EUR one-time per FTE, >= 0
  hybridComplexTier: TierId;      // tier used for complex tasks in the hybrid posture
  tiers: Record<TierId, TierAssumptions>;
  readiness: Readiness;
}

export interface CaseResult {
  postureId: PostureId;
  caseId: CaseId;
  netHoursSavedPerMonth: number;   // at maturity
  capacityFte: number;             // netHoursSavedPerMonth / hoursPerFteMonth
  capacityValuePerMonth: number;   // EUR, all released capacity at the hourly cost
  countedSavingPerMonth: number;   // capacityValue x effective cash share
  redeployedValuePerMonth: number; // capacityValue minus counted saving (NOT counted anywhere)
  usageCostPerMonth: number;       // at maturity
  platformAndGovernancePerMonth: number;
  steadyNetPerMonth: number;       // counted saving + retired cost - usage - platform and governance, at maturity
  investment: number;              // one-time, month 0
  /** Breakdown of `investment`; the amounts add up to it exactly. */
  investmentLines: { label: string; amount: number }[];
  paybackMonth: number | null;     // first month 1..36 with cumulative >= 0, else null
  netValue36: number;              // cumulative at month 36 (undiscounted)
  roiPercent: number | null;       // netValue36 / investment x 100; null when investment is 0
  cumulative: number[];            // length 37: index m is the cumulative position at month m
  verdict: Verdict;
}

export interface PostureSummary {
  postureId: PostureId;
  allowed: boolean;
  disallowedReason: string | null;
  tiersUsed: TierId[];
  expected: CaseResult;
  conservative: CaseResult;
  stretch: CaseResult;
}

export interface ValidationIssue { field: string; message: string; }
