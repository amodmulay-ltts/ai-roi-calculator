import { describe, it, expect } from 'vitest';
import { createDefaultInputs } from '../defaults.js';
import { calculateCase } from '../calc.js';
import { allowedTiers, compareAll, recommendedPosture, tiersForPosture } from '../compare.js';
import type { BusinessCaseInputs } from '../types.js';
import { validateInputs } from '../validate.js';

const withReadiness = (answer: 'partial' | 'not-ready', readiness?: BusinessCaseInputs['readiness']): BusinessCaseInputs => {
  const d = createDefaultInputs();
  d.readiness = readiness ?? { data: answer, skills: answer, sponsorship: answer, compliance: answer };
  return d;
};

describe('recommendedPosture (section 6.2)', () => {
  it('is enterprise at the defaults', () => {
    expect(recommendedPosture(createDefaultInputs())).toBe('enterprise');
  });
});

describe('cases for enterprise at defaults (section 6.4)', () => {
  const inputs = createDefaultInputs();
  const rows = [
    { caseId: 'conservative' as const, netHours: 1080, counted: 25200, steadyNet: 2600, investment: 248750, payback: null, netValue36: -217550, roi: -87.5 },
    { caseId: 'expected' as const, netHours: 1440, counted: 42000, steadyNet: 19400, investment: 199000, payback: 15, netValue36: 418400, roi: 210.3 },
    { caseId: 'stretch' as const, netHours: 1656, counted: 48300, steadyNet: 25700, investment: 179100, payback: 10, netValue36: 668700, roi: 373.4 },
  ];
  for (const row of rows) {
    it(`reproduces the ${row.caseId} row`, () => {
      const r = calculateCase(inputs, 'enterprise', row.caseId);
      expect(r.netHoursSavedPerMonth).toBeCloseTo(row.netHours, 2);
      expect(r.countedSavingPerMonth).toBeCloseTo(row.counted, 2);
      expect(r.steadyNetPerMonth).toBeCloseTo(row.steadyNet, 2);
      expect(r.investment).toBeCloseTo(row.investment, 2);
      expect(r.paybackMonth).toBe(row.payback);
      expect(r.netValue36).toBeCloseTo(row.netValue36, 2);
      expect(Math.round(r.roiPercent! * 10) / 10).toBe(row.roi);
    });
  }
});

describe('readiness (section 6.5)', () => {
  it('a partial readiness gap of 4 lowers the expected case', () => {
    const r = calculateCase(withReadiness('partial'), 'enterprise', 'expected');
    expect(r.netHoursSavedPerMonth).toBeCloseTo(1296, 2);
    expect(r.countedSavingPerMonth).toBeCloseTo(37800, 2);
    expect(r.steadyNetPerMonth).toBeCloseTo(15200, 2);
    expect(r.investment).toBeCloseTo(218900, 2);
    expect(r.paybackMonth).toBe(21);
    expect(r.netValue36).toBeCloseTo(229600, 2);
    expect(Math.round(r.roiPercent! * 10) / 10).toBe(104.9);
  });

  it('applies the investment multiplier to each investment line for a gap of 4', () => {
    const r = calculateCase(withReadiness('partial'), 'enterprise', 'expected');
    expect(r.investmentLines.map(l => l.amount)).toEqual([
      90000 * 1.1,
      60000 * 1.1,
      25000 * 1.1,
      24000 * 1.1,
    ].map(v => expect.closeTo(v, 6)));
  });

  it('a full readiness gap of 8 makes the conservative case lose money with no payback', () => {
    const r = calculateCase(withReadiness('not-ready'), 'enterprise', 'conservative');
    expect(r.steadyNetPerMonth).toBeCloseTo(-2440, 2);
    expect(r.investment).toBeCloseTo(298500, 2);
    expect(r.paybackMonth).toBeNull();
    expect(r.netValue36).toBeCloseTo(-449700, 2);
  });
});

describe('data-rule constraints (section 6.6)', () => {
  const withConstraint = (c: BusinessCaseInputs['dataConstraint'], complex?: BusinessCaseInputs['hybridComplexTier']) => {
    const d = createDefaultInputs();
    d.dataConstraint = c;
    if (complex) d.hybridComplexTier = complex;
    return compareAll(d);
  };

  it('public cloud is acceptable: all four postures allowed', () => {
    const s = withConstraint('public-ok');
    expect(Object.values(s).every(p => p.allowed)).toBe(true);
    expect(Object.values(s).every(p => p.disallowedReason === null)).toBe(true);
  });

  it('restricted: frontier is not allowed, with the restricted reason', () => {
    const s = withConstraint('restricted');
    expect(s.local.allowed).toBe(true);
    expect(s.hybrid.allowed).toBe(true);
    expect(s.enterprise.allowed).toBe(true);
    expect(s.frontier.allowed).toBe(false);
    expect(s.frontier.disallowedReason).toBe('Needs a public cloud model, which your data rules do not allow.');
  });

  it('restricted with frontier for complex hybrid work: hybrid is not allowed', () => {
    const s = withConstraint('restricted', 'frontier');
    expect(s.hybrid.allowed).toBe(false);
    expect(s.hybrid.disallowedReason).toBe('Needs a public cloud model, which your data rules do not allow.');
  });

  it('sovereign: only local is allowed; the others carry the sovereign reason', () => {
    const s = withConstraint('sovereign');
    expect(s.local.allowed).toBe(true);
    for (const id of ['hybrid', 'enterprise', 'frontier'] as const) {
      expect(s[id].allowed).toBe(false);
      expect(s[id].disallowedReason).toBe('Needs a model outside your own infrastructure, which your data rules do not allow.');
    }
  });

  it('a disallowed posture is still calculated', () => {
    const s = withConstraint('sovereign');
    expect(s.frontier.expected.netHoursSavedPerMonth).toBeGreaterThan(0);
    expect(s.frontier.stretch.netValue36).toBeTypeOf('number');
  });

  it('allowedTiers and tiersForPosture match the spec', () => {
    expect(allowedTiers('public-ok')).toEqual(['local', 'enterprise', 'frontier']);
    expect(allowedTiers('restricted')).toEqual(['local', 'enterprise']);
    expect(allowedTiers('sovereign')).toEqual(['local']);
    expect(tiersForPosture(createDefaultInputs(), 'hybrid').sort()).toEqual(['enterprise', 'local']);
    expect(tiersForPosture(createDefaultInputs(), 'frontier')).toEqual(['frontier']);
  });

  it('recommends only an allowed posture', () => {
    const d = createDefaultInputs();
    d.dataConstraint = 'sovereign';
    expect(recommendedPosture(d)).toBe('local');
  });

  it('keeps the defaults valid', () => {
    expect(validateInputs(createDefaultInputs())).toEqual([]);
  });
});
