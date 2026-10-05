import { useState } from 'react';
import type { LlmPricing, LlmUsage, Results, Scenario } from '@ai-roi-calc/engine';
import Tooltip from './Tooltip';

interface AiUsagePanelProps {
  scenario: Scenario;
  results: Results;
  formatCurrency: (value: number) => string;
  onUpdate: (updates: Partial<Scenario>) => void;
}

const num = (v: number) => Math.round(v).toLocaleString('en');
const FIXED = '__fixed__';

export default function AiUsagePanel({ scenario, results, formatCurrency, onUpdate }: AiUsagePanelProps) {
  const [draft, setDraft] = useState<{ usage: LlmUsage[]; pricing: LlmPricing } | null>(null);
  const { cost } = results;
  const pricing = scenario.llmPricing;
  const workload = scenario.kpis.filter(k => k.volumePerMonth !== undefined);
  const saving = cost.fullyLoaded.baseline - cost.fullyLoaded.mature;
  const priceLabel = (id: string) => pricing.prices.find(p => p.id === id)?.label ?? 'Unknown model';

  if (draft) {
    const { usage, pricing: dp } = draft;
    const setUsage = (id: string, changes: Partial<LlmUsage>) =>
      setDraft({ ...draft, usage: usage.map(u => (u.id === id ? { ...u, ...changes } : u)) });
    const setPrice = (id: string, changes: Partial<LlmPricing['prices'][number]>) =>
      setDraft({ ...draft, pricing: { ...dp, prices: dp.prices.map(p => (p.id === id ? { ...p, ...changes } : p)) } });
    const inUse = new Set(usage.map(u => u.priceId));
    const changed = JSON.stringify(draft) !== JSON.stringify({ usage: scenario.llmUsage, pricing });
    const input = 'px-2 py-1 border border-gray-300 rounded text-xs';

    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center">
          <h4 className="text-sm font-semibold text-gray-900">Edit AI model usage and prices</h4>
          <Tooltip text="Monthly cost = requests × (input tokens × input price + output tokens × output price) ÷ 1,000,000. Requests follow the linked work item's monthly volume and the delivery model's AI adoption." />
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-500 text-left border-b border-gray-200">
              <th className="px-4 py-2 font-normal">Usage</th>
              <th className="px-2 py-2 font-normal">Model</th>
              <th className="px-2 py-2 font-normal">Driven by</th>
              <th className="px-2 py-2 font-normal text-right">Requests per unit</th>
              <th className="px-2 py-2 font-normal text-right">Input tokens / request</th>
              <th className="px-2 py-2 font-normal text-right">Output tokens / request</th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {usage.map(u => (
              <tr key={u.id} className="border-b border-gray-100">
                <td className="px-4 py-2">
                  <input aria-label="Usage name" value={u.name} onChange={e => setUsage(u.id, { name: e.target.value })} className={`w-44 ${input}`} />
                </td>
                <td className="px-2 py-2">
                  <select aria-label={`${u.name} model`} value={u.priceId} onChange={e => setUsage(u.id, { priceId: e.target.value })} className={input}>
                    {dp.prices.map(p => (
                      <option key={p.id} value={p.id}>{p.label}</option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-2">
                  <select
                    aria-label={`${u.name} driven by`}
                    value={u.kpiId ?? FIXED}
                    onChange={e => setUsage(u.id, { kpiId: e.target.value === FIXED ? undefined : e.target.value })}
                    className={input}
                  >
                    {workload.map(k => (
                      <option key={k.id} value={k.id}>per {k.volumeUnit?.replace(/s$/, '') ?? 'unit'} ({k.name})</option>
                    ))}
                    <option value={FIXED}>fixed per month</option>
                  </select>
                </td>
                {(['requestsPerUnit', 'inputTokensPerRequest', 'outputTokensPerRequest'] as const).map(field => (
                  <td key={field} className="px-2 py-2 text-right">
                    <input
                      aria-label={`${u.name} ${field}`}
                      type="number"
                      min={0}
                      value={u[field]}
                      onChange={e => setUsage(u.id, { [field]: Number(e.target.value) || 0 })}
                      className={`w-24 text-right ${input}`}
                    />
                  </td>
                ))}
                <td className="px-2 py-2">
                  <button onClick={() => setDraft({ ...draft, usage: usage.filter(x => x.id !== u.id) })} className="text-xs text-gray-500 hover:text-gray-900">
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-3">
          <button
            onClick={() =>
              setDraft({
                ...draft,
                usage: [
                  ...usage,
                  {
                    id: `usage-${Date.now()}`,
                    name: 'New AI usage',
                    priceId: dp.prices[0]?.id ?? 'other',
                    kpiId: workload[0]?.id,
                    requestsPerUnit: 0,
                    inputTokensPerRequest: 2_000,
                    outputTokensPerRequest: 500,
                  },
                ],
              })
            }
            className="text-sm text-blue-700 hover:text-blue-900"
          >
            Add usage
          </button>
        </div>

        <div className="px-4 py-4 border-t border-gray-200">
          <div className="flex flex-wrap items-end gap-4 mb-3">
            <p className="text-sm font-semibold text-gray-900">Price table ({dp.currency} per million tokens)</p>
            <label className="text-xs text-gray-500 flex items-center gap-2">
              Prices as of
              <input type="date" value={dp.asOf} onChange={e => setDraft({ ...draft, pricing: { ...dp, asOf: e.target.value } })} className={input} />
            </label>
          </div>
          <table className="text-sm mb-3">
            <thead>
              <tr className="text-xs text-gray-500 text-left">
                <th className="pr-4 py-1 font-normal">Model</th>
                <th className="px-2 py-1 font-normal text-right">Input</th>
                <th className="px-2 py-1 font-normal text-right">Output</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {dp.prices.map(p => (
                <tr key={p.id}>
                  <td className="pr-4 py-1">
                    <input aria-label="Model name" value={p.label} onChange={e => setPrice(p.id, { label: e.target.value })} className={`w-56 ${input}`} />
                  </td>
                  {(['inputPerMTok', 'outputPerMTok'] as const).map(field => (
                    <td key={field} className="px-2 py-1">
                      <input
                        aria-label={`${p.label} ${field === 'inputPerMTok' ? 'input' : 'output'} price`}
                        type="number"
                        min={0}
                        step="any"
                        value={p[field]}
                        onChange={e => setPrice(p.id, { [field]: Number(e.target.value) || 0 })}
                        className={`w-20 text-right ${input}`}
                      />
                    </td>
                  ))}
                  <td className="px-2 py-1">
                    <button
                      disabled={inUse.has(p.id)}
                      title={inUse.has(p.id) ? 'Used by a usage item' : undefined}
                      onClick={() => setDraft({ ...draft, pricing: { ...dp, prices: dp.prices.filter(x => x.id !== p.id) } })}
                      className="text-xs text-gray-500 hover:text-gray-900 disabled:opacity-30"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            onClick={() =>
              setDraft({
                ...draft,
                pricing: { ...dp, prices: [...dp.prices, { id: `model-${Date.now()}`, label: 'New model', inputPerMTok: 0, outputPerMTok: 0 }] },
              })
            }
            className="text-sm text-blue-700 hover:text-blue-900 mr-6"
          >
            Add model
          </button>
          <label className="block mt-3 text-xs text-gray-500">
            Source
            <input value={dp.source} onChange={e => setDraft({ ...draft, pricing: { ...dp, source: e.target.value } })} className={`block w-full mt-1 ${input}`} />
          </label>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex gap-3 justify-end">
          <button onClick={() => setDraft(null)} className="px-4 py-2 border border-gray-300 hover:bg-gray-100 text-gray-700 text-sm rounded-lg">
            Cancel
          </button>
          <button
            onClick={() => {
              onUpdate({ llmUsage: draft.usage, llmPricing: draft.pricing });
              setDraft(null);
            }}
            disabled={!changed}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white text-sm font-medium rounded-lg"
          >
            Save changes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-8">
      <div className="flex items-start justify-between gap-4 mb-1">
        <div className="flex items-center">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">AI model usage</p>
          <Tooltip text="Token cost of the AI models, from requests × tokens × list price. It follows the workload volume and the delivery model's AI adoption. Licences and platform fees are separate cost lines." />
        </div>
        <button
          onClick={() => setDraft({ usage: structuredClone(scenario.llmUsage), pricing: structuredClone(pricing) })}
          className="text-sm text-blue-700 hover:text-blue-900"
        >
          Edit usage and prices
        </button>
      </div>

      {/* Hero */}
      <p className="text-4xl font-bold text-gray-900 mb-1">
        {formatCurrency(cost.llmCost.mature)}
        <span className="text-xl font-semibold text-gray-500"> / month</span>
      </p>
      <p className="text-sm text-gray-600 mb-6">
        {scenario.llmUsage.length === 0
          ? 'No AI model usage modelled. Add usage to cost tokens from requests and list prices.'
          : saving > 0
            ? `${Math.round((cost.llmCost.mature / saving) * 100)}% of the monthly saving, once mature`
            : 'Once mature'}
      </p>

      {/* Supporting: per usage */}
      {scenario.llmUsage.length > 0 && (
        <table className="w-full max-w-3xl text-sm">
          <thead>
            <tr className="text-xs text-gray-400 text-left">
              <th className="font-normal pb-1">Usage</th>
              <th className="font-normal pb-1">Model</th>
              <th className="font-normal pb-1 text-right">Requests / month</th>
              <th className="font-normal pb-1 text-right">Cost / month</th>
            </tr>
          </thead>
          <tbody>
            {scenario.llmUsage.map(u => (
              <tr key={u.id} className="border-t border-gray-100">
                <td className="py-1.5 text-gray-900">{u.name}</td>
                <td className="py-1.5 text-gray-600">{priceLabel(u.priceId)}</td>
                <td className="py-1.5 text-right text-gray-700">{num(cost.llmRequestsPerMonth[u.id] ?? 0)}</td>
                <td className="py-1.5 text-right text-gray-700">{formatCurrency(cost.llmCostByUsage[u.id]?.mature ?? 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Quiet: price provenance */}
      <p className="mt-4 text-xs text-gray-400">
        Prices as of {pricing.asOf}, {pricing.currency} per million tokens: {pricing.source} Not fetched live; check current prices before presenting.
      </p>
    </div>
  );
}
