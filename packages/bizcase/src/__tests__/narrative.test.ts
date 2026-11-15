import { describe, it, expect } from 'vitest';
import { createDefaultInputs } from '../defaults.js';
import { calculateCase } from '../calc.js';
import { headline, readinessCost, whatMustBeTrue } from '../narrative.js';

describe('whatMustBeTrue at defaults (section 6.3)', () => {
  it('states the effect and cash thresholds for enterprise', () => {
    expect(whatMustBeTrue(createDefaultInputs(), 'enterprise')).toEqual([
      'AI must deliver at least 70% of the assumed effort reduction to break even.',
      'At least 49% of released capacity must turn into real savings.',
    ]);
  });
});

describe('headline', () => {
  it('states a positive verdict with payback and value (section 6.7)', () => {
    const r = calculateCase(createDefaultInputs(), 'enterprise', 'expected');
    expect(headline('Enterprise', r)).toBe(
      'Enterprise AI pays back in month 15 and returns €418K over 3 years (expected case).',
    );
  });

  it('states a negative verdict without a payback (section 6.7)', () => {
    const r = calculateCase(createDefaultInputs(), 'hybrid', 'expected');
    expect(headline('Hybrid', r)).toBe('Hybrid AI does not pay back within 36 months at current assumptions.');
  });

  it('states a marginal verdict as sensitive to assumptions', () => {
    const r = calculateCase(createDefaultInputs(), 'local', 'expected');
    expect(r.verdict).toBe('marginal');
    expect(headline('Local', r)).toBe(
      'Local AI pays back in month 35 but returns only €16,328 over 3 years; the case is sensitive to assumptions.',
    );
  });
});

describe('readinessCost (section 6.5)', () => {
  it('is zero when every answer is ready', () => {
    expect(readinessCost(createDefaultInputs(), 'enterprise')).toBeCloseTo(0, 6);
  });

  it('is the value lost to partial readiness', () => {
    const d = createDefaultInputs();
    d.readiness = { data: 'partial', skills: 'partial', sponsorship: 'partial', compliance: 'partial' };
    expect(readinessCost(d, 'enterprise')).toBeCloseTo(188800, 2);
  });

  it('adds a readiness sentence to whatMustBeTrue when there is a cost', () => {
    const d = createDefaultInputs();
    d.readiness = { data: 'partial', skills: 'partial', sponsorship: 'partial', compliance: 'partial' };
    expect(whatMustBeTrue(d, 'enterprise').at(-1)).toBe('Readiness gaps reduce the 3-year value by €189K.');
  });
});
