import type { ReactElement } from 'react';
import { formatMoney, type DataConstraint } from '@ai-roi-calc/bizcase';
import Field, { NumberInput } from '../components/Field';
import { useExecStore } from '../store';

export const DATA_RULES: Array<[DataConstraint, string]> = [
  ['public-ok', 'Public cloud AI is acceptable'],
  ['restricted', 'Restricted: no public cloud AI'],
  ['sovereign', 'Sovereign: must stay on our own infrastructure'],
];

export default function Situation(): ReactElement {
  const inputs = useExecStore(s => s.inputs);
  const setInputs = useExecStore(s => s.setInputs);

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 space-y-6">
      <Field label="People in scope" assumption>
        <NumberInput value={inputs.teamSize} onChange={v => setInputs({ teamSize: v })} />
      </Field>
      <Field label="Annual cost per person (EUR, fully loaded)" assumption>
        <NumberInput value={inputs.loadedCostPerFteYear} onChange={v => setInputs({ loadedCostPerFteYear: v })} />
      </Field>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-gray-900 mb-2">Data rules</legend>
        {DATA_RULES.map(([value, label]) => (
          <label key={value} className="flex items-center gap-3 text-sm text-gray-800">
            <input
              type="radio"
              name="dataConstraint"
              value={value}
              checked={inputs.dataConstraint === value}
              onChange={() => setInputs({ dataConstraint: value })}
            />
            {label}
          </label>
        ))}
      </fieldset>

      <p className="text-sm text-gray-600">
        Today: {inputs.teamSize} people, {formatMoney(inputs.teamSize * inputs.loadedCostPerFteYear)} a year,{' '}
        {Math.round(inputs.teamSize * inputs.hoursPerFteMonth).toLocaleString('en-US')} hours a month.
      </p>
    </section>
  );
}
