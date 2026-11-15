import type { ReactElement } from 'react';
import type { BusinessCaseInputs, TierId } from '@ai-roi-calc/bizcase';
import { NumberInput, PercentInput } from './Field';
import { useExecStore } from '../store';

const TIERS: Array<[TierId, string]> = [
  ['local', 'Local'],
  ['enterprise', 'Enterprise'],
  ['frontier', 'Frontier'],
];

type PercentField = 'reductionRoutine' | 'reductionComplex' | 'reviewRoutine' | 'reviewComplex';
type MoneyField = 'usageCostPerAssistedHour' | 'platformMonthly' | 'setup';

const PERCENT_ROWS: Array<[PercentField, string]> = [
  ['reductionRoutine', 'Routine work: effort removed (%)'],
  ['reductionComplex', 'Complex work: effort removed (%)'],
  ['reviewRoutine', 'Routine work: review and rework (%)'],
  ['reviewComplex', 'Complex work: review and rework (%)'],
];

const MONEY_ROWS: Array<[MoneyField, string]> = [
  ['usageCostPerAssistedHour', 'Usage cost per assisted hour (EUR)'],
  ['platformMonthly', 'Platform per month (EUR)'],
  ['setup', 'One-time setup (EUR)'],
];

export default function AssumptionsTable({ inputs }: { inputs: BusinessCaseInputs }): ReactElement {
  const setTier = useExecStore(s => s.setTier);
  const setInputs = useExecStore(s => s.setInputs);

  return (
    <div className="space-y-4">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
            <th className="py-2 font-normal">Assumption</th>
            {TIERS.map(([id, label]) => (
              <th key={id} className="py-2 text-right font-normal">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PERCENT_ROWS.map(([field, label]) => (
            <tr key={field} className="border-b border-gray-100">
              <td className="py-2 text-gray-900">
                {label}
                <span className="block text-xs text-gray-400">Assumption to validate</span>
              </td>
              {TIERS.map(([id, tierLabel]) => (
                <td key={id} className="py-2 text-right">
                  <PercentInput
                    value={inputs.tiers[id][field]}
                    ariaLabel={`${tierLabel}: ${label}`}
                    onChange={v => setTier(id, { [field]: v })}
                  />
                </td>
              ))}
            </tr>
          ))}
          {MONEY_ROWS.map(([field, label]) => (
            <tr key={field} className="border-b border-gray-100">
              <td className="py-2 text-gray-900">
                {label}
                <span className="block text-xs text-gray-400">Assumption to validate</span>
              </td>
              {TIERS.map(([id, tierLabel]) => (
                <td key={id} className="py-2 text-right">
                  <NumberInput
                    value={inputs.tiers[id][field]}
                    ariaLabel={`${tierLabel}: ${label}`}
                    onChange={v => setTier(id, { [field]: v })}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <label className="flex items-center justify-between gap-4 text-sm">
        <span className="text-gray-900">Complex work in hybrid runs on</span>
        <select
          value={inputs.hybridComplexTier}
          onChange={e => setInputs({ hybridComplexTier: e.target.value as TierId })}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2"
        >
          <option value="enterprise">Enterprise</option>
          <option value="frontier">Frontier</option>
          <option value="local">Local</option>
        </select>
      </label>
      <p className="text-xs text-gray-500">
        These are placeholder values. Replace them with the customer's figures and current vendor prices.
      </p>
    </div>
  );
}
