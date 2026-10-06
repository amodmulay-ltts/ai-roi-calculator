import type { LlmPricing, Scenario, State } from './types.js';
import type { DeliveryContext } from './delivery.js';
import { fxFactor } from './currency.js';

/** Anthropic first-party API list prices, USD per million tokens. Editable per scenario. */
export const DEFAULT_LLM_PRICING: LlmPricing = {
  currency: 'USD',
  asOf: '2026-09-25',
  source: 'Anthropic API list prices (first-party). Other vendors: enter from their price list.',
  prices: [
    { id: 'claude-fable-5-1', label: 'Claude Fable 5.1', inputPerMTok: 10, outputPerMTok: 50 },
    { id: 'claude-opus-5-5', label: 'Claude Opus 5.5', inputPerMTok: 4, outputPerMTok: 20 },
    { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5', inputPerMTok: 2, outputPerMTok: 10 },
    { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5', inputPerMTok: 1, outputPerMTok: 5 },
    { id: 'other', label: 'Other model (enter vendor price)', inputPerMTok: 0, outputPerMTok: 0 },
  ],
};

export interface LlmCostBreakdown {
  total: Record<State, number>;
  /** Monthly cost per usage item id, per state, in the scenario currency. */
  byUsage: Record<string, Record<State, number>>;
  /** Requests per month per usage item id (before AI adoption scaling). */
  requestsPerMonth: Record<string, number>;
}

/**
 * Monthly model-usage cost: requests × tokens × price, converted to the scenario currency.
 * Requests = linked workload volume × requests per unit (or requests per month when unlinked),
 * scaled by the delivery model's AI adoption; none in the baseline.
 */
export function llmCosts(scenario: Scenario, ctx: DeliveryContext): LlmCostBreakdown {
  const pricing = scenario.llmPricing;
  const fx = fxFactor(pricing.currency, scenario.baseCurrency, scenario.fxRatesPerEur) * (scenario.tokenPriceFactor ?? 1);
  const result: LlmCostBreakdown = {
    total: { baseline: 0, transition: 0, mature: 0 },
    byUsage: {},
    requestsPerMonth: {},
  };

  for (const usage of scenario.llmUsage) {
    const price = pricing.prices.find(p => p.id === usage.priceId);
    const volume = usage.kpiId ? (scenario.kpis.find(k => k.id === usage.kpiId)?.volumePerMonth ?? 0) : 1;
    const requests = volume * usage.requestsPerUnit;
    const perRequest = price
      ? (usage.inputTokensPerRequest * price.inputPerMTok + usage.outputTokensPerRequest * price.outputPerMTok) / 1_000_000
      : 0;
    const monthly = requests * perRequest * fx;

    result.requestsPerMonth[usage.id] = requests;
    const byState = {
      baseline: 0,
      transition: monthly * ctx.adoption.transition,
      mature: monthly * ctx.adoption.mature,
    };
    result.byUsage[usage.id] = byState;
    result.total.transition += byState.transition;
    result.total.mature += byState.mature;
  }
  return result;
}
