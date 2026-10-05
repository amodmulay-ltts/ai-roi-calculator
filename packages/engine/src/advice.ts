import type { Currency, Results, Scenario, State } from './types.js';
import { calculate } from './engine.js';
import { deliveryContext, effectiveLineAmount } from './delivery.js';

export type VerdictTone = 'strong' | 'marginal' | 'negative' | 'no-change';
export type FindingSeverity = 'warning' | 'info';

export interface Finding {
  id: string;
  severity: FindingSeverity;
  title: string;
  detail: string;
}

export interface Advice {
  tone: VerdictTone;
  headline: string;
  summary: string;
  /** Most important first. */
  findings: Finding[];
}

const FTE_GAP_LIMIT = 0.05;
const MARGINAL_ROI_PERCENT = 50;
const AI_COST_SHARE_LIMIT = 0.5;

export function formatMoney(value: number, currency: Currency): string {
  const compact = Math.abs(value) >= 10_000;
  return new Intl.NumberFormat('en', {
    style: 'currency',
    currency,
    notation: compact ? 'compact' : 'standard',
    maximumFractionDigits: compact ? 1 : 0,
  }).format(value);
}

const pct = (v: number) => `${Math.round(v * 100)}%`;

/**
 * Scales only the effort reduction (productivity factor and KPI overrides) by `share`, keeping every cost.
 * share = 1 is the scenario as entered; 0 means AI changes nothing about the work but all its costs remain.
 */
export function withRealisedEffortReduction(scenario: Scenario, share: number): Scenario {
  const s: Scenario = structuredClone(scenario);
  if (s.productivityFactor.mode === 'direct-factor') {
    s.productivityFactor.transition = 1 - (1 - s.productivityFactor.transition) * share;
    s.productivityFactor.mature = 1 - (1 - s.productivityFactor.mature) * share;
  }
  s.kpis = s.kpis.map(k => {
    const overrides = { ...k.overrides };
    for (const state of ['transition', 'mature'] as const) {
      const o = overrides[state];
      if (o !== undefined) overrides[state] = k.baseline + (o - k.baseline) * share;
    }
    return { ...k, overrides };
  });
  return s;
}

/** Smallest share of the assumed effort reduction at which NPV ≥ 0, or null when it is not bracketed. */
export function breakEvenRealisation(scenario: Scenario): number | null {
  const npv = (share: number) => calculate(withRealisedEffortReduction(scenario, share)).financialMetrics.npv;
  if (npv(1) < 0 || npv(0) >= 0) return null;
  let low = 0;
  let high = 1;
  for (let i = 0; i < 40; i++) {
    const mid = (low + high) / 2;
    if (npv(mid) >= 0) high = mid;
    else low = mid;
  }
  return high;
}

export function advise(scenario: Scenario, results: Results): Advice {
  const money = (v: number) => formatMoney(v, scenario.baseCurrency);
  const { financialMetrics: fm, cost, effort } = results;
  const horizon = scenario.timeValue.horizonMonths;
  const saving = cost.fullyLoaded.baseline - cost.fullyLoaded.mature;
  const derived = scenario.peopleMode.mode === 'effort-derived';
  const ctx = deliveryContext(scenario);
  const findings: Finding[] = [];

  // ---------- Verdict ----------
  let tone: VerdictTone;
  let headline: string;
  let summary: string;
  const nothingChanges = fm.paybackMonth === null && !fm.paybackNotInHorizon;
  if (nothingChanges) {
    tone = 'no-change';
    headline = 'This model keeps today’s setup: nothing changes.';
    summary = 'Choose a delivery model with AI or offshoring to see a business case.';
  } else if (fm.paybackNotInHorizon || fm.npv <= 0) {
    tone = 'negative';
    headline = `Does not pay back within ${horizon} months.`;
    summary =
      saving > 0
        ? `It saves ${money(saving)} a month once mature, but that does not recover the ${money(fm.totalInvestment)} investment and the transition costs in time.`
        : `Once mature it costs ${money(-saving)} a month more than today, so it never pays back.`;
  } else if (fm.roiPercent < MARGINAL_ROI_PERCENT || (fm.paybackMonth ?? 0) > horizon * 0.6) {
    tone = 'marginal';
    headline = `Pays back in month ${fm.paybackMonth}, with a thin margin.`;
    summary = `${money(fm.npv)} of value over ${horizon} months (ROI ${Math.round(fm.roiPercent)}%). Small changes in the assumptions can turn it negative.`;
  } else {
    tone = 'strong';
    headline = `Pays back in month ${fm.paybackMonth} and creates ${money(fm.npv)} over ${horizon} months.`;
    summary = `Saves ${money(saving)} a month once mature, for a ${money(fm.totalInvestment)} investment (ROI ${Math.round(fm.roiPercent)}%).`;
  }

  if (nothingChanges) return { tone, headline, summary, findings };

  // ---------- How much of the AI effect must materialise ----------
  if (ctx.adoption.mature > 0 && derived) {
    const share = breakEvenRealisation(scenario);
    if (share !== null) {
      findings.push({
        id: 'break-even-realisation',
        severity: share > 0.7 ? 'warning' : 'info',
        title: `Needs at least ${pct(share)} of the assumed AI effort reduction to break even`,
        detail:
          share > 0.7
            ? 'Little room for error: if AI delivers noticeably less than assumed, the case turns negative while its costs remain. Validate the effort reduction with a pilot first.'
            : 'The case still pays back if AI delivers somewhat less than assumed, because all AI costs and the investment are kept in this test.',
      });
    }
  }

  if (fm.paybackNotInHorizon) {
    findings.push({
      id: 'payback-horizon',
      severity: 'warning',
      title: `No payback within ${horizon} months`,
      detail: 'Check the AI effort assumption, AI running costs and the investment, or compare other delivery models.',
    });
  }

  // ---------- AI running costs versus the saving they enable ----------
  const aiRunCost = scenario.costLines
    .filter(l => l.aiSpecific)
    .reduce((sum, l) => sum + effectiveLineAmount(l, 'mature', ctx) - effectiveLineAmount(l, 'baseline', ctx), 0);
  const peopleSaving = cost.peopleCost.baseline - cost.peopleCost.mature;
  if (aiRunCost > 0 && peopleSaving > 0 && aiRunCost / peopleSaving > AI_COST_SHARE_LIMIT) {
    findings.push({
      id: 'ai-cost-share',
      severity: 'warning',
      title: `AI running costs take ${pct(aiRunCost / peopleSaving)} of the people saving`,
      detail: `${money(aiRunCost)} a month for AI usage, tools and infrastructure against ${money(peopleSaving)} of people cost saved. Check licence and usage prices.`,
    });
  }

  // ---------- Headcount backed by effort (F9 FTE gap) ----------
  const plan = effort.planFte.mature;
  const costed = effort.staffingFte.mature;
  if (derived && costed > 0 && Math.abs(plan - costed) / costed > FTE_GAP_LIMIT) {
    findings.push({
      id: 'fte-gap',
      severity: 'warning',
      title: `Staffing plan (${plan.toFixed(1)} FTE) differs from the workload-based team (${costed.toFixed(1)} FTE)`,
      detail: 'Results use the workload-based team. Align the plan or the effort assumptions before presenting headcount numbers.',
    });
  }
  if (!derived) {
    const workloadTeam = (effort.totalEffort.mature / Math.max(effort.totalEffort.baseline, 1)) * effort.staffingFte.baseline;
    if (workloadTeam > 0 && Math.abs(costed - workloadTeam) / workloadTeam > FTE_GAP_LIMIT) {
      findings.push({
        id: 'fte-gap',
        severity: 'warning',
        title: `Typed headcount (${costed.toFixed(1)} FTE) is not backed by the workload (${workloadTeam.toFixed(1)} FTE)`,
        detail: 'In "Staffing plan as entered" mode the AI assumptions do not drive cost. Switch to "Derived from AI productivity" or adjust the plan.',
      });
    }
  }

  // ---------- Transition dip ----------
  // Only meaningful when the case recovers; for losing cases the lowest point is simply the final loss.
  const transitionExtra = cost.fullyLoaded.transition - cost.fullyLoaded.baseline;
  const beforePayback = results.monthlyForecast.filter(m => fm.paybackMonth !== null && m.month < fm.paybackMonth);
  const lowestCash = Math.min(0, ...beforePayback.map(m => m.cumulativeCashFlow));
  if (transitionExtra > 0 && fm.paybackMonth !== null && !fm.paybackNotInHorizon) {
    findings.push({
      id: 'transition-dip',
      severity: 'info',
      title: `Budget for the transition: up to ${money(-lowestCash)} out of pocket`,
      detail: `During the ${scenario.globalAssumptions.transitionLengthMonths}-month transition the run cost is ${money(transitionExtra)} a month above today, on top of the investment.`,
    });
  }

  // ---------- Overrides bypass the productivity factor (F12) ----------
  const overridden = scenario.kpis.filter(
    k => k.volumePerMonth !== undefined && (k.overrides.transition !== undefined || k.overrides.mature !== undefined)
  );
  if (overridden.length > 0) {
    findings.push({
      id: 'overrides',
      severity: 'info',
      title: `${overridden.length} work item${overridden.length > 1 ? 's use' : ' uses'} fixed hours instead of the AI factor`,
      detail: `${overridden.map(k => k.name).join(', ')}. Changing the productivity factor does not affect ${overridden.length > 1 ? 'these items' : 'this item'}.`,
    });
  }

  // ---------- Pyramid / mix effect ----------
  const mix = results.benefitLedger.find(l => l.category === 'mixEffect')?.amount ?? 0;
  if (mix < 0) {
    findings.push({
      id: 'mix-effect',
      severity: 'info',
      title: 'The mature team costs more per person than today’s',
      detail: `Specialist AI roles raise the average rate, reducing the saving by ${money(-mix)} a month.`,
    });
  }

  // ---------- Overhead rationale (F5) ----------
  const g = scenario.globalAssumptions;
  const missingRationale = (['transition', 'mature'] as State[]).filter(
    s => g.corporateOverheadPercent[s] !== g.corporateOverheadPercent.baseline && !g.overheadRationale[s]?.trim()
  );
  if (missingRationale.length > 0) {
    findings.push({
      id: 'overhead-rationale',
      severity: 'warning',
      title: 'Overhead % changes without a stated reason',
      detail: `The ${missingRationale.join(' and ')} overhead differs from today. Add the rationale so the customer can follow it.`,
    });
  }

  if (scenario.isExample) {
    findings.push({
      id: 'example',
      severity: 'info',
      title: 'Fictional example data',
      detail: 'Use this to understand the calculator; replace every input with the customer’s data before any decision.',
    });
  }

  const order: Record<FindingSeverity, number> = { warning: 0, info: 1 };
  findings.sort((a, b) => order[a.severity] - order[b.severity]);
  return { tone, headline, summary, findings };
}
