import { calculateCase } from './calc.js';
import { formatMoney } from './format.js';
import type { BusinessCaseInputs, CaseResult, PostureId, ReadinessAnswer } from './types.js';
import { breakEvenCashShare, breakEvenEffectiveness } from './breakeven.js';

/** Section 5.11: one sentence stating the verdict for a posture's expected case. */
export function headline(postureLabel: string, r: CaseResult): string {
  if (r.verdict === 'positive') {
    return `${postureLabel} AI pays back in month ${r.paybackMonth} and returns ${formatMoney(r.netValue36)} over 3 years (expected case).`;
  }
  if (r.verdict === 'marginal') {
    return `${postureLabel} AI pays back in month ${r.paybackMonth} but returns only ${formatMoney(r.netValue36)} over 3 years; the case is sensitive to assumptions.`;
  }
  return `${postureLabel} AI does not pay back within 36 months at current assumptions.`;
}

/** Section 5.11: the sentences that state what must be true for the case to hold, in order. */
export function whatMustBeTrue(inputs: BusinessCaseInputs, postureId: PostureId): string[] {
  const sentences: string[] = [];

  const effect = breakEvenEffectiveness(inputs, postureId);
  if (effect === null) {
    sentences.push('Even at five times the assumed effect this option does not pay back.');
  } else if (effect === 0) {
    sentences.push('The case holds even if AI delivers none of the assumed effect.');
  } else {
    sentences.push(`AI must deliver at least ${Math.round(effect * 100)}% of the assumed effort reduction to break even.`);
  }

  const cash = breakEvenCashShare(inputs, postureId);
  if (cash === null) {
    sentences.push('Even if all released capacity became real savings, this option does not pay back.');
  } else if (cash === 0) {
    sentences.push('The case holds even if no released capacity becomes a real saving.');
  } else {
    sentences.push(`At least ${Math.round(cash * 100)}% of released capacity must turn into real savings.`);
  }

  const gapCost = readinessCost(inputs, postureId);
  if (gapCost > 0) {
    sentences.push(`Readiness gaps reduce the 3-year value by ${formatMoney(gapCost)}.`);
  }

  return sentences;
}

/**
 * Expected 3-year value lost to readiness gaps: the value with every answer 'ready' minus the value as entered.
 * Never negative.
 */
export function readinessCost(inputs: BusinessCaseInputs, postureId: PostureId): number {
  const ready: Record<'data' | 'skills' | 'sponsorship' | 'compliance', ReadinessAnswer> = {
    data: 'ready',
    skills: 'ready',
    sponsorship: 'ready',
    compliance: 'ready',
  };
  const allReady = calculateCase({ ...inputs, readiness: ready }, postureId, 'expected').netValue36;
  const asEntered = calculateCase(inputs, postureId, 'expected').netValue36;
  return Math.max(0, allReady - asEntered);
}
