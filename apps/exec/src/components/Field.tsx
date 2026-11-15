import type { ReactNode } from 'react';

interface FieldProps {
  label: string;
  help?: string;
  /** Shows "Assumption to validate" under the field: the value is a placeholder until replaced. */
  assumption?: boolean;
  children: ReactNode;
}

export const INPUT_CLASS =
  'w-36 rounded-lg border border-gray-300 bg-white px-3 py-2 text-right text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600';

export default function Field({ label, help, assumption, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-medium text-gray-900">{label}</span>
        {children}
      </div>
      {help && <span className="text-xs text-gray-500">{help}</span>}
      {assumption && <span className="text-xs text-gray-400">Assumption to validate</span>}
    </div>
  );
}

/** Percent input: the stored value is a fraction 0..1, shown as 0..100. */
export function PercentInput({ value, onChange }: { value: number; onChange: (fraction: number) => void }) {
  const shown = Math.round(value * 10000) / 100;
  return (
    <span className="inline-flex items-center gap-1">
      <input
        type="number"
        step="1"
        className={INPUT_CLASS}
        value={shown}
        onChange={e => onChange((Number(e.target.value) || 0) / 100)}
      />
      <span className="text-sm text-gray-500">%</span>
    </span>
  );
}

export function NumberInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <input
      type="number"
      className={INPUT_CLASS}
      value={value}
      onChange={e => onChange(Number(e.target.value) || 0)}
    />
  );
}
