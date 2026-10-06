/**
 * Main calculation engine for AI ROI Calculator
 * References the build prompt sections for each calculation
 */

import type {
  Scenario,
  Results,
  State,
  EffortCalculation,
  CostCalculation,
  MonthlyCashFlow,
  BenefitLedgerLine,
  FinancialMetrics,
} from './types.js';
import {
  type DeliveryContext,
  deliveryContext,
  effectiveFte,
  effectiveRate,
  effectiveLineAmount,
  effectiveInvestment,
  effectiveProductivityFactor,
  effectiveOverride,
} from './delivery.js';
import { llmCosts } from './llm.js';

/**
 * Main entry point: calculate(scenario) -> Results
 * Section 5 of the build prompt
 */
export function calculate(scenario: Scenario): Results {
  const ctx = deliveryContext(scenario);
  const effort = calculateEffort(scenario, ctx);
  const cost = calculateCost(scenario, ctx, effort);
  const monthlyForecast = calculateMonthlyCashFlow(scenario, cost, ctx);
  const benefitLedger = calculateBenefitLedger(scenario, cost, ctx, effort);
  const financialMetrics = calculateFinancialMetrics(scenario, monthlyForecast);

  return {
    scenario,
    effort,
    cost,
    monthlyForecast,
    benefitLedger,
    financialMetrics,
    matureMonthlyAverage: cost.fullyLoaded.mature,
  };
}

/**
 * Section 5.1: Effort model per state
 * kpi_s(k) = override_s(k) ?? baseline(k) × factor_s
 * totalEffort_s = core + ai overhead + rca + verify
 */
function calculateEffort(scenario: Scenario, ctx: DeliveryContext): EffortCalculation {
  const result: EffortCalculation = {
    kpi: {},
    workloadHours: {},
    coreEffort: { baseline: 0, transition: 0, mature: 0 },
    aiOverheadHours: { baseline: 0, transition: 0, mature: 0 },
    otherEffort: { baseline: 0, transition: 0, mature: 0 },
    totalEffort: { baseline: 0, transition: 0, mature: 0 },
    effortFte: { baseline: 0, transition: 0, mature: 0 },
    planFte: { baseline: 0, transition: 0, mature: 0 },
    roleFte: [],
    staffingFte: { baseline: 0, transition: 0, mature: 0 },
    fteGap: { baseline: 0, transition: 0, mature: 0 },
    effortSavingPercent: { baseline: 0, transition: 0, mature: 0 },
  };

  // Productivity factor (Section 5.2), scaled by the delivery model's AI adoption
  const plannedFactor = getProductivityFactor(scenario);
  const targetStates: Array<'transition' | 'mature'> = ['transition', 'mature'];

  for (const kpi of scenario.kpis) {
    result.kpi[kpi.id] = { baseline: kpi.baseline, transition: kpi.baseline, mature: kpi.baseline };

    for (const state of targetStates) {
      const adoption = ctx.adoption[state];
      const override = kpi.overrides[state];
      if (override !== undefined) {
        result.kpi[kpi.id][state] = effectiveOverride(kpi.baseline, override, adoption);
      } else if (kpi.appliesToFactor) {
        const factor = effectiveProductivityFactor(plannedFactor[state], adoption);
        result.kpi[kpi.id][state] = kpi.isVelocity ? kpi.baseline / factor : kpi.baseline * factor;
      }
    }
  }

  // Workload (Section 5.1, generalised): hours = volume × hours per unit, per state
  const states: State[] = ['baseline', 'transition', 'mature'];
  for (const kpi of scenario.kpis) {
    if (kpi.volumePerMonth === undefined) continue;
    const hours = {
      baseline: result.kpi[kpi.id]!.baseline * kpi.volumePerMonth,
      transition: result.kpi[kpi.id]!.transition * kpi.volumePerMonth,
      mature: result.kpi[kpi.id]!.mature * kpi.volumePerMonth,
    };
    result.workloadHours[kpi.id] = hours;
    const bucket = kpi.reviewOverheadApplies ? result.coreEffort : result.otherEffort;
    for (const state of states) bucket[state] += hours[state];
  }

  // AI overhead = core effort × (HITL + rework + dual-run) - Section 5.1, F10
  for (const state of states) {
    const overhead = scenario.aiOverheadPercent[state];
    const totalOverheadPercent = (overhead.hitl + overhead.rework + overhead.dualRun) * ctx.adoption[state];
    result.aiOverheadHours[state] = result.coreEffort[state] * totalOverheadPercent;
    result.totalEffort[state] = result.coreEffort[state] + result.aiOverheadHours[state] + result.otherEffort[state];
  }

  // Effort FTE
  const workingHrsPerFte = scenario.globalAssumptions.workingHrsPerFtePerMonth;
  for (const state of states) {
    result.effortFte[state] = result.totalEffort[state] / workingHrsPerFte;
  }

  // Staffing plan as entered (adoption-scaled); it always defines the role mix
  const planByRole = scenario.roles.map(role => ({
    baseline: effectiveFte(role, 'baseline', ctx),
    transition: effectiveFte(role, 'transition', ctx),
    mature: effectiveFte(role, 'mature', ctx),
  }));
  for (const state of states) {
    result.planFte[state] = planByRole.reduce((sum, r) => sum + r[state], 0);
  }

  // F9 effort-derived: the baseline team is the customer's actual team; later states scale it by the
  // workload ratio (effort_s / effort_B) and spread it across roles by the plan's mix.
  if (scenario.peopleMode.mode === 'effort-derived') {
    const scale: Record<State, number> = { baseline: 1, transition: 1, mature: 1 };
    for (const state of targetStates) {
      const workload = result.totalEffort.baseline > 0 ? result.totalEffort[state] / result.totalEffort.baseline : 1;
      const derivedTotal = result.planFte.baseline * workload;
      scale[state] = result.planFte[state] > 0 ? derivedTotal / result.planFte[state] : 0;
    }
    result.roleFte = planByRole.map(r => ({
      baseline: r.baseline,
      transition: r.transition * scale.transition,
      mature: r.mature * scale.mature,
    }));
  } else {
    result.roleFte = planByRole;
  }

  for (const state of states) {
    result.staffingFte[state] = result.roleFte.reduce((sum, r) => sum + r[state], 0);
  }

  // FTE gap
  for (const state of states) {
    result.fteGap[state] = result.staffingFte[state] - result.effortFte[state];
  }

  // Effort saving % (F4): on the AI-assisted core work before review overhead; falls back to all workload
  const savingBasis = result.coreEffort.baseline > 0
    ? result.coreEffort
    : { baseline: result.otherEffort.baseline, transition: result.otherEffort.transition, mature: result.otherEffort.mature };
  for (const state of states) {
    result.effortSavingPercent[state] = savingBasis.baseline > 0 ? 1 - savingBasis[state] / savingBasis.baseline : 0;
  }

  return result;
}

/**
 * Section 5.2: Get productivity factor
 * Returns either direct or evaluation-derived factor
 */
function getProductivityFactor(scenario: Scenario): Record<State, number> {
  if (scenario.productivityFactor.mode === 'direct-factor') {
    return {
      baseline: 1,
      transition: scenario.productivityFactor.transition,
      mature: scenario.productivityFactor.mature,
    };
  }

  // Evaluation-derived mode (not fully implemented in v1, but structure in place)
  // For now, return direct factor defaults
  return {
    baseline: 1,
    transition: 0.5801,
    mature: 0.3864,
  };
}

/**
 * Section 5.3: Cost model per state
 * fullyLoaded = direct + overhead + risk
 */
function calculateCost(scenario: Scenario, ctx: DeliveryContext, effort: EffortCalculation): CostCalculation {
  const result: CostCalculation = {
    peopleCost: { baseline: 0, transition: 0, mature: 0 },
    llmCost: { baseline: 0, transition: 0, mature: 0 },
    llmCostByUsage: {},
    llmRequestsPerMonth: {},
    costAvoidance: { baseline: 0, transition: 0, mature: 0 },
    directOpex: { baseline: 0, transition: 0, mature: 0 },
    overhead: { baseline: 0, transition: 0, mature: 0 },
    risk: { baseline: 0, transition: 0, mature: 0 },
    fullyLoaded: { baseline: 0, transition: 0, mature: 0 },
    chargeableDirectOpex: { baseline: 0, transition: 0, mature: 0 },
    chargeableOverhead: { baseline: 0, transition: 0, mature: 0 },
    chargeableRisk: { baseline: 0, transition: 0, mature: 0 },
    chargeableFullyLoaded: { baseline: 0, transition: 0, mature: 0 },
  };

  const states: State[] = ['baseline', 'transition', 'mature'];
  const llm = llmCosts(scenario, ctx);
  result.llmCost = llm.total;
  result.llmCostByUsage = llm.byUsage;
  result.llmRequestsPerMonth = llm.requestsPerMonth;

  for (const state of states) {
    // People cost: sum of all roles' FTE × cost per FTE
    let peopleCost = 0;
    scenario.roles.forEach((role, i) => {
      peopleCost += effort.roleFte[i]![state] * effectiveRate(role, state, ctx);
    });
    result.peopleCost[state] = peopleCost;

    // Cost lines
    let costLinesTotal = 0;
    let costLinesChargeable = 0;
    for (const line of scenario.costLines) {
      const amount = effectiveLineAmount(line, state, ctx);
      costLinesTotal += amount;
      if (line.chargeable) {
        costLinesChargeable += amount;
      }
    }

    // Direct OPEX (model usage is chargeable, like the AI cost lines)
    result.directOpex[state] = peopleCost + costLinesTotal + llm.total[state];
    result.chargeableDirectOpex[state] = peopleCost + costLinesChargeable + llm.total[state];

    // Overhead and risk
    const overheadPercent = scenario.globalAssumptions.corporateOverheadPercent[state];
    const riskPercent = scenario.globalAssumptions.riskReservePercent[state];

    result.overhead[state] = result.directOpex[state] * overheadPercent;
    result.risk[state] = result.directOpex[state] * riskPercent;
    result.chargeableOverhead[state] = result.chargeableDirectOpex[state] * overheadPercent;
    result.chargeableRisk[state] = result.chargeableDirectOpex[state] * riskPercent;

    // Fully loaded (TCO)
    result.fullyLoaded[state] = result.directOpex[state] + result.overhead[state] + result.risk[state];
    result.chargeableFullyLoaded[state] =
      result.chargeableDirectOpex[state] + result.chargeableOverhead[state] + result.chargeableRisk[state];
  }

  result.costAvoidance = calculateCostAvoidance(scenario, ctx, effort, result.peopleCost.baseline);

  return result;
}

/**
 * Section 5.4: Monthly cash-flow series
 * runCost_m = ramp(m) using fullyLoaded_T and fullyLoaded_M
 * saving_m = baseline_m - runCost_m
 */
function calculateMonthlyCashFlow(scenario: Scenario, cost: CostCalculation, ctx: DeliveryContext): MonthlyCashFlow[] {
  const forecast: MonthlyCashFlow[] = [];
  const horizonMonths = scenario.timeValue.horizonMonths;
  const transitionMonths = scenario.globalAssumptions.transitionLengthMonths;
  const discountRateAnnual = scenario.timeValue.discountRateAnnual;
  const wageEscalationAnnual = scenario.timeValue.wageEscalationAnnual;

  // Investment by month
  const investmentByMonth: Record<number, number> = {};
  for (const item of scenario.oneTimeInvestment) {
    investmentByMonth[item.month] = (investmentByMonth[item.month] || 0) + effectiveInvestment(item, ctx);
  }

  let cumulativeCashFlow = 0;
  let cumulativeSavingOnly = 0;

  for (let m = 0; m <= horizonMonths; m++) {
    const month: MonthlyCashFlow = {
      month: m,
      runCostFull: 0,
      baselineCostFull: 0,
      savingFull: 0,
      runCostChargeable: 0,
      baselineCostChargeable: 0,
      savingChargeable: 0,
      investmentOutflow: 0,
      costAvoidance: 0,
      netCashFlow: 0,
      cumulativeCashFlow: 0,
    };

    if (m === 0) {
      // Month 0: only investment
      month.investmentOutflow = investmentByMonth[0] || 0;
      month.netCashFlow = -month.investmentOutflow;
    } else {
      // Ramp between transition and mature (Section 2)
      const runCostFull = getRampedCost(m, transitionMonths, cost.fullyLoaded, wageEscalationAnnual);
      const runCostChargeable = getRampedCost(m, transitionMonths, cost.chargeableFullyLoaded, wageEscalationAnnual);
      const escalationFactor = Math.pow(1 + wageEscalationAnnual, Math.floor((m - 1) / 12));

      month.runCostFull = runCostFull;
      month.baselineCostFull = cost.fullyLoaded.baseline * escalationFactor;
      month.savingFull = month.baselineCostFull - month.runCostFull;

      month.runCostChargeable = runCostChargeable;
      month.baselineCostChargeable = cost.chargeableFullyLoaded.baseline * escalationFactor;
      month.savingChargeable = month.baselineCostChargeable - month.runCostChargeable;

      month.investmentOutflow = investmentByMonth[m] || 0;

      // Cost avoidance (F7): reported every month, counted in the cash flow only when opted in
      month.costAvoidance =
        (m <= transitionMonths ? cost.costAvoidance.transition : cost.costAvoidance.mature) * escalationFactor;

      // F6: the user chooses whether TCO or client-chargeable cost drives the business case
      const saving = scenario.costChargeable === 'chargeable' ? month.savingChargeable : month.savingFull;
      const avoidance = scenario.costAvoidanceIncludedInRoi ? month.costAvoidance : 0;
      month.netCashFlow = saving + avoidance - month.investmentOutflow;

      cumulativeSavingOnly += saving + avoidance;
    }

    cumulativeCashFlow += month.netCashFlow;
    month.cumulativeCashFlow = cumulativeCashFlow;
    forecast.push(month);
  }

  // Store cumulative savings for use in financial metrics
  (forecast as any).cumulativeSavingOnly = cumulativeSavingOnly;

  return forecast;
}

/**
 * Get ramped cost between transition and mature
 * Month k (1..N) = T + (M - T) × (k - 1) / N
 */
function getRampedCost(
  month: number,
  transitionMonths: number,
  costByState: Record<State, number>,
  wageEscalationAnnual: number
): number {
  const escalationFactor = Math.pow(1 + wageEscalationAnnual, Math.floor((month - 1) / 12));

  if (month <= transitionMonths) {
    // Linear ramp from transition to mature over N months
    // Section 2: Month k (1..N) = T + (M - T) × (k - 1) / N
    const k = month;
    const rampedCost =
      costByState.transition +
      (costByState.mature - costByState.transition) * ((k - 1) / transitionMonths);

    return rampedCost * escalationFactor;
  } else {
    // Mature phase (month > N)
    return costByState.mature * escalationFactor;
  }
}

/**
 * Section 5.5: Benefit ledger
 * Shows the breakdown of savings into volume, mix, and cost effects
 */
function calculateBenefitLedger(
  scenario: Scenario,
  cost: CostCalculation,
  ctx: DeliveryContext,
  effort: EffortCalculation
): BenefitLedgerLine[] {
  const ledger: BenefitLedgerLine[] = [];

  // Notes are shown to the user, so they follow the scenario's currency
  const money = (v: number) =>
    new Intl.NumberFormat('en', {
      style: 'currency',
      currency: scenario.baseCurrency,
      maximumFractionDigits: 0,
    }).format(v);
  const fte = (v: number) => `${Math.round(v * 10) / 10} FTE`;

  const baselineHeadcount = effort.staffingFte.baseline;
  const matureHeadcount = effort.staffingFte.mature;

  // Blended rate in baseline
  const baselineBlendedRate = cost.peopleCost.baseline / baselineHeadcount;

  // Volume effect: (FTE_B - FTE_M) × blendedRate_B
  const volumeEffect = (baselineHeadcount - matureHeadcount) * baselineBlendedRate;
  ledger.push({
    category: 'volumeEffect',
    amount: volumeEffect,
    notes: `(${fte(baselineHeadcount)} − ${fte(matureHeadcount)}) × ${money(baselineBlendedRate)}`,
  });

  // Mix effect: FTE_M × blendedRate_B - peopleCost_M
  const mixEffect = matureHeadcount * baselineBlendedRate - cost.peopleCost.mature;
  ledger.push({
    category: 'mixEffect',
    amount: mixEffect,
    notes: `${fte(matureHeadcount)} × ${money(baselineBlendedRate)} − ${money(cost.peopleCost.mature)}`,
  });

  // Non-people cost delta (cost lines)
  let baselineCostLines = 0;
  let matureCostLines = 0;
  for (const line of scenario.costLines) {
    baselineCostLines += effectiveLineAmount(line, 'baseline', ctx);
    matureCostLines += effectiveLineAmount(line, 'mature', ctx);
  }
  // Model usage is a non-people cost too; keeps the ledger reconciled to the monthly saving
  baselineCostLines += cost.llmCost.baseline;
  matureCostLines += cost.llmCost.mature;
  const costLinesDelta = baselineCostLines - matureCostLines;
  ledger.push({
    category: 'nonPeopleCostDelta',
    amount: costLinesDelta,
    notes: `Cost lines: ${money(baselineCostLines)} → ${money(matureCostLines)}`,
  });

  // Overhead and risk deltas
  const overheadDelta =
    cost.overhead.baseline -
    (cost.directOpex.mature * scenario.globalAssumptions.corporateOverheadPercent.mature);
  ledger.push({
    category: 'overheadDelta',
    amount: overheadDelta,
    notes: `Overhead: ${(scenario.globalAssumptions.corporateOverheadPercent.baseline * 100).toFixed(0)}% → ${(
      scenario.globalAssumptions.corporateOverheadPercent.mature * 100
    ).toFixed(0)}%`,
  });

  if (cost.costAvoidance.mature > 0) {
    ledger.push({
      category: 'costAvoidance',
      amount: cost.costAvoidance.mature,
      notes: scenario.costAvoidanceIncludedInRoi
        ? 'Extra demand absorbed without hiring; included in ROI'
        : 'Extra demand absorbed without hiring; excluded from ROI and from the reconciliation',
    });
  }

  const riskDelta =
    cost.risk.baseline -
    (cost.directOpex.mature * scenario.globalAssumptions.riskReservePercent.mature);
  ledger.push({
    category: 'riskDelta',
    amount: riskDelta,
    notes: `Risk: ${(scenario.globalAssumptions.riskReservePercent.baseline * 100).toFixed(0)}% → ${(
      scenario.globalAssumptions.riskReservePercent.mature * 100
    ).toFixed(0)}%`,
  });

  return ledger;
}

/**
 * Section 5.4: Financial metrics
 * Payback, ROI, NPV, IRR
 */
function calculateFinancialMetrics(
  scenario: Scenario,
  monthlyForecast: MonthlyCashFlow[]
): FinancialMetrics {
  const horizonMonths = scenario.timeValue.horizonMonths;
  const discountRateAnnual = scenario.timeValue.discountRateAnnual;
  const monthlyDiscountRate = Math.pow(1 + discountRateAnnual, 1 / 12) - 1;

  const metrics: FinancialMetrics = {
    paybackMonth: null,
    paybackNotInHorizon: false,
    breakEvenMonth: null,
    totalSavingsOverHorizon: 0,
    totalInvestment: 0,
    roiPercent: 0,
    steadyStateAnnualRoi: 0,
    npv: 0,
    irr: null,
    lowestCumulativePosition: 0,
    lowestCumulativeMonth: 0,
  };

  // Calculate cumulative savings (without investment) and cumulative cash flow (with investment)
  let cumulativeSavings = 0;
  const cumulativeSavingsByMonth: number[] = [0];

  // Find payback month - first month where cumulative cash flow >= 0
  for (const month of monthlyForecast) {
    if (month.month > 0) {
      cumulativeSavings += month.netCashFlow + month.investmentOutflow;
      cumulativeSavingsByMonth[month.month] = cumulativeSavings;
    }

    if (month.cumulativeCashFlow >= 0 && month.month > 0 && !metrics.paybackMonth) {
      metrics.paybackMonth = month.month;
    }
  }
  const nothingChanges = monthlyForecast.every(m => m.netCashFlow === 0);
  if (nothingChanges) metrics.paybackMonth = null;
  metrics.paybackNotInHorizon =
    !nothingChanges && (metrics.paybackMonth === null || metrics.paybackMonth > horizonMonths);

  // Find breakeven month (without investment) - first month where savings cumulative >= 0
  for (let m = 1; m <= horizonMonths; m++) {
    if (cumulativeSavingsByMonth[m] >= 0) {
      metrics.breakEvenMonth = m;
      break;
    }
  }

  // Find lowest cumulative position (for savings only, not cash flow with investment)
  let lowestPosition = 0;
  let lowestMonth = 0;
  for (let m = 0; m <= horizonMonths; m++) {
    const cumulativeSaving = cumulativeSavingsByMonth[m] || 0;
    if (cumulativeSaving < lowestPosition) {
      lowestPosition = cumulativeSaving;
      lowestMonth = m;
    }
  }
  metrics.lowestCumulativePosition = lowestPosition;
  metrics.lowestCumulativeMonth = lowestMonth;

  // Total investment and savings
  for (let m = 0; m <= horizonMonths; m++) {
    const month = monthlyForecast[m];
    metrics.totalInvestment += month.investmentOutflow;
    if (m > 0) {
      metrics.totalSavingsOverHorizon += month.netCashFlow + month.investmentOutflow;
    }
  }

  // ROI % over H = (total savings - total invest) / total invest
  if (metrics.totalInvestment > 0) {
    metrics.roiPercent =
      ((metrics.totalSavingsOverHorizon - metrics.totalInvestment) / metrics.totalInvestment) * 100;
  }

  // Steady-state annual ROI = (12 × mature monthly saving - total invest) / total invest
  const matureMonthlyForecasts = monthlyForecast.filter(m => m.month > horizonMonths - 12 && m.month > 0);
  const matureMonthlySaving = matureMonthlyForecasts.length > 0
    ? matureMonthlyForecasts.reduce((sum, m) => sum + m.netCashFlow + m.investmentOutflow, 0) / matureMonthlyForecasts.length
    : 0;

  if (metrics.totalInvestment > 0) {
    metrics.steadyStateAnnualRoi =
      ((12 * matureMonthlySaving - metrics.totalInvestment) / metrics.totalInvestment) * 100;
  }

  // NPV at monthly discount rate
  metrics.npv = 0;
  for (let m = 0; m <= horizonMonths; m++) {
    const month = monthlyForecast[m];
    const discountFactor = Math.pow(1 + monthlyDiscountRate, -m);
    metrics.npv += month.netCashFlow * discountFactor;
  }

  // IRR - solve by bisection
  metrics.irr = solveIrr(monthlyForecast, horizonMonths);

  return metrics;
}

/**
 * F7 cost avoidance: extra volume × hours saved per unit (incl. review overhead) × baseline blended hourly rate.
 */
function calculateCostAvoidance(
  scenario: Scenario,
  ctx: DeliveryContext,
  effort: EffortCalculation,
  baselinePeopleCost: number
): Record<State, number> {
  const result: Record<State, number> = { baseline: 0, transition: 0, mature: 0 };
  const baselineHours = effort.staffingFte.baseline * scenario.globalAssumptions.workingHrsPerFtePerMonth;
  if (baselineHours <= 0) return result;
  const hourlyRate = baselinePeopleCost / baselineHours;

  for (const kpi of scenario.kpis) {
    const extra = kpi.extraVolumePerMonth ?? 0;
    if (extra <= 0 || kpi.volumePerMonth === undefined) continue;
    const hours = effort.kpi[kpi.id]!;
    for (const state of ['transition', 'mature'] as const) {
      const o = scenario.aiOverheadPercent[state];
      const overhead = kpi.reviewOverheadApplies ? (o.hitl + o.rework + o.dualRun) * ctx.adoption[state] : 0;
      const savedPerUnit = hours.baseline - hours[state] * (1 + overhead);
      result[state] += Math.max(0, extra * savedPerUnit * hourlyRate);
    }
  }
  return result;
}

/**
 * Solve IRR using bisection method
 */
function solveIrr(monthlyForecast: MonthlyCashFlow[], horizonMonths: number): number | null {
  const flows = monthlyForecast.slice(0, horizonMonths + 1).map(m => m.netCashFlow);

  // Check if IRR exists (need both positive and negative flows)
  const hasPositive = flows.some(f => f > 0);
  const hasNegative = flows.some(f => f < 0);
  if (!hasPositive || !hasNegative) {
    return null;
  }

  const npvAt = (annualRate: number) => {
    const monthlyRate = Math.pow(1 + annualRate, 1 / 12) - 1;
    return flows.reduce((sum, f, m) => sum + f / Math.pow(1 + monthlyRate, m), 0);
  };

  // Bracket the root: NPV falls as the rate rises for invest-then-save flows. Widen the upper bound
  // instead of capping it, so fast-payback cases are not reported at an arbitrary ceiling.
  let low = -0.99;
  let high = 1;
  while (npvAt(high) > 0 && high < 1e6) high *= 2;
  if (npvAt(low) < 0 || npvAt(high) > 0) return null;

  for (let iteration = 0; iteration < 200 && high - low > 1e-9; iteration++) {
    const mid = (low + high) / 2;
    if (npvAt(mid) > 0) low = mid;
    else high = mid;
  }
  return (low + high) / 2; // Annualized
}

export { calculateEffort, calculateCost, calculateMonthlyCashFlow, calculateBenefitLedger, calculateFinancialMetrics };
