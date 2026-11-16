import { describe, it, expect } from 'vitest';
import { createDefaultInputs } from '../defaults.js';
import { calculateCase } from '../calc.js';
import type { PostureId } from '../types.js';

/** Expected figures come from an independent reference model of the section 5 rules. */
describe('net efficiency and the effort bridge (default inputs, expected case)', () => {
  const rows: Array<[PostureId, number, number, number]> = [
    // posture, gross removed hours, review and rework hours, net efficiency (share of in-scope effort)
    ['local', 844.8, 215.04, 0.1312],
    ['hybrid', 1305.6, 291.84, 0.2112],
    ['enterprise', 1766.4, 326.4, 0.3],
    ['frontier', 2112, 359.04, 0.3652],
  ];
  for (const [posture, gross, review, efficiency] of rows) {
    it(`${posture}: gross ${gross} h, review and rework ${review} h, net ${efficiency * 100}%`, () => {
      const r = calculateCase(createDefaultInputs(), posture, 'expected');
      expect(r.totalHours).toBeCloseTo(4800, 6);
      expect(r.grossRemovedHoursPerMonth).toBeCloseTo(gross, 2);
      expect(r.reviewReworkHoursPerMonth).toBeCloseTo(review, 2);
      expect(r.netEfficiency).toBeCloseTo(efficiency, 4);
      expect(r.grossEfficiency).toBeCloseTo(gross / 4800, 6);
      expect(r.reviewReworkEfficiency).toBeCloseTo(review / 4800, 6);
      expect(r.grossEfficiency - r.reviewReworkEfficiency).toBeCloseTo(r.netEfficiency, 9);
      // The bridge closes: gross removed minus review and rework is the net saved
      expect(r.grossRemovedHoursPerMonth - r.reviewReworkHoursPerMonth).toBeCloseTo(r.netHoursSavedPerMonth, 6);
    });
  }
});

describe('per-task breakdown (enterprise, default inputs)', () => {
  const r = calculateCase(createDefaultInputs(), 'enterprise', 'expected');
  const expected: Array<[string, number, number, number, number, number, number]> = [
    // id, baseline, assisted, gross removed, review and rework, net saved, net efficiency
    ['testDesign', 1440, 1152, 460.8, 115.2, 345.6, 0.24],
    ['scriptDev', 1200, 960, 480, 72, 408, 0.34],
    ['execution', 1200, 960, 480, 72, 408, 0.34],
    ['defectAnalysis', 480, 384, 153.6, 38.4, 115.2, 0.24],
    ['reporting', 480, 384, 192, 28.8, 163.2, 0.34],
  ];

  it('lists the five tasks in order with the spec figures', () => {
    expect(r.tasks.map(t => t.id)).toEqual(expected.map(e => e[0]));
    r.tasks.forEach((t, i) => {
      const [, baseline, assisted, gross, review, net, efficiency] = expected[i]!;
      expect(t.baselineHours).toBeCloseTo(baseline, 6);
      expect(t.assistedHours).toBeCloseTo(assisted, 6);
      expect(t.grossRemovedHours).toBeCloseTo(gross, 6);
      expect(t.reviewReworkHours).toBeCloseTo(review, 6);
      expect(t.netSavedHours).toBeCloseTo(net, 6);
      expect(t.netEfficiency).toBeCloseTo(efficiency, 6);
      expect(t.tier).toBe('enterprise');
    });
  });

  it('adds up to the totals', () => {
    expect(r.tasks.reduce((s, t) => s + t.netSavedHours, 0)).toBeCloseTo(r.netHoursSavedPerMonth, 6);
    expect(r.tasks.reduce((s, t) => s + t.baselineHours, 0)).toBeCloseTo(r.totalHours, 6);
  });

  it('shows the tier each task uses in the hybrid posture', () => {
    const hybrid = calculateCase(createDefaultInputs(), 'hybrid', 'expected');
    expect(hybrid.tasks.map(t => [t.id, t.tier])).toEqual([
      ['testDesign', 'enterprise'],
      ['scriptDev', 'local'],
      ['execution', 'local'],
      ['defectAnalysis', 'enterprise'],
      ['reporting', 'local'],
    ]);
  });
});

describe('efficiency edge cases', () => {
  it('reports zero efficiency, not NaN, when there is no work', () => {
    const d = createDefaultInputs();
    d.phases = d.phases.map(p => ({ ...p, effortShare: 0 }));
    const r = calculateCase(d, 'enterprise', 'expected');
    expect(r.netEfficiency).toBe(0);
    expect(r.tasks.every(t => t.netEfficiency === 0)).toBe(true);
  });

  it('is zero when AI is not used at all', () => {
    const d = createDefaultInputs();
    d.tasks = d.tasks.map(t => ({ ...t, aiUse: 0 }));
    const r = calculateCase(d, 'enterprise', 'expected');
    expect(r.netEfficiency).toBe(0);
    expect(r.grossRemovedHoursPerMonth).toBe(0);
  });

  it('passes the retired cost through for the monthly economics', () => {
    const d = createDefaultInputs();
    d.retiredCostMonthly = 1500;
    expect(calculateCase(d, 'local', 'expected').retiredCostPerMonth).toBe(1500);
  });
});
