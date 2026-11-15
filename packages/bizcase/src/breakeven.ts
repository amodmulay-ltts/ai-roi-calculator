import { calculateCase } from './calc.js';
import type { BusinessCaseInputs, PostureId } from './types.js';

const ITERATIONS = 60;

/**
 * Smallest effectiveness multiplier (applied to the assumed effort reduction) at which the expected case
 * reaches a non-negative 3-year value. 0 when the case already holds with no effect; null when it does not
 * hold even at five times the assumed effect.
 */
export function breakEvenEffectiveness(inputs: BusinessCaseInputs, postureId: PostureId): number | null {
  const f = (k: number): number => calculateCase(inputs, postureId, 'expected', { effectivenessMultiplier: k }).netValue36;
  if (f(0) >= 0) return 0;
  if (f(5) < 0) return null;
  let lo = 0;
  let hi = 5;
  for (let i = 0; i < ITERATIONS; i++) {
    const mid = (lo + hi) / 2;
    if (f(mid) >= 0) hi = mid;
    else lo = mid;
  }
  return hi;
}

/**
 * Smallest share of released capacity that must become real savings for the expected case to reach a
 * non-negative 3-year value. 0 when no cash share is needed; null when even full cash does not hold.
 */
export function breakEvenCashShare(inputs: BusinessCaseInputs, postureId: PostureId): number | null {
  const g = (c: number): number => calculateCase(inputs, postureId, 'expected', { cashShare: c }).netValue36;
  if (g(1) < 0) return null;
  if (g(0) >= 0) return 0;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < ITERATIONS; i++) {
    const mid = (lo + hi) / 2;
    if (g(mid) >= 0) hi = mid;
    else lo = mid;
  }
  return hi;
}
