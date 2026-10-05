import { useMemo } from 'react';
import type { Scenario } from '@ai-roi-calc/engine';
import { calculate } from '@ai-roi-calc/engine';
import PercentInput from './PercentInput';
import Tooltip from './Tooltip';

interface AiEffectPanelProps {
  scenario: Scenario;
  onUpdate: (updates: Partial<Scenario>) => void;
}

type Stage = 'transition' | 'mature';
type OverheadPart = 'hitl' | 'rework' | 'dualRun';

const PARTS: Array<[OverheadPart, string, string]> = [
  ['hitl', 'Human review', 'People checking AI output before it is used (human in the loop).'],
  ['rework', 'Rework', 'Correcting AI output that was wrong or incomplete.'],
  ['dualRun', 'Dual running', 'Doing work the old way in parallel while AI is introduced; usually zero once mature.'],
];

const num = (v: number) => Math.round(v).toLocaleString('en');

export default function AiEffectPanel({ scenario, onUpdate }: AiEffectPanelProps) {
  const r = useMemo(() => calculate(scenario), [scenario]);
  const pf = scenario.productivityFactor;

  if (pf.mode !== 'direct-factor') {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8">
        <p className="text-sm text-gray-700 mb-4">
          This scenario uses an evaluation-derived productivity factor, which cannot be edited here yet.
        </p>
        <button
          onClick={() => onUpdate({ productivityFactor: { mode: 'direct-factor', transition: 0.85, mature: 0.7 } })}
          className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Use a direct effort cut instead
        </button>
      </div>
    );
  }

  const cut = (stage: Stage) => 1 - pf[stage];
  const setCut = (stage: Stage, value: number) =>
    onUpdate({ productivityFactor: { ...pf, [stage]: 1 - Math.min(0.95, value) } });
  const overhead = (stage: Stage) => {
    const o = scenario.aiOverheadPercent[stage];
    return o.hitl + o.rework + o.dualRun;
  };
  const setPart = (stage: Stage, part: OverheadPart, value: number) =>
    onUpdate({
      aiOverheadPercent: { ...scenario.aiOverheadPercent, [stage]: { ...scenario.aiOverheadPercent[stage], [part]: value } },
    });

  const assisted = scenario.kpis.filter(k => k.volumePerMonth !== undefined && k.appliesToFactor);
  const overridden = assisted.filter(k => k.overrides.transition !== undefined || k.overrides.mature !== undefined);
  const notAssisted = scenario.kpis.filter(k => k.volumePerMonth !== undefined && !k.appliesToFactor);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-8">
      <div className="flex items-center mb-1">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">AI effect</p>
        <Tooltip text="The central assumption of the business case. The effort cut lowers the hours each AI-assisted work item takes; review overhead adds back the time people spend checking and correcting AI output. Validate both with a pilot." />
      </div>

      {/* Hero: mature effort cut */}
      <label htmlFor="cut-mature" className="block text-sm text-gray-600 mb-2">
        AI cuts the effort on AI-assisted work, once mature, by
      </label>
      <div className="mb-2">
        <PercentInput id="cut-mature" size="lg" step={1} max={95} value={cut('mature')} onChange={v => setCut('mature', v)} />
      </div>
      <p className="text-sm text-gray-600 mb-8 max-w-2xl">
        Work falls from {num(r.effort.totalEffort.baseline)} h to {num(r.effort.totalEffort.mature)} h a month once mature,
        including {num(r.effort.aiOverheadHours.mature)} h of review overhead.
      </p>

      {/* Supporting: transition cut and review overhead */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div>
          <label htmlFor="cut-transition" className="flex items-center text-sm text-gray-600 mb-2">
            Effort cut during the transition
            <Tooltip text="Usually lower than the mature cut, while people learn the tools and processes change." />
          </label>
          <PercentInput id="cut-transition" size="md" step={1} max={95} value={cut('transition')} onChange={v => setCut('transition', v)} />
        </div>
        <div>
          <p className="flex items-center text-sm text-gray-600 mb-2">
            Review overhead on AI-assisted hours
            <Tooltip text="Added on top of the hours of work items marked 'review overhead applies'. Higher for safety-critical work." />
          </p>
          <p className="text-3xl font-semibold text-gray-900">
            {Math.round(overhead('mature') * 1000) / 10}% <span className="text-sm font-normal text-gray-500">once mature</span>
          </p>
          <p className="text-lg text-gray-700">
            {Math.round(overhead('transition') * 1000) / 10}% <span className="text-sm text-gray-500">during the transition</span>
          </p>
        </div>
      </div>

      {/* Quiet: overhead breakdown and coverage notes */}
      <table className="text-sm mb-6">
        <thead>
          <tr className="text-xs text-gray-400 text-left">
            <th className="font-normal pb-1 pr-8">Review overhead</th>
            <th className="font-normal pb-1 pr-6 text-right">Transition</th>
            <th className="font-normal pb-1 text-right">Mature</th>
          </tr>
        </thead>
        <tbody>
          {PARTS.map(([part, label, help]) => (
            <tr key={part} className="border-t border-gray-100">
              <td className="py-1.5 pr-8 text-gray-700">
                <span className="inline-flex items-center">
                  {label}
                  <Tooltip text={help} />
                </span>
              </td>
              {(['transition', 'mature'] as const).map(stage => (
                <td key={stage} className="py-1.5 pr-6 text-right">
                  <PercentInput
                    id={`${part}-${stage}`}
                    size="sm"
                    step={1}
                    max={100}
                    value={scenario.aiOverheadPercent[stage][part]}
                    onChange={v => setPart(stage, part, v)}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="text-xs text-gray-500 space-y-1 max-w-3xl">
        <p>
          Applies to {assisted.length - overridden.length} of {assisted.length + notAssisted.length} work items
          {notAssisted.length > 0 ? `; not to ${notAssisted.map(k => k.name).join(', ')}, which AI does not change` : ''}.
        </p>
        {overridden.length > 0 && (
          <p>
            {overridden.map(k => k.name).join(', ')} {overridden.length > 1 ? 'use' : 'uses'} fixed hours with AI (set in Workload), so
            this cut does not change {overridden.length > 1 ? 'them' : 'it'}.
          </p>
        )}
        <p>The delivery model's AI adoption scales this effect: 0% means no AI, 100% the cut as entered here.</p>
      </div>
    </div>
  );
}
