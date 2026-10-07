import type { AiSourcing, Scenario } from '@ai-roi-calc/engine';
import { SOURCING_PRESETS, applySourcing, sourcingPreset } from '@ai-roi-calc/engine';
import Tooltip from './Tooltip';

interface SourcingPanelProps {
  scenario: Scenario;
  onReplace: (scenario: Scenario) => void;
}

const pct = (v: number) => `${Math.round(v * 100)}%`;

export default function SourcingPanel({ scenario, onReplace }: SourcingPanelProps) {
  const current = scenario.aiSourcing;
  const preset = current ? sourcingPreset(current) : null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-8">
      <div className="flex items-center mb-1">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Model selection</p>
        <Tooltip text="Applying a preset sets the AI effect (effort cut and review overhead) and the cost shape (token price, or no token bill plus a capacity line). Everything it writes stays editable, and switching back restores what it changed." />
      </div>

      {/* Hero */}
      <h3 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">
        {preset ? (
          <>
            <span className="text-blue-700">{preset.label}</span>
          </>
        ) : (
          'Not set'
        )}
      </h3>
      <p className="text-sm text-gray-600 max-w-2xl mb-8">
        {preset ? preset.shape : 'Pick how the customer would get the model. It changes both what AI costs and how much work it takes off the team.'}
      </p>

      {/* Supporting: the three options */}
      <div role="radiogroup" aria-label="AI sourcing" className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {SOURCING_PRESETS.map(p => {
          const selected = p.id === current;
          return (
            <button
              key={p.id}
              role="radio"
              aria-checked={selected}
              onClick={() => onReplace(applySourcing(scenario, p.id as AiSourcing))}
              className={`text-left rounded-xl border p-5 transition ${
                selected ? 'border-blue-300 bg-blue-50/50' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <p className={`font-semibold mb-1 ${selected ? 'text-blue-700' : 'text-gray-900'}`}>{p.label}</p>
              <p className="text-sm text-gray-600 mb-3">{p.what}</p>
              <dl className="text-xs text-gray-500 space-y-0.5">
                <div className="flex justify-between">
                  <dt>Effort cut, mature</dt>
                  <dd className="text-gray-700">{pct(p.matureEffortCut)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Review overhead</dt>
                  <dd className="text-gray-700">
                    {pct(p.reviewOverheadMature.hitl + p.reviewOverheadMature.rework + p.reviewOverheadMature.dualRun)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt>Token price</dt>
                  <dd className="text-gray-700">{p.tokenPriceFactor === 0 ? 'none' : `${p.tokenPriceFactor}× list`}</dd>
                </div>
                {!p.usesTokens && (
                  <div className="flex justify-between">
                    <dt>Capacity</dt>
                    <dd className="text-gray-700">€{p.infraPerMonthEur.toLocaleString('en')} / month</dd>
                  </div>
                )}
              </dl>
            </button>
          );
        })}
      </div>

      {/* Quiet */}
      {preset && (
        <div className="text-xs text-gray-500 space-y-1 max-w-3xl">
          <p>
            <span className="text-gray-700">Good for:</span> {preset.fit}
          </p>
          <p>
            <span className="text-gray-700">Watch out:</span> {preset.watchOut}
          </p>
          <p className="text-gray-400">
            Assumption, not a published figure: {preset.unsourced.join(', ')}. Applying a preset overwrites these; edit them
            above and in Costs once applied.
          </p>
        </div>
      )}
    </div>
  );
}
