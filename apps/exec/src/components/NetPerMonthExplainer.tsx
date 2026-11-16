import type { ReactElement } from 'react';
import { formatMoney, optionCosts, type BusinessCaseInputs, type CaseResult, type PostureId } from '@ai-roi-calc/bizcase';
import { POSTURE_LABEL } from './PostureCard';

const h = (n: number): string => Math.round(n).toLocaleString('en-US');

interface Props {
  inputs: BusinessCaseInputs;
  result: CaseResult;
  posture: PostureId;
}

/** A worked, always-visible explanation of "net per month at maturity", using the figures of the chosen option. */
export default function NetPerMonthExplainer({ inputs, result: r, posture }: Props): ReactElement {
  const c = optionCosts(inputs, posture);
  const hourly = inputs.loadedCostPerFteYear / 12 / inputs.hoursPerFteMonth;
  const share = r.capacityValuePerMonth > 0 ? r.countedSavingPerMonth / r.capacityValuePerMonth : inputs.cashShare;
  const assisted = r.tasks.reduce((sum, t) => sum + t.assistedHours, 0);

  const rows: Array<{ label: string; how: string; value: string; strong?: boolean; sign?: string }> = [
    { label: 'Hours freed', how: `${h(r.totalHours)} in-scope hours; AI removes ${h(r.grossRemovedHoursPerMonth)}, ${h(r.reviewReworkHoursPerMonth)} come back as review and rework`, value: `${h(r.netHoursSavedPerMonth)} h` },
    { label: 'Value of those hours', how: `${h(r.netHoursSavedPerMonth)} h × ${formatMoney(hourly)} an hour (${formatMoney(inputs.loadedCostPerFteYear)} ÷ 12 ÷ ${inputs.hoursPerFteMonth})`, value: formatMoney(r.capacityValuePerMonth) },
    { label: 'Counted as saving', how: `${formatMoney(r.capacityValuePerMonth)} × ${Math.round(share * 100)}% that becomes a real saving`, value: formatMoney(r.countedSavingPerMonth), strong: true },
    { label: 'Cost removed outright', how: 'tools or contractors no longer needed', value: formatMoney(c.retiredCostMonthly), sign: '+' },
    { label: 'Usage cost', how: `${h(assisted)} hours where AI is used × the usage cost per assisted hour`, value: formatMoney(r.usageCostPerMonth), sign: '−' },
    { label: 'Platform', how: `monthly platform cost of the ${POSTURE_LABEL[posture]} option`, value: formatMoney(c.platformMonthly), sign: '−' },
    { label: 'Governance', how: 'monitoring and assurance that runs every month', value: formatMoney(c.governanceMonthly), sign: '−' },
    { label: 'Net per month at maturity', how: 'counted saving + cost removed outright − usage − platform − governance', value: formatMoney(r.steadyNetPerMonth), strong: true, sign: '=' },
  ];

  return (
    <section aria-label="How net per month at maturity is calculated" className="rounded-xl border border-blue-200 bg-blue-50/40 p-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">How it is calculated</p>
      <h2 className="mt-1 text-lg font-semibold text-gray-900">
        Net per month at maturity: {formatMoney(r.steadyNetPerMonth)} ({POSTURE_LABEL[posture]}, expected case)
      </h2>
      <p className="mt-2 max-w-3xl text-sm text-gray-700">
        What the option saves each month once AI is working at full effect, minus what it costs to run each month.
      </p>

      <table className="mt-4 w-full text-sm">
        <tbody>
          {rows.map(row => (
            <tr key={row.label} className={`border-b border-blue-100 ${row.strong ? 'bg-white/70' : ''}`}>
              <td className={`w-56 py-2 pr-3 align-top ${row.strong ? 'font-semibold text-gray-900' : 'text-gray-800'}`}>
                {row.sign && <span className="mr-1 text-gray-400">{row.sign}</span>}
                {row.label}
              </td>
              <td className="py-2 pr-3 text-gray-600">{row.how}</td>
              <td className={`py-2 text-right tabular-nums ${row.strong ? 'font-semibold text-gray-900' : 'text-gray-800'}`}>{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="mt-4 max-w-3xl list-disc space-y-1 pl-5 text-sm text-gray-700">
        <li>
          Only the counted share is a saving. The other {Math.round((1 - share) * 100)}% of the value ({formatMoney(r.redeployedValuePerMonth)} a month) is capacity that is
          redeployed, and it is left out of every result.
        </li>
        <li>
          &ldquo;At maturity&rdquo; means full effect. Before that, savings and usage cost build up in a straight line over the months to full effect, while platform and
          governance are paid in full from month 1. That is why payback comes later than investment ÷ net per month would suggest.
        </li>
        <li>Each option has its own figures: change any of them in the table above and this explanation follows.</li>
      </ul>
    </section>
  );
}
