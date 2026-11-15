import { describe, it, expect } from 'vitest';
import { createDefaultInputs } from '../defaults.js';
import { isBusinessCaseInputs, validateInputs } from '../validate.js';

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

describe('isBusinessCaseInputs', () => {
  it('accepts the defaults and a JSON round trip of them', () => {
    expect(isBusinessCaseInputs(createDefaultInputs())).toBe(true);
    expect(isBusinessCaseInputs(JSON.parse(JSON.stringify(createDefaultInputs())))).toBe(true);
  });

  it('rejects things that are not an object', () => {
    for (const bad of [null, undefined, 42, 'text', [], true]) expect(isBusinessCaseInputs(bad)).toBe(false);
  });

  it('rejects a numeric field that is a string, missing, or not finite', () => {
    const asString = JSON.parse(JSON.stringify(createDefaultInputs()));
    asString.teamSize = '30';
    expect(isBusinessCaseInputs(asString)).toBe(false);
    const missing = JSON.parse(JSON.stringify(createDefaultInputs()));
    delete missing.rampMonths;
    expect(isBusinessCaseInputs(missing)).toBe(false);
    const notFinite = createDefaultInputs();
    notFinite.adoption = Number.NaN;
    expect(isBusinessCaseInputs(notFinite)).toBe(false);
  });

  it('rejects an option outside its allowed values', () => {
    const constraint = JSON.parse(JSON.stringify(createDefaultInputs()));
    constraint.dataConstraint = 'anything';
    expect(isBusinessCaseInputs(constraint)).toBe(false);
    const tier = JSON.parse(JSON.stringify(createDefaultInputs()));
    tier.hybridComplexTier = 'hybrid';
    expect(isBusinessCaseInputs(tier)).toBe(false);
    const readiness = JSON.parse(JSON.stringify(createDefaultInputs()));
    readiness.readiness.data = 'maybe';
    expect(isBusinessCaseInputs(readiness)).toBe(false);
  });

  it('rejects tasks that are missing, reordered, or have an unknown difficulty', () => {
    const short = createDefaultInputs();
    short.tasks.pop();
    expect(isBusinessCaseInputs(short)).toBe(false);
    const reordered = createDefaultInputs();
    reordered.tasks.reverse();
    expect(isBusinessCaseInputs(reordered)).toBe(false);
    const difficulty = JSON.parse(JSON.stringify(createDefaultInputs()));
    difficulty.tasks[0].difficulty = 'hard';
    expect(isBusinessCaseInputs(difficulty)).toBe(false);
  });

  it('rejects a missing tier or a tier field of the wrong type', () => {
    const noTier = JSON.parse(JSON.stringify(createDefaultInputs()));
    delete noTier.tiers.frontier;
    expect(isBusinessCaseInputs(noTier)).toBe(false);
    const wrongType = JSON.parse(JSON.stringify(createDefaultInputs()));
    wrongType.tiers.local.setup = '130000';
    expect(isBusinessCaseInputs(wrongType)).toBe(false);
  });
});
