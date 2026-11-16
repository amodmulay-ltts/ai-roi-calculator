export type TierId = 'local' | 'enterprise' | 'frontier';
export type PostureId = 'local' | 'hybrid' | 'enterprise' | 'frontier';
export type CaseId = 'conservative' | 'expected' | 'stretch';
export type Difficulty = 'routine' | 'complex';
export type DataConstraint = 'public-ok' | 'restricted' | 'sovereign';
export type ReadinessAnswer = 'ready' | 'partial' | 'not-ready';
export type Verdict = 'positive' | 'marginal' | 'negative';

/** A kind of work, belonging to one lifecycle phase. */
export interface TaskMix {
  /** Unique within the case. */
  id: string;
  name: string;
  /** Name of the phase this work belongs to; must match one of the case's phases. */
  phase: string;
  /** Share of in-scope effort, 0..1. All shares must sum to 1: they split one whole. */
  share: number;
  difficulty: Difficulty;
  /**
   * Share of this work where AI is used at maturity, 0..1. Set for each piece of work on its own, so these
   * values do not add up to 100%. A phase's AI use is the average of the work in it.
   */
  aiUse: number;
}

/** A lifecycle phase. Its AI use is not entered: it is the average of the AI use of the work in it. */
export interface WorkPhase {
  name: string;
}

/** A ready-made starting point for the work in scope. Its figures are placeholders, not measured data. */
export interface WorkTemplate {
  id: string;
  name: string;
  industry: string;
  description: string;
  phases: WorkPhase[];
  tasks: TaskMix[];
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
  workTemplateId: string;         // the template the work was last started from ('custom' once built by hand)
  phases: WorkPhase[];            // 1..12 phases, in display order
  tasks: TaskMix[];               // 1..40 kinds of work, each in one of the phases
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

/** What happens to one kind of work under a posture, in hours per month at maturity. */
export interface TaskResult {
  id: string;
  name: string;
  phase: string;
  tier: TierId;
  baselineHours: number;      // total hours x share of work
  assistedHours: number;      // baseline hours x the phase's AI use
  grossRemovedHours: number;  // assisted hours x effort AI removes
  reviewReworkHours: number;  // removed hours that come back as review and rework
  netSavedHours: number;      // gross removed minus review and rework
  netEfficiency: number;      // net saved / baseline hours, 0..1 (0 when there is no baseline work)
}

/** The tasks of one phase added up. */
export interface PhaseResult {
  name: string;
  aiUse: number;              // as entered
  baselineHours: number;
  assistedHours: number;
  netSavedHours: number;
  netEfficiency: number;      // net saved / baseline hours, 0..1 (0 when the phase has no work)
}

export interface CaseResult {
  postureId: PostureId;
  caseId: CaseId;
  netHoursSavedPerMonth: number;   // at maturity
  /** Hours of in-scope work per month before AI. */
  totalHours: number;
  grossRemovedHoursPerMonth: number;
  reviewReworkHoursPerMonth: number;
  /** Net share of in-scope effort freed after review and rework: netHoursSavedPerMonth / totalHours, 0..1. */
  netEfficiency: number;
  /** The bridge to net efficiency, as shares of in-scope effort: gross removed minus review and rework. */
  grossEfficiency: number;
  reviewReworkEfficiency: number;
  /** Share of all in-scope effort that AI is used on: assisted hours / total hours, 0..1. */
  aiReach: number;
  tasks: TaskResult[];
  phases: PhaseResult[];
  capacityFte: number;             // netHoursSavedPerMonth / hoursPerFteMonth
  capacityValuePerMonth: number;   // EUR, all released capacity at the hourly cost
  countedSavingPerMonth: number;   // capacityValue x effective cash share
  retiredCostPerMonth: number;     // cost removed outright, as entered
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
