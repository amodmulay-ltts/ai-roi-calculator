import { describe, it, expect } from 'vitest';
import { createDefaultInputs } from '../defaults.js';
import { validateInputs } from '../validate.js';

describe('validateInputs', () => {
  it('reports no issues for the defaults', () => {
    expect(validateInputs(createDefaultInputs())).toEqual([]);
  });

  it('flags a work mix that does not add up to 100%', () => {
    const d = createDefaultInputs();
    d.tasks[0]!.share = 0.2; // 0.2 + 0.25 + 0.25 + 0.1 + 0.1 = 0.9
    expect(validateInputs(d)).toContainEqual({ field: 'tasks', message: 'Work mix must add up to 100%.' });
  });

  it('flags a ramp outside 1..24 or not a whole number', () => {
    const zero = createDefaultInputs();
    zero.rampMonths = 0;
    expect(validateInputs(zero)).toContainEqual({
      field: 'rampMonths',
      message: 'Ramp must be a whole number of months from 1 to 24.',
    });
    const fraction = createDefaultInputs();
    fraction.rampMonths = 2.5;
    expect(validateInputs(fraction).map(i => i.field)).toContain('rampMonths');
  });

  it('flags zero team size, cost and hours', () => {
    const d = createDefaultInputs();
    d.teamSize = 0;
    d.loadedCostPerFteYear = 0;
    d.hoursPerFteMonth = 0;
    expect(validateInputs(d).map(i => i.message)).toEqual([
      'Team size must be greater than zero.',
      'Annual cost per person must be greater than zero.',
      'Hours per month must be greater than zero.',
    ]);
  });

  it('flags fractions outside 0..1', () => {
    const d = createDefaultInputs();
    d.adoption = 1.2;
    d.cashShare = -0.1;
    d.tasks[1]!.share = 1.5;
    const messages = validateInputs(d).map(i => i.message);
    expect(messages).toContain('Adoption must be between 0% and 100%.');
    expect(messages).toContain('Cash share must be between 0% and 100%.');
    expect(messages).toContain('Script development: share must be between 0% and 100%.');
  });

  it('flags negative costs', () => {
    const d = createDefaultInputs();
    d.governanceMonthly = -1;
    expect(validateInputs(d)).toContainEqual({
      field: 'governanceMonthly',
      message: 'Governance running cost per month cannot be negative.',
    });
  });

  it('flags tier assumptions out of range, using the tier label', () => {
    const d = createDefaultInputs();
    d.tiers.enterprise.reviewRoutine = 2;
    d.tiers.frontier.platformMonthly = -5;
    expect(validateInputs(d)).toEqual([
      { field: 'tiers.enterprise.reviewRoutine', message: 'Enterprise assumption "reviewRoutine" is out of range.' },
      { field: 'tiers.frontier.platformMonthly', message: 'Frontier assumption "platformMonthly" is out of range.' },
    ]);
  });
});
