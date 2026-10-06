import { useState } from 'react';
import type { CostLine, Scenario } from '@ai-roi-calc/engine';
import { fxFactor } from '@ai-roi-calc/engine';
import Tooltip from './Tooltip';
import {
  INFRA_REFERENCES,
  INFRA_REFERENCE_NOTE,
  referenceMonthlyCost,
} from '../utils/infraReference';

interface CostsStepProps {
  scenario: Scenario;
  onUpdate: (updates: Partial<Scenario>) => void;
  formatCurrency: (value: number) => string;
}

/** The guided buckets. Free-form lines in any other category still show, under "Other". */
const BUCKETS: Array<{ category: string; label: string; help: string; aiSpecific: boolean }> = [
  {
    category: 'Tools',
    label: 'Tools and licences',
    help: 'What the team already pays for: IDEs, test tooling, ALM, static analysis. Usually unchanged by AI, so it appears in both columns.',
    aiSpecific: false,
  },
  {
    category: 'AI',
    label: 'AI tools and licences',
    help: 'AI-specific tooling bought as a product rather than per token or per seat. Scales with the delivery model’s AI adoption.',
    aiSpecific: true,
  },
  {
    category: 'Infra',
    label: 'Infrastructure',
    help: 'Running cost of the hardware behind the work: a private AI platform, self-hosted GPUs, cloud compute. For local or hybrid models this is where the machines are paid for.',
    aiSpecific: true,
  },
  {
    category: 'Governance',
    label: 'Governance and compliance',
    help: 'Audit, reporting, tool qualification. In regulated work this is rarely zero.',
    aiSpecific: true,
  },
  {
    category: 'Transition',
    label: 'Transition',
    help: 'Costs that exist only while the change is happening: training, change management, dual running. Usually zero once mature.',
    aiSpecific: false,
  },
];

const STAGES = [
  ['baseline', 'Today'],
  ['transition', 'Transition'],
  ['mature', 'Mature'],
] as const;

export default function CostsStep({ scenario, onUpdate, formatCurrency }: CostsStepProps) {
  const [units, setUnits] = useState<Record<string, number>>({});
  const usdToScenario = fxFactor('USD', scenario.baseCurrency, scenario.fxRatesPerEur);
  const known = new Set(BUCKETS.map(b => b.category));
  const other = scenario.costLines.filter(l => !known.has(l.category));

  const setLine = (id: string, changes: Partial<CostLine>) =>
    onUpdate({ costLines: scenario.costLines.map(l => (l.id === id ? { ...l, ...changes } : l)) });

  const addLine = (category: string, aiSpecific: boolean) =>
    onUpdate({
      costLines: [
        ...scenario.costLines,
        {
          id: `cost-${Date.now()}`,
          name: 'New cost line',
          category,
          monthlyAmount: { baseline: 0, transition: 0, mature: 0 },
          chargeable: true,
          aiSpecific,
        },
      ],
    });

  const total = (stage: 'baseline' | 'transition' | 'mature') =>
    scenario.costLines.reduce((sum, l) => sum + l.monthlyAmount[stage], 0);

  const renderLines = (lines: CostLine[]) =>
    lines.map(line => (
      <tr key={line.id} className="border-t border-gray-100">
        <td className="py-1.5 pr-3">
          <input
            aria-label="Cost line name"
            value={line.name}
            onChange={e => setLine(line.id, { name: e.target.value })}
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
          />
        </td>
        {STAGES.map(([stage]) => (
          <td key={stage} className="py-1.5 px-1">
            <input
              aria-label={`${line.name} ${stage}`}
              type="number"
              min={0}
              step="any"
              value={line.monthlyAmount[stage]}
              onChange={e =>
                setLine(line.id, {
                  monthlyAmount: { ...line.monthlyAmount, [stage]: Math.max(0, Number(e.target.value) || 0) },
                })
              }
              className="w-24 px-2 py-1 text-right border border-gray-300 rounded text-sm"
            />
          </td>
        ))}
        <td className="py-1.5 pl-2">
          <button
            onClick={() => onUpdate({ costLines: scenario.costLines.filter(l => l.id !== line.id) })}
            className="text-xs text-gray-500 hover:text-gray-900"
          >
            Remove
          </button>
        </td>
      </tr>
    ));

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Costs</h3>
        <p className="text-sm text-gray-600">
          Monthly running costs besides people. Enter what the customer pays today and what they would pay with the change;
          the difference is most of the business case. People cost is on the previous step, AI seats and token usage are
          modelled separately on the dashboard, and one-off spend is the next step.
        </p>
      </div>

      {/* Hero: what the buckets add up to */}
      <div>
        <p className="text-3xl font-semibold text-gray-900">
          {formatCurrency(total('baseline'))} <span className="text-gray-400">→</span>{' '}
          <span className="text-blue-700">{formatCurrency(total('mature'))}</span>
          <span className="text-base font-normal text-gray-500"> / month</span>
        </p>
        <p className="text-sm text-gray-500 mt-1">Cost lines today versus once mature, before overhead and risk reserve</p>
      </div>

      {BUCKETS.map(bucket => {
        const lines = scenario.costLines.filter(l => l.category === bucket.category);
        return (
          <div key={bucket.category}>
            <div className="flex items-center mb-1">
              <h4 className="text-sm font-semibold text-gray-900">{bucket.label}</h4>
              <Tooltip text={bucket.help} />
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 text-left">
                  <th className="font-normal pb-1 pr-3">Cost line</th>
                  {STAGES.map(([stage, label]) => (
                    <th key={stage} className="font-normal pb-1 px-1 text-right">
                      {label}
                    </th>
                  ))}
                  <th />
                </tr>
              </thead>
              <tbody>{renderLines(lines)}</tbody>
            </table>
            <button onClick={() => addLine(bucket.category, bucket.aiSpecific)} className="mt-1 text-sm text-blue-700 hover:text-blue-900">
              Add {bucket.label.toLowerCase()} line
            </button>

            {bucket.category === 'Infra' && (
              <details className="mt-3 text-sm">
                <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
                  Reference figures for self-hosting a model
                </summary>
                <table className="mt-3 w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-400 text-left">
                      <th className="font-normal pb-1">Option</th>
                      <th className="font-normal pb-1 text-right">Per unit / month</th>
                      <th className="font-normal pb-1 text-right">Units</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {INFRA_REFERENCES.map(ref => {
                      const count = units[ref.id] ?? 1;
                      return (
                        <tr key={ref.id} className="border-t border-gray-100">
                          <td className="py-1.5 pr-3">
                            <span className="text-gray-900">{ref.label}</span>
                            <span className="block text-xs text-gray-400">
                              {ref.basis} · {ref.source}
                              {ref.note ? ` · ${ref.note}` : ''}
                            </span>
                          </td>
                          <td className="py-1.5 text-right text-gray-700">
                            {formatCurrency(referenceMonthlyCost(ref, 1, usdToScenario))}
                          </td>
                          <td className="py-1.5 text-right">
                            <input
                              aria-label={`${ref.label} units`}
                              type="number"
                              min={1}
                              value={count}
                              onChange={e => setUnits({ ...units, [ref.id]: Math.max(1, Number(e.target.value) || 1) })}
                              className="w-16 px-2 py-1 text-right border border-gray-300 rounded text-sm"
                            />
                          </td>
                          <td className="py-1.5 pl-2">
                            <button
                              onClick={() => {
                                const amount = referenceMonthlyCost(ref, count, usdToScenario);
                                onUpdate({
                                  costLines: [
                                    ...scenario.costLines,
                                    {
                                      id: `infra-${Date.now()}`,
                                      name: `${count} × ${ref.label}`,
                                      category: 'Infra',
                                      monthlyAmount: { baseline: 0, transition: amount, mature: amount },
                                      chargeable: true,
                                      aiSpecific: true,
                                    },
                                  ],
                                });
                              }}
                              className="text-xs text-blue-700 hover:text-blue-900"
                            >
                              Add as line
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <p className="mt-2 text-xs text-gray-400">{INFRA_REFERENCE_NOTE}</p>
              </details>
            )}
          </div>
        );
      })}

      {other.length > 0 && (
        <div>
          <div className="flex items-center mb-1">
            <h4 className="text-sm font-semibold text-gray-900">Other</h4>
            <Tooltip text="Lines that do not sit in one of the buckets above — kept so an imported scenario never loses a cost." />
          </div>
          <table className="w-full text-sm">
            <tbody>{renderLines(other)}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
