import type { ImplementationModel, Results, Scenario } from './types.js';
import { calculate } from './engine.js';
import { DELIVERY_MODELS } from './delivery.js';

export interface ModelComparison {
  model: ImplementationModel;
  results: Results;
  /** Rank by NPV, 1 = most value. Ties share the better rank. */
  rank: number;
}

/** Calculates every delivery model against the same baseline, using the scenario's own (edited) profiles. */
export function compareDeliveryModels(scenario: Scenario): ModelComparison[] {
  const rows = DELIVERY_MODELS.map(model => ({ model, results: calculate({ ...scenario, primaryModel: model }) }));
  const npvs = rows.map(r => r.results.financialMetrics.npv);
  return rows.map((r, i) => ({ ...r, rank: 1 + npvs.filter(v => v > npvs[i]!).length }));
}
