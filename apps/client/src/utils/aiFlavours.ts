import type { Results, Scenario } from '@ai-roi-calc/engine';
import { calculate, createExampleScenario } from '@ai-roi-calc/engine';

export type FlavourId = 'frontier' | 'enterprise' | 'local';

export interface AiFlavour {
  id: FlavourId;
  label: string;
  what: string;
  /** Why a customer picks it. */
  fit: string;
  watchOut: string;
  /** How the flavour changes the scenario, relative to the frontier-model case. */
  shape: string;
}

export const AI_FLAVOURS: AiFlavour[] = [
  {
    id: 'frontier',
    label: 'Frontier models',
    what: 'The most capable hosted models, used through the vendor’s API.',
    fit: 'Hardest reasoning, broadest task coverage, fastest to start: no infrastructure to build.',
    watchOut: 'Data leaves your network under the vendor’s terms; cost scales with every request.',
    shape: 'Paid per token. Little fixed cost, so the bill follows the work.',
  },
  {
    id: 'enterprise',
    label: 'Enterprise models',
    what: 'The same class of model run inside your own cloud tenant or a private deployment.',
    fit: 'Regulated work and customer IP that must stay inside your boundary, with near-frontier capability.',
    watchOut: 'Platform, governance and qualification cost on top; per-token price is usually higher, not lower.',
    shape: 'Per token plus a fixed platform fee, and the effort to qualify the tooling.',
  },
  {
    id: 'local',
    label: 'Local / open-weight models',
    what: 'Open-weight models you run on your own hardware, on-premises or at the edge.',
    fit: 'Data that may never leave the building, high steady volume, or no connectivity.',
    watchOut: 'Capability typically trails frontier on hard reasoning, so the effort cut is usually smaller, and you own the GPUs and the people who run them.',
    shape: 'No token bill at all: a fixed hardware and MLOps cost, whatever the volume.',
  },
];

/** Monthly self-hosted capacity and MLOps cost assumed for the local flavour, in the example's currency. */
const LOCAL_INFRA_PER_MONTH = 12_000;
/** Premium on per-token price for a private deployment: dedicated capacity batches less efficiently. */
const ENTERPRISE_TOKEN_PREMIUM = 1.3;
/** Effort cut assumed for open-weight models when frontier achieves the scenario's cut. */
const LOCAL_EFFORT_CUT = 0.18;
/** Output you trust less needs more checking, so review overhead rises with a weaker model. */
const LOCAL_REVIEW_OVERHEAD = { hitl: 0.12, rework: 0.05, dualRun: 0 };

/**
 * The three flavours applied to one scenario, so they can be compared on the same baseline.
 * These are illustrative starting assumptions for the walkthrough, not vendor claims: in a real
 * scenario the consultant sets the price table, the platform cost and the effort cut with the customer.
 */
export function applyFlavour(scenario: Scenario, id: FlavourId): Scenario {
  const s = structuredClone(scenario);
  if (id === 'frontier') return s;

  if (id === 'enterprise') {
    s.llmPricing = {
      ...s.llmPricing,
      prices: s.llmPricing.prices.map(p => ({
        ...p,
        inputPerMTok: p.inputPerMTok * ENTERPRISE_TOKEN_PREMIUM,
        outputPerMTok: p.outputPerMTok * ENTERPRISE_TOKEN_PREMIUM,
      })),
    };
    return s;
  }

  // Local: no token bill, a fixed capacity cost instead, and a smaller effort cut
  s.llmUsage = [];
  const platform = s.costLines.find(l => l.id === 'private-ai-platform');
  if (platform) {
    platform.name = 'Self-hosted GPU capacity and MLOps';
    platform.monthlyAmount = { baseline: 0, transition: LOCAL_INFRA_PER_MONTH, mature: LOCAL_INFRA_PER_MONTH };
  }
  if (s.productivityFactor.mode === 'direct-factor') {
    s.productivityFactor.mature = 1 - LOCAL_EFFORT_CUT;
    s.productivityFactor.transition = 1 - LOCAL_EFFORT_CUT / 2;
  }
  s.aiOverheadPercent = {
    ...s.aiOverheadPercent,
    mature: { ...LOCAL_REVIEW_OVERHEAD },
    transition: { hitl: 0.15, rework: 0.08, dualRun: 0.05 },
  };
  return s;
}

export interface FlavourComparison extends AiFlavour {
  scenario: Scenario;
  results: Results;
  /** Monthly token cost once mature. */
  tokenCost: number;
  /** Monthly AI cost lines other than tokens, once mature. */
  fixedAiCost: number;
  effortCut: number;
}

export function compareFlavours(base = createExampleScenario()): FlavourComparison[] {
  return AI_FLAVOURS.map(flavour => {
    const scenario = applyFlavour(base, flavour.id);
    const results = calculate(scenario);
    const { cost } = results;
    const nonAiLines = scenario.costLines
      .filter(l => !l.aiSpecific)
      .reduce((sum, l) => sum + l.monthlyAmount.mature, 0);
    return {
      ...flavour,
      scenario,
      results,
      tokenCost: cost.llmCost.mature,
      fixedAiCost: cost.directOpex.mature - cost.peopleCost.mature - cost.llmCost.mature - nonAiLines,
      effortCut: scenario.productivityFactor.mode === 'direct-factor' ? 1 - scenario.productivityFactor.mature : 0,
    };
  });
}

/** What a flavour with no token bill needs to match the frontier case: effort cut × fixed cost. */
export function localBreakEven(base = createExampleScenario()) {
  const infraOptions = [8_000, 12_000, 18_000];
  /** Middle row, used in the copy to name the cut a self-hosted model has to reach. */
  const cutOptions = [0.18, 0.22, 0.26, 0.3];
  return infraOptions.map(infra => ({
    infra,
    cells: cutOptions.map(cut => {
      const s = applyFlavour(base, 'local');
      const platform = s.costLines.find(l => l.id === 'private-ai-platform');
      if (platform) platform.monthlyAmount = { baseline: 0, transition: infra, mature: infra };
      if (s.productivityFactor.mode === 'direct-factor') {
        s.productivityFactor.mature = 1 - cut;
        s.productivityFactor.transition = 1 - cut / 2;
      }
      const fm = calculate(s).financialMetrics;
      return { cut, npv: fm.npv, payback: fm.paybackNotInHorizon ? null : fm.paybackMonth };
    }),
  }));
}
