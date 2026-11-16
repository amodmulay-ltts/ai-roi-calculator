import type { ReactElement } from 'react';
import { calculateCase, phaseAiUse, validateInputs, type Difficulty, type TaskMix } from '@ai-roi-calc/bizcase';
import InfoTip from '../components/InfoTip';
import { explainCapacity, explainEfficiencyChart, explainNetEfficiency, explainNetHours, explainPhaseAiUse, explainPhaseChart, explainReach } from '../explain';
import { EfficiencyBridgeChart, PhaseEfficiencyChart } from '../components/Charts';
import { PercentInput } from '../components/Field';
import { POSTURE_LABEL } from '../components/PostureCard';
import { effectivePosture, useExecStore } from '../store';

const TYPE_OPTIONS: Array<[Difficulty, string]> = [
  ['routine', 'Routine'],
  ['complex', 'Complex'],
];

const TEXT_INPUT =
  'rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600';
const SMALL_BUTTON = 'rounded-lg border border-gray-300 bg-white px-3 py-1 text-xs text-gray-700 hover:bg-gray-50';

export default function Opportunity(): ReactElement {
  const inputs = useExecStore(s => s.inputs);
  const selectedPosture = useExecStore(s => s.selectedPosture);
  const setTask = useExecStore(s => s.setTask);
  const setPhase = useExecStore(s => s.setPhase);
  const addPhase = useExecStore(s => s.addPhase);
  const removePhase = useExecStore(s => s.removePhase);
  const addTask = useExecStore(s => s.addTask);
  const removeTask = useExecStore(s => s.removeTask);

  const phaseTotal = inputs.phases.reduce((sum, p) => sum + p.effortShare, 0);
  const phaseTotalPct = Math.round(phaseTotal * 100);
  const phaseTotalOff = Math.abs(phaseTotal - 1) > 0.0001;

  const ok = validateInputs(inputs).length === 0;
  const posture = effectivePosture(inputs, selectedPosture);
  const result = ok && posture ? calculateCase(inputs, posture, 'expected') : null;

  const handleRemovePhase = (index: number): void => {
    const phase = inputs.phases[index];
    if (!phase) return;
    const hasWork = inputs.tasks.some(t => t.phase === phase.name);
    if (hasWork && !window.confirm('Remove this phase and the work in it?')) return;
    removePhase(index);
  };

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 space-y-6">
      <p className="text-xs text-gray-500">
        AI use is set for each piece of work on its own: the percentages do not need to add up to 100%. A phase shows the average of its work. Each phase has a share of all the effort, and these add up to 100%. The work inside a phase also adds up to 100%, one phase at a time.
      </p>

      <div className="space-y-4">
        {inputs.phases.map((phase, index) => {
          const phaseTasks = inputs.tasks.filter(t => t.phase === phase.name);
          const workTotal = phaseTasks.reduce((sum, t) => sum + t.share, 0);
          const workOff = Math.abs(workTotal - 1) > 0.0001;
          return (
            <div key={index} className="rounded-xl border border-gray-200 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <input
                  type="text"
                  value={phase.name}
                  aria-label={`Phase ${index + 1} name`}
                  onChange={e => setPhase(index, { name: e.target.value })}
                  className={`${TEXT_INPUT} font-medium`}
                />
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">Share of all effort</span>
                  <PercentInput
                    value={phase.effortShare}
                    ariaLabel={`${phase.name} share of all effort (%)`}
                    onChange={effortShare => setPhase(index, { effortShare })}
                  />
                  <span className="text-xs text-gray-500">
                    Average AI use
                    <InfoTip explanation={explainPhaseAiUse(inputs, phase.name)} />
                  </span>
                  <span
                    aria-label={`${phase.name} average AI use`}
                    className="min-w-[3.5rem] rounded-lg bg-gray-100 px-3 py-1.5 text-right text-sm font-medium text-gray-900 tabular-nums"
                  >
                    {Math.round(phaseAiUse(inputs, phase.name) * 100)}%
                  </span>
                  {inputs.phases.length > 1 && (
                    <button type="button" onClick={() => handleRemovePhase(index)} className={SMALL_BUTTON}>
                      Remove phase
                    </button>
                  )}
                </div>
              </div>

              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                    <th className="w-1/2 py-1 font-normal">Work</th>
                    <th className="py-1 text-right font-normal">Share of phase (%)</th>
                    <th className="py-1 text-right font-normal">AI use (%)</th>
                    <th className="py-1 text-right font-normal">Type</th>
                    <th className="py-1" />
                  </tr>
                </thead>
                <tbody>
                  {phaseTasks.map((task: TaskMix) => (
                    <tr key={task.id} className="border-b border-gray-100">
                      <td className="py-2 pr-2">
                        <input
                          type="text"
                          value={task.name}
                          aria-label={`Name of ${task.id}`}
                          onChange={e => setTask(task.id, { name: e.target.value })}
                          className={`${TEXT_INPUT} w-full`}
                        />
                      </td>
                      <td className="py-2 text-right">
                        <PercentInput
                          value={task.share}
                          ariaLabel={`${task.name} share of phase (%)`}
                          onChange={share => setTask(task.id, { share })}
                        />
                      </td>
                      <td className="py-2 text-right">
                        <PercentInput
                          value={task.aiUse}
                          ariaLabel={`${task.name} AI use (%)`}
                          onChange={aiUse => setTask(task.id, { aiUse })}
                        />
                      </td>
                      <td className="py-2 text-right">
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
                      <td className="py-2 pl-2 text-right">
                        <button
                          type="button"
                          aria-label={`Remove ${task.name}`}
                          onClick={() => removeTask(task.id)}
                          className={SMALL_BUTTON}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex items-center justify-between">
                <button type="button" onClick={() => addTask(phase.name)} className={SMALL_BUTTON}>
                  Add work
                </button>
                <p className={`text-sm ${workOff ? 'text-red-600' : 'text-gray-600'}`}>Phase work total {Math.round(workTotal * 100)}%</p>
              </div>
            </div>
          );
        })}
      </div>

      <button type="button" onClick={addPhase} className={SMALL_BUTTON}>
        Add phase
      </button>

      <div className="space-y-1">
        <p className={`text-sm ${phaseTotalOff ? 'text-red-600' : 'text-gray-600'}`}>Phase effort total {phaseTotalPct}%</p>
        <p className="text-xs text-gray-400">Assumption to validate</p>
        <p className="text-xs text-gray-500">Routine: Repetitive, well-defined work. AI usually does well.</p>
        <p className="text-xs text-gray-500">Complex: Judgement-heavy work. AI needs stronger models and more review.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-xs text-gray-500">
            Hours freed per month
            {result && <InfoTip explanation={explainNetHours(inputs, result)} />}
          </p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">
            {result ? Math.round(result.netHoursSavedPerMonth).toLocaleString('en-US') : '—'}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-xs text-gray-500">
            People equivalent
            {result && <InfoTip explanation={explainCapacity(inputs, result)} />}
          </p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{result ? result.capacityFte.toFixed(1) : '—'}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-xs text-gray-500">
            Net efficiency gain
            {result && <InfoTip explanation={explainNetEfficiency(result)} />}
          </p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">
            {result ? `${(result.netEfficiency * 100).toFixed(1)}%` : '—'}
          </p>
        </div>
      </div>

      {result && posture && (
        <p className="text-xs text-gray-500">
          Shown for the {POSTURE_LABEL[posture]} option. AI is used on {Math.round(result.aiReach * 100)}% of all the work.
          <InfoTip explanation={explainReach(result)} />
        </p>
      )}

      {result && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <h2 className="text-sm font-medium text-gray-900">
              How the efficiency is built
              <InfoTip explanation={explainEfficiencyChart(result)} />
            </h2>
            <div role="img" aria-label="Bar chart: effort AI removes, minus review and rework, gives net efficiency">
              <EfficiencyBridgeChart result={result} width={380} height={190} />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-sm font-medium text-gray-900">
              Where the effort is saved
              <InfoTip explanation={explainPhaseChart()} />
            </h2>
            <div role="img" aria-label="Bar chart of each phase's AI use and net efficiency">
              <PhaseEfficiencyChart phases={result.phases} showUse width={380} />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
