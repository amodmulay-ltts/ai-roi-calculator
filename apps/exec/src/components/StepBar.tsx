import type { ReactElement } from 'react';
import { calculateCase, formatMoney, formatRoi, validateInputs } from '@ai-roi-calc/bizcase';
import { effectivePosture, useExecStore } from '../store';

export const STEP_NAMES = [
  '1 Situation',
  '2 Opportunity',
  '3 Right-size',
  '4 Investment',
  '5 Result',
  '6 Risks',
  '7 Decision',
];

interface StepBarProps {
  step: number;
  onSelect: (n: number) => void;
}

/** The sticky bar under the header: the seven steps, and a quiet running result at the right. */
export default function StepBar({ step, onSelect }: StepBarProps): ReactElement {
  const inputs = useExecStore(s => s.inputs);
  const selectedPosture = useExecStore(s => s.selectedPosture);

  const posture = effectivePosture(inputs, selectedPosture);
  const result = validateInputs(inputs).length === 0 && posture ? calculateCase(inputs, posture, 'expected') : null;

  return (
    <nav aria-label="Steps" className="bg-gray-50/95 backdrop-blur border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-6 flex items-center gap-6 text-sm">
        <div className="flex gap-6 overflow-x-auto">
          {STEP_NAMES.map((name, i) => {
            const n = i + 1;
            const active = n === step;
            return (
              <button
                key={name}
                type="button"
                onClick={() => onSelect(n)}
                aria-current={active ? 'step' : undefined}
                className={`py-2.5 whitespace-nowrap border-b-2 transition ${
                  active ? 'border-blue-600 text-gray-900 font-medium' : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                {name}
              </button>
            );
          })}
        </div>

        {/* Quiet running total, so an edit anywhere shows its effect without leaving the step */}
        {result && (
          <p aria-label="Running result" className="ml-auto shrink-0 py-2 flex items-baseline gap-3 text-xs text-gray-500">
            <span className="font-semibold text-blue-700 text-sm">{formatMoney(result.netValue36)}</span>
            <span className="hidden sm:inline">
              {result.paybackMonth === null ? 'no payback' : `month ${result.paybackMonth}`}
            </span>
            <span className="hidden md:inline">ROI {formatRoi(result.roiPercent)}</span>
          </p>
        )}
      </div>
    </nav>
  );
}
