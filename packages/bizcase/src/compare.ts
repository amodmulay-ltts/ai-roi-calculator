import { calculateCase } from './calc.js';
import type {
  BusinessCaseInputs,
  DataConstraint,
  PostureId,
  PostureSummary,
  TierId,
} from './types.js';

const POSTURE_ORDER: PostureId[] = ['local', 'hybrid', 'enterprise', 'frontier'];

/** Section 5.9: model tiers the data rules allow. */
export function allowedTiers(c: DataConstraint): TierId[] {
  if (c === 'public-ok') return ['local', 'enterprise', 'frontier'];
  if (c === 'restricted') return ['local', 'enterprise'];
  return ['local'];
}

/** Section 5.1: the distinct tiers a posture uses across the tasks, in order of first use. */
export function tiersForPosture(inputs: BusinessCaseInputs, postureId: PostureId): TierId[] {
  if (postureId !== 'hybrid') return [postureId];
  const tiers: TierId[] = [];
  for (const task of inputs.tasks) {
    const tier: TierId = task.difficulty === 'routine' ? 'local' : inputs.hybridComplexTier;
    if (!tiers.includes(tier)) tiers.push(tier);
  }
  return tiers;
}

const DISALLOWED_REASON: Partial<Record<DataConstraint, string>> = {
  restricted: 'Needs a public cloud model, which your data rules do not allow.',
  sovereign: 'Needs a model outside your own infrastructure, which your data rules do not allow.',
};

/** Computes every posture under every case, with its constraint status. */
export function compareAll(inputs: BusinessCaseInputs): Record<PostureId, PostureSummary> {
  const allowed = allowedTiers(inputs.dataConstraint);
  const result = {} as Record<PostureId, PostureSummary>;
  for (const postureId of POSTURE_ORDER) {
    const tiersUsed = tiersForPosture(inputs, postureId);
    const isAllowed = tiersUsed.every(t => allowed.includes(t));
    result[postureId] = {
      postureId,
      allowed: isAllowed,
      disallowedReason: isAllowed ? null : (DISALLOWED_REASON[inputs.dataConstraint] ?? null),
      tiersUsed,
      expected: calculateCase(inputs, postureId, 'expected'),
      conservative: calculateCase(inputs, postureId, 'conservative'),
      stretch: calculateCase(inputs, postureId, 'stretch'),
    };
  }
  return result;
}

/** The allowed posture with the highest expected 3-year net value; ties go to the earlier posture in order. */
export function recommendedPosture(inputs: BusinessCaseInputs): PostureId | null {
  const summaries = compareAll(inputs);
  let best: PostureId | null = null;
  let bestValue = -Infinity;
  for (const postureId of POSTURE_ORDER) {
    const s = summaries[postureId];
    if (!s.allowed) continue;
    if (s.expected.netValue36 > bestValue) {
      best = postureId;
      bestValue = s.expected.netValue36;
    }
  }
  return best;
}
