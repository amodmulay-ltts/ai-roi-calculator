import type { ReactElement } from 'react';
import { formatMoney, formatPayback, type PostureSummary, type Verdict } from '@ai-roi-calc/bizcase';

export const POSTURE_LABEL = { local: 'Local', hybrid: 'Hybrid', enterprise: 'Enterprise', frontier: 'Frontier' } as const;

export const POSTURE_DESCRIPTION = {
  local: 'Open models on your own infrastructure. No usage charges; lower capability.',
  hybrid: 'Routine work on local models, complex work on a stronger model.',
  enterprise: 'Contracted or private commercial models with predictable pricing and data controls.',
  frontier: 'Most capable public models, paid per use.',
} as const;

const VERDICT_BADGE: Record<Verdict, { text: string; className: string }> = {
  positive: { text: 'Pays back', className: 'bg-blue-50 text-blue-700' },
  marginal: { text: 'Marginal', className: 'bg-gray-100 text-gray-700' },
  negative: { text: 'Does not pay back', className: 'bg-red-50 text-red-700' },
};

/** Break-even line for a card, from the break-even effectiveness (null means it cannot break even). */
export function breakEvenText(effect: number | null): string {
  if (effect === null) return 'Cannot break even.';
  if (effect === 0) return 'Breaks even at any effect.';
  return `Breaks even if AI delivers ${Math.round(effect * 100)}% of the assumed effect.`;
}

interface PostureCardProps {
  summary: PostureSummary;
  selected: boolean;
  recommended: boolean;
  breakEven: number | null;
  onSelect: () => void;
}

export default function PostureCard({ summary, selected, recommended, breakEven, onSelect }: PostureCardProps): ReactElement {
  const r = summary.expected;
  const badge = VERDICT_BADGE[r.verdict];
  const disabled = !summary.allowed;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex h-full flex-col rounded-xl border bg-white p-4 text-left transition ${
        disabled ? 'cursor-not-allowed border-gray-200 opacity-50' : 'hover:bg-gray-50'
      } ${selected ? 'border-blue-600 ring-2 ring-blue-600' : 'border-gray-200'}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-base font-semibold text-gray-900">{POSTURE_LABEL[summary.postureId]}</span>
        {recommended && !disabled && (
          <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs text-white">Recommended</span>
        )}
      </div>
      <p className="mt-1 text-xs text-gray-500">{POSTURE_DESCRIPTION[summary.postureId]}</p>
      {disabled ? (
        <p className="mt-3 text-sm text-red-700">{summary.disallowedReason}</p>
      ) : (
        <span className={`mt-3 inline-block self-start rounded-full px-2 py-0.5 text-xs ${badge.className}`}>{badge.text}</span>
      )}
      <dl className="mt-4 space-y-2 text-sm">
        <Row label="Run cost per month" value={formatMoney(r.usageCostPerMonth + r.platformAndGovernancePerMonth)} />
        <Row label="Investment" value={formatMoney(r.investment)} />
        <Row label="Net per month at maturity" value={formatMoney(r.steadyNetPerMonth)} />
        <Row label="Payback" value={formatPayback(r.paybackMonth)} />
        <Row label="3-year net value" value={formatMoney(r.netValue36)} />
      </dl>
      <p className="mt-3 text-xs text-gray-500">{breakEvenText(breakEven)}</p>
    </button>
  );
}

function Row({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-right font-medium text-gray-900">{value}</dd>
    </div>
  );
}
