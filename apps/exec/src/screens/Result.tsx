import { Line, LineChart, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { compareAll, formatMoney, formatPayback, formatRoi, headline } from '@ai-roi-calc/bizcase';
import { POSTURE_LABEL } from '../components/PostureCard';
import { effectivePosture, useExecStore } from '../store';

export default function Result() {
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

  const rows: Array<[string, (r: (typeof columns)[number]['r']) => string]> = [
    ['Payback', r => formatPayback(r.paybackMonth)],
    ['3-year net value', r => formatMoney(r.netValue36)],
    ['3-year return', r => formatRoi(r.roiPercent)],
    ['Net per month at maturity', r => formatMoney(r.steadyNetPerMonth)],
    ['Capacity released (people equivalent)', r => r.capacityFte.toFixed(1)],
    ['Counted as saving per month', r => formatMoney(r.countedSavingPerMonth)],
    ['Redeployed, not counted per month', r => formatMoney(r.redeployedValuePerMonth)],
  ];

  const chartData = Array.from({ length: 37 }, (_, m) => ({
    month: m,
    conservative: cases.conservative.cumulative[m],
    expected: cases.expected.cumulative[m],
    stretch: cases.stretch.cumulative[m],
  }));

  return (
    <section className="space-y-6">
      <p className="rounded-xl border border-gray-200 bg-white p-6 text-base text-gray-900">
        {headline(POSTURE_LABEL[posture], cases.expected)}
      </p>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
              <th className="py-2 font-normal" />
              {columns.map(c => (
                <th key={c.title} className="py-2 text-right font-normal">
                  {c.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, format]) => (
              <tr key={label} className="border-b border-gray-100">
                <td className="py-2 text-gray-700">{label}</td>
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

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-medium text-gray-900">Cumulative position</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={v => formatMoney(Number(v))} tick={{ fontSize: 12 }} width={80} />
              <ReferenceLine y={0} stroke="#9ca3af" />
              <Line type="monotone" dataKey="conservative" stroke="#6b7280" strokeDasharray="6 4" dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="expected" stroke="#1d4ed8" dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="stretch" stroke="#0ea5e9" strokeDasharray="6 4" dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
