import { useState } from 'react';
import type { Role, Scenario } from '@ai-roi-calc/engine';
import Tooltip from './Tooltip';
import { offshoreRate } from '@ai-roi-calc/engine';
import { displayRate, monthlyFromRate, rateSuffix, rateUnitOf, type RateUnit } from '../utils/rates';

interface RolesGridProps {
  scenario: Scenario;
  onUpdate: (updates: Partial<Scenario>) => void;
  onDone: () => void;
  formatCurrency: (value: number) => string;
}

interface Draft {
  roles: Role[];
  hoursPerFte: number;
  unit: RateUnit;
}

const STATES = [
  ['baseline', 'Today'],
  ['transition', 'Transition (plan)'],
  ['mature', 'Mature (plan)'],
] as const;

const round2 = (v: number) => Math.round(v * 100) / 100;

export default function RolesGrid({ scenario, onUpdate, onDone, formatCurrency }: RolesGridProps) {
  const original: Draft = {
    roles: scenario.roles,
    hoursPerFte: scenario.globalAssumptions.workingHrsPerFtePerMonth,
    unit: rateUnitOf(scenario),
  };
  const [draft, setDraft] = useState<Draft>(() => structuredClone(original));
  const { roles, hoursPerFte, unit } = draft;

  const setRole = (id: string, changes: Partial<Role>) =>
    setDraft(d => ({ ...d, roles: d.roles.map(r => (r.id === id ? { ...r, ...changes } : r)) }));

  // Hourly rates are what customers quote: keep them fixed when the hours change, so monthly cost follows
  const setHours = (hours: number) =>
    setDraft(d => {
      if (!(hours > 0)) return { ...d, hoursPerFte: hours };
      const k = d.unit === 'hour' && d.hoursPerFte > 0 ? hours / d.hoursPerFte : 1;
      return {
        ...d,
        hoursPerFte: hours,
        roles: d.roles.map(r => ({
          ...r,
          costPerFte: r.costPerFte * k,
          ...(r.bccCostPerFte !== undefined && { bccCostPerFte: r.bccCostPerFte * k }),
        })),
      };
    });

  const addRole = () =>
    setDraft(d => ({
      ...d,
      roles: [
        ...d.roles,
        {
          id: `role-${Date.now()}`,
          name: 'New role',
          fte: { baseline: 1, transition: 1, mature: 1 },
          costPerFte: d.roles.length ? d.roles.reduce((s, r) => s + r.costPerFte, 0) / d.roles.length : 0,
        },
      ],
    }));

  const hoursValid = hoursPerFte > 0 && hoursPerFte <= 744;
  const changed = JSON.stringify(draft) !== JSON.stringify(original);
  const changedCell = (a: unknown, b: unknown) => (a !== b ? 'bg-blue-50 border-blue-300' : 'border-gray-300');
  const before = (id: string) => scenario.roles.find(r => r.id === id);

  const save = () => {
    onUpdate({
      roles: roles,
      rateUnit: unit,
      globalAssumptions: { ...scenario.globalAssumptions, workingHrsPerFtePerMonth: hoursPerFte },
    });
    onDone();
  };

  const teamCostToday = roles.reduce((s, r) => s + r.fte.baseline * r.costPerFte, 0);
  const teamFteToday = roles.reduce((s, r) => s + r.fte.baseline, 0);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
      <div className="px-6 py-4 border-b border-gray-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center">
          <h4 className="text-sm font-semibold text-gray-900">Edit roles, FTE and rates</h4>
          <Tooltip text="Rates are the fully loaded internal cost per person at onshore level; offshore (BCC) rates are derived from them in the delivery model. In 'Derived from AI productivity' mode, transition and mature FTE set the role mix only." />
        </div>
        <div className="flex flex-wrap items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Rates per</span>
            <div role="radiogroup" aria-label="Rate unit" className="inline-flex rounded-lg border border-gray-200 p-0.5">
              {(['hour', 'month'] as const).map(u => (
                <button
                  key={u}
                  role="radio"
                  aria-checked={unit === u}
                  onClick={() => setDraft(d => ({ ...d, unit: u }))}
                  className={`px-3 py-1 rounded-md transition ${unit === u ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  {u === 'hour' ? 'Hour' : 'Month'}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-gray-500">
            <span className="flex items-center">
              Working hours per FTE per month
              <Tooltip text="Productive hours per person per month. Converts hourly rates to monthly cost and workload hours to FTE. Changing it with hourly rates keeps the hourly rates and changes the monthly cost." />
            </span>
            <input
              type="number"
              min={1}
              max={744}
              value={hoursPerFte}
              onChange={e => setHours(Number(e.target.value))}
              aria-invalid={!hoursValid}
              className={`w-20 px-2 py-1 text-right border rounded ${hoursValid ? changedCell(hoursPerFte, original.hoursPerFte) : 'border-gray-900'}`}
            />
          </label>
        </div>
      </div>

      <p className="px-6 pt-4 text-sm text-gray-600">
        Team today: {teamFteToday.toLocaleString('en', { maximumFractionDigits: 1 })} FTE, {formatCurrency(teamCostToday)} a month
        {teamFteToday > 0 && hoursValid ? `, average ${formatCurrency(teamCostToday / teamFteToday / (unit === 'hour' ? hoursPerFte : 1))} ${rateSuffix(unit)}` : ''}
      </p>

      <table className="w-full text-sm mt-2">
        <thead>
          <tr className="text-xs text-gray-500 text-left border-b border-gray-200">
            <th className="px-6 py-2 font-normal">Role</th>
            {STATES.map(([s, label]) => (
              <th key={s} className="px-2 py-2 font-normal text-right">
                FTE {label.toLowerCase()}
              </th>
            ))}
            <th className="px-2 py-2 font-normal text-right">
              Onshore cost {rateSuffix(unit)} ({scenario.baseCurrency})
            </th>
            <th className="px-2 py-2 font-normal text-right">
              <span className="inline-flex items-center">
                Offshore cost {rateSuffix(unit)}
                <Tooltip text={`The role's cost in the best-cost country. Leave empty to use ${Math.round(scenario.bccRateFactor * 100)}% of the onshore cost (the default in the delivery model).`} />
              </span>
            </th>
            <th className="px-2 py-2 font-normal text-center">
              <span className="inline-flex items-center">
                Offshore-able
                <Tooltip text="Untick for roles that must stay onshore, such as safety sign-off or customer-facing leadership. They keep the onshore rate in every delivery model." />
              </span>
            </th>
            <th className="px-2 py-2" />
          </tr>
        </thead>
        <tbody>
          {roles.map(role => {
            const prev = before(role.id);
            return (
              <tr key={role.id} className="border-b border-gray-100">
                <td className="px-6 py-2">
                  <input
                    aria-label="Role name"
                    value={role.name}
                    onChange={e => setRole(role.id, { name: e.target.value })}
                    className={`w-56 px-2 py-1 border rounded ${changedCell(role.name, prev?.name)}`}
                  />
                </td>
                {STATES.map(([s, label]) => (
                  <td key={s} className="px-2 py-2 text-right">
                    <input
                      aria-label={`${role.name} FTE ${label}`}
                      type="number"
                      min={0}
                      step={0.5}
                      value={role.fte[s]}
                      onChange={e => setRole(role.id, { fte: { ...role.fte, [s]: Math.max(0, Number(e.target.value) || 0) } })}
                      className={`w-16 px-2 py-1 text-right border rounded ${changedCell(role.fte[s], prev?.fte[s])}`}
                    />
                  </td>
                ))}
                <td className="px-2 py-2 text-right">
                  <input
                    aria-label={`${role.name} cost ${rateSuffix(unit)}`}
                    type="number"
                    min={0}
                    step={unit === 'hour' ? 0.5 : 100}
                    value={round2(displayRate(role, unit, hoursPerFte || 1))}
                    onChange={e =>
                      setRole(role.id, { costPerFte: monthlyFromRate(Math.max(0, Number(e.target.value) || 0), unit, hoursPerFte || 1) })
                    }
                    className={`w-24 px-2 py-1 text-right border rounded ${changedCell(round2(role.costPerFte), round2(prev?.costPerFte ?? NaN))}`}
                  />
                </td>
                <td className="px-2 py-2 text-right">
                  <input
                    aria-label={`${role.name} offshore cost ${rateSuffix(unit)}`}
                    type="number"
                    min={0}
                    step={unit === 'hour' ? 0.5 : 100}
                    disabled={role.offshorable === false}
                    placeholder={String(round2(displayRate({ ...role, costPerFte: offshoreRate({ ...role, bccCostPerFte: undefined }, scenario.bccRateFactor) }, unit, hoursPerFte || 1)))}
                    value={role.bccCostPerFte === undefined ? '' : round2(displayRate({ ...role, costPerFte: role.bccCostPerFte }, unit, hoursPerFte || 1))}
                    onChange={e =>
                      setRole(role.id, {
                        bccCostPerFte:
                          e.target.value === '' ? undefined : monthlyFromRate(Math.max(0, Number(e.target.value) || 0), unit, hoursPerFte || 1),
                      })
                    }
                    className={`w-24 px-2 py-1 text-right border rounded disabled:bg-gray-50 disabled:text-gray-300 ${changedCell(role.bccCostPerFte, prev?.bccCostPerFte)}`}
                  />
                </td>
                <td className="px-2 py-2 text-center">
                  <input
                    type="checkbox"
                    aria-label={`${role.name} can be offshored`}
                    checked={role.offshorable !== false}
                    onChange={e => setRole(role.id, { offshorable: e.target.checked })}
                  />
                </td>
                <td className="px-2 py-2">
                  <button
                    onClick={() => setDraft(d => ({ ...d, roles: d.roles.filter(r => r.id !== role.id) }))}
                    disabled={roles.length === 1}
                    className="text-xs text-gray-500 hover:text-gray-900 disabled:opacity-30"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="px-6 py-3">
        <button onClick={addRole} className="text-sm text-blue-700 hover:text-blue-900">
          Add role
        </button>
      </div>

      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex gap-3 justify-end items-center">
        {!hoursValid && <span className="text-xs text-gray-900 mr-auto">Working hours must be between 1 and 744.</span>}
        <button onClick={onDone} className="px-4 py-2 border border-gray-300 hover:bg-gray-100 text-gray-700 text-sm rounded-lg">
          Cancel
        </button>
        <button
          onClick={save}
          disabled={!changed || !hoursValid}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white text-sm font-medium rounded-lg"
        >
          Save changes
        </button>
      </div>
    </div>
  );
}
