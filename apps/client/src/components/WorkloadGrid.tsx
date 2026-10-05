import { useState } from 'react';
import type { KpiInput, Results, Scenario } from '@ai-roi-calc/engine';
import Tooltip from './Tooltip';

interface WorkloadGridProps {
  scenario: Scenario;
  results: Results;
  onUpdate: (updates: Partial<Scenario>) => void;
  formatCurrency: (value: number) => string;
}

const fmt = (v: number, digits = 0) => v.toLocaleString('en', { maximumFractionDigits: digits });
const isWorkload = (k: KpiInput) => k.volumePerMonth !== undefined;

export default function WorkloadGrid({ scenario, results, onUpdate, formatCurrency }: WorkloadGridProps) {
  const [draft, setDraft] = useState<KpiInput[] | null>(null);
  const { effort } = results;
  const workload = scenario.kpis.filter(isWorkload);
  const info = scenario.kpis.filter(k => !isWorkload(k));
  const change = effort.totalEffort.baseline > 0 ? effort.totalEffort.mature / effort.totalEffort.baseline - 1 : 0;

  if (draft) {
    const update = (id: string, changes: Partial<KpiInput>) =>
      setDraft(draft.map(k => (k.id === id ? { ...k, ...changes } : k)));
    const setOverride = (k: KpiInput, state: 'transition' | 'mature', text: string) => {
      const overrides = { ...k.overrides };
      if (text.trim() === '') delete overrides[state];
      else overrides[state] = Number(text) || 0;
      update(k.id, { overrides });
    };
    const addItem = () =>
      setDraft([
        ...draft,
        {
          id: `item-${Date.now()}`,
          name: 'New work item',
          unit: 'hrs per unit',
          baseline: 1,
          appliesToFactor: true,
          isVelocity: false,
          overrides: {},
          volumePerMonth: 0,
          volumeUnit: 'units',
          reviewOverheadApplies: true,
        },
      ]);
    const draftWorkload = draft.filter(isWorkload);
    const draftInfo = draft.filter(k => !isWorkload(k));
    const changed = JSON.stringify(draft) !== JSON.stringify(scenario.kpis);
    const cell = 'px-2 py-1 border border-gray-300 rounded text-right text-xs';

    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center">
          <h4 className="text-sm font-semibold text-gray-900">Edit workload</h4>
          <Tooltip text="Monthly hours = volume × hours each. With AI, hours each follow the productivity factor, unless you enter an override for transition or mature. Review overhead (HITL, rework, dual run) is added on top of items where it applies." />
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-500 text-left border-b border-gray-200">
              <th className="px-4 py-2 font-normal">Work item</th>
              <th className="px-2 py-2 font-normal text-right">Volume / month</th>
              <th className="px-2 py-2 font-normal">Unit</th>
              <th className="px-2 py-2 font-normal text-right">Hours each today</th>
              <th className="px-2 py-2 font-normal text-right">Transition override</th>
              <th className="px-2 py-2 font-normal text-right">Mature override</th>
              <th className="px-2 py-2 font-normal text-center">AI-assisted</th>
              <th className="px-2 py-2 font-normal text-center">Review overhead</th>
              <th className="px-2 py-2 font-normal text-right">
                <span className="inline-flex items-center">
                  Extra volume absorbed
                  <Tooltip text="Additional demand per month that the AI-assisted team can take on without hiring (cost avoidance). Valued at the hours saved per unit × today's average hourly rate. Shown separately; counted in ROI only if you switch it on." />
                </span>
              </th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {draftWorkload.map(k => (
              <tr key={k.id} className="border-b border-gray-100">
                <td className="px-4 py-2">
                  <input aria-label="Work item name" value={k.name} onChange={e => update(k.id, { name: e.target.value })} className="w-48 px-2 py-1 border border-gray-300 rounded text-xs" />
                </td>
                <td className="px-2 py-2 text-right">
                  <input aria-label={`${k.name} volume per month`} type="number" min={0} value={k.volumePerMonth} onChange={e => update(k.id, { volumePerMonth: Number(e.target.value) || 0 })} className={`w-24 ${cell}`} />
                </td>
                <td className="px-2 py-2">
                  <input aria-label={`${k.name} unit`} value={k.volumeUnit ?? ''} onChange={e => update(k.id, { volumeUnit: e.target.value })} className="w-24 px-2 py-1 border border-gray-300 rounded text-xs" />
                </td>
                <td className="px-2 py-2 text-right">
                  <input aria-label={`${k.name} hours each today`} type="number" min={0} step="any" value={k.baseline} onChange={e => update(k.id, { baseline: Number(e.target.value) || 0 })} className={`w-20 ${cell}`} />
                </td>
                {(['transition', 'mature'] as const).map(state => (
                  <td key={state} className="px-2 py-2 text-right">
                    <input
                      aria-label={`${k.name} ${state} hours each override`}
                      type="number"
                      min={0}
                      step="any"
                      placeholder={k.appliesToFactor ? 'AI factor' : 'unchanged'}
                      value={k.overrides[state] ?? ''}
                      onChange={e => setOverride(k, state, e.target.value)}
                      className={`w-20 ${cell} ${k.overrides[state] !== undefined ? 'bg-blue-50 border-blue-300' : ''}`}
                    />
                  </td>
                ))}
                <td className="px-2 py-2 text-center">
                  <input type="checkbox" aria-label={`${k.name} is AI-assisted`} checked={k.appliesToFactor} onChange={e => update(k.id, { appliesToFactor: e.target.checked })} />
                </td>
                <td className="px-2 py-2 text-center">
                  <input type="checkbox" aria-label={`${k.name} carries review overhead`} checked={!!k.reviewOverheadApplies} onChange={e => update(k.id, { reviewOverheadApplies: e.target.checked })} />
                </td>
                <td className="px-2 py-2 text-right">
                  <input
                    aria-label={`${k.name} extra volume absorbed per month`}
                    type="number"
                    min={0}
                    placeholder="0"
                    value={k.extraVolumePerMonth ?? ''}
                    onChange={e => update(k.id, { extraVolumePerMonth: e.target.value === '' ? undefined : Number(e.target.value) || 0 })}
                    className={`w-20 ${cell}`}
                  />
                </td>
                <td className="px-2 py-2">
                  <button
                    onClick={() => setDraft(draft.filter(x => x.id !== k.id))}
                    disabled={draftWorkload.length === 1}
                    className="text-xs text-gray-500 hover:text-gray-900 disabled:opacity-30"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-3">
          <button onClick={addItem} className="text-sm text-blue-700 hover:text-blue-900">
            Add work item
          </button>
        </div>

        {draftInfo.length > 0 && (
          <details className="px-4 pb-4 text-xs text-gray-500">
            <summary className="cursor-pointer">Information-only KPIs ({draftInfo.length}), not used in the calculation</summary>
            <ul className="mt-2 space-y-1">
              {draftInfo.map(k => (
                <li key={k.id}>
                  {k.name}: {fmt(k.baseline, 2)} {k.unit}
                </li>
              ))}
            </ul>
          </details>
        )}

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex gap-3 justify-end">
          <button onClick={() => setDraft(null)} className="px-4 py-2 border border-gray-300 hover:bg-gray-100 text-gray-700 text-sm rounded-lg">
            Cancel
          </button>
          <button
            onClick={() => {
              onUpdate({ kpis: draft });
              setDraft(null);
            }}
            disabled={!changed}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white text-sm font-medium rounded-lg"
          >
            Save changes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-8">
      <div className="flex items-start justify-between gap-4 mb-1">
        <div className="flex items-center">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Workload</p>
          <Tooltip text="The work the team does each month. AI changes the hours per item; the team size follows the total hours." />
        </div>
        <button onClick={() => setDraft(structuredClone(scenario.kpis))} className="text-sm text-blue-700 hover:text-blue-900">
          Edit workload
        </button>
      </div>

      {/* Hero */}
      <p className="text-4xl font-bold text-gray-900 mb-1">
        {fmt(effort.totalEffort.baseline)} <span className="text-gray-400">→</span>{' '}
        <span className="text-blue-700">{fmt(effort.totalEffort.mature)}</span>
        <span className="text-xl font-semibold text-gray-500"> h / month</span>
      </p>
      <p className="text-sm text-gray-600 mb-6">
        {change <= 0 ? `${fmt(-change * 100)}% less work` : `${fmt(change * 100)}% more work`} once mature, including{' '}
        {fmt(effort.aiOverheadHours.mature)} h of review overhead
      </p>

      {/* Supporting: per item */}
      <table className="w-full max-w-3xl text-sm">
        <thead>
          <tr className="text-xs text-gray-400 text-left">
            <th className="font-normal pb-1">Work item</th>
            <th className="font-normal pb-1 text-right">Volume</th>
            <th className="font-normal pb-1 text-right">Today</th>
            <th className="font-normal pb-1 text-right">Mature</th>
          </tr>
        </thead>
        <tbody>
          {workload.map(k => {
            const h = effort.workloadHours[k.id];
            return (
              <tr key={k.id} className="border-t border-gray-100">
                <td className="py-1.5 text-gray-900">
                  {k.name}
                  {(k.overrides.transition !== undefined || k.overrides.mature !== undefined) && (
                    <span className="ml-2 text-xs text-blue-700">override</span>
                  )}
                </td>
                <td className="py-1.5 text-right text-gray-500 text-xs">
                  {fmt(k.volumePerMonth ?? 0)} {k.volumeUnit}
                </td>
                <td className="py-1.5 text-right text-gray-700">{fmt(h?.baseline ?? 0)} h</td>
                <td className="py-1.5 text-right text-gray-700">{fmt(h?.mature ?? 0)} h</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Quiet */}
      {results.cost.costAvoidance.mature > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-gray-600">
          <span>
            Cost avoidance: {formatCurrency(results.cost.costAvoidance.mature)} a month from absorbing extra demand without hiring
          </span>
          <label className="flex items-center gap-2 text-xs text-gray-500">
            <input
              type="checkbox"
              checked={scenario.costAvoidanceIncludedInRoi}
              onChange={e => onUpdate({ costAvoidanceIncludedInRoi: e.target.checked })}
            />
            Count it in ROI
          </label>
        </div>
      )}
      {info.length > 0 && (
        <p className="mt-4 text-xs text-gray-400">{info.length} information-only KPIs are kept with the scenario but not used in the calculation.</p>
      )}
    </div>
  );
}
