import { useEffect, useState } from 'react';
import type { Currency, Scenario } from '@ai-roi-calc/engine';
import { fxFactor, DEFAULT_FX_RATES_NOTE } from '@ai-roi-calc/engine';

interface CurrencyChangeDialogProps {
  scenario: Scenario;
  target: Currency | null;
  onConvert: (rate: number) => void;
  onRelabel: () => void;
  onCancel: () => void;
}

export default function CurrencyChangeDialog({ scenario, target, onConvert, onRelabel, onCancel }: CurrencyChangeDialogProps) {
  const from = scenario.baseCurrency;
  const [rateText, setRateText] = useState('');

  useEffect(() => {
    if (target) setRateText(String(Number(fxFactor(from, target, scenario.fxRatesPerEur).toPrecision(6))));
  }, [target, from, scenario.fxRatesPerEur]);

  if (!target) return null;

  const rate = Number(rateText);
  const rateValid = Number.isFinite(rate) && rate > 0;
  const investment = scenario.oneTimeInvestment.reduce((sum, i) => sum + i.amount, 0);
  const fmt = (v: number, c: string) =>
    new Intl.NumberFormat(undefined, { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(v);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-labelledby="fx-title">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-8">
        <p id="fx-title" className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-6">
          Change currency {from} → {target}
        </p>

        <label htmlFor="fx-rate" className="block text-sm text-gray-600 mb-2">
          1 {from} =
        </label>
        <div className="flex items-baseline gap-3 mb-2">
          <input
            id="fx-rate"
            type="number"
            step="any"
            min="0"
            value={rateText}
            onChange={e => setRateText(e.target.value)}
            className="w-full text-4xl font-semibold text-blue-700 border-b-2 border-blue-200 focus:border-blue-600 focus:outline-none pb-1"
          />
          <span className="text-2xl font-semibold text-gray-900">{target}</span>
        </div>
        <p className="text-xs text-gray-400 mb-8">{DEFAULT_FX_RATES_NOTE}</p>

        <div className="space-y-3 mb-6">
          <button
            disabled={!rateValid}
            onClick={() => onConvert(rate)}
            className="w-full text-left px-5 py-4 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white transition"
          >
            <span className="block font-medium">Convert all amounts</span>
            <span className="block text-xs text-blue-100 mt-0.5">
              Investment {fmt(investment, from)} becomes {fmt(investment * (rateValid ? rate : 0), target)}
            </span>
          </button>
          <button
            onClick={onRelabel}
            className="w-full text-left px-5 py-4 rounded-lg border border-gray-300 hover:bg-gray-50 transition"
          >
            <span className="block font-medium text-gray-900">Relabel only</span>
            <span className="block text-xs text-gray-500 mt-0.5">Keep the numbers; use when you will re-enter client data in {target}</span>
          </button>
        </div>

        <button onClick={onCancel} className="text-sm text-gray-500 hover:text-gray-700">
          Cancel
        </button>
      </div>
    </div>
  );
}
