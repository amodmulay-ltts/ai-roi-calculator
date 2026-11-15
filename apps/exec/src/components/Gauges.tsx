import type { ReactElement } from 'react';

interface MarginBarProps {
  title: string;
  /** Where the case breaks even; null when it cannot. */
  breakEven: number | null;
  /** The value the case assumes. The marker shows how far break-even is from it. */
  assumed: number;
  /** The value at the right-hand end of the bar. */
  scaleMax: number;
  breakEvenLabel: string;
  assumedLabel: string;
}

/** Break-even against the assumption: blue when there is headroom, red when the case needs more than assumed. */
export function MarginBar({ title, breakEven, assumed, scaleMax, breakEvenLabel, assumedLabel }: MarginBarProps): ReactElement {
  const position = (v: number): string => `${Math.min(100, Math.max(0, (v / scaleMax) * 100))}%`;
  const hasHeadroom = breakEven !== null && breakEven <= assumed;
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-gray-900">{title}</p>
      <div className="relative h-3 rounded-full bg-gray-100">
        {breakEven !== null && (
          <div
            className={`h-3 rounded-full ${hasHeadroom ? 'bg-blue-600' : 'bg-red-700'}`}
            style={{ width: position(breakEven) }}
          />
        )}
        <div className="absolute -top-1 h-5 w-0.5 bg-gray-900" style={{ left: position(assumed) }} />
      </div>
      <p className="flex justify-between text-xs text-gray-500">
        <span>{breakEvenLabel}</span>
        <span>{assumedLabel}</span>
      </p>
    </div>
  );
}

/** Eight blocks, one per readiness point lost. */
export function ReadinessGauge({ gap }: { gap: number }): ReactElement {
  return (
    <div className="space-y-1">
      <div className="flex gap-1" role="img" aria-label={`Readiness gap ${gap} of 8`}>
        {Array.from({ length: 8 }, (_, i) => (
          <span key={i} className={`h-3 flex-1 rounded-sm ${i < gap ? 'bg-red-700' : 'bg-gray-200'}`} />
        ))}
      </div>
      <p className="text-xs text-gray-500">Readiness gap: {gap} of 8.</p>
    </div>
  );
}
