import type { ReactElement } from 'react';
import { validateInputs } from '@ai-roi-calc/bizcase';
import { useExecStore } from '../store';

const DECISION_STEP = 7;

const PRIMARY = 'px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm text-sm transition disabled:opacity-40';
const SECONDARY = 'px-4 py-2 border border-gray-300 text-gray-800 font-medium rounded-lg hover:bg-gray-50 text-sm transition';

/** The same header as VALUEAI: logo, product name, and the actions on the right. */
export default function Header(): ReactElement {
  const inputs = useExecStore(s => s.inputs);
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
    <header className="no-print bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img src="/ltts-logo.png" alt="L&T Technology Services" className="h-12 w-auto" />
          <span className="h-8 w-px bg-gray-200" aria-hidden="true" />
          <div className="flex flex-col">
            <h1 className="text-lg font-semibold text-gray-900 tracking-tight">VALUEAI</h1>
            <p className="text-xs text-gray-500">AI Business Case</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button type="button" onClick={handleReset} className={SECONDARY}>
            Reset to defaults
          </button>
          <button
            type="button"
            onClick={handlePrint}
            disabled={!canPrint}
            title={canPrint ? undefined : 'Fix the inputs on the earlier steps to print.'}
            className={PRIMARY}
          >
            Print summary
          </button>
        </div>
      </div>
    </header>
  );
}
