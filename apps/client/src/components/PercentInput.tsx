interface PercentInputProps {
  id: string;
  /** Fraction, e.g. 0.3 for 30%. */
  value: number;
  /** Upper bound in percent. */
  max: number;
  onChange: (fraction: number) => void;
  size: 'lg' | 'md' | 'sm';
  step?: number;
}

const SIZES = {
  lg: ['w-32 text-5xl font-bold text-blue-700 border-b-2 border-blue-200 focus:border-blue-600', 'text-3xl text-gray-500'],
  md: ['w-24 text-3xl font-semibold text-gray-900 border-b-2 border-gray-200 focus:border-blue-600', 'text-xl text-gray-500'],
  sm: ['w-16 text-sm text-gray-700 border-b border-gray-200 focus:border-blue-600', 'text-sm text-gray-500'],
} as const;

/** Number input that shows and edits a fraction as a whole percentage. */
export default function PercentInput({ id, value, max, onChange, size, step = 5 }: PercentInputProps) {
  const [input, suffix] = SIZES[size];
  return (
    <span className="inline-flex items-baseline gap-1">
      <input
        id={id}
        type="number"
        min={0}
        max={max}
        step={step}
        value={Math.round(value * 1000) / 10}
        onChange={e => {
          const pct = Math.min(max, Math.max(0, Number(e.target.value) || 0));
          onChange(pct / 100);
        }}
        className={`${input} bg-transparent focus:outline-none`}
      />
      <span className={suffix}>%</span>
    </span>
  );
}
