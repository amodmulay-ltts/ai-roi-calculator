import type { ReactElement } from 'react';
import type { BusinessCaseInputs, TierId } from '@ai-roi-calc/bizcase';
import { PercentInput } from './Field';
import { useExecStore } from '../store';

const TIERS: Array<[TierId, string]> = [
  ['local', 'Local'],
  ['enterprise', 'Enterprise'],
  ['frontier', 'Frontier'],
];

type PercentField = 'reductionRoutine' | 'reductionComplex' | 'reviewRoutine' | 'reviewComplex';
const PERCENT_ROWS: Array<[PercentField, string]> = [
  ['reductionRoutine', 'Routine work: effort removed (%)'],
  ['reductionComplex', 'Complex work: effort removed (%)'],
  ['reviewRoutine', 'Routine work: review and rework (%)'],
  ['reviewComplex', 'Complex work: review and rework (%)'],
];

export default function AssumptionsTable({ inputs }: { inputs: BusinessCaseInputs }): ReactElement {
  const setTier = useExecStore(s => s.setTier);

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
        </tbody>
      </table>

      <p className="text-xs text-gray-500">
        These are placeholder values. Replace them with the customer's figures and current vendor prices.
      </p>
    </div>
  );
}
