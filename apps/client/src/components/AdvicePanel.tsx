import { useMemo } from 'react';
import type { Finding, Results, Scenario, VerdictTone } from '@ai-roi-calc/engine';
import { advise } from '@ai-roi-calc/engine';

interface AdvicePanelProps {
  scenario: Scenario;
  results: Results;
}

const TONE_LABEL: Record<VerdictTone, string> = {
  strong: 'Worth pursuing',
  marginal: 'Marginal',
  negative: 'Does not pay back',
  'no-change': 'No change',
};

function FindingCard({ finding }: { finding: Finding }) {
  const warning = finding.severity === 'warning';
  return (
    <div className={`border-l-4 pl-4 py-1 ${warning ? 'border-blue-800' : 'border-gray-200'}`}>
      {warning && <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide mb-1">Check</p>}
      <p className="text-base font-semibold text-gray-900 mb-1">{finding.title}</p>
      <p className="text-sm text-gray-600">{finding.detail}</p>
    </div>
  );
}

export default function AdvicePanel({ scenario, results }: AdvicePanelProps) {
  const advice = useMemo(() => advise(scenario, results), [scenario, results]);
  const [first, second, ...rest] = advice.findings;

  return (
    <section aria-label="Advice" className="mb-12 bg-white rounded-xl border border-gray-200 p-8">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
        Advice · <span className={advice.tone === 'strong' ? 'text-blue-700' : 'text-gray-700'}>{TONE_LABEL[advice.tone]}</span>
      </p>

      {/* Hero: the verdict */}
      <h3 className={`text-3xl font-bold tracking-tight mb-2 ${advice.tone === 'strong' ? 'text-blue-700' : 'text-gray-900'}`}>
        {advice.headline}
      </h3>
      <p className="text-sm text-gray-600 max-w-3xl">{advice.summary}</p>

      {/* Supporting: the two most important findings */}
      {first && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <FindingCard finding={first} />
          {second && <FindingCard finding={second} />}
        </div>
      )}

      {/* Quiet: everything else */}
      {rest.length > 0 && (
        <details className="mt-6 text-sm">
          <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
            {rest.length} more note{rest.length > 1 ? 's' : ''}
          </summary>
          <ul className="mt-3 space-y-3 max-w-3xl">
            {rest.map(f => (
              <li key={f.id}>
                <p className="text-gray-800">
                  {f.severity === 'warning' && <span className="text-xs font-semibold text-blue-800 mr-2">CHECK</span>}
                  {f.title}
                </p>
                <p className="text-xs text-gray-500">{f.detail}</p>
              </li>
            ))}
          </ul>
        </details>
      )}

      <p className="mt-6 text-xs text-gray-400">
        Generated from the numbers by fixed rules, so every statement can be traced to an input. It is not a recommendation by itself.
      </p>
    </section>
  );
}
