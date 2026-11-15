import type { ReactElement } from 'react';
import {
  calculateCase,
  validateInputs,
  type Difficulty,
  type TaskMix,
} from '@ai-roi-calc/bizcase';
import Field, { PercentInput } from '../components/Field';
import { effectivePosture, useExecStore } from '../store';

const TYPE_OPTIONS: Array<[Difficulty, string]> = [
  ['routine', 'Routine'],
  ['complex', 'Complex'],
];

export default function Opportunity(): ReactElement {
  const inputs = useExecStore(s => s.inputs);
  const selectedPosture = useExecStore(s => s.selectedPosture);
  const setInputs = useExecStore(s => s.setInputs);
  const setTask = useExecStore(s => s.setTask);

  const totalShare = inputs.tasks.reduce((sum, t) => sum + t.share, 0);
  const totalPct = Math.round(totalShare * 100);
  const totalOff = Math.abs(totalShare - 1) > 0.0001;

  const ok = validateInputs(inputs).length === 0;
  const posture = effectivePosture(inputs, selectedPosture);
  const result = ok && posture ? calculateCase(inputs, posture, 'expected') : null;

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 space-y-6">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
            <th className="py-2 font-normal">Work</th>
            <th className="py-2 font-normal text-right">Share of work (%)</th>
            <th className="py-2 font-normal text-right">Type</th>
          </tr>
        </thead>
        <tbody>
          {inputs.tasks.map((task: TaskMix) => (
            <tr key={task.id} className="border-b border-gray-100">
              <td className="py-3 text-gray-900">{task.name}</td>
              <td className="py-3 text-right">
                <PercentInput
                  value={task.share}
                  ariaLabel={`${task.name} share of work (%)`}
                  onChange={share => setTask(task.id, { share })}
                />
              </td>
              <td className="py-3 text-right">
                <span className="inline-flex rounded-lg border border-gray-200 p-0.5">
                  {TYPE_OPTIONS.map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={task.difficulty === value}
                      onClick={() => setTask(task.id, { difficulty: value })}
                      className={`rounded-md px-2.5 py-1 transition ${
                        task.difficulty === value ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className={`text-sm ${totalOff ? 'text-red-600' : 'text-gray-600'}`}>Total {totalPct}%</p>
      <p className="text-xs text-gray-400">Assumption to validate</p>
      <p className="text-xs text-gray-500">Routine: Repetitive, well-defined work. AI usually does well.</p>
      <p className="text-xs text-gray-500">Complex: Judgement-heavy work. AI needs stronger models and more review.</p>

      <Field label="Share of work where AI is used (%)" assumption>
        <PercentInput value={inputs.adoption} onChange={adoption => setInputs({ adoption })} />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-xs text-gray-500">Hours freed per month</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">
            {result ? Math.round(result.netHoursSavedPerMonth).toLocaleString('en-US') : '—'}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-xs text-gray-500">People equivalent</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{result ? result.capacityFte.toFixed(1) : '—'}</p>
        </div>
      </div>
    </section>
  );
}
