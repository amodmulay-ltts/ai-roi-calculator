import type { ReactElement } from 'react';
import { compareAll, formatMoney } from '@ai-roi-calc/bizcase';
import Field, { NumberInput, PercentInput } from '../components/Field';
import { effectivePosture, useExecStore } from '../store';

export default function Investment(): ReactElement {
  const inputs = useExecStore(s => s.inputs);
  const selectedPosture = useExecStore(s => s.selectedPosture);
  const setInputs = useExecStore(s => s.setInputs);

  const posture = effectivePosture(inputs, selectedPosture);
  const expected = posture ? compareAll(inputs)[posture].expected : null;

  return (
    <section className="space-y-6 rounded-xl border border-gray-200 bg-white p-6">
      <Field label="Data readiness investment (EUR)" assumption>
        <NumberInput value={inputs.dataReadinessInvestment} onChange={v => setInputs({ dataReadinessInvestment: v })} />
      </Field>
      <Field label="Governance and assurance setup (EUR)" assumption>
        <NumberInput value={inputs.governanceSetup} onChange={v => setInputs({ governanceSetup: v })} />
      </Field>
      <Field label="Training per person (EUR)" assumption>
        <NumberInput value={inputs.trainingPerFte} onChange={v => setInputs({ trainingPerFte: v })} />
      </Field>
      <Field label="Governance running cost per month (EUR)" assumption>
        <NumberInput value={inputs.governanceMonthly} onChange={v => setInputs({ governanceMonthly: v })} />
      </Field>
      <Field
        label="Cost removed outright per month (EUR)"
        help="Tools or contractors that would no longer be needed."
        assumption
      >
        <NumberInput value={inputs.retiredCostMonthly} onChange={v => setInputs({ retiredCostMonthly: v })} />
      </Field>
      <Field
        label="Share of released capacity counted as real savings (%)"
        help="Only capacity that leaves payroll or avoids hiring is a saving. The rest is redeployed and is not counted."
        assumption
      >
        <PercentInput value={inputs.cashShare} onChange={v => setInputs({ cashShare: v })} />
      </Field>
      <Field label="Months to full effect" assumption>
        <NumberInput value={inputs.rampMonths} onChange={v => setInputs({ rampMonths: v })} />
      </Field>

      {expected && (
        <div className="border-t border-gray-200 pt-4">
          <ul className="space-y-2 text-sm">
            {expected.investmentLines.map(line => (
              <li key={line.label} className="flex justify-between">
                <span className="text-gray-700">{line.label}</span>
                <span className="text-gray-900">{formatMoney(line.amount)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex justify-between border-t border-gray-200 pt-3 text-sm font-semibold">
            <span className="text-gray-900">Total</span>
            <span className="text-gray-900">{formatMoney(expected.investment)}</span>
          </div>
        </div>
      )}
    </section>
  );
}
