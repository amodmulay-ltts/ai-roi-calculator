import type { Results, Scenario } from '@ai-roi-calc/engine';

/**
 * The dashboard's sections and the explanation of each. One source, so the page, the section bar
 * and the help cannot drift apart. `live` renders a line from the scenario on screen, so the
 * explanation talks about the customer's own numbers rather than a generic example.
 */
export interface SectionInfo {
  id: string;
  label: string;
  /** Short title for the help slide. */
  headline: string;
  what: string;
  read: string;
  watch: string;
  live: (scenario: Scenario, results: Results, money: (v: number) => string) => string;
}

const pct = (v: number) => `${Math.round(v * 100)}%`;
const num = (v: number, digits = 0) => v.toLocaleString('en', { maximumFractionDigits: digits });

export const SECTIONS: SectionInfo[] = [
  {
    id: 'assumptions',
    label: 'Assumptions',
    headline: 'Everything the answer is built from',
    what: 'The customer’s own numbers, in four groups: the team and its rates, the work it does each month, AI seats and token usage, and the other running costs and one-off investment.',
    read: 'Each tab is an input, not an output. Change anything and every figure further down the page recalculates immediately — there is no recalculate button and no saved intermediate state.',
    watch: 'Rates can be entered per hour or per month, but an hourly rate only becomes a monthly cost through the working hours per FTE. If that number is wrong, every cost on the page is wrong by the same factor.',
    live: (s, r, money) =>
      `This scenario: ${num(r.effort.staffingFte.baseline)} people today at ${money(
        r.cost.peopleCost.baseline / Math.max(r.effort.staffingFte.baseline, 1)
      )} each a month, ${num(r.effort.totalEffort.baseline)} hours of work, ${s.costLines.length} cost lines.`,
  },
  {
    id: 'delivery',
    label: 'Delivery model',
    headline: 'Where the people sit, and how much AI they use',
    what: 'Two settings: the share of the team in a best-cost country, and how much of the AI plan actually applies. Together they define one delivery option.',
    read: 'The baseline — what the customer does today — never changes, whichever model you pick. Everything you see is measured against that same starting point.',
    watch: 'Role rates are onshore rates; the offshore rate is per role, and roles marked as staying onshore keep their rate in every model. A move offshore also ramps in over the transition rather than arriving on day one.',
    live: (s, _r, _money) => {
      const profile = s.deliveryProfiles[s.primaryModel];
      return `This scenario: ${pct(profile.bccShare)} offshore and ${pct(profile.aiAdoption)} AI adoption, against ${pct(
        s.baselineBccShare
      )} offshore today.`;
    },
  },
  {
    id: 'compare',
    label: 'Compare models',
    headline: 'All five options on the same baseline',
    what: 'Every delivery model calculated against the customer’s current team and costs, ranked by the value it creates.',
    read: 'The bars are NPV. The verdict line names the best option and what the selected one gives up. Selecting a row makes that model active everywhere else on the page.',
    watch: 'Offshoring and AI are different levers that can both look good in isolation. A model that wins on cost may lose on capability or data residency, neither of which this table measures.',
    live: (_s, _r, money) => `Compare each option’s payback, monthly saving, mature team size and investment side by side.`,
  },
  {
    id: 'ai-effect',
    label: 'AI effect',
    headline: 'The one assumption the whole case turns on',
    what: 'How the model is sourced — frontier, enterprise or self-hosted — and what that does to the work: how far it cuts the effort, and how much human review it adds back.',
    read: 'Picking a sourcing option seeds both the cost shape and the effect, because a weaker model does less of the work. Everything it writes stays editable, and switching back restores what it changed.',
    watch: 'This is the number a customer will challenge first, and the one with the least evidence behind it. Treat it as a hypothesis to validate with a pilot, not a commitment. The sensitivity section shows how much rests on it.',
    live: (s, r, _money) =>
      s.productivityFactor.mode === 'direct-factor'
        ? `This scenario assumes a ${pct(1 - s.productivityFactor.mature)} effort cut once mature, taking the work from ${num(
            r.effort.totalEffort.baseline
          )} to ${num(r.effort.totalEffort.mature)} hours a month.`
        : 'This scenario derives its productivity factor from evaluation data.',
  },
  {
    id: 'cashflow',
    label: 'Cash flow',
    headline: 'What it costs before it pays',
    what: 'The cumulative cash position month by month: savings minus the investment, with the payback month marked.',
    read: 'The dip at the start is the investment plus the transition, when the team is still learning and costs more than today. Payback is the month the line crosses zero, read from the series rather than from an average.',
    watch: 'The lowest point of that dip is the money the customer actually has to find. A case can pay back comfortably and still be refused because nobody budgeted for the trough.',
    live: (_s, r, money) =>
      `This scenario dips to ${money(Math.min(...r.monthlyForecast.map(m => m.cumulativeCashFlow)))} before recovering${
        r.financialMetrics.paybackMonth === null ? '.' : ` in month ${r.financialMetrics.paybackMonth}.`
      }`,
  },
  {
    id: 'sensitivity',
    label: 'Sensitivity',
    headline: 'Which assumption the answer depends on',
    what: 'Each driver moved 20% down and up on its own, everything else held still, and the resulting range of value.',
    read: 'The longest bar is the assumption worth arguing about. The grid beside it shows the payback month for the AI effect against the transition length, so you can see where the case stops working.',
    watch: 'If the AI effort reduction dominates — and it usually does — then the case rests on a number nobody has measured yet. That is the honest thing to say in the room.',
    live: (_s, _r, _money) => 'Drivers: AI effort reduction, AI running costs, role rates, overhead and risk, transition length, investment.',
  },
  {
    id: 'results',
    label: 'Net value',
    headline: 'What the case is worth',
    what: 'Net present value over the forecast horizon, with payback, ROI and IRR beside it.',
    read: 'NPV is every monthly saving and the investment, discounted to today’s money. Payback is when the cumulative position turns positive. ROI is undiscounted and over the whole horizon, so it always looks larger than NPV suggests.',
    watch: 'These four numbers are only as good as the effort assumption above them. A large NPV built on an unvalidated productivity claim is a large unvalidated claim.',
    live: (s, r, money) =>
      `This scenario: ${money(r.financialMetrics.npv)} over ${s.timeValue.horizonMonths} months, ${
        r.financialMetrics.paybackMonth === null ? 'no payback' : `payback in month ${r.financialMetrics.paybackMonth}`
      }, ROI ${num(r.financialMetrics.roiPercent)}%.`,
  },
  {
    id: 'advice',
    label: 'Advice',
    headline: 'What the numbers are telling you',
    what: 'A verdict and a list of findings, generated from the figures by fixed rules — not a judgement of its own.',
    read: 'Findings marked “Check” are things that would undermine the case in front of a customer: an implausible cost per developer, a staffing plan that the workload does not support, a seat that bundles usage you are also metering.',
    watch: 'Every statement traces back to an input you can see. If one looks wrong, the input behind it is wrong — fix that rather than ignoring the finding.',
    live: (_s, _r, _money) => 'Rules cover payback, the share of the AI effect needed to break even, AI running costs, headcount, the transition budget and price staleness.',
  },
];

export const sectionInfo = (id: string): SectionInfo => SECTIONS.find(s => s.id === id) ?? SECTIONS[0]!;
