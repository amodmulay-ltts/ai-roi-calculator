import type { Results } from '@ai-roi-calc/engine';

interface ExampleBannerProps {
  results: Results;
  formatCurrency: (value: number) => string;
  onStartNew: () => void;
  onHelp?: () => void;
}

export default function ExampleBanner({ results, formatCurrency, onStartNew, onHelp }: ExampleBannerProps) {
  const { effort, financialMetrics } = results;
  const effortCut = Math.round(effort.effortSavingPercent.mature * 100);

  return (
    <aside
      aria-label="Example calculation"
      className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-blue-200 bg-blue-50/60 rounded-xl px-6 py-4"
    >
      <div className="max-w-3xl">
        <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">Example calculation · fictional data</p>
        <p className="text-sm text-gray-700">
          A {Math.round(effort.staffingFte.baseline)}-person team adopts AI that cuts the effort on its AI-assisted work by {effortCut}%, for a
          one-off investment of {formatCurrency(financialMetrics.totalInvestment)}. Use it to see how the calculator works;
          do not use these figures for a customer decision.
        </p>
      </div>
      <div className="flex items-center gap-4 shrink-0">
        {onHelp && (
          <button onClick={onHelp} className="text-sm text-blue-700 hover:text-blue-900">
            How this is calculated
          </button>
        )}
        <button onClick={onStartNew} className="px-4 py-2 text-sm font-medium bg-white border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50">
          Start a customer scenario
        </button>
      </div>
    </aside>
  );
}
