import {
  CASE_FACTORS,
  GAP_EFFECTIVENESS_PER_POINT,
  GAP_INVESTMENT_PER_POINT,
  MARGINAL_ROI_PERCENT,
  formatMoney,
  phaseAiUse,
  readinessGap,
  type BusinessCaseInputs,
  type CaseId,
  type CaseResult,
  type PostureId,
} from '@ai-roi-calc/bizcase';

/**
 * Plain-language explanations of each calculated answer, written with the figures currently on screen so a
 * reader can follow the arithmetic. Every function returns a title and a few short lines for an InfoTip.
 */
export interface Explanation {
  title: string;
  lines: string[];
}

const h = (n: number): string => Math.round(n).toLocaleString('en-US');
const pct = (n: number, digits = 0): string => `${(n * 100).toFixed(digits)}%`;
const POSTURE_NAME: Record<PostureId, string> = { local: 'Local', hybrid: 'Hybrid', enterprise: 'Enterprise', frontier: 'Frontier' };

/** The share of released capacity counted as real savings, as the case actually used it. */
function countedShare(inputs: BusinessCaseInputs, r: CaseResult): number {
  return r.capacityValuePerMonth > 0 ? r.countedSavingPerMonth / r.capacityValuePerMonth : inputs.cashShare;
}

function rampMonths(inputs: BusinessCaseInputs, caseId: CaseId): number {
  return Math.max(1, inputs.rampMonths + Math.ceil(readinessGap(inputs.readiness) / 2) + CASE_FACTORS[caseId].rampDelta);
}

export function explainNetHours(inputs: BusinessCaseInputs, r: CaseResult): Explanation {
  return {
    title: 'Hours freed per month',
    lines: [
      `In-scope effort: ${inputs.teamSize} people × ${inputs.hoursPerFteMonth} hours = ${h(r.totalHours)} hours a month.`,
      `AI is used on ${pct(r.aiReach)} of that work, about ${h(r.totalHours * r.aiReach)} hours. Each piece of work uses its own AI use, weighted by its share of the effort.`,
      `On that work AI removes ${h(r.grossRemovedHoursPerMonth)} hours. How much depends on whether the work is routine or complex, and on the model option and case.`,
      `${h(r.reviewReworkHoursPerMonth)} of those hours come back as human review and rework.`,
      `Hours freed = ${h(r.grossRemovedHoursPerMonth)} − ${h(r.reviewReworkHoursPerMonth)} = ${h(r.netHoursSavedPerMonth)} hours a month, at full effect.`,
    ],
  };
}

export function explainNetEfficiency(r: CaseResult): Explanation {
  return {
    title: 'Net efficiency',
    lines: [
      'The share of all in-scope effort that is really freed, after review and rework.',
      `Effort AI removes (${pct(r.grossEfficiency, 1)}) − review and rework (${pct(r.reviewReworkEfficiency, 1)}) = ${pct(r.netEfficiency, 1)}.`,
      `Same as hours freed ÷ in-scope hours = ${h(r.netHoursSavedPerMonth)} ÷ ${h(r.totalHours)}.`,
    ],
  };
}

export function explainCapacity(inputs: BusinessCaseInputs, r: CaseResult): Explanation {
  return {
    title: 'People equivalent',
    lines: [
      'Hours freed per month ÷ hours one person works in a month.',
      `${h(r.netHoursSavedPerMonth)} ÷ ${inputs.hoursPerFteMonth} = ${r.capacityFte.toFixed(1)} people.`,
      'This is capacity, not headcount: it only becomes a saving to the extent set by the share counted as real savings.',
    ],
  };
}

export function explainReach(r: CaseResult): Explanation {
  return {
    title: 'Share of work AI is used on',
    lines: [
      'Hours of work where AI is used ÷ all in-scope hours.',
      `Each piece of work has its own AI use. It is weighted by the work's share of the effort (its phase's share of all effort × its share of the phase).`,
      `Here: ${pct(r.aiReach, 1)}.`,
    ],
  };
}

export function explainPhaseAiUse(inputs: BusinessCaseInputs, phaseName: string): Explanation {
  const own = inputs.tasks.filter(t => t.phase === phaseName);
  const values = own.map(t => pct(t.aiUse)).join(', ');
  return {
    title: `Average AI use: ${phaseName}`,
    lines: [
      'The plain average of the AI use of the work in this phase. It is not entered; change the AI use on the work instead.',
      own.length === 0 ? 'This phase has no work yet.' : `(${values}) ÷ ${own.length} = ${pct(phaseAiUse(inputs, phaseName), 1)}.`,
    ],
  };
}

export function explainCapacityValue(inputs: BusinessCaseInputs, r: CaseResult): Explanation {
  const hourly = inputs.loadedCostPerFteYear / 12 / inputs.hoursPerFteMonth;
  return {
    title: 'Counted and redeployed value',
    lines: [
      `Value of the freed hours = hours freed × cost of an hour. An hour costs ${formatMoney(inputs.loadedCostPerFteYear)} ÷ 12 ÷ ${inputs.hoursPerFteMonth} = ${formatMoney(hourly)}.`,
      `${h(r.netHoursSavedPerMonth)} hours × ${formatMoney(hourly)} = ${formatMoney(r.capacityValuePerMonth)} a month.`,
      `Counted as saving = that value × the share that becomes real savings (${pct(countedShare(inputs, r))}) = ${formatMoney(r.countedSavingPerMonth)}.`,
      `Redeployed, not counted = the rest = ${formatMoney(r.redeployedValuePerMonth)}. It is useful capacity, but it is left out of every result.`,
    ],
  };
}

export function explainRunCost(inputs: BusinessCaseInputs, r: CaseResult, posture: PostureId): Explanation {
  return {
    title: 'Run cost per month',
    lines: [
      `Usage: hours where AI is used × the usage cost per assisted hour of the model option. At full effect: ${formatMoney(r.usageCostPerMonth)}.`,
      `Platform and governance: the monthly platform cost of each model option used, plus governance running cost (${formatMoney(inputs.governanceMonthly)}). Here: ${formatMoney(r.platformAndGovernancePerMonth)}.`,
      posture === 'hybrid'
        ? 'Hybrid uses the local model for routine work and the chosen stronger model for complex work, so both platforms are paid for.'
        : `All the work uses the ${POSTURE_NAME[posture]} option.`,
      `Run cost = ${formatMoney(r.usageCostPerMonth)} + ${formatMoney(r.platformAndGovernancePerMonth)} = ${formatMoney(r.usageCostPerMonth + r.platformAndGovernancePerMonth)}.`,
    ],
  };
}

export function explainSteadyNet(r: CaseResult): Explanation {
  return {
    title: 'Net per month at maturity',
    lines: [
      'Once the ramp-up is over: what is saved, minus what it costs to run.',
      `Counted saving ${formatMoney(r.countedSavingPerMonth)} + cost removed outright ${formatMoney(r.retiredCostPerMonth)} − usage ${formatMoney(r.usageCostPerMonth)} − platform and governance ${formatMoney(r.platformAndGovernancePerMonth)}.`,
      `= ${formatMoney(r.steadyNetPerMonth)} a month.`,
    ],
  };
}

export function explainInvestment(inputs: BusinessCaseInputs, r: CaseResult, caseId: CaseId = 'expected'): Explanation {
  const gap = readinessGap(inputs.readiness);
  const uplift = (1 + GAP_INVESTMENT_PER_POINT * gap) * CASE_FACTORS[caseId].investment;
  return {
    title: 'One-time investment',
    lines: [
      'Platform setup of each model option used + data readiness + governance setup + training (cost per person × people).',
      `Each line is then adjusted: +${pct(GAP_INVESTMENT_PER_POINT, 1)} for every readiness-gap point (gap ${gap} of 8)${caseId === 'expected' ? '' : `, and by the ${caseId} case`}. Combined factor: ×${uplift.toFixed(3)}.`,
      `${r.investmentLines.map(l => `${l.label} ${formatMoney(l.amount)}`).join(' + ')} = ${formatMoney(r.investment)}.`,
    ],
  };
}

export function explainPayback(inputs: BusinessCaseInputs, r: CaseResult, caseId: CaseId = 'expected'): Explanation {
  const ramp = rampMonths(inputs, caseId);
  return {
    title: 'Payback',
    lines: [
      `We start at −${formatMoney(r.investment)} (the investment) and add each month's net result for 36 months.`,
      `Benefits build up in a straight line over ${ramp} month${ramp === 1 ? '' : 's'} (the months to full effect, plus any readiness delay). Platform and governance costs are paid in full from month 1.`,
      r.paybackMonth === null
        ? 'The running total never reaches zero within 36 months, so there is no payback.'
        : `Payback is the first month where the running total reaches zero or more: month ${r.paybackMonth}.`,
    ],
  };
}

export function explainNetValue(r: CaseResult): Explanation {
  return {
    title: '3-year net value',
    lines: [
      'The running total after 36 months, not discounted.',
      `−${formatMoney(r.investment)} investment + 36 months of net results (with the ramp-up) = ${formatMoney(r.netValue36)}.`,
    ],
  };
}

export function explainRoi(r: CaseResult): Explanation {
  return {
    title: '3-year return',
    lines: [
      '3-year net value ÷ investment, as a percentage.',
      r.roiPercent === null ? 'There is no investment, so no return is shown.' : `${formatMoney(r.netValue36)} ÷ ${formatMoney(r.investment)} = ${Math.round(r.roiPercent)}%.`,
    ],
  };
}

export function explainVerdict(r: CaseResult): Explanation {
  return {
    title: 'Verdict',
    lines: [
      'Does not pay back: the 3-year net value is zero or negative.',
      `Marginal: it pays back but the 3-year return is below ${MARGINAL_ROI_PERCENT}%, so a small change in the assumptions could flip it.`,
      `Pays back: the 3-year net value is positive and the return is ${MARGINAL_ROI_PERCENT}% or more.`,
      `Here: net value ${formatMoney(r.netValue36)}${r.roiPercent === null ? '' : `, return ${Math.round(r.roiPercent)}%`}.`,
    ],
  };
}

export function explainRange(): Explanation {
  const c = CASE_FACTORS.conservative;
  const s = CASE_FACTORS.stretch;
  return {
    title: 'Conservative, expected and stretch',
    lines: [
      'The same inputs, run three times with different assumptions about how things go.',
      `Conservative: AI removes ${pct(c.effectiveness)} of the assumed effort, the investment is ${pct(c.investment - 1)} higher, benefits arrive ${c.rampDelta} months later and ${pct(1 - c.cash)} less of the freed capacity counts as savings.`,
      `Expected: the inputs as entered.`,
      `Stretch: AI removes ${pct(s.effectiveness)} of the assumed effort, the investment is ${pct(1 - s.investment)} lower and benefits arrive ${-s.rampDelta} month earlier.`,
    ],
  };
}

export function explainBreakEvenEffect(): Explanation {
  return {
    title: 'AI effect needed to break even',
    lines: [
      'We re-run the case with AI delivering a smaller and smaller share of the assumed effort reduction.',
      'The break-even is the share at which the 3-year net value is exactly zero.',
      'If it is well below 100%, there is headroom: AI can fall short and the case still pays back.',
    ],
  };
}

export function explainBreakEvenCash(): Explanation {
  return {
    title: 'Share of capacity that must become savings',
    lines: [
      'We re-run the case changing only the share of freed capacity that counts as real savings.',
      'The break-even is the smallest share at which the 3-year net value is zero or more.',
      'If it is above what is assumed, the case relies on more savings than expected.',
    ],
  };
}

export function explainReadiness(inputs: BusinessCaseInputs): Explanation {
  const gap = readinessGap(inputs.readiness);
  return {
    title: 'Readiness gap',
    lines: [
      'Four questions (data, skills, sponsorship, compliance). Ready scores 0, partly ready 1, not ready 2. The gap is the total, 0 to 8.',
      `Each point lowers the effect of AI by ${pct(GAP_EFFECTIVENESS_PER_POINT, 1)} and raises the investment by ${pct(GAP_INVESTMENT_PER_POINT, 1)}. Every two points add a month before full effect.`,
      `Here the gap is ${gap}: effect ×${(1 - GAP_EFFECTIVENESS_PER_POINT * gap).toFixed(3)}, investment ×${(1 + GAP_INVESTMENT_PER_POINT * gap).toFixed(3)}, +${Math.ceil(gap / 2)} month${Math.ceil(gap / 2) === 1 ? '' : 's'}.`,
    ],
  };
}

export function explainReadinessCost(): Explanation {
  return {
    title: 'Value lost to readiness gaps',
    lines: ['The 3-year net value if every readiness answer were "Ready", minus the 3-year net value as entered.', 'It shows what closing the gaps would be worth.'],
  };
}

export function explainCumulative(): Explanation {
  return {
    title: 'Cumulative position',
    lines: [
      'Month 0 is minus the investment. Each month adds that month\'s net result: counted savings and cost removed, minus usage, platform and governance.',
      'The line crosses zero in the payback month. The three lines are the conservative, expected and stretch cases.',
    ],
  };
}

export function explainOptionsChart(): Explanation {
  return {
    title: '3-year net value by option',
    lines: ['Each option (local, hybrid, enterprise, frontier) is run through the same 36 months with its own costs and effect.', 'Each bar is the 3-year net value of that option.'],
  };
}

export function explainEfficiencyChart(r: CaseResult): Explanation {
  return {
    title: 'How the efficiency is built',
    lines: [
      `Effort AI removes (${pct(r.grossEfficiency, 1)} of all effort) − review and rework (${pct(r.reviewReworkEfficiency, 1)}) = net efficiency (${pct(r.netEfficiency, 1)}).`,
    ],
  };
}

export function explainPhaseChart(): Explanation {
  return {
    title: 'Where the effort is saved',
    lines: ['For each phase: hours freed in that phase ÷ hours of work in that phase.', 'AI use is the average AI use of the phase\'s work.'],
  };
}

export function explainMonthlyChart(): Explanation {
  return {
    title: 'Monthly position at maturity',
    lines: ['Counted saving and cost removed on one side, usage and platform with governance on the other. The difference is the net per month.'],
  };
}

export function explainInvestmentChart(inputs: BusinessCaseInputs, r: CaseResult): Explanation {
  return explainInvestment(inputs, r);
}
