import {
  CASE_FACTORS,
  GAP_EFFECTIVENESS_PER_POINT,
  GAP_INVESTMENT_PER_POINT,
  HORIZON_MONTHS,
  MARGINAL_ROI_PERCENT,
  MAX_REDUCTION,
  READINESS_POINTS,
} from './defaults.js';
import type {
  BusinessCaseInputs,
  CaseId,
  CaseResult,
  Readiness,
  ReadinessAnswer,
  TaskMix,
  TierId,
  PostureId,
  Verdict,
} from './types.js';

/** Optional adjustments used only by the break-even searches. The screens never pass these. */
export interface CaseOverrides {
  effectivenessMultiplier?: number;
  cashShare?: number;
}

/** Section 5.2: sum of readiness points over the four answers, 0 to 8. */
export function readinessGap(readiness: Readiness): number {
  const answers: ReadinessAnswer[] = [readiness.data, readiness.skills, readiness.sponsorship, readiness.compliance];
  return answers.reduce((sum, answer) => sum + READINESS_POINTS[answer], 0);
}

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

/** Section 5.1: the tier a task uses in a posture. */
function tierForTask(inputs: BusinessCaseInputs, postureId: PostureId, task: TaskMix): TierId {
  if (postureId !== 'hybrid') return postureId;
  return task.difficulty === 'routine' ? 'local' : inputs.hybridComplexTier;
}

/**
 * Calculates one posture under one case (sections 5.1 to 5.8). Pure: no rounding.
 * Assumes the inputs are valid.
 */
export function calculateCase(
  inputs: BusinessCaseInputs,
  postureId: PostureId,
  caseId: CaseId,
  overrides: CaseOverrides = {},
): CaseResult {
  // 5.2 and 5.3: case parameters
  const f = CASE_FACTORS[caseId];
  const gap = readinessGap(inputs.readiness);
  let effMult = (1 - GAP_EFFECTIVENESS_PER_POINT * gap) * f.effectiveness;
  if (overrides.effectivenessMultiplier !== undefined) effMult *= overrides.effectivenessMultiplier;
  const invMult = (1 + GAP_INVESTMENT_PER_POINT * gap) * f.investment;
  const ramp = Math.max(1, inputs.rampMonths + Math.ceil(gap / 2) + f.rampDelta);
  const cashShare =
    overrides.cashShare !== undefined ? clamp01(overrides.cashShare) : clamp01(inputs.cashShare * f.cash);

  // 5.1 and 5.4: hours and usage, task by task
  const totalHours = inputs.teamSize * inputs.hoursPerFteMonth;
  const hourlyCost = inputs.loadedCostPerFteYear / 12 / inputs.hoursPerFteMonth;
  const tiersUsed: TierId[] = [];
  let netHoursSavedPerMonth = 0;
  let usageCostPerMonth = 0;
  for (const task of inputs.tasks) {
    const tierId = tierForTask(inputs, postureId, task);
    if (!tiersUsed.includes(tierId)) tiersUsed.push(tierId);
    const tier = inputs.tiers[tierId];
    const routine = task.difficulty === 'routine';
    const assisted = totalHours * task.share * inputs.adoption;
    const reduction = Math.min(MAX_REDUCTION, (routine ? tier.reductionRoutine : tier.reductionComplex) * effMult);
    const review = routine ? tier.reviewRoutine : tier.reviewComplex;
    const removed = assisted * reduction;
    netHoursSavedPerMonth += removed * (1 - review);
    usageCostPerMonth += assisted * tier.usageCostPerAssistedHour;
  }

  // 5.5: value
  const capacityValuePerMonth = netHoursSavedPerMonth * hourlyCost;
  const countedSavingPerMonth = capacityValuePerMonth * cashShare;
  const redeployedValuePerMonth = capacityValuePerMonth - countedSavingPerMonth;
  const capacityFte = netHoursSavedPerMonth / inputs.hoursPerFteMonth;

  // 5.6: costs. The four investment lines are multiplied first, so they add up to the investment exactly.
  const investmentLines = [
    {
      label: 'Platform setup',
      amount: tiersUsed.reduce((sum, t) => sum + inputs.tiers[t].setup, 0) * invMult,
    },
    { label: 'Data readiness', amount: inputs.dataReadinessInvestment * invMult },
    { label: 'Governance setup', amount: inputs.governanceSetup * invMult },
    { label: 'Training', amount: inputs.trainingPerFte * inputs.teamSize * invMult },
  ];
  const investment = investmentLines.reduce((sum, line) => sum + line.amount, 0);
  const platformAndGovernancePerMonth =
    tiersUsed.reduce((sum, t) => sum + inputs.tiers[t].platformMonthly, 0) + inputs.governanceMonthly;
  const steadyNetPerMonth =
    countedSavingPerMonth + inputs.retiredCostMonthly - usageCostPerMonth - platformAndGovernancePerMonth;

  // 5.7: timeline over the horizon
  const cumulative: number[] = [-investment];
  for (let m = 1; m <= HORIZON_MONTHS; m++) {
    const factor = Math.min(1, m / ramp);
    const net =
      (countedSavingPerMonth + inputs.retiredCostMonthly) * factor -
      usageCostPerMonth * factor -
      platformAndGovernancePerMonth;
    cumulative.push(cumulative[m - 1]! + net);
  }
  let paybackMonth: number | null = null;
  for (let m = 1; m <= HORIZON_MONTHS; m++) {
    if (cumulative[m]! >= 0) {
      paybackMonth = m;
      break;
    }
  }
  const netValue36 = cumulative[HORIZON_MONTHS]!;
  const roiPercent = investment > 0 ? (netValue36 / investment) * 100 : null;

  // 5.8: verdict
  let verdict: Verdict;
  if (netValue36 <= 0) verdict = 'negative';
  else if (roiPercent !== null && roiPercent < MARGINAL_ROI_PERCENT) verdict = 'marginal';
  else verdict = 'positive';

  return {
    postureId,
    caseId,
    netHoursSavedPerMonth,
    capacityFte,
    capacityValuePerMonth,
    countedSavingPerMonth,
    redeployedValuePerMonth,
    usageCostPerMonth,
    platformAndGovernancePerMonth,
    steadyNetPerMonth,
    investment,
    investmentLines,
    paybackMonth,
    netValue36,
    roiPercent,
    cumulative,
    verdict,
  };
}
