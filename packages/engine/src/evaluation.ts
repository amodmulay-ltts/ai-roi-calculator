import type { EvaluationProductivityFactor, State } from './types.js';

/**
 * Evaluation-derived productivity (brief §5.2): the effort reduction is the activity-weighted maximum AI reduction,
 * scaled by the composite evaluation score of each state and by that state's AI adoption.
 *   factor_s = 1 − Σ(effortShare × maxAiReduction) × (C_s / 100) × adoption_s
 * C_s is the weighted mean of tier scores; a tier score is the weighted mean of its dimension scores (0–100 each).
 */

const STATES: State[] = ['baseline', 'transition', 'mature'];

/** Starting point for the STLC testing use case. Scores are placeholders until an evaluation is entered. */
export const DEFAULT_EVALUATION_FACTOR: EvaluationProductivityFactor = {
  mode: 'evaluation-derived',
  tiers: [
    {
      name: 'llm',
      weight: 50,
      dimensions: [
        { name: 'relevance', score: { baseline: 75, transition: 75, mature: 75 }, weight: 25 },
        { name: 'correctness', score: { baseline: 75, transition: 75, mature: 75 }, weight: 30 },
        { name: 'hallucination', score: { baseline: 75, transition: 75, mature: 75 }, weight: 20 },
        { name: 'toolCompletion', score: { baseline: 75, transition: 75, mature: 75 }, weight: 15 },
        { name: 'governance', score: { baseline: 75, transition: 75, mature: 75 }, weight: 10 },
      ],
    },
    {
      name: 'multiAgent',
      weight: 30,
      dimensions: [
        { name: 'relevance', score: { baseline: 75, transition: 75, mature: 75 }, weight: 25 },
        { name: 'correctness', score: { baseline: 75, transition: 75, mature: 75 }, weight: 30 },
        { name: 'hallucination', score: { baseline: 75, transition: 75, mature: 75 }, weight: 20 },
        { name: 'toolCompletion', score: { baseline: 75, transition: 75, mature: 75 }, weight: 15 },
        { name: 'governance', score: { baseline: 75, transition: 75, mature: 75 }, weight: 10 },
      ],
    },
    {
      name: 'multiTurn',
      weight: 20,
      dimensions: [
        { name: 'relevance', score: { baseline: 75, transition: 75, mature: 75 }, weight: 25 },
        { name: 'correctness', score: { baseline: 75, transition: 75, mature: 75 }, weight: 30 },
        { name: 'hallucination', score: { baseline: 75, transition: 75, mature: 75 }, weight: 20 },
        { name: 'toolCompletion', score: { baseline: 75, transition: 75, mature: 75 }, weight: 15 },
        { name: 'governance', score: { baseline: 75, transition: 75, mature: 75 }, weight: 10 },
      ],
    },
  ],
  activities: [
    { name: 'testDesign', effortShare: 0.3, maxAiReduction: 0.6 },
    { name: 'scriptDev', effortShare: 0.25, maxAiReduction: 0.65 },
    { name: 'execution', effortShare: 0.25, maxAiReduction: 0.4 },
    { name: 'defectRca', effortShare: 0.1, maxAiReduction: 0.65 },
    { name: 'reporting', effortShare: 0.1, maxAiReduction: 0.5 },
  ],
  adoption: { baseline: 1, transition: 1, mature: 1 },
};

/** Weighted mean; zero total weight gives zero rather than NaN. */
function weightedMean(items: Array<{ value: number; weight: number }>): number {
  const totalWeight = items.reduce((sum, i) => sum + i.weight, 0);
  if (totalWeight <= 0) return 0;
  return items.reduce((sum, i) => sum + i.value * i.weight, 0) / totalWeight;
}

/** Composite evaluation score C_s (0–100) per state. */
export function evaluationComposite(pf: EvaluationProductivityFactor): Record<State, number> {
  const result = { baseline: 0, transition: 0, mature: 0 } as Record<State, number>;
  for (const state of STATES) {
    const tierScores = pf.tiers.map(tier => ({
      value: weightedMean(tier.dimensions.map(d => ({ value: d.score[state], weight: d.weight }))),
      weight: tier.weight,
    }));
    result[state] = weightedMean(tierScores);
  }
  return result;
}

/** Effort multiplier per state from the evaluation (baseline is always the unchanged effort). */
export function evaluationFactor(pf: EvaluationProductivityFactor): Record<State, number> {
  const grossReduction = pf.activities.reduce((sum, a) => sum + a.effortShare * a.maxAiReduction, 0);
  const composite = evaluationComposite(pf);
  return {
    baseline: 1,
    transition: 1 - grossReduction * (composite.transition / 100) * pf.adoption.transition,
    mature: 1 - grossReduction * (composite.mature / 100) * pf.adoption.mature,
  };
}
