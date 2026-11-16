import { useMemo } from 'react';
import type { ReactElement } from 'react';
import { validateInputs } from '@ai-roi-calc/bizcase';
import Header from './components/Header';
import IssueList from './components/IssueList';
import StepBar, { STEP_NAMES } from './components/StepBar';
import Decision from './screens/Decision';
import Investment from './screens/Investment';
import Opportunity from './screens/Opportunity';
import Result from './screens/Result';
import RightSize from './screens/RightSize';
import Risks from './screens/Risks';
import Situation from './screens/Situation';
import { useExecStore, workInScopeName } from './store';

const LAST_STEP = STEP_NAMES.length;

/** Forms read best in a narrower column; the option cards and the dashboard use the full page width. */
const STEP_WIDTH: Record<number, string> = {
  1: 'max-w-4xl mx-auto',
  2: 'max-w-4xl mx-auto',
  3: '',
  4: 'max-w-4xl mx-auto',
  5: 'max-w-5xl mx-auto',
  6: 'max-w-4xl mx-auto',
  7: '',
};

const PRIMARY = 'px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm text-sm transition disabled:opacity-40';
const SECONDARY = 'px-4 py-2 border border-gray-300 text-gray-800 font-medium rounded-lg hover:bg-gray-50 text-sm transition disabled:opacity-40';

export default function App(): ReactElement {
  const step = useExecStore(s => s.step);
  const setStep = useExecStore(s => s.setStep);
  const inputs = useExecStore(s => s.inputs);
  const setInputs = useExecStore(s => s.setInputs);
  const issues = useMemo(() => validateInputs(inputs), [inputs]);

  const screen =
    step === 1 ? <Situation /> : step === 2 ? <Opportunity /> : step === 3 ? <RightSize /> : step === 4 ? <Investment /> : step === 5 ? <Result /> : step === 6 ? <Risks /> : step === 7 ? <Decision /> : null;
  const width = STEP_WIDTH[step] ?? '';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="no-print sticky top-0 z-40">
        <Header />
        <StepBar step={step} onSelect={setStep} />
      </div>

      <main className="max-w-7xl mx-auto px-6 py-10">
        {/* Case identity, as VALUEAI shows the scenario */}
        <div className="no-print mb-8">
          <input
            type="text"
            aria-label="Customer name"
            placeholder="Customer name"
            value={inputs.customerName}
            onChange={e => setInputs({ customerName: e.target.value })}
            className="w-full bg-transparent text-3xl font-bold text-gray-900 placeholder-gray-300 border-0 border-b border-transparent hover:border-gray-300 focus:border-blue-600 focus:outline-none pb-1"
          />
          <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2 text-sm text-gray-500">
            <span>
              Work in scope: <span className="text-gray-700">{workInScopeName(inputs)}</span>
            </span>
            <span>
              People: <span className="text-gray-700">{inputs.teamSize}</span>
            </span>
            <span>
              Currency: <span className="text-gray-700">EUR</span>
            </span>
          </div>
        </div>

        <aside
          aria-label="Placeholder assumptions"
          className="no-print mb-8 border border-blue-200 bg-blue-50/60 rounded-xl px-6 py-4"
        >
          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">Placeholder assumptions · not verified</p>
          <p className="text-sm text-gray-700">
            Every starting figure is a placeholder, not a benchmark or a vendor price. Replace them with the customer&apos;s figures before
            using a result in a decision.
          </p>
        </aside>

        <div className={width}>
          <div className="no-print">
            <IssueList issues={issues} />
          </div>

          <h3 className="no-print text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">{STEP_NAMES[step - 1]?.slice(2)}</h3>

          {step >= 3 && issues.length > 0 ? (
            <p className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-700">
              Fix the inputs on the earlier steps to see results.
            </p>
          ) : (
            screen
          )}

          <footer className="no-print mt-6 flex justify-between">
            <button type="button" onClick={() => setStep(step - 1)} disabled={step === 1} className={SECONDARY}>
              Back
            </button>
            <button type="button" onClick={() => setStep(step + 1)} disabled={step === LAST_STEP} className={PRIMARY}>
              Next
            </button>
          </footer>
        </div>

        <footer className="no-print mt-12 border-t border-gray-200 pt-8 text-center text-sm text-gray-500">
          <p>VALUEAI — AI Business Case</p>
          <p className="mt-1">A presenter-led business case for management</p>
        </footer>
      </main>
    </div>
  );
}
