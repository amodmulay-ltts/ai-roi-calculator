import type { ReactElement } from 'react';
import { formatMoney, listWorkTemplates, type DataConstraint } from '@ai-roi-calc/bizcase';
import Field, { NumberInput } from '../components/Field';
import { CUSTOM_TEMPLATE_ID, useExecStore } from '../store';

export const DATA_RULES: Array<[DataConstraint, string]> = [
  ['public-ok', 'Public cloud AI is acceptable'],
  ['restricted', 'Restricted: no public cloud AI'],
  ['sovereign', 'Sovereign: must stay on our own infrastructure'],
];

const TEMPLATES = listWorkTemplates();

export default function Situation(): ReactElement {
  const inputs = useExecStore(s => s.inputs);
  const setInputs = useExecStore(s => s.setInputs);
  const applyTemplate = useExecStore(s => s.applyTemplate);

  const isCustom = inputs.workTemplateId === CUSTOM_TEMPLATE_ID;
  const current = TEMPLATES.find(t => t.id === inputs.workTemplateId);

  const handleTemplate = (id: string): void => {
    if (id === inputs.workTemplateId) return;
    // Starting from a template replaces any phases and work the presenter has changed
    if (isCustom && !window.confirm('Replace the phases and work you changed with this starting point?')) return;
    applyTemplate(id);
  };

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 space-y-6">
      <div className="space-y-1">
        <label className="flex items-center justify-between gap-4">
          <span className="text-sm font-medium text-gray-900">Work in scope</span>
          <select
            value={inputs.workTemplateId}
            onChange={e => handleTemplate(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
          >
            {TEMPLATES.map(t => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
            {isCustom && <option value={CUSTOM_TEMPLATE_ID}>Custom (edited)</option>}
          </select>
        </label>
        <p className="text-xs text-gray-500">
          {current ? `${current.industry}. ${current.description}` : 'The phases and work have been edited on the next step.'}
        </p>
        <p className="text-xs text-gray-400">Assumption to validate</p>
      </div>

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
