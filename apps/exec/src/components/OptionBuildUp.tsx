import type { ReactElement, ReactNode } from 'react';
import {
  GAP_INVESTMENT_PER_POINT,
  formatMoney,
  readinessGap,
  type BusinessCaseInputs,
  type PostureId,
  type PostureSummary,
  type TierAssumptions,
  type TierId,
} from '@ai-roi-calc/bizcase';
import { useExecStore } from '../store';
import { NumberInput } from './Field';
import InfoTip from './InfoTip';
import { POSTURE_LABEL } from './PostureCard';

const ORDER: PostureId[] = ['local', 'hybrid', 'enterprise', 'frontier'];
const TIER_LABEL: Record<TierId, string> = { local: 'Local', enterprise: 'Enterprise', frontier: 'Frontier' };

/** The model options (tiers) an option runs on. Hybrid runs routine work locally and complex work on the chosen tier. */
function tiersFor(posture: PostureId, inputs: BusinessCaseInputs): TierId[] {
  if (posture !== 'hybrid') return [posture];
  return inputs.hybridComplexTier === 'local' ? ['local'] : ['local', inputs.hybridComplexTier];
}

interface Props {
  inputs: BusinessCaseInputs;
  summaries: Record<PostureId, PostureSummary>;
}

/**
 * Shows, for each option, how the run cost, the investment and the net per month are built up, line by line,
 * and lets the presenter edit the figure behind every line. Local, enterprise and frontier are edited directly;
 * hybrid is made of local plus the stronger model, so its figures follow from theirs.
 */
export default function OptionBuildUp({ inputs, summaries }: Props): ReactElement {
  const setTier = useExecStore(s => s.setTier);
  const setInputs = useExecStore(s => s.setInputs);
  const gap = readinessGap(inputs.readiness);

  const cell = (id: PostureId, node: ReactNode, strong = false): ReactElement => (
    <td key={id} className={`py-2 text-right tabular-nums ${strong ? 'font-semibold text-gray-900' : 'text-gray-700'} ${summaries[id].allowed ? '' : 'opacity-40'}`}>
      {node}
    </td>
  );

  /** A row of figures worked out from the case. */
  const calcRow = (label: string, info: string, value: (id: PostureId) => string, opts: { strong?: boolean; sign?: string } = {}): ReactElement => (
    <tr className={`border-b border-gray-100 ${opts.strong ? 'bg-gray-50' : ''}`}>
      <td className={`py-2 pr-3 ${opts.strong ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
        {opts.sign && <span className="mr-1 text-gray-400">{opts.sign}</span>}
        {label}
        <InfoTip explanation={{ title: label, lines: [info] }} />
      </td>
      {ORDER.map(id => cell(id, value(id), opts.strong))}
    </tr>
  );

  /** A row where local, enterprise and frontier have an editable figure and hybrid follows from them. */
  const tierRow = (
    label: string,
    info: string,
    field: keyof TierAssumptions,
    hybridValue: () => string,
    opts: { sign?: string } = {},
  ): ReactElement => (
    <tr className="border-b border-gray-100">
      <td className="py-2 pr-3 text-gray-700">
        {opts.sign && <span className="mr-1 text-gray-400">{opts.sign}</span>}
        {label}
        <InfoTip explanation={{ title: label, lines: [info] }} />
      </td>
      {ORDER.map(id =>
        id === 'hybrid' ? (
          <td key={id} className={`py-2 text-right text-gray-500 tabular-nums ${summaries[id].allowed ? '' : 'opacity-40'}`}>
            {hybridValue()}
          </td>
        ) : (
          <td key={id} className={`py-2 text-right ${summaries[id].allowed ? '' : 'opacity-40'}`}>
            <NumberInput
              compact
              value={inputs.tiers[id][field]}
              ariaLabel={`${POSTURE_LABEL[id]}: ${label}`}
              onChange={v => setTier(id, { [field]: v })}
            />
          </td>
        ),
      )}
    </tr>
  );

  /** A figure shared by every option: one input across the table. */
  const sharedRow = (label: string, info: string, value: number, onChange: (n: number) => void, note?: string, sign?: string): ReactElement => (
    <tr className="border-b border-gray-100">
      <td className="py-2 pr-3 text-gray-700">
        {sign && <span className="mr-1 text-gray-400">{sign}</span>}
        {label}
        <InfoTip explanation={{ title: label, lines: [info] }} />
      </td>
      <td colSpan={4} className="py-2 text-right">
        <span className="inline-flex items-center gap-3">
          {note && <span className="text-xs text-gray-500">{note}</span>}
          <NumberInput compact value={value} ariaLabel={`${label} (all options)`} onChange={onChange} />
          <span className="text-xs text-gray-400">same for every option</span>
        </span>
      </td>
    </tr>
  );

  const e = (id: PostureId): PostureSummary["expected"] => summaries[id].expected;
  const assisted = (id: PostureId): number => e(id).tasks.reduce((sum, t) => sum + t.assistedHours, 0);
  const setup = (id: PostureId): number => tiersFor(id, inputs).reduce((sum, t) => sum + inputs.tiers[t].setup, 0);
  const training = inputs.trainingPerFte * inputs.teamSize;
  const rawInvestment = (id: PostureId): number => setup(id) + inputs.dataReadinessInvestment + inputs.governanceSetup + training;
  const hybridNote = (field: 'platformMonthly' | 'setup'): string => {
    const t = tiersFor('hybrid', inputs);
    return `${t.map(x => TIER_LABEL[x]).join(' + ')}: ${formatMoney(t.reduce((sum, x) => sum + inputs.tiers[x][field], 0))}`;
  };

  return (
    <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-6">
      <div>
        <h2 className="text-sm font-medium text-gray-900">How each option&apos;s cost is built</h2>
        <p className="mt-1 text-xs text-gray-500">
          Every line is worked out from the figures you can edit here. Local, Enterprise and Frontier are edited directly; Hybrid is made of
          Local plus the stronger model, so it follows from them. Expected case, at full effect.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
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
            {tierRow(
              'Usage cost per assisted hour (EUR)',
              'What each hour of AI-assisted work costs in model usage. Hybrid pays the local rate for routine work and the stronger model\'s rate for complex work.',
              'usageCostPerAssistedHour',
              () => {
                const h = assisted('hybrid');
                return `mixed: €${(h > 0 ? e("hybrid").usageCostPerMonth / h : 0).toFixed(2)}`;
              },
              { sign: '×' },
            )}
            {calcRow('Usage cost', 'Hours where AI is used × usage cost per assisted hour, for each piece of work, added up.', id => formatMoney(e(id).usageCostPerMonth), { sign: '=' })}
            {tierRow(
              'Platform per month (EUR)',
              'Licences, infrastructure and operations for the model option, every month. Hybrid pays for local and the stronger model.',
              'platformMonthly',
              () => hybridNote('platformMonthly'),
              { sign: '+' },
            )}
            {sharedRow(
              'Governance per month (EUR)',
              'Monitoring, assurance and compliance work that runs every month, whichever option is chosen.',
              inputs.governanceMonthly,
              n => setInputs({ governanceMonthly: n }),
              undefined,
              '+',
            )}
            {calcRow('Run cost per month', 'Usage cost + platform + governance.', id => formatMoney(e(id).usageCostPerMonth + e(id).platformAndGovernancePerMonth), { strong: true, sign: '=' })}

            <tr>
              <td colSpan={5} className="pb-1 pt-5 text-xs font-medium uppercase tracking-wide text-gray-500">
                One-time investment
              </td>
            </tr>
            {tierRow(
              'Platform setup (EUR)',
              'One-time cost to set up the model option. Hybrid sets up local and the stronger model.',
              'setup',
              () => hybridNote('setup'),
            )}
            {sharedRow(
              'Data readiness (EUR)',
              'One-time cost of getting the data into a state AI can use.',
              inputs.dataReadinessInvestment,
              n => setInputs({ dataReadinessInvestment: n }),
              undefined,
              '+',
            )}
            {sharedRow(
              'Governance setup (EUR)',
              'One-time cost of putting policies, controls and assurance in place.',
              inputs.governanceSetup,
              n => setInputs({ governanceSetup: n }),
              undefined,
              '+',
            )}
            {sharedRow(
              'Training per person (EUR)',
              'One-time training cost for each person in scope. The total is this × the number of people.',
              inputs.trainingPerFte,
              n => setInputs({ trainingPerFte: n }),
              `× ${inputs.teamSize} people = ${formatMoney(training)}`,
              '+',
            )}
            {calcRow(
              `Readiness adjustment (gap ${gap} of 8)`,
              `Each readiness-gap point raises every investment line by ${(GAP_INVESTMENT_PER_POINT * 100).toFixed(1)}%. Change the answers on the Risks step.`,
              id => formatMoney(e(id).investment - rawInvestment(id)),
              { sign: '+' },
            )}
            {calcRow('Investment', 'Platform setup + data readiness + governance setup + training, plus the readiness adjustment.', id => formatMoney(e(id).investment), { strong: true, sign: '=' })}

            <tr>
              <td colSpan={5} className="pb-1 pt-5 text-xs font-medium uppercase tracking-wide text-gray-500">
                Net per month at maturity
              </td>
            </tr>
            {calcRow('Counted as saving', 'Value of the hours freed × the share counted as real savings. Both are set on earlier steps.', id => formatMoney(e(id).countedSavingPerMonth))}
            {sharedRow(
              'Cost removed outright (EUR)',
              'Tools or contractors that would no longer be needed, per month.',
              inputs.retiredCostMonthly,
              n => setInputs({ retiredCostMonthly: n }),
              undefined,
              '+',
            )}
            {calcRow('Run cost per month', 'From the running cost above.', id => formatMoney(e(id).usageCostPerMonth + e(id).platformAndGovernancePerMonth), { sign: '−' })}
            {calcRow('Net per month at maturity', 'Counted saving + cost removed outright − run cost.', id => formatMoney(e(id).steadyNetPerMonth), { strong: true, sign: '=' })}
          </tbody>
        </table>
      </div>

      <label className="flex items-center justify-between gap-4 text-sm">
        <span className="text-gray-900">
          Complex work in Hybrid runs on
          <InfoTip explanation={{ title: 'Hybrid', lines: ['Routine work runs on the local model. Complex work runs on this stronger model, so Hybrid pays for both platforms.'] }} />
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
