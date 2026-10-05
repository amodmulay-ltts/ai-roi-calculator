import { useMemo } from 'react';
import type { ImplementationModel, Results, Scenario } from '@ai-roi-calc/engine';
import { compareDeliveryModels } from '@ai-roi-calc/engine';
import { deliveryModelInfo } from '../utils/deliveryModels';
import Tooltip from './Tooltip';

interface ModelComparisonProps {
  scenario: Scenario;
  formatCurrency: (value: number) => string;
  onSelect: (model: ImplementationModel) => void;
}

const paybackText = (r: Results) =>
  r.financialMetrics.paybackNotInHorizon
    ? 'Not within horizon'
    : r.financialMetrics.paybackMonth === null
      ? 'No change'
      : `Month ${r.financialMetrics.paybackMonth}`;

export default function ModelComparison({ scenario, formatCurrency, onSelect }: ModelComparisonProps) {
  const rows = useMemo(() => compareDeliveryModels(scenario), [scenario]);
  const best = rows.find(r => r.rank === 1)!;
  const selected = rows.find(r => r.model === scenario.primaryModel)!;
  const maxAbsNpv = Math.max(...rows.map(r => Math.abs(r.results.financialMetrics.npv)), 1);
  const gap = best.results.financialMetrics.npv - selected.results.financialMetrics.npv;
  const nothingPays = best.results.financialMetrics.npv <= 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-8">
      <div className="flex items-center mb-1">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Compare delivery models</p>
        <Tooltip text="Every model calculated on the same baseline team and costs, using each model's offshore share and AI adoption. Ranked by NPV. Select a row to make it the active model." />
      </div>

      {/* Hero: the verdict */}
      <h3 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">
        {nothingPays ? (
          'No delivery model creates value with these inputs.'
        ) : (
          <>
            <span className="text-blue-700">{deliveryModelInfo(best.model).label}</span> creates the most value:{' '}
            {formatCurrency(best.results.financialMetrics.npv)}
          </>
        )}
      </h3>
      <p className="text-sm text-gray-600 mb-8">
        {nothingPays
          ? 'Review the AI effort assumption, AI running costs and the investment.'
          : best.model === selected.model
            ? 'This is the model currently selected.'
            : `Your selected model, ${deliveryModelInfo(selected.model).label}, creates ${formatCurrency(gap)} less over ${scenario.timeValue.horizonMonths} months.`}
      </p>

      {/* Supporting: NPV bars and payback per model */}
      <div role="radiogroup" aria-label="Delivery models ranked by NPV" className="space-y-1">
        <div className="grid grid-cols-[10rem_1fr_9rem] md:grid-cols-[10rem_1fr_9rem_8rem_6rem_7rem] gap-4 px-3 pb-2 text-xs text-gray-400">
          <span>Model</span>
          <span>NPV</span>
          <span>Payback</span>
          <span className="hidden md:block text-right">Saving / month</span>
          <span className="hidden md:block text-right">Team (mature)</span>
          <span className="hidden md:block text-right">Investment</span>
        </div>
        {[...rows]
          .sort((a, b) => a.rank - b.rank)
          .map(({ model, results }) => {
            const npv = results.financialMetrics.npv;
            const isSelected = model === scenario.primaryModel;
            const width = `${(Math.abs(npv) / maxAbsNpv) * 100}%`;
            return (
              <button
                key={model}
                role="radio"
                aria-checked={isSelected}
                onClick={() => onSelect(model)}
                className={`w-full grid grid-cols-[10rem_1fr_9rem] md:grid-cols-[10rem_1fr_9rem_8rem_6rem_7rem] gap-4 items-center px-3 py-2.5 rounded-lg text-left transition ${
                  isSelected ? 'bg-blue-50 ring-1 ring-blue-200' : 'hover:bg-gray-50'
                }`}
              >
                <span className={`text-sm ${isSelected ? 'font-semibold text-blue-700' : 'text-gray-900'}`}>
                  {deliveryModelInfo(model).label}
                </span>
                <span className="flex items-center gap-3 min-w-0">
                  <span className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden" aria-hidden="true">
                    <span className={`block h-full rounded-full ${npv >= 0 ? 'bg-blue-600' : 'bg-gray-400'}`} style={{ width }} />
                  </span>
                  <span className={`w-20 text-right text-sm font-medium ${npv >= 0 ? 'text-gray-900' : 'text-gray-500'}`}>
                    {formatCurrency(npv)}
                  </span>
                </span>
                <span className="text-sm text-gray-700">{paybackText(results)}</span>
                {/* Quiet details */}
                <span className="hidden md:block text-right text-xs text-gray-500">
                  {formatCurrency(
                    scenario.costChargeable === 'chargeable'
                      ? results.cost.chargeableFullyLoaded.baseline - results.cost.chargeableFullyLoaded.mature
                      : results.cost.fullyLoaded.baseline - results.cost.fullyLoaded.mature
                  )}
                </span>
                <span className="hidden md:block text-right text-xs text-gray-500">
                  {results.effort.staffingFte.mature.toFixed(1)} FTE
                </span>
                <span className="hidden md:block text-right text-xs text-gray-500">
                  {formatCurrency(results.financialMetrics.totalInvestment)}
                </span>
              </button>
            );
          })}
      </div>
    </div>
  );
}
