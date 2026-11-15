import type { ReactElement } from 'react';
import { validateInputs } from '@ai-roi-calc/bizcase';
import { useExecStore } from '../store';

const DECISION_STEP = 7;

export default function Header(): ReactElement {
  const inputs = useExecStore(s => s.inputs);
  const setInputs = useExecStore(s => s.setInputs);
  const setStep = useExecStore(s => s.setStep);
  const reset = useExecStore(s => s.reset);
  const canPrint = validateInputs(inputs).length === 0;

  const handleReset = (): void => {
    if (window.confirm('Reset all inputs to the defaults?')) reset();
  };

  // Only the decision screen prints, so go there first and let it render before opening the print dialog
  const handlePrint = (): void => {
    setStep(DECISION_STEP);
    window.setTimeout(() => window.print(), 100);
  };

  return (
    <header className="no-print mb-6 flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="text-2xl font-semibold text-gray-900">AI Business Case</h1>
        <input
          type="text"
          placeholder="Customer name"
          aria-label="Customer name"
          value={inputs.customerName}
          onChange={e => setInputs({ customerName: e.target.value })}
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleReset}
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
        >
          Reset to defaults
        </button>
        <button
          type="button"
          onClick={handlePrint}
          disabled={!canPrint}
          title={canPrint ? undefined : 'Fix the inputs on the earlier steps to print.'}
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40"
        >
          Print summary
        </button>
      </div>
    </header>
  );
}
