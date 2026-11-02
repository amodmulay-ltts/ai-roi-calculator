/**
 * Evaluation-derived productivity: evaluation inputs must change the factor, and the money when effort drives people cost.
 */

import { describe, it, expect } from 'vitest';
import {
  calculate,
  createDefaultScenario,
  DEFAULT_EVALUATION_FACTOR,
  evaluationComposite,
  evaluationFactor,
  parseScenario,
  type Scenario,
} from '../index.js';
import type { EvaluationProductivityFactor } from '../index.js';

/** Sets every dimension of every tier to one score for a state. */
const scoreAll = (pf: EvaluationProductivityFactor, state: 'transition' | 'mature', value: number): EvaluationProductivityFactor => ({
  ...pf,
  tiers: pf.tiers.map(t => ({
    ...t,
    dimensions: t.dimensions.map(d => ({ ...d, score: { ...d.score, [state]: value } })),
  })),
});

const effortDerived = (pf: EvaluationProductivityFactor): Scenario => {
  const s = createDefaultScenario();
  s.peopleMode = { mode: 'effort-derived' };
  s.productivityFactor = pf;
  return s;
};

describe('Evaluation-derived productivity factor (brief §5.2)', () => {
  it('computes the default factor from the activity table and composite score', () => {
    // Gross reduction = 0.3×0.6 + 0.25×0.65 + 0.25×0.4 + 0.1×0.65 + 0.1×0.5 = 0.5575; composite 75 → 0.418125
    const factor = evaluationFactor(DEFAULT_EVALUATION_FACTOR);
    expect(factor.transition).toBeCloseTo(1 - 0.5575 * 0.75, 9);
    expect(factor.mature).toBeCloseTo(1 - 0.5575 * 0.75, 9);
    expect(factor.baseline).toBe(1);
  });

  it('takes the tier and dimension weights into account', () => {
    const composite = evaluationComposite(DEFAULT_EVALUATION_FACTOR);
    expect(composite.transition).toBeCloseTo(75, 9);
    // One weak dimension in the 50-weight tier lowers the composite by its share of that tier
    const weak = scoreAll(DEFAULT_EVALUATION_FACTOR, 'transition', 75);
    weak.tiers[0]!.dimensions[1]!.score.transition = 35; // correctness, weight 30 of 100
    const weakComposite = evaluationComposite(weak).transition;
    expect(weakComposite).toBeCloseTo(75 - (40 * 0.3 * 50) / 100, 9);
  });

  it('changes the factor when the evaluation scores change', () => {
    const better = evaluationFactor(scoreAll(DEFAULT_EVALUATION_FACTOR, 'mature', 95));
    const worse = evaluationFactor(scoreAll(DEFAULT_EVALUATION_FACTOR, 'mature', 40));
    expect(better.mature).toBeLessThan(worse.mature);
    expect(better.mature).not.toBeCloseTo(evaluationFactor(DEFAULT_EVALUATION_FACTOR).mature, 6);
  });

  it('applies each state’s AI adoption to the reduction', () => {
    const half = { ...DEFAULT_EVALUATION_FACTOR, adoption: { baseline: 1, transition: 0.5, mature: 1 } };
    const factor = evaluationFactor(half);
    expect(factor.transition).toBeCloseTo(1 - 0.5575 * 0.75 * 0.5, 9);
    expect(factor.mature).toBeCloseTo(evaluationFactor(DEFAULT_EVALUATION_FACTOR).mature, 9);
  });

  it('flows into effort and, when effort drives people cost, into ROI', () => {
    const base = calculate(effortDerived(DEFAULT_EVALUATION_FACTOR));
    const strong = calculate(effortDerived(scoreAll(DEFAULT_EVALUATION_FACTOR, 'mature', 100)));
    const weak = calculate(effortDerived(scoreAll(DEFAULT_EVALUATION_FACTOR, 'mature', 30)));

    expect(strong.effort.totalEffort.mature).toBeLessThan(base.effort.totalEffort.mature);
    expect(weak.effort.totalEffort.mature).toBeGreaterThan(base.effort.totalEffort.mature);
    expect(strong.financialMetrics.roiPercent).toBeGreaterThan(base.financialMetrics.roiPercent);
    expect(weak.financialMetrics.roiPercent).toBeLessThan(base.financialMetrics.roiPercent);
  });

  it('does not move money in staffing-plan mode, where the plan sets the team', () => {
    const plan = (pf: EvaluationProductivityFactor): Scenario => {
      const s = effortDerived(pf);
      s.peopleMode = { mode: 'staffing-plan' };
      return s;
    };
    const a = calculate(plan(DEFAULT_EVALUATION_FACTOR));
    const b = calculate(plan(scoreAll(DEFAULT_EVALUATION_FACTOR, 'mature', 30)));
    expect(b.financialMetrics.roiPercent).toBeCloseTo(a.financialMetrics.roiPercent, 9);
  });

  it('rejects an evaluation whose activity shares do not sum to 100%', () => {
    const s = effortDerived({
      ...DEFAULT_EVALUATION_FACTOR,
      activities: DEFAULT_EVALUATION_FACTOR.activities.map(a => ({ ...a, effortShare: a.effortShare * 0.5 })),
    });
    expect(parseScenario(effortDerived(DEFAULT_EVALUATION_FACTOR)).ok).toBe(true);
    expect(parseScenario(s).ok).toBe(false);
  });
});
