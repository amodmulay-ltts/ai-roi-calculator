import type { Results, Scenario } from '@ai-roi-calc/engine';
import { SOURCING_PRESETS, applySourcing, calculate, createExampleScenario } from '@ai-roi-calc/engine';

/** Presentation view over the engine's sourcing presets, so the walkthrough and the scenario share one source. */
export interface FlavourComparison {
  id: string;
  label: string;
  what: string;
  fit: string;
  watchOut: string;
  shape: string;
  scenario: Scenario;
  results: Results;
  tokenCost: number;
  fixedAiCost: number;
  effortCut: number;
}

export const AI_FLAVOURS = SOURCING_PRESETS;

export function compareFlavours(base = createExampleScenario()): FlavourComparison[] {
  return SOURCING_PRESETS.map(preset => {
    const scenario = applySourcing(base, preset.id);
    const results = calculate(scenario);
    const { cost } = results;
    const nonAiLines = scenario.costLines
      .filter(l => !l.aiSpecific)
      .reduce((sum, l) => sum + l.monthlyAmount.mature, 0);
    return {
      ...preset,
      scenario,
      results,
      tokenCost: cost.llmCost.mature,
      fixedAiCost: cost.directOpex.mature - cost.peopleCost.mature - cost.llmCost.mature - cost.seatCost.mature - nonAiLines,
      effortCut: preset.matureEffortCut,
    };
  });
}

/** What a self-hosted model needs to pay back: effort cut across, capacity cost down. */
export function localBreakEven(base = createExampleScenario()) {
  const infraOptions = [8_000, 12_000, 18_000];
  const cutOptions = [0.18, 0.22, 0.26, 0.3];
  return infraOptions.map(infra => ({
    infra,
    cells: cutOptions.map(cut => {
      const s = applySourcing(base, 'local');
      const line = s.costLines.find(l => l.id === 'self-hosted-capacity');
      if (line) line.monthlyAmount = { baseline: 0, transition: infra, mature: infra };
      if (s.productivityFactor.mode === 'direct-factor') {
        s.productivityFactor.mature = 1 - cut;
        s.productivityFactor.transition = 1 - cut / 2;
      }
      const fm = calculate(s).financialMetrics;
      return { cut, npv: fm.npv, payback: fm.paybackNotInHorizon ? null : fm.paybackMonth };
    }),
  }));
}
