import { useState } from 'react';
import type { Results, Scenario, SeatAssignment, SeatPricing } from '@ai-roi-calc/engine';
import Tooltip from './Tooltip';
import { inactiveNote } from '../utils/sourcingNote';

interface SeatsPanelProps {
  scenario: Scenario;
  results: Results;
  formatCurrency: (value: number) => string;
  onUpdate: (updates: Partial<Scenario>) => void;
}

const seats = (v: number) => (Math.round(v * 10) / 10).toLocaleString('en');

export default function SeatsPanel({ scenario, results, formatCurrency, onUpdate }: SeatsPanelProps) {
  const [draft, setDraft] = useState<{ assignments: SeatAssignment[]; pricing: SeatPricing } | null>(null);
  const { cost } = results;
  const pricing = scenario.seatPricing;
  const priceOf = (id: string) => pricing.prices.find(p => p.id === id);

  if (draft) {
    const { assignments, pricing: dp } = draft;
    const setAssignment = (id: string, changes: Partial<SeatAssignment>) =>
      setDraft({ ...draft, assignments: assignments.map(a => (a.id === id ? { ...a, ...changes } : a)) });
    const toggleRole = (a: SeatAssignment, roleId: string) =>
      setAssignment(a.id, {
        roleIds: a.roleIds.includes(roleId) ? a.roleIds.filter(r => r !== roleId) : [...a.roleIds, roleId],
      });
    const inUse = new Set(assignments.map(a => a.seatPriceId));
    const changed = JSON.stringify(draft) !== JSON.stringify({ assignments: scenario.seatAssignments, pricing });
    const input = 'px-2 py-1 border border-gray-300 rounded text-xs';

    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <h4 className="text-sm font-semibold text-gray-900">Edit AI seats and prices</h4>
          <Tooltip text="A seat is billed per person per month. The seat count follows the FTE of the roles you tick, through every stage, and scales with the delivery model's AI adoption." />
        </div>

        <div className="space-y-5">
          {assignments.map(a => {
            const price = dp.prices.find(p => p.id === a.seatPriceId);
            return (
              <div key={a.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <input
                    aria-label="Seat assignment name"
                    value={a.name}
                    onChange={e => setAssignment(a.id, { name: e.target.value })}
                    className={`w-64 ${input}`}
                  />
                  <select
                    aria-label={`${a.name} seat type`}
                    value={a.seatPriceId}
                    onChange={e => setAssignment(a.id, { seatPriceId: e.target.value })}
                    className={input}
                  >
                    {dp.prices.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                  {price?.includesUsage && (
                    <span className="text-xs text-blue-800">includes usage — do not also meter tokens for these people</span>
                  )}
                  <button
                    onClick={() => setDraft({ ...draft, assignments: assignments.filter(x => x.id !== a.id) })}
                    className="ml-auto text-xs text-gray-500 hover:text-gray-900"
                  >
                    Remove
                  </button>
                </div>
                <p className="text-xs text-gray-500 mb-2">Roles that get this seat</p>
                <div className="flex flex-wrap gap-x-5 gap-y-1">
                  {scenario.roles.map(role => (
                    <label key={role.id} className="flex items-center gap-1.5 text-xs text-gray-700">
                      <input
                        type="checkbox"
                        aria-label={`${a.name}: ${role.name}`}
                        checked={a.roleIds.includes(role.id)}
                        onChange={() => toggleRole(a, role.id)}
                      />
                      {role.name}
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={() =>
            setDraft({
              ...draft,
              assignments: [
                ...assignments,
                { id: `seats-${Date.now()}`, name: 'New seat group', seatPriceId: dp.prices[0]?.id ?? 'other-seat', roleIds: [] },
              ],
            })
          }
          className="mt-4 text-sm text-blue-700 hover:text-blue-900"
        >
          Add seat group
        </button>

        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex flex-wrap items-end gap-4 mb-3">
            <p className="text-sm font-semibold text-gray-900">Seat price list ({dp.currency} per seat per month)</p>
            <label className="text-xs text-gray-500 flex items-center gap-2">
              Prices as of
              <input type="date" value={dp.asOf} onChange={e => setDraft({ ...draft, pricing: { ...dp, asOf: e.target.value } })} className={input} />
            </label>
          </div>
          <table className="text-sm">
            <thead>
              <tr className="text-xs text-gray-500 text-left">
                <th className="pr-4 py-1 font-normal">Seat</th>
                <th className="px-2 py-1 font-normal text-right">Price</th>
                <th className="px-2 py-1 font-normal text-center">
                  <span className="inline-flex items-center">
                    Includes usage
                    <Tooltip text="Tick when model usage is bundled into the seat. Untick for seats billed on top at API rates, such as Claude Enterprise." />
                  </span>
                </th>
                <th />
              </tr>
            </thead>
            <tbody>
              {dp.prices.map(p => (
                <tr key={p.id}>
                  <td className="pr-4 py-1">
                    <input
                      aria-label="Seat name"
                      value={p.label}
                      onChange={e =>
                        setDraft({ ...draft, pricing: { ...dp, prices: dp.prices.map(x => (x.id === p.id ? { ...x, label: e.target.value } : x)) } })
                      }
                      className={`w-72 ${input}`}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      aria-label={`${p.label} price per seat`}
                      type="number"
                      min={0}
                      step="any"
                      value={p.pricePerSeatPerMonth}
                      onChange={e =>
                        setDraft({
                          ...draft,
                          pricing: {
                            ...dp,
                            prices: dp.prices.map(x => (x.id === p.id ? { ...x, pricePerSeatPerMonth: Math.max(0, Number(e.target.value) || 0) } : x)),
                          },
                        })
                      }
                      className={`w-20 text-right ${input}`}
                    />
                  </td>
                  <td className="px-2 py-1 text-center">
                    <input
                      type="checkbox"
                      aria-label={`${p.label} includes usage`}
                      checked={p.includesUsage}
                      onChange={e =>
                        setDraft({
                          ...draft,
                          pricing: { ...dp, prices: dp.prices.map(x => (x.id === p.id ? { ...x, includesUsage: e.target.checked } : x)) },
                        })
                      }
                    />
                  </td>
                  <td className="px-2 py-1">
                    <button
                      disabled={inUse.has(p.id)}
                      title={inUse.has(p.id) ? 'Used by a seat group' : undefined}
                      onClick={() => setDraft({ ...draft, pricing: { ...dp, prices: dp.prices.filter(x => x.id !== p.id) } })}
                      className="text-xs text-gray-500 hover:text-gray-900 disabled:opacity-30"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex gap-3 justify-end">
          <button onClick={() => setDraft(null)} className="px-4 py-2 border border-gray-300 hover:bg-gray-100 text-gray-700 text-sm rounded-lg">
            Cancel
          </button>
          <button
            onClick={() => {
              onUpdate({ seatAssignments: draft.assignments, seatPricing: draft.pricing });
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
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">AI seats</p>
          <Tooltip text="Per-person licences for AI tooling. The seat count follows the FTE of the assigned roles, so it falls as the team falls — but only if you actually hand the licences back." />
        </div>
        <button
          onClick={() => setDraft({ assignments: structuredClone(scenario.seatAssignments), pricing: structuredClone(pricing) })}
          className="text-sm text-blue-700 hover:text-blue-900"
        >
          Edit seats and prices
        </button>
      </div>

      {/* Hero */}
      <p className="text-4xl font-bold text-gray-900 mb-1">
        {formatCurrency(cost.seatCost.mature)}
        <span className="text-xl font-semibold text-gray-500"> / month</span>
      </p>
      <p className="text-sm text-gray-600 mb-6">
        {scenario.seatAssignments.length === 0
          ? 'No seats modelled. Add a seat group if the customer buys AI tooling per developer.'
          : `${seats(cost.totalSeats.mature)} seats once mature, ${seats(cost.totalSeats.transition)} during the transition`}
      </p>

      {/* Supporting: per assignment */}
      {scenario.seatAssignments.length > 0 && (
        <table className="w-full max-w-3xl text-sm">
          <thead>
            <tr className="text-xs text-gray-400 text-left">
              <th className="font-normal pb-1">Seat group</th>
              <th className="font-normal pb-1">Seat</th>
              <th className="font-normal pb-1 text-right">Transition</th>
              <th className="font-normal pb-1 text-right">Mature</th>
              <th className="font-normal pb-1 text-right">Cost / month</th>
            </tr>
          </thead>
          <tbody>
            {scenario.seatAssignments.map(a => {
              const price = priceOf(a.seatPriceId);
              return (
                <tr key={a.id} className="border-t border-gray-100">
                  <td className="py-1.5 text-gray-900">
                    {a.name}
                    <span className="block text-xs text-gray-400">
                      {a.roleIds.length} roles
                      {inactiveNote(a, scenario) ? ` · ${inactiveNote(a, scenario)}` : ''}
                    </span>
                  </td>
                  <td className="py-1.5 text-gray-600">
                    {price?.label ?? 'Unknown seat'}
                    {price?.includesUsage && <span className="block text-xs text-gray-400">usage included</span>}
                  </td>
                  <td className="py-1.5 text-right text-gray-700">{seats(cost.seatsByAssignment[a.id]?.transition ?? 0)}</td>
                  <td className="py-1.5 text-right text-gray-700">{seats(cost.seatsByAssignment[a.id]?.mature ?? 0)}</td>
                  <td className="py-1.5 text-right text-gray-700">{formatCurrency(cost.seatCostByAssignment[a.id]?.mature ?? 0)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* Quiet */}
      <p className="mt-4 text-xs text-gray-400">
        Prices as of {pricing.asOf}, {pricing.currency} per seat per month. {pricing.source}
      </p>
    </div>
  );
}
