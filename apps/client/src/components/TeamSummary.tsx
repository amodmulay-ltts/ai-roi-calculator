import type { Results, Scenario } from '@ai-roi-calc/engine';
import Tooltip from './Tooltip';
import { offshoreRate } from '@ai-roi-calc/engine';
import { displayRate, rateSuffix, rateUnitOf } from '../utils/rates';

interface TeamSummaryProps {
  scenario: Scenario;
  results: Results;
  onUpdate: (updates: Partial<Scenario>) => void;
}

const GAP_WARNING = 0.05;
const fmt = (n: number) => (Math.round(n * 10) / 10).toLocaleString('en');

export default function TeamSummary({ scenario, results, onUpdate }: TeamSummaryProps) {
  const { staffingFte, planFte, roleFte } = results.effort;
  const unit = rateUnitOf(scenario);
  const hours = scenario.globalAssumptions.workingHrsPerFtePerMonth;
  const rate = (v: number) => v.toLocaleString('en', { maximumFractionDigits: unit === 'hour' ? 2 : 0 });
  const derived = scenario.peopleMode.mode === 'effort-derived';
  const otherMature = derived ? planFte.mature : null;
  const gap = derived && planFte.mature > 0 ? (planFte.mature - staffingFte.mature) / staffingFte.mature : 0;

  const modes = [
    { id: 'effort-derived' as const, label: 'Derived from AI productivity' },
    { id: 'staffing-plan' as const, label: 'Staffing plan as entered' },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-8">
      {/* Hero: costed team size */}
      <div className="flex items-center mb-1">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Team size (costed FTE)</p>
        <Tooltip text="The headcount that drives people cost: baseline (today) → transition → mature." />
      </div>
      <p className="text-4xl font-bold text-gray-900 mb-6">
        {fmt(staffingFte.baseline)} <span className="text-gray-400">→</span> {fmt(staffingFte.transition)}{' '}
        <span className="text-gray-400">→</span> <span className="text-blue-700">{fmt(staffingFte.mature)}</span>
      </p>

      {/* Supporting 1: how FTE is determined */}
      <div role="radiogroup" aria-label="People cost mode" className="inline-flex rounded-lg border border-gray-200 p-1 mb-4">
        {modes.map(m => (
          <button
            key={m.id}
            role="radio"
            aria-checked={scenario.peopleMode.mode === m.id}
            onClick={() => onUpdate({ peopleMode: { mode: m.id } })}
            className={`px-3 py-1.5 rounded-md text-sm transition ${
              scenario.peopleMode.mode === m.id ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
      <p className="text-sm text-gray-600 mb-6 max-w-2xl">
        {derived
          ? 'Mature and transition headcount scale with workload from the effort and KPI assumptions. The role FTE you enter set the mix only.'
          : 'Headcount per role is taken exactly as entered. AI productivity assumptions do not affect cost in this mode.'}
      </p>

      {/* Supporting 2: plan vs derived check */}
      {derived && otherMature !== null && Math.abs(gap) > GAP_WARNING && (
        <div role="status" className="border-l-4 border-blue-600 bg-blue-50 px-4 py-3 mb-6 text-sm text-gray-800 max-w-2xl">
          Your staffing plan has <strong>{fmt(otherMature)}</strong> FTE in the mature state, but the productivity assumptions
          support <strong>{fmt(staffingFte.mature)}</strong> ({gap > 0 ? '+' : ''}
          {(gap * 100).toFixed(0)}%). Review the plan or the effort assumptions before presenting.
        </div>
      )}

      {/* Quiet: roles */}
      <details className="text-sm">
        <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
          {scenario.roles.length} roles{derived && otherMature !== null && Math.abs(gap) <= GAP_WARNING
            ? ` · plan ${fmt(otherMature)} FTE is within 5% of derived`
            : ''}
        </summary>
        <table className="mt-3 w-full max-w-2xl text-xs text-gray-600">
          <thead>
            <tr className="text-gray-400">
              <th className="text-left font-normal py-1">Role</th>
              <th className="text-right font-normal py-1">Baseline</th>
              <th className="text-right font-normal py-1">Mature</th>
              <th className="text-right font-normal py-1">
                Onshore {rateSuffix(unit)} ({scenario.baseCurrency})
              </th>
              <th className="text-right font-normal py-1">Offshore {rateSuffix(unit)}</th>
              <th className="text-right font-normal py-1">Offshore saving</th>
            </tr>
          </thead>
          <tbody>
            {scenario.roles.map((role, i) => (
              <tr key={`${role.id}-${i}`} className="border-t border-gray-100">
                <td className="py-1">{role.name}</td>
                <td className="py-1 text-right">{fmt(roleFte[i]!.baseline)}</td>
                <td className="py-1 text-right">{fmt(roleFte[i]!.mature)}</td>
                <td className="py-1 text-right">{rate(displayRate(role, unit, hours))}</td>
                {role.offshorable === false ? (
                  <td colSpan={2} className="py-1 text-right text-gray-400">
                    stays onshore
                  </td>
                ) : (
                  <>
                    <td className="py-1 text-right">
                      {rate(displayRate({ ...role, costPerFte: offshoreRate(role, scenario.bccRateFactor) }, unit, hours))}
                      {role.bccCostPerFte === undefined && <span className="text-gray-400"> *</span>}
                    </td>
                    <td className="py-1 text-right">
                      {role.costPerFte > 0 ? `${Math.round((1 - offshoreRate(role, scenario.bccRateFactor) / role.costPerFte) * 100)}%` : '—'}
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {scenario.roles.some(r => r.offshorable !== false && r.bccCostPerFte === undefined) && (
          <p className="mt-2 text-xs text-gray-400">
            * default offshore rate: {Math.round(scenario.bccRateFactor * 100)}% of onshore. Set role-specific rates in Edit roles, FTE and rates.
          </p>
        )}
      </details>
    </div>
  );
}
