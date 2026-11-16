import type { ReactElement } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { compareAll, formatMoney, formatPayback, formatRoi, headline } from '@ai-roi-calc/bizcase';
import { POSTURE_LABEL } from '../components/PostureCard';
import NetPerMonthExplainer from '../components/NetPerMonthExplainer';
import InfoTip from '../components/InfoTip';
import {
  explainCapacity,
  explainCapacityValue,
  explainCumulative,
  explainNetValue,
  explainPayback,
  explainRange,
  explainRoi,
  explainSteadyNet,
  type Explanation,
} from '../explain';
import { effectivePosture, useExecStore } from '../store';

export default function Result(): ReactElement | null {
  const inputs = useExecStore(s => s.inputs);
  const selectedPosture = useExecStore(s => s.selectedPosture);

  const posture = effectivePosture(inputs, selectedPosture);
  if (!posture) return null;
  const cases = compareAll(inputs)[posture];
  const columns = [
    { title: 'Conservative', r: cases.conservative },
    { title: 'Expected', r: cases.expected },
    { title: 'Stretch', r: cases.stretch },
  ];

  const rows: Array<[string, (r: (typeof columns)[number]['r']) => string, Explanation]> = [
    ['Payback', r => formatPayback(r.paybackMonth), explainPayback(inputs, cases.expected)],
    ['3-year net value', r => formatMoney(r.netValue36), explainNetValue(cases.expected)],
    ['3-year return', r => formatRoi(r.roiPercent), explainRoi(cases.expected)],
    ['Net per month at maturity', r => formatMoney(r.steadyNetPerMonth), explainSteadyNet(cases.expected)],
    ['Capacity released (people equivalent)', r => r.capacityFte.toFixed(1), explainCapacity(inputs, cases.expected)],
    ['Counted as saving per month', r => formatMoney(r.countedSavingPerMonth), explainCapacityValue(inputs, cases.expected)],
    ['Redeployed, not counted per month', r => formatMoney(r.redeployedValuePerMonth), explainCapacityValue(inputs, cases.expected)],
  ];

  const chartData = Array.from({ length: 37 }, (_, m) => ({
    month: m,
    conservative: cases.conservative.cumulative[m],
    expected: cases.expected.cumulative[m],
    stretch: cases.stretch.cumulative[m],
  }));

  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">{headline(POSTURE_LABEL[posture], cases.expected)}</h2>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
              <th className="py-2 font-normal" />
              {columns.map(c => (
                <th key={c.title} className="py-2 text-right font-normal">
                  {c.title}
                  {c.title === 'Expected' && <InfoTip explanation={explainRange()} />}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, format, info]) => (
              <tr key={label} className="border-b border-gray-100">
                <td className="py-2 text-gray-700">
                  {label}
                  <InfoTip explanation={info} />
                </td>
                {columns.map(c => (
                  <td key={c.title} className="py-2 text-right font-medium text-gray-900">
                    {format(c.r)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <NetPerMonthExplainer inputs={inputs} result={cases.expected} posture={posture} />

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-medium text-gray-900">
          Cumulative position
          <InfoTip explanation={explainCumulative()} />
        </h2>
        <div className="h-72" role="img" aria-label="Line chart of the cumulative position over 36 months for each case">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={v => formatMoney(Number(v))} tick={{ fontSize: 12 }} width={80} />
              <CartesianGrid stroke="#e5e7eb" vertical={false} />
              <ReferenceLine y={0} stroke="#374151" />
              <Line type="monotone" dataKey="conservative" stroke="#9ca3af" strokeDasharray="6 4" dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="expected" stroke="#1d4ed8" dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="stretch" stroke="#0ea5e9" strokeDasharray="6 4" dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
