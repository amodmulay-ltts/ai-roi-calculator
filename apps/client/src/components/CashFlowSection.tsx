import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from 'recharts';
import type { Results, Scenario } from '@ai-roi-calc/engine';
import Tooltip from './Tooltip';

interface CashFlowSectionProps {
  scenario: Scenario;
  results: Results;
  formatCurrency: (value: number) => string;
  onUpdate: (updates: Partial<Scenario>) => void;
}

const BLUE = '#1d4ed8';
const GRAY = '#9ca3af';
const GRID = '#e5e7eb';

export default function CashFlowSection({ scenario, results, formatCurrency, onUpdate }: CashFlowSectionProps) {
  const { monthlyForecast, financialMetrics: fm, cost } = results;
  const chargeable = scenario.costChargeable === 'chargeable';
  const full = chargeable ? cost.chargeableFullyLoaded : cost.fullyLoaded;
  const direct = chargeable ? cost.chargeableDirectOpex : cost.directOpex;
  const delta = (v: number) => (v > 0 ? '+' : '') + formatCurrency(v);

  const cumulative = monthlyForecast.map(m => ({ month: m.month, cash: m.cumulativeCashFlow }));
  const runCost = monthlyForecast
    .filter(m => m.month > 0)
    .map(m => ({
      month: m.month,
      today: chargeable ? m.baselineCostChargeable : m.baselineCostFull,
      withChange: chargeable ? m.runCostChargeable : m.runCostFull,
    }));
  const lowest = Math.min(...monthlyForecast.map(m => m.cumulativeCashFlow));

  const headline = fm.paybackNotInHorizon
    ? `The investment is not recovered within ${scenario.timeValue.horizonMonths} months`
    : fm.paybackMonth === null
      ? 'No cash moves: this model keeps today’s setup'
      : `The investment is recovered in month ${fm.paybackMonth}`;

  const axis = { stroke: '#6b7280', fontSize: 12 };
  const tooltipStyle = { backgroundColor: '#fff', border: `1px solid ${GRID}`, borderRadius: 8, fontSize: 12 };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-8">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Cash flow</p>

      {/* Hero: cumulative cash position */}
      <h3 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">{headline}</h3>
      <p className="text-sm text-gray-600 mb-6">
        Cumulative cash position: savings minus the investment, month by month. The dip is the investment plus the transition.
      </p>
      <div className="h-80 mb-10" role="img" aria-label={`Cumulative cash position chart. ${headline}.`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={cumulative} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="month" tick={axis} tickLine={false} label={{ value: 'Month', position: 'insideBottomRight', offset: -4, fontSize: 12, fill: '#6b7280' }} />
            <YAxis tick={axis} tickLine={false} width={80} tickFormatter={v => formatCurrency(Number(v))} />
            <ChartTooltip formatter={v => [formatCurrency(Number(v)), 'Cumulative cash']} labelFormatter={m => `Month ${m}`} contentStyle={tooltipStyle} />
            <ReferenceLine y={0} stroke="#374151" />
            {fm.paybackMonth !== null && !fm.paybackNotInHorizon && (
              <ReferenceLine
                x={fm.paybackMonth}
                stroke={BLUE}
                strokeDasharray="4 4"
                label={{ value: `Payback · month ${fm.paybackMonth}`, position: 'insideTopLeft', fill: BLUE, fontSize: 12 }}
              />
            )}
            <Line type="linear" dataKey="cash" stroke={BLUE} strokeWidth={2.5} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
        {/* Supporting 1: monthly run cost against today */}
        <div>
          <p className="text-sm font-semibold text-gray-900 mb-1">Monthly run cost against today</p>
          <p className="text-xs text-gray-500 mb-3">
            <span className="inline-block w-3 border-t-2 border-dashed border-gray-400 align-middle mr-1" /> Today
            <span className="inline-block w-3 border-t-2 border-blue-700 align-middle ml-4 mr-1" /> With the change
          </p>
          <div className="h-56" role="img" aria-label="Monthly run cost with the change compared with today">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={runCost} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="month" tick={axis} tickLine={false} />
                <YAxis tick={axis} tickLine={false} width={80} tickFormatter={v => formatCurrency(Number(v))} domain={['auto', 'auto']} />
                <ChartTooltip
                  formatter={(v, name) => [formatCurrency(Number(v)), name === 'today' ? 'Today' : 'With the change']}
                  labelFormatter={m => `Month ${m}`}
                  contentStyle={tooltipStyle}
                />
                <Line type="stepAfter" dataKey="today" stroke={GRAY} strokeWidth={2} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
                <Line type="linear" dataKey="withChange" stroke={BLUE} strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Supporting 2: cost model by state */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <p className="text-sm font-semibold text-gray-900">Cost per month by stage</p>
            <div className="flex items-center gap-1 text-xs">
              <div role="radiogroup" aria-label="Cost basis" className="inline-flex rounded-lg border border-gray-200 p-0.5">
                {([
                  ['tco', 'Total cost of ownership'],
                  ['chargeable', 'Client-chargeable'],
                ] as const).map(([id, label]) => (
                  <button
                    key={id}
                    role="radio"
                    aria-checked={scenario.costChargeable === id}
                    onClick={() => onUpdate({ costChargeable: id })}
                    className={`px-2.5 py-1 rounded-md transition ${scenario.costChargeable === id ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <Tooltip text="Total cost of ownership counts every cost line. Client-chargeable leaves out lines marked as not chargeable (for example internal capex amortisation). The choice drives savings, payback, ROI and NPV." />
            </div>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 text-left border-b border-gray-200">
                <th className="py-2 font-normal">Stage</th>
                <th className="py-2 font-normal text-right">People</th>
                <th className="py-2 font-normal text-right">Direct</th>
                <th className="py-2 font-normal text-right">Fully loaded</th>
                <th className="py-2 font-normal text-right">vs today</th>
              </tr>
            </thead>
            <tbody>
              {(['baseline', 'transition', 'mature'] as const).map(state => (
                <tr key={state} className="border-b border-gray-100">
                  <td className="py-2 text-gray-900">{{ baseline: 'Today', transition: 'Transition', mature: 'Mature' }[state]}</td>
                  <td className="py-2 text-right text-gray-600">{formatCurrency(cost.peopleCost[state])}</td>
                  <td className="py-2 text-right text-gray-600">{formatCurrency(direct[state])}</td>
                  <td className="py-2 text-right font-medium text-gray-900">{formatCurrency(full[state])}</td>
                  <td className={`py-2 text-right ${state === 'mature' && full.mature < full.baseline ? 'font-semibold text-blue-700' : 'text-gray-600'}`}>
                    {state === 'baseline' ? '—' : delta(full[state] - full.baseline)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quiet: totals over the horizon */}
      <dl className="mt-8 pt-4 border-t border-gray-100 flex flex-wrap gap-x-10 gap-y-3 text-sm">
        {[
          [`Savings over ${scenario.timeValue.horizonMonths} months`, formatCurrency(fm.totalSavingsOverHorizon)],
          ['Investment', formatCurrency(fm.totalInvestment)],
          ['Net benefit', formatCurrency(fm.totalSavingsOverHorizon - fm.totalInvestment)],
          ['Lowest cash position', formatCurrency(lowest)],
          ['Breakeven without investment', fm.breakEvenMonth === null ? '—' : `Month ${fm.breakEvenMonth}`],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-gray-500">{label}</dt>
            <dd className="text-gray-700 font-medium">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
