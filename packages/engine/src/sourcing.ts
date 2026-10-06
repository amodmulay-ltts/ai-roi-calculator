import type { AiSourcing, Scenario } from './types.js';

export interface SourcingPreset {
  id: AiSourcing;
  label: string;
  what: string;
  /** Why a customer picks it. */
  fit: string;
  watchOut: string;
  /** How the money behaves under this option. */
  shape: string;
  /** Effort cut once mature, as a fraction of the work. */
  matureEffortCut: number;
  transitionEffortCut: number;
  reviewOverheadMature: { hitl: number; rework: number; dualRun: number };
  reviewOverheadTransition: { hitl: number; rework: number; dualRun: number };
  /** Multiplier on token list prices. 1 = vendor API list price, 0 = self-hosted, no token bill. */
  tokenPriceFactor: number;
  /** False when there is no token bill at all, as with self-hosted models. */
  usesTokens: boolean;
  /** Monthly self-hosted capacity and MLOps cost, when usesTokens is false (scenario currency). */
  infraPerMonth: number;
  /** Set on values that are assumptions rather than published figures. */
  unsourced: string[];
}

/**
 * Starting assumptions for the three ways of sourcing a model. Shared by the walkthrough and the
 * scenario, so the two cannot drift. These are not vendor claims: a consultant sets the real figures
 * with the customer, and `unsourced` names the ones with no published basis.
 */
export const SOURCING_PRESETS: SourcingPreset[] = [
  {
    id: 'frontier',
    label: 'Frontier models',
    what: 'The most capable hosted models, used through the vendor’s API.',
    fit: 'Hardest reasoning, broadest task coverage, fastest to start: no infrastructure to build.',
    watchOut: 'Data leaves your network under the vendor’s terms; cost scales with every request.',
    shape: 'Paid per token. Little fixed cost, so the bill follows the work.',
    matureEffortCut: 0.3,
    transitionEffortCut: 0.15,
    reviewOverheadMature: { hitl: 0.08, rework: 0.03, dualRun: 0 },
    reviewOverheadTransition: { hitl: 0.12, rework: 0.06, dualRun: 0.05 },
    tokenPriceFactor: 1,
    usesTokens: true,
    infraPerMonth: 0,
    unsourced: ['effort cut', 'review overhead'],
  },
  {
    id: 'enterprise',
    label: 'Enterprise models',
    what: 'The same class of model run inside your own cloud tenant or a private deployment.',
    fit: 'Regulated work and customer IP that must stay inside your boundary, with near-frontier capability.',
    watchOut: 'Platform, governance and qualification cost on top; per-token price is usually higher, not lower.',
    shape: 'Per token plus a fixed platform fee, and the effort to qualify the tooling.',
    matureEffortCut: 0.3,
    transitionEffortCut: 0.15,
    reviewOverheadMature: { hitl: 0.08, rework: 0.03, dualRun: 0 },
    reviewOverheadTransition: { hitl: 0.12, rework: 0.06, dualRun: 0.05 },
    tokenPriceFactor: 1.3,
    usesTokens: true,
    infraPerMonth: 0,
    unsourced: ['effort cut', 'review overhead', 'token price premium'],
  },
  {
    id: 'local',
    label: 'Local / open-weight models',
    what: 'Open-weight models you run on your own hardware, on-premises or at the edge.',
    fit: 'Data that may never leave the building, high steady volume, or no connectivity.',
    watchOut:
      'Capability typically trails frontier on hard reasoning, so the effort cut is usually smaller, and you own the GPUs and the people who run them.',
    shape: 'No token bill at all: a fixed hardware and MLOps cost, whatever the volume.',
    matureEffortCut: 0.18,
    transitionEffortCut: 0.09,
    reviewOverheadMature: { hitl: 0.12, rework: 0.05, dualRun: 0 },
    reviewOverheadTransition: { hitl: 0.15, rework: 0.08, dualRun: 0.05 },
    tokenPriceFactor: 0,
    usesTokens: false,
    infraPerMonth: 12_000,
    unsourced: ['effort cut', 'review overhead', 'capacity cost'],
  },
];

export const sourcingPreset = (id: AiSourcing): SourcingPreset =>
  SOURCING_PRESETS.find(p => p.id === id) ?? SOURCING_PRESETS[0]!;

/** Cost line the local preset writes its capacity cost into. */
export const SELF_HOSTED_LINE_ID = 'self-hosted-capacity';

/**
 * Applies a preset to a scenario: the AI effect (effort cut and review overhead) and the cost shape
 * (token prices, or no tokens plus a capacity line). Everything it writes stays editable afterwards.
 */
export function applySourcing(scenario: Scenario, id: AiSourcing): Scenario {
  const preset = sourcingPreset(id);
  const s = structuredClone(scenario);
  s.aiSourcing = id;

  if (s.productivityFactor.mode === 'direct-factor') {
    s.productivityFactor.mature = 1 - preset.matureEffortCut;
    s.productivityFactor.transition = 1 - preset.transitionEffortCut;
  }
  s.aiOverheadPercent = {
    ...s.aiOverheadPercent,
    mature: { ...preset.reviewOverheadMature },
    transition: { ...preset.reviewOverheadTransition },
  };

  // The dated list prices are left alone; the factor carries the difference, so switching is reversible
  s.tokenPriceFactor = preset.tokenPriceFactor;

  const others = s.costLines.filter(l => l.id !== SELF_HOSTED_LINE_ID);
  if (preset.usesTokens) {
    s.costLines = others;
  } else {
    // Usage items describe the work, which does not change — they simply cost nothing per token
    s.costLines = [
      ...others,
      {
        id: SELF_HOSTED_LINE_ID,
        name: 'Self-hosted GPU capacity and MLOps',
        category: 'Infra',
        monthlyAmount: { baseline: 0, transition: preset.infraPerMonth, mature: preset.infraPerMonth },
        chargeable: true,
        aiSpecific: true,
      },
    ];
  }
  return s;
}
