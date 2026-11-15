import { describe, it, expect } from 'vitest';
import { createDefaultInputs } from '../defaults.js';
import { applyWorkTemplate, getWorkTemplate, listWorkTemplates } from '../templates.js';
import { calculateCase } from '../calc.js';
import { MAX_PHASES, MAX_TASKS, isBusinessCaseInputs, validateInputs } from '../validate.js';

const sum = (values: number[]): number => values.reduce((s, v) => s + v, 0);

describe('work templates', () => {
  const templates = listWorkTemplates();

  it('offers testing, the software lifecycle, the product lifecycle and mechanical design', () => {
    expect(templates.map(t => t.id)).toEqual(['software-testing', 'software-lifecycle', 'product-lifecycle', 'mechanical-design']);
    expect(getWorkTemplate('mechanical-design')?.industry).toBe('Mechanical engineering');
    expect(getWorkTemplate('nonexistent')).toBeUndefined();
  });

  for (const template of templates) {
    describe(template.name, () => {
      const inputs = applyWorkTemplate(createDefaultInputs(), template.id);

      it('is valid and has the shape of a saved case', () => {
        expect(validateInputs(inputs)).toEqual([]);
        expect(isBusinessCaseInputs(inputs)).toBe(true);
      });

      it('splits the effort across the work as one whole (100%)', () => {
        expect(sum(template.tasks.map(t => t.share))).toBeCloseTo(1, 10);
      });

      it('puts every kind of work in a listed phase, with unique ids and phase names', () => {
        const names = template.phases.map(p => p.name);
        expect(new Set(names).size).toBe(names.length);
        expect(new Set(template.tasks.map(t => t.id)).size).toBe(template.tasks.length);
        expect(template.tasks.every(t => names.includes(t.phase))).toBe(true);
        expect(template.phases.length).toBeLessThanOrEqual(MAX_PHASES);
        expect(template.tasks.length).toBeLessThanOrEqual(MAX_TASKS);
      });
    });
  }

  it('keeps everything else the presenter entered when a template is applied', () => {
    const d = createDefaultInputs();
    d.teamSize = 55;
    d.customerName = 'Acme';
    d.readiness.data = 'partial';
    const applied = applyWorkTemplate(d, 'mechanical-design');
    expect(applied.workTemplateId).toBe('mechanical-design');
    expect(applied.teamSize).toBe(55);
    expect(applied.customerName).toBe('Acme');
    expect(applied.readiness.data).toBe('partial');
    expect(applied.tasks).not.toEqual(d.tasks);
  });

  it('returns the inputs unchanged for an unknown template', () => {
    const d = createDefaultInputs();
    expect(applyWorkTemplate(d, 'nonexistent')).toBe(d);
  });

  it('hands out independent copies, so editing a case never changes a template', () => {
    const a = applyWorkTemplate(createDefaultInputs(), 'software-lifecycle');
    a.phases[0]!.aiUse = 0;
    a.tasks[0]!.share = 0.9;
    const b = applyWorkTemplate(createDefaultInputs(), 'software-lifecycle');
    expect(b.phases[0]!.aiUse).toBe(0.6);
    expect(b.tasks[0]!.share).toBe(0.08);
  });
});

describe('AI use is set for each phase and does not add up to 100%', () => {
  it('lets the phases add up to far more than 100%', () => {
    const d = applyWorkTemplate(createDefaultInputs(), 'software-lifecycle');
    const total = sum(d.phases.map(p => p.aiUse));
    expect(total).toBeCloseTo(4.35, 10); // 435%
    expect(validateInputs(d)).toEqual([]);
  });

  it('accepts every phase at 100% and every phase at 0%', () => {
    for (const aiUse of [1, 0]) {
      const d = applyWorkTemplate(createDefaultInputs(), 'product-lifecycle');
      d.phases = d.phases.map(p => ({ ...p, aiUse }));
      expect(validateInputs(d)).toEqual([]);
    }
  });

  it('still insists each phase value is a percentage between 0% and 100%', () => {
    const d = createDefaultInputs();
    d.phases[2]!.aiUse = 1.5;
    expect(validateInputs(d).map(i => i.message)).toContain('Execute: AI use must be between 0% and 100%.');
  });

  it('does not tie one phase to another: changing one phase changes only that phase', () => {
    const base = calculateCase(applyWorkTemplate(createDefaultInputs(), 'mechanical-design'), 'enterprise', 'expected');
    const d = applyWorkTemplate(createDefaultInputs(), 'mechanical-design');
    d.phases = d.phases.map(p => (p.name === 'Prototype' ? { ...p, aiUse: 0.8 } : p));
    const changed = calculateCase(d, 'enterprise', 'expected');
    const byName = (r: typeof base, name: string) => r.phases.find(p => p.name === name)!;
    expect(byName(changed, 'Prototype').netEfficiency).toBeCloseTo(0.34, 6); // 80% x 50% effect x (1 - 15% review)
    expect(byName(base, 'Prototype').netEfficiency).toBeCloseTo(0.02125, 6);
    for (const p of base.phases.filter(p => p.name !== 'Prototype')) {
      expect(byName(changed, p.name).netEfficiency).toBeCloseTo(p.netEfficiency, 9);
    }
  });
});

describe('results by phase (independent reference model, enterprise, expected case)', () => {
  it('mechanical design: 19.9% net efficiency, prototype work barely touched', () => {
    const r = calculateCase(applyWorkTemplate(createDefaultInputs(), 'mechanical-design'), 'enterprise', 'expected');
    expect(r.totalHours).toBeCloseTo(4800, 6);
    expect(r.netHoursSavedPerMonth).toBeCloseTo(954.9, 3);
    expect(r.netEfficiency).toBeCloseTo(0.198938, 5);
    expect(r.aiReach).toBeCloseTo(0.5225, 6);
    const eff = Object.fromEntries(r.phases.map(p => [p.name, p.netEfficiency]));
    expect(eff['Prototype']).toBeCloseTo(0.02125, 6);
    expect(eff['Test reporting']).toBeCloseTo(0.34, 6);
    expect(eff['Detailing']).toBeCloseTo(0.2975, 6);
    expect(eff['Analysis']).toBeCloseTo(0.165, 6);
    expect(eff['Concept']).toBeCloseTo(0.15, 6);
  });

  it('software lifecycle: 29.7% net efficiency across six phases', () => {
    const r = calculateCase(applyWorkTemplate(createDefaultInputs(), 'software-lifecycle'), 'enterprise', 'expected');
    expect(r.netHoursSavedPerMonth).toBeCloseTo(1424.88, 3);
    expect(r.netEfficiency).toBeCloseTo(0.29685, 5);
    expect(r.aiReach).toBeCloseTo(0.772, 6);
    expect(r.phases.map(p => p.name)).toEqual(['Requirements', 'Design', 'Build', 'Test', 'Release', 'Operate']);
  });

  it('local is lower than enterprise on the same work (mechanical design, 9.0%)', () => {
    const local = calculateCase(applyWorkTemplate(createDefaultInputs(), 'mechanical-design'), 'local', 'expected');
    expect(local.netEfficiency).toBeCloseTo(0.09025, 5);
  });

  it('adds up: phases total the tasks, tasks total the case, in the order the phases are listed', () => {
    const d = applyWorkTemplate(createDefaultInputs(), 'product-lifecycle');
    const r = calculateCase(d, 'hybrid', 'expected');
    expect(r.phases.map(p => p.name)).toEqual(d.phases.map(p => p.name));
    expect(sum(r.phases.map(p => p.netSavedHours))).toBeCloseTo(r.netHoursSavedPerMonth, 6);
    expect(sum(r.phases.map(p => p.baselineHours))).toBeCloseTo(r.totalHours, 6);
    expect(sum(r.tasks.map(t => t.netSavedHours))).toBeCloseTo(r.netHoursSavedPerMonth, 6);
    expect(r.tasks.every(t => d.phases.some(p => p.name === t.phase))).toBe(true);
  });

  it('reports AI reach as the work-weighted AI use, and zero efficiency for a phase with no work', () => {
    const d = createDefaultInputs();
    d.phases = [...d.phases, { name: 'Unused', aiUse: 0.5 }];
    const r = calculateCase(d, 'enterprise', 'expected');
    expect(r.aiReach).toBeCloseTo(0.8, 9);
    const unused = r.phases.find(p => p.name === 'Unused')!;
    expect(unused.baselineHours).toBe(0);
    expect(unused.netEfficiency).toBe(0);
  });
});

describe('validation of phases and work', () => {
  it('needs at least one phase and one kind of work', () => {
    const d = createDefaultInputs();
    d.phases = [];
    d.tasks = [];
    const messages = validateInputs(d).map(i => i.message);
    expect(messages).toContain('Add at least one phase.');
    expect(messages).toContain('Add at least one kind of work.');
  });

  it('flags a blank or repeated phase name', () => {
    const d = createDefaultInputs();
    d.phases[1]!.name = '  ';
    d.phases[2]!.name = 'Design';
    const messages = validateInputs(d).map(i => i.message);
    expect(messages).toContain('Each phase needs a name.');
    expect(messages).toContain('Phase names must be different.');
  });

  it('flags work that is not in any listed phase, and a blank work name', () => {
    const d = createDefaultInputs();
    d.tasks[0]!.phase = 'Nowhere';
    d.tasks[1]!.name = '';
    const messages = validateInputs(d).map(i => i.message);
    expect(messages).toContain('Test design: choose one of the phases.');
    expect(messages).toContain('Each kind of work needs a name.');
  });

  it('flags two kinds of work with the same identifier', () => {
    const d = createDefaultInputs();
    d.tasks[1]!.id = d.tasks[0]!.id;
    expect(validateInputs(d).map(i => i.message)).toContain('Two kinds of work share the same identifier.');
  });

  it('limits the number of phases and kinds of work', () => {
    const d = createDefaultInputs();
    d.phases = Array.from({ length: MAX_PHASES + 1 }, (_, i) => ({ name: `P${i}`, aiUse: 0.5 }));
    d.tasks = Array.from({ length: MAX_TASKS + 1 }, (_, i) => ({ id: `t${i}`, name: `W${i}`, phase: 'P0', share: 1 / (MAX_TASKS + 1), difficulty: 'routine' as const }));
    const messages = validateInputs(d).map(i => i.message);
    expect(messages).toContain(`Use at most ${MAX_PHASES} phases.`);
    expect(messages).toContain(`Use at most ${MAX_TASKS} kinds of work.`);
  });

  it('does not crash the calculation on work in an unlisted phase: it is treated as having no AI use', () => {
    const d = createDefaultInputs();
    d.tasks[0]!.phase = 'Nowhere';
    const r = calculateCase(d, 'enterprise', 'expected');
    expect(Number.isFinite(r.netEfficiency)).toBe(true);
    expect(r.tasks[0]!.assistedHours).toBe(0);
  });
});
