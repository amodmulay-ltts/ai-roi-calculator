import type { ReactElement } from 'react';
import {
  GAP_INVESTMENT_PER_POINT,
  formatMoney,
  optionCosts,
  readinessGap,
  type BusinessCaseInputs,
  type OptionOverrides,
  type PostureId,
  type PostureSummary,
  type TierAssumptions,
  type TierId,
} from '@ai-roi-calc/bizcase';
import { useExecStore } from '../store';
import { COMPACT_INPUT_CLASS } from './Field';
import InfoTip from './InfoTip';
import { POSTURE_LABEL } from './PostureCard';

const ORDER: PostureId[] = ['local', 'hybrid', 'enterprise', 'frontier'];
const SMALL_BUTTON = 'rounded-lg border border-gray-300 bg-white px-3 py-1 text-xs text-gray-700 hover:bg-gray-50';

interface Props {
  inputs: BusinessCaseInputs;
  summaries: Record<PostureId, PostureSummary>;
}

/**
 * Shows, for each option, how the run cost, the investment and the net per month are built up, line by line.
 * Every figure behind a line can be edited for every option. Local, enterprise and frontier model figures are
 * the option's own. Hybrid is made of local plus the stronger model until its own figure is typed. The other
 * figures start from the shared value (set on the Investment step) until an option gets its own.
 */
export default function OptionBuildUp({ inputs, summaries }: Props): ReactElement {
  const setTier = useExecStore(s => s.setTier);
  const setInputs = useExecStore(s => s.setInputs);
  const setOptionOverride = useExecStore(s => s.setOptionOverride);
  const clearOptionOverrides = useExecStore(s => s.clearOptionOverrides);
  const gap = readinessGap(inputs.readiness);
  const hasOverrides = Object.values(inputs.optionOverrides ?? {}).some(o => o && Object.keys(o).length > 0);

  const e = (id: PostureId): PostureSummary['expected'] => summaries[id].expected;
  const costs = (id: PostureId): ReturnType<typeof optionCosts> => optionCosts(inputs, id);
  const assisted = (id: PostureId): number => e(id).tasks.reduce((sum, t) => sum + t.assistedHours, 0);
  const dim = (id: PostureId): string => (summaries[id].allowed ? '' : 'opacity-40');

  const labelCell = (label: string, info: string, sign?: string, strong = false): ReactElement => (
    <td className={`py-2 pr-3 ${strong ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
      {sign && <span className="mr-1 text-gray-400">{sign}</span>}
      {label}
      <InfoTip explanation={{ title: label, lines: [info] }} />
    </td>
  );

  /** A figure worked out from the case; not typed. */
  const calcRow = (label: string, info: string, value: (id: PostureId) => string, opts: { strong?: boolean; sign?: string } = {}): ReactElement => (
    <tr className={`border-b border-gray-100 ${opts.strong ? 'bg-gray-50' : ''}`}>
      {labelCell(label, info, opts.sign, opts.strong)}
      {ORDER.map(id => (
        <td key={id} className={`py-2 text-right tabular-nums ${opts.strong ? 'font-semibold text-gray-900' : 'text-gray-700'} ${dim(id)}`}>
          {value(id)}
        </td>
      ))}
    </tr>
  );

  /** A typed figure, one input per option. */
  const inputRow = (
    label: string,
    info: string,
    value: (id: PostureId) => number,
    overridden: (id: PostureId) => boolean,
    onChange: (id: PostureId, n: number) => void,
    opts: { sign?: string; caption?: (id: PostureId) => string } = {},
  ): ReactElement => (
    <tr className="border-b border-gray-100">
      {labelCell(label, info, opts.sign)}
      {ORDER.map(id => (
        <td key={id} className={`py-2 text-right ${dim(id)}`}>
          <input
            type="number"
            aria-label={`${POSTURE_LABEL[id]}: ${label}`}
            value={Math.round(value(id) * 100) / 100}
            onChange={ev => onChange(id, Number(ev.target.value) || 0)}
            className={`${COMPACT_INPUT_CLASS} ${overridden(id) ? 'border-blue-600 bg-blue-50/50' : ''}`}
          />
          {opts.caption && <span className="mt-0.5 block text-xs text-gray-400">{opts.caption(id)}</span>}
        </td>
      ))}
    </tr>
  );

  /** A model figure: local, enterprise and frontier edit the tier; hybrid edits its own figure, made from them until set. */
  const modelRow = (label: string, info: string, field: keyof Pick<TierAssumptions, 'usageCostPerAssistedHour' | 'platformMonthly' | 'setup'>, hybridValue: () => number, sign?: string): ReactElement =>
    inputRow(
      label,
      info,
      id => (id === 'hybrid' ? hybridValue() : inputs.tiers[id as TierId][field]),
      id => id === 'hybrid' && inputs.optionOverrides?.hybrid?.[field] !== undefined,
      (id, n) => (id === 'hybrid' ? setOptionOverride('hybrid', { [field]: n }) : setTier(id as TierId, { [field]: n })),
      { sign, caption: id => (id === 'hybrid' ? (inputs.optionOverrides?.hybrid?.[field] !== undefined ? 'its own figure' : 'from Local + stronger model') : '') },
    );

  /** A shared figure that any option can override. */
  const sharedRow = (label: string, info: string, field: keyof OverridableShared, sign?: string, caption?: (id: PostureId) => string): ReactElement =>
    inputRow(
      label,
      info,
      id => costs(id)[field],
      id => inputs.optionOverrides?.[id]?.[field] !== undefined,
      (id, n) => setOptionOverride(id, { [field]: n }),
      { sign, caption },
    );

  return (
    <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-3xl">
          <h2 className="text-sm font-medium text-gray-900">How each option&apos;s cost is built</h2>
          <p className="mt-1 text-xs text-gray-500">
            Every line is worked out from the figures in its column, and every figure can be edited for every option. A blue box is a figure
            set for that option alone; the others use the shared figure from the Investment step. Hybrid starts as Local plus the stronger
            model until you type its own figure. Expected case, at full effect.
          </p>
        </div>
        {hasOverrides && (
          <button type="button" onClick={clearOptionOverrides} className={SMALL_BUTTON}>
            Reset option-specific figures
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
              <th className="w-1/3 py-2 font-normal" />
              {ORDER.map(id => (
                <th key={id} className="py-2 text-right font-normal">
                  {POSTURE_LABEL[id]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={5} className="pb-1 pt-3 text-xs font-medium uppercase tracking-wide text-gray-500">
                Running cost per month
              </td>
            </tr>
            {calcRow('Hours where AI is used', 'The in-scope hours per month where AI is used, from the AI use set on each piece of work.', id => `${Math.round(assisted(id)).toLocaleString('en-US')} h`)}
            {modelRow(
              'Usage cost per assisted hour (EUR)',
              "What each hour of AI-assisted work costs in model usage. Hybrid, until you type a rate, pays the local rate for routine work and the stronger model's rate for complex work.",
              'usageCostPerAssistedHour',
              () => {
                const rate = costs('hybrid').hybridUsageRate;
                const h = assisted('hybrid');
                return rate ?? (h > 0 ? e('hybrid').usageCostPerMonth / h : 0);
              },
              '×',
            )}
            {calcRow('Usage cost', 'Hours where AI is used × usage cost per assisted hour.', id => formatMoney(e(id).usageCostPerMonth), { sign: '=' })}
            {modelRow('Platform per month (EUR)', 'Licences, infrastructure and operations for the model option, every month.', 'platformMonthly', () => costs('hybrid').platformMonthly, '+')}
            {sharedRow('Governance per month (EUR)', 'Monitoring, assurance and compliance work that runs every month.', 'governanceMonthly', '+')}
            {calcRow('Run cost per month', 'Usage cost + platform + governance.', id => formatMoney(e(id).usageCostPerMonth + e(id).platformAndGovernancePerMonth), { strong: true, sign: '=' })}

            <tr>
              <td colSpan={5} className="pb-1 pt-5 text-xs font-medium uppercase tracking-wide text-gray-500">
                One-time investment
              </td>
            </tr>
            {modelRow('Platform setup (EUR)', 'One-time cost to set up the model option.', 'setup', () => costs('hybrid').setup)}
            {sharedRow('Data readiness (EUR)', 'One-time cost of getting the data into a state AI can use.', 'dataReadinessInvestment', '+')}
            {sharedRow('Governance setup (EUR)', 'One-time cost of putting policies, controls and assurance in place.', 'governanceSetup', '+')}
            {sharedRow('Training per person (EUR)', 'One-time training cost for each person in scope. The total is this × the number of people.', 'trainingPerFte', '+', id => `× ${inputs.teamSize} = ${formatMoney(costs(id).trainingPerFte * inputs.teamSize)}`)}
            {calcRow(
              `Readiness adjustment (gap ${gap} of 8)`,
              `Each readiness-gap point raises every investment line by ${(GAP_INVESTMENT_PER_POINT * 100).toFixed(1)}%. Change the answers on the Risks step.`,
              id => {
                const c = costs(id);
                return formatMoney(e(id).investment - (c.setup + c.dataReadinessInvestment + c.governanceSetup + c.trainingPerFte * inputs.teamSize));
              },
              { sign: '+' },
            )}
            {calcRow('Investment', 'Platform setup + data readiness + governance setup + training, plus the readiness adjustment.', id => formatMoney(e(id).investment), { strong: true, sign: '=' })}

            <tr>
              <td colSpan={5} className="pb-1 pt-5 text-xs font-medium uppercase tracking-wide text-gray-500">
                Net per month at maturity
              </td>
            </tr>
            {calcRow('Counted as saving', 'Value of the hours freed × the share counted as real savings. Both are set on earlier steps.', id => formatMoney(e(id).countedSavingPerMonth))}
            {sharedRow('Cost removed outright (EUR)', 'Tools or contractors that would no longer be needed, per month.', 'retiredCostMonthly', '+')}
            {calcRow('Run cost per month', 'From the running cost above.', id => formatMoney(e(id).usageCostPerMonth + e(id).platformAndGovernancePerMonth), { sign: '−' })}
            {calcRow('Net per month at maturity', 'Counted saving + cost removed outright − run cost.', id => formatMoney(e(id).steadyNetPerMonth), { strong: true, sign: '=' })}
          </tbody>
        </table>
      </div>

      <label className="flex items-center justify-between gap-4 text-sm">
        <span className="text-gray-900">
          Complex work in Hybrid runs on
          <InfoTip explanation={{ title: 'Hybrid', lines: ['Routine work runs on the local model. Complex work runs on this stronger model, so Hybrid pays for both platforms unless you type its own figures.'] }} />
        </span>
        <select
          value={inputs.hybridComplexTier}
          onChange={ev => setInputs({ hybridComplexTier: ev.target.value as TierId })}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2"
        >
          <option value="enterprise">Enterprise</option>
          <option value="frontier">Frontier</option>
          <option value="local">Local</option>
        </select>
      </label>
      <p className="text-xs text-gray-500">These are placeholder values. Replace them with the customer&apos;s figures and current vendor prices.</p>
    </div>
  );
}

type OverridableShared = Required<Pick<OptionOverrides, 'governanceMonthly' | 'dataReadinessInvestment' | 'governanceSetup' | 'trainingPerFte' | 'retiredCostMonthly'>>;
