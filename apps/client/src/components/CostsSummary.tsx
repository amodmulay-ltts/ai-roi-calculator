import type { Results, Scenario } from '@ai-roi-calc/engine';
import Tooltip from './Tooltip';
import { inactiveNote } from '../utils/sourcingNote';

interface CostsSummaryProps {
  scenario: Scenario;
  results: Results;
  formatCurrency: (value: number) => string;
  onEditLines: () => void;
  onEditInvestment: () => void;
}

export default function CostsSummary({ scenario, results, formatCurrency, onEditLines, onEditInvestment }: CostsSummaryProps) {
  const linesMature = results.cost.directOpex.mature - results.cost.peopleCost.mature - results.cost.llmCost.mature;
  const linesToday = results.cost.directOpex.baseline - results.cost.peopleCost.baseline - results.cost.llmCost.baseline;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-8">
      <div className="flex items-start justify-between gap-4 mb-1">
        <div className="flex items-center">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Other running costs and investment</p>
          <Tooltip text="Monthly cost lines besides people and AI model usage, and the one-off investment. Amounts shown follow the selected delivery model (AI-specific lines scale with AI adoption)." />
        </div>
        <button onClick={onEditLines} className="text-sm text-blue-700 hover:text-blue-900">
          Edit cost lines
        </button>
      </div>

      {/* Hero */}
      <p className="text-4xl font-bold text-gray-900 mb-1">
        {formatCurrency(linesToday)} <span className="text-gray-400">→</span>{' '}
        <span className="text-blue-700">{formatCurrency(linesMature)}</span>
        <span className="text-xl font-semibold text-gray-500"> / month</span>
      </p>
      <p className="text-sm text-gray-600 mb-6">Cost lines today versus once mature, before overhead and risk reserve</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Supporting 1: cost lines */}
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-400 text-left">
              <th className="font-normal pb-1">Cost line</th>
              <th className="font-normal pb-1 text-right">Today</th>
              <th className="font-normal pb-1 text-right">Mature</th>
            </tr>
          </thead>
          <tbody>
            {scenario.costLines.map(l => {
              const off = inactiveNote(l, scenario);
              return (
              <tr key={l.id} className={`border-t border-gray-100 ${off ? 'opacity-50' : ''}`}>
                <td className="py-1.5">
                  <span className="text-gray-900">{l.name}</span>
                  <span className="ml-2 text-xs text-gray-400">
                    {l.category}
                    {l.aiSpecific ? ' · AI-specific' : ''}
                    {l.chargeable ? '' : ' · not chargeable'}
                    {off ? ` · ${off}` : ''}
                  </span>
                </td>
                <td className="py-1.5 text-right text-gray-700">{formatCurrency(l.monthlyAmount.baseline)}</td>
                <td className="py-1.5 text-right text-gray-700">{formatCurrency(l.monthlyAmount.mature)}</td>
              </tr>
              );
            })}
          </tbody>
        </table>

        {/* Supporting 2: investment */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-gray-400">One-off investment</p>
            <button onClick={onEditInvestment} className="text-xs text-blue-700 hover:text-blue-900">
              Edit in setup
            </button>
          </div>
          <p className="text-2xl font-semibold text-gray-900 mb-2">{formatCurrency(results.financialMetrics.totalInvestment)}</p>
          <ul className="text-sm space-y-1">
            {scenario.oneTimeInvestment.map(i => (
              <li key={i.id} className="flex justify-between border-t border-gray-100 pt-1">
                <span className="text-gray-700">
                  {i.name}
                  <span className="ml-2 text-xs text-gray-400">
                    month {i.month}
                    {i.aiSpecific ? ' · AI-specific' : ''}
                  </span>
                </span>
                <span className="text-gray-700">{formatCurrency(i.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
