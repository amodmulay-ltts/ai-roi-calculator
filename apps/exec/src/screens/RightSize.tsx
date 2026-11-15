import { useMemo } from 'react';
import { Bar, BarChart, Cell, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import {
  breakEvenEffectiveness,
  compareAll,
  formatMoney,
  recommendedPosture,
  type PostureId,
} from '@ai-roi-calc/bizcase';
import AssumptionsTable from '../components/AssumptionsTable';
import PostureCard, { POSTURE_LABEL } from '../components/PostureCard';
import { effectivePosture, useExecStore } from '../store';
import { DATA_RULES } from './Situation';

const ORDER: PostureId[] = ['local', 'hybrid', 'enterprise', 'frontier'];
const POSITIVE = '#1d4ed8';
const NEGATIVE = '#b91c1c';

export default function RightSize() {
  const inputs = useExecStore(s => s.inputs);
  const selectedPosture = useExecStore(s => s.selectedPosture);
  const selectPosture = useExecStore(s => s.selectPosture);

  const summaries = useMemo(() => compareAll(inputs), [inputs]);
  const recommended = useMemo(() => recommendedPosture(inputs), [inputs]);
  const current = effectivePosture(inputs, selectedPosture);
  const openCount = ORDER.filter(id => summaries[id].allowed).length;
  const rule = DATA_RULES.find(([value]) => value === inputs.dataConstraint)?.[1] ?? '';

  const chartData = ORDER.map(id => ({
    name: POSTURE_LABEL[id],
    value: summaries[id].expected.netValue36,
  }));

  return (
    <section className="space-y-6">
      <p className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700">
        Data rules: {rule}. {openCount} of 4 options are open to you.
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {ORDER.map(id => (
          <PostureCard
            key={id}
            summary={summaries[id]}
            selected={current === id}
            recommended={recommended === id}
            breakEven={breakEvenEffectiveness(inputs, id)}
            onSelect={() => selectPosture(id)}
          />
        ))}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-medium text-gray-900">3-year net value by option</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={v => formatMoney(Number(v))} tick={{ fontSize: 12 }} width={80} />
              <Bar dataKey="value" isAnimationActive={false}>
                {chartData.map(entry => (
                  <Cell key={entry.name} fill={entry.value < 0 ? NEGATIVE : POSITIVE} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <details className="rounded-xl border border-gray-200 bg-white p-6">
        <summary className="cursor-pointer text-sm font-medium text-gray-900">Assumptions to validate</summary>
        <div className="mt-4">
          <AssumptionsTable inputs={inputs} />
        </div>
      </details>
    </section>
  );
}
