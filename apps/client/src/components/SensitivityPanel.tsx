import { useMemo } from 'react';
import type { Scenario } from '@ai-roi-calc/engine';
import { paybackGrid, tornado } from '@ai-roi-calc/engine';
import Tooltip from './Tooltip';

interface SensitivityPanelProps {
  scenario: Scenario;
  formatCurrency: (value: number) => string;
}

export default function SensitivityPanel({ scenario, formatCurrency }: SensitivityPanelProps) {
  const t = useMemo(() => tornado(scenario), [scenario]);
  const grid = useMemo(() => paybackGrid(scenario), [scenario]);
  const top = t.rows[0]!;

  const values = t.rows.flatMap(r => [r.npvLow, r.npvHigh]).concat(t.baseNpv, 0);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pos = (v: number) => ((v - min) / span) * 100;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-8">
      <div className="flex items-center mb-1">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Sensitivity</p>
        <Tooltip text="Each driver is moved 20% down and up on its own, everything else unchanged. Bars show the resulting NPV range; the line marks the current NPV." />
      </div>

      {/* Hero */}
      <h3 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">
        NPV depends most on: <span className="text-blue-700">{top.label}</span>
      </h3>
      <p className="text-sm text-gray-600 mb-8">
        {formatCurrency(Math.min(top.npvLow, top.npvHigh))} to {formatCurrency(Math.max(top.npvLow, top.npvHigh))} when it moves ±20%, against{' '}
        {formatCurrency(t.baseNpv)} today.
      </p>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
        {/* Supporting 1: tornado */}
        <div>
          <p className="text-sm font-semibold text-gray-900 mb-4">NPV when one driver moves ±20%</p>
          <ul className="space-y-4">
            {t.rows.map(r => {
              const lo = Math.min(r.npvLow, r.npvHigh);
              const hi = Math.max(r.npvLow, r.npvHigh);
              const worse = r.npvLow < r.npvHigh ? r.lowLabel : r.highLabel;
              const better = r.npvLow < r.npvHigh ? r.highLabel : r.lowLabel;
              return (
                <li key={r.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-900">{r.label}</span>
                    <span className="text-xs text-gray-500">
                      {formatCurrency(lo)} – {formatCurrency(hi)}
                    </span>
                  </div>
                  <div className="relative h-3 bg-gray-100 rounded-full" aria-hidden="true">
                    <span
                      className="absolute top-0 h-3 bg-gray-400 rounded-l-full"
                      style={{ left: `${pos(lo)}%`, width: `${Math.max(0, pos(t.baseNpv) - pos(lo))}%` }}
                    />
                    <span
                      className="absolute top-0 h-3 bg-blue-600 rounded-r-full"
                      style={{ left: `${pos(t.baseNpv)}%`, width: `${Math.max(0, pos(hi) - pos(t.baseNpv))}%` }}
                    />
                    <span className="absolute -top-1 h-5 w-0.5 bg-gray-900" style={{ left: `${pos(t.baseNpv)}%` }} />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Lower: {worse} · Higher: {better}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Supporting 2: payback grid */}
        <div>
          <div className="flex items-center mb-4">
            <p className="text-sm font-semibold text-gray-900">Payback month: AI effect × transition length</p>
            <Tooltip text="Rows: share of the assumed AI effort reduction that actually materialises, with every cost kept. Columns: transition length. The outlined cell is the current scenario." />
          </div>
          <table className="w-full text-sm text-center">
            <thead>
              <tr className="text-xs text-gray-500">
                <th className="py-2 text-left font-normal">AI effect</th>
                {grid.transitionMonths.map(m => (
                  <th key={m} className="py-2 font-normal">
                    {m} mo
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grid.realisation.map((share, i) => (
                <tr key={share} className="border-t border-gray-100">
                  <td className="py-2 text-left text-xs text-gray-500">{Math.round(share * 100)}%</td>
                  {grid.cells[i]!.map((cell, j) => {
                    const isBase = i === grid.base.row && j === grid.base.col;
                    return (
                      <td key={j} className="py-1.5">
                        <span
                          className={`inline-block min-w-14 px-2 py-1 rounded ${
                            isBase ? 'ring-2 ring-blue-600 font-semibold text-blue-700' : cell === null ? 'text-gray-400' : 'text-gray-800'
                          }`}
                        >
                          {cell === null ? 'never' : `M${cell}`}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-gray-400 mt-3">
            "never" means no payback within {scenario.timeValue.horizonMonths} months.
          </p>
        </div>
      </div>
    </div>
  );
}
