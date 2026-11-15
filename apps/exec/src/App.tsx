import { useMemo } from 'react';
import { validateInputs } from '@ai-roi-calc/bizcase';
import Header from './components/Header';
import IssueList from './components/IssueList';
import StepBar, { STEP_NAMES } from './components/StepBar';
import Opportunity from './screens/Opportunity';
import RightSize from './screens/RightSize';
import Situation from './screens/Situation';
import { useExecStore } from './store';

const LAST_STEP = STEP_NAMES.length;

export default function App() {
  const step = useExecStore(s => s.step);
  const setStep = useExecStore(s => s.setStep);
  const inputs = useExecStore(s => s.inputs);
  const issues = useMemo(() => validateInputs(inputs), [inputs]);

  const screen =
    step === 1 ? <Situation /> : step === 2 ? <Opportunity /> : step === 3 ? <RightSize /> : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <Header />
        <div className="mb-6">
          <StepBar step={step} onSelect={setStep} />
        </div>

        <IssueList issues={issues} />

        {step >= 3 && issues.length > 0 ? (
          <p className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-700">
            Fix the inputs on the earlier steps to see results.
          </p>
        ) : (
          screen
        )}

        <footer className="mt-6 flex justify-between">
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            disabled={step === 1}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40"
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => setStep(step + 1)}
            disabled={step === LAST_STEP}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
          >
            Next
          </button>
        </footer>
      </div>
    </div>
  );
}
