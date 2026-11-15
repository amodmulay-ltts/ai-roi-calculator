import type { ReactElement } from 'react';
import {
  compareAll,
  formatMoney,
  formatPayback,
  headline,
  whatMustBeTrue,
  type Verdict,
} from '@ai-roi-calc/bizcase';
import { POSTURE_LABEL } from '../components/PostureCard';
import { effectivePosture, useExecStore } from '../store';

const VERDICT_TEXT: Record<Verdict, string> = {
  positive: 'Pays back',
  marginal: 'Marginal',
  negative: 'Does not pay back',
};

const POSTURE_ORDER = ['local', 'hybrid', 'enterprise', 'frontier'] as const;

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
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <section className="print-area space-y-6 rounded-xl border border-gray-200 bg-white p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm text-gray-600">
        <span className="text-base font-semibold text-gray-900">{inputs.customerName}</span>
        <span>{today}</span>
      </div>

      <p className="text-base text-gray-900">{headline(POSTURE_LABEL[posture], expected)}</p>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Figure label="Payback" value={formatPayback(expected.paybackMonth)} />
        <Figure label="3-year net value" value={formatMoney(expected.netValue36)} />
        <Figure label="Net per month at maturity" value={formatMoney(expected.steadyNetPerMonth)} />
        <Figure label="Investment" value={formatMoney(expected.investment)} />
      </div>

      <p className="text-sm text-gray-700">
        Range: {formatMoney(cases.conservative.netValue36)} to {formatMoney(cases.stretch.netValue36)}
      </p>

      <div>
        <h2 className="mb-2 text-sm font-medium text-gray-900">What must be true</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-gray-800">
          {whatMustBeTrue(inputs, posture).map(sentence => (
            <li key={sentence}>{sentence}</li>
          ))}
        </ul>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
            <th className="py-2 font-normal">Option</th>
            <th className="py-2 text-right font-normal">Investment</th>
            <th className="py-2 text-right font-normal">Payback</th>
            <th className="py-2 text-right font-normal">3-year net value</th>
            <th className="py-2 text-right font-normal">Verdict</th>
          </tr>
        </thead>
        <tbody>
          {POSTURE_ORDER.map(id => {
            const r = summaries[id].expected;
            return (
              <tr key={id} className="border-b border-gray-100">
                <td className="py-2 text-gray-900">{POSTURE_LABEL[id]}</td>
                <td className="py-2 text-right">{formatMoney(r.investment)}</td>
                <td className="py-2 text-right">{formatPayback(r.paybackMonth)}</td>
                <td className="py-2 text-right">{formatMoney(r.netValue36)}</td>
                <td className="py-2 text-right">{VERDICT_TEXT[r.verdict]}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <label className="block space-y-1">
        <span className="text-sm font-medium text-gray-900">The ask</span>
        <textarea
          value={ask}
          onChange={e => setAsk(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
        />
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-medium text-gray-900">Next steps</span>
        <textarea
          value={nextSteps}
          onChange={e => setNextSteps(e.target.value)}
          rows={4}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
        />
      </label>

      <p className="text-xs text-gray-500">Assumptions are presenter-entered and not independently verified.</p>
    </section>
  );
}

function Figure({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-gray-900">{value}</p>
    </div>
  );
}
