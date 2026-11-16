import type { ReactElement, ReactNode } from 'react';
import {
  breakEvenCashShare,
  breakEvenEffectiveness,
  compareAll,
  formatMoney,
  formatPayback,
  headline,
  readinessGap,
  whatMustBeTrue,
  type Verdict,
} from '@ai-roi-calc/bizcase';
import {
  CHART_WIDTH,
  CumulativeCasesChart,
  EfficiencyBridgeChart,
  InvestmentChart,
  MonthlyEconomicsChart,
  OptionsRangeChart,
  PhaseEfficiencyChart,
} from '../components/Charts';
import InfoTip from '../components/InfoTip';
import {
  explainBreakEvenCash,
  explainBreakEvenEffect,
  explainCapacity,
  explainCumulative,
  explainEfficiencyChart,
  explainInvestment,
  explainMonthlyChart,
  explainNetEfficiency,
  explainNetValue,
  explainOptionsChart,
  explainPayback,
  explainPhaseChart,
  explainRange,
  explainReadiness,
  explainSteadyNet,
  explainVerdict,
  type Explanation,
} from '../explain';
import { MarginBar, ReadinessGauge } from '../components/Gauges';
import { POSTURE_LABEL } from '../components/PostureCard';
import { effectivePosture, useExecStore, workInScopeName } from '../store';

const VERDICT_TEXT: Record<Verdict, string> = {
  positive: 'Pays back',
  marginal: 'Marginal',
  negative: 'Does not pay back',
};
const VERDICT_CLASS: Record<Verdict, string> = {
  positive: 'bg-blue-50 text-blue-700',
  marginal: 'bg-gray-100 text-gray-700',
  negative: 'bg-red-50 text-red-700',
};
const POSTURE_ORDER = ['local', 'hybrid', 'enterprise', 'frontier'] as const;
const HEIGHT = 112;

export default function Decision(): ReactElement | null {
  const inputs = useExecStore(s => s.inputs);
  const selectedPosture = useExecStore(s => s.selectedPosture);
  const ask = useExecStore(s => s.ask);
  const nextSteps = useExecStore(s => s.nextSteps);
  const setAsk = useExecStore(s => s.setAsk);
  const setNextSteps = useExecStore(s => s.setNextSteps);

  const posture = effectivePosture(inputs, selectedPosture);
  if (!posture) return null;
  const summaries = compareAll(inputs);
  const cases = summaries[posture];
  const expected = cases.expected;
  const effectBreakEven = breakEvenEffectiveness(inputs, posture);
  const cashBreakEven = breakEvenCashShare(inputs, posture);
  const workInScope = workInScopeName(inputs);
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <section className="print-area space-y-3 rounded-xl border border-gray-200 bg-white p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm text-gray-600">
        <span className="text-base font-semibold text-gray-900">{inputs.customerName}</span>
        <span>
          {workInScope ? `Work in scope: ${workInScope}. ` : ''}
          {today}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <p className="text-base text-gray-900">{headline(POSTURE_LABEL[posture], expected)}</p>
        <span className={`rounded-full px-2 py-0.5 text-xs ${VERDICT_CLASS[expected.verdict]}`}>{VERDICT_TEXT[expected.verdict]}</span>
        <InfoTip explanation={explainVerdict(expected)} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Figure label="Payback" value={formatPayback(expected.paybackMonth)} info={explainPayback(inputs, expected)} />
        <Figure label="3-year net value" value={formatMoney(expected.netValue36)} info={explainNetValue(expected)} />
        <Figure label="Net per month at maturity" value={formatMoney(expected.steadyNetPerMonth)} info={explainSteadyNet(expected)} />
        <Figure label="Investment" value={formatMoney(expected.investment)} info={explainInvestment(inputs, expected)} />
        <Figure
          label="Net efficiency gain"
          info={explainNetEfficiency(expected)}
          noteInfo={explainCapacity(inputs, expected)}
          value={`${(expected.netEfficiency * 100).toFixed(1)}%`}
          note={`${expected.capacityFte.toFixed(1)} people equivalent`}
        />
      </div>

      <p className="text-sm text-gray-700">
        Range: {formatMoney(cases.conservative.netValue36)} to {formatMoney(cases.stretch.netValue36)}
        <InfoTip explanation={explainRange()} />
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 print:grid-cols-3">
        <Card title="Cumulative position" info={explainCumulative()} label="Line chart of the cumulative position over 36 months for each case">
          <CumulativeCasesChart conservative={cases.conservative} expected={cases.expected} stretch={cases.stretch} width={CHART_WIDTH} height={HEIGHT} />
        </Card>
        <Card title="3-year net value by option" info={explainOptionsChart()} label="Bar chart of the 3-year net value of each option for each case">
          <OptionsRangeChart summaries={summaries} width={CHART_WIDTH} height={HEIGHT} />
          <p className="flex flex-wrap justify-center gap-x-3 text-xs text-gray-500">
            {POSTURE_ORDER.map(id => (
              <span key={id}>
                {POSTURE_LABEL[id]}: {VERDICT_TEXT[summaries[id].expected.verdict]}
              </span>
            ))}
          </p>
        </Card>
        <Card title="How the efficiency is built" info={explainEfficiencyChart(expected)} label="Bar chart: effort AI removes, minus review and rework, gives net efficiency">
          <EfficiencyBridgeChart result={expected} width={CHART_WIDTH} height={HEIGHT} />
          <p className="text-center text-xs text-gray-500">AI is used on {Math.round(expected.aiReach * 100)}% of all the work.</p>
        </Card>
        <Card title="Where the effort is saved" info={explainPhaseChart()} label="Bar chart of net efficiency for each phase">
          <PhaseEfficiencyChart phases={expected.phases} width={CHART_WIDTH} height={Math.max(HEIGHT, Math.min(150, expected.phases.length * 15 + 12))} />
        </Card>
        <Card title="Monthly position at maturity" info={explainMonthlyChart()} label="Bar chart of the monthly saving, costs and net at maturity">
          <MonthlyEconomicsChart result={expected} width={CHART_WIDTH} height={HEIGHT} />
          <p className="text-center text-xs text-gray-500">Saving is the counted share. Platform includes governance.</p>
        </Card>
        <Card title="One-time investment" info={explainInvestment(inputs, expected)} label="Stacked bar of the one-time investment by line">
          <InvestmentChart lines={expected.investmentLines} width={CHART_WIDTH} height={HEIGHT - 10} />
          <p className="text-center text-xs text-gray-500">Total {formatMoney(expected.investment)}</p>
        </Card>
        <Card title="Safety margin" info={explainReadiness(inputs)}>
          <div className="space-y-3">
            <MarginBar
              title="AI effect needed to break even"
              breakEven={effectBreakEven}
              assumed={1}
              scaleMax={1.5}
              breakEvenLabel={effectBreakEven === null ? 'Cannot break even' : `Break-even: ${Math.round(effectBreakEven * 100)}%`}
              assumedLabel="Assumed: 100%"
            />
            <MarginBar
              title="Share of released capacity that must become savings"
              breakEven={cashBreakEven}
              assumed={inputs.cashShare}
              scaleMax={1}
              breakEvenLabel={cashBreakEven === null ? 'Cannot break even' : `Break-even: ${Math.round(cashBreakEven * 100)}%`}
              assumedLabel={`Assumed: ${Math.round(inputs.cashShare * 100)}%`}
            />
            <ReadinessGauge gap={readinessGap(inputs.readiness)} />
          </div>
        </Card>
        <Card title="What must be true" info={explainBreakEvenEffect()} info2={explainBreakEvenCash()}>
          <ul className="list-disc space-y-1 pl-4 text-xs text-gray-800">
            {whatMustBeTrue(inputs, posture).map(sentence => (
              <li key={sentence}>{sentence}</li>
            ))}
          </ul>
        </Card>
        <div className="space-y-2 rounded-xl border border-gray-200 p-3">
          <label className="block space-y-1">
            <span className="text-xs font-medium text-gray-900">The ask</span>
            <textarea
              value={ask}
              onChange={e => setAsk(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-gray-900">Next steps</span>
            <textarea
              value={nextSteps}
              onChange={e => setNextSteps(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs"
            />
          </label>
        </div>
      </div>

      <p className="text-xs text-gray-500">Assumptions are presenter-entered and not independently verified.</p>
    </section>
  );
}

function Figure({ label, value, note, info, noteInfo }: { label: string; value: string; note?: string; info: Explanation; noteInfo?: Explanation }): ReactElement {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
      <p className="text-xs text-gray-500">
        {label}
        <InfoTip explanation={info} />
      </p>
      <p className="mt-0.5 text-lg font-semibold text-gray-900">{value}</p>
      {note && (
        <p className="text-xs text-gray-500">
          {note}
          {noteInfo && <InfoTip explanation={noteInfo} />}
        </p>
      )}
    </div>
  );
}

function Card({ title, label, info, info2, children }: { title: string; label?: string; info?: Explanation; info2?: Explanation; children: ReactNode }): ReactElement {
  return (
    <div className="space-y-2 rounded-xl border border-gray-200 p-3">
      <h2 className="text-xs font-medium text-gray-900">
        {title}
        {info && <InfoTip explanation={info} />}
        {info2 && <InfoTip explanation={info2} />}
      </h2>
      <div className="flex flex-col items-center gap-1" role={label ? 'img' : undefined} aria-label={label}>
        {children}
      </div>
    </div>
  );
}
