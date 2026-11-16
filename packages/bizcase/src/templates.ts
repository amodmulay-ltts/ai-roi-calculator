import type { BusinessCaseInputs, Difficulty, TaskMix, WorkPhase, WorkTemplate } from './types.js';

/** The template data below states AI use once per phase; each piece of work starts from its phase's figure. */
interface TemplateSource extends Omit<WorkTemplate, 'phases' | 'tasks'> {
  phases: Array<WorkPhase & { aiUse: number }>;
  tasks: Array<Omit<TaskMix, 'aiUse'>>;
}

/**
 * Ready-made starting points for the work in scope. Every share and AI-use figure here is a placeholder
 * chosen to start a conversation, not measured data: the presenter replaces them with the customer's own.
 * AI use is set per phase and is independent: the phase values do not add up to 100%.
 */

const phase = (name: string, aiUse: number): WorkPhase & { aiUse: number } => ({ name, aiUse });
const task = (id: string, name: string, phaseName: string, share: number, difficulty: Difficulty): Omit<TaskMix, 'aiUse'> => ({
  id,
  name,
  phase: phaseName,
  share,
  difficulty,
});

function templateSources(): TemplateSource[] {
  return [
    {
      id: 'software-testing',
      name: 'Software testing',
      industry: 'Software',
      description: 'The software testing life cycle: design, scripting, execution, defect analysis and reporting.',
      phases: [phase('Design', 0.8), phase('Build', 0.8), phase('Execute', 0.8), phase('Analyse', 0.8), phase('Report', 0.8)],
      tasks: [
        task('testDesign', 'Test design', 'Design', 0.3, 'complex'),
        task('scriptDev', 'Script development', 'Build', 0.25, 'routine'),
        task('execution', 'Test execution', 'Execute', 0.25, 'routine'),
        task('defectAnalysis', 'Defect analysis', 'Analyse', 0.1, 'complex'),
        task('reporting', 'Reporting', 'Report', 0.1, 'routine'),
      ],
    },
    {
      id: 'software-lifecycle',
      name: 'Software development lifecycle',
      industry: 'Software',
      description: 'The whole software lifecycle, from requirements to operations and support.',
      phases: [
        phase('Requirements', 0.6),
        phase('Design', 0.5),
        phase('Build', 0.9),
        phase('Test', 0.85),
        phase('Release', 0.8),
        phase('Operate', 0.7),
      ],
      tasks: [
        task('requirements', 'Requirements and analysis', 'Requirements', 0.08, 'complex'),
        task('architecture', 'Architecture and design', 'Design', 0.1, 'complex'),
        task('coding', 'Coding', 'Build', 0.24, 'routine'),
        task('code-review', 'Code review', 'Build', 0.06, 'routine'),
        task('unit-testing', 'Unit and integration testing', 'Test', 0.12, 'routine'),
        task('system-testing', 'System and acceptance testing', 'Test', 0.08, 'complex'),
        task('release', 'Release and deployment', 'Release', 0.05, 'routine'),
        task('documentation', 'Documentation', 'Release', 0.05, 'routine'),
        task('defect-fixing', 'Defect analysis and fixing', 'Operate', 0.12, 'complex'),
        task('support', 'Support and maintenance', 'Operate', 0.1, 'routine'),
      ],
    },
    {
      id: 'product-lifecycle',
      name: 'Product development lifecycle',
      industry: 'Product engineering (hardware and software)',
      description: 'A product from concept to service: mechanical, electrical and software design, prototyping, industrialisation and certification.',
      phases: [
        phase('Concept', 0.6),
        phase('Requirements', 0.6),
        phase('Design', 0.55),
        phase('Software', 0.85),
        phase('Analysis', 0.6),
        phase('Prototype', 0.05),
        phase('Verification', 0.35),
        phase('Industrialise', 0.4),
        phase('Certify and release', 0.75),
        phase('Service', 0.7),
      ],
      tasks: [
        task('concept-studies', 'Market and concept studies', 'Concept', 0.05, 'complex'),
        task('systems-engineering', 'Requirements and systems engineering', 'Requirements', 0.08, 'complex'),
        task('mechanical-design', 'Mechanical design (CAD)', 'Design', 0.17, 'complex'),
        task('electrical-design', 'Electrical and electronics design', 'Design', 0.08, 'complex'),
        task('embedded-software', 'Embedded software', 'Software', 0.1, 'routine'),
        task('simulation', 'Simulation and analysis', 'Analysis', 0.1, 'complex'),
        task('prototype-build', 'Prototype build', 'Prototype', 0.08, 'routine'),
        task('verification', 'Verification and validation testing', 'Verification', 0.1, 'complex'),
        task('manufacturing', 'Manufacturing engineering and design for manufacture', 'Industrialise', 0.07, 'complex'),
        task('certification', 'Certification and compliance documents', 'Certify and release', 0.07, 'routine'),
        task('change-release', 'Change management and release', 'Certify and release', 0.05, 'routine'),
        task('field-support', 'Service and field support engineering', 'Service', 0.05, 'routine'),
      ],
    },
    {
      id: 'mechanical-design',
      name: 'Mechanical system design',
      industry: 'Mechanical engineering',
      description: 'Designing a mechanical system: concept, CAD, simulation, drawings, review, prototype testing and release.',
      phases: [
        phase('Concept', 0.5),
        phase('Design', 0.45),
        phase('Analysis', 0.55),
        phase('Detailing', 0.7),
        phase('Review', 0.5),
        phase('Prototype', 0.05),
        phase('Test reporting', 0.8),
        phase('Release', 0.75),
      ],
      tasks: [
        task('concept-layout', 'Concept and layout studies', 'Concept', 0.08, 'complex'),
        task('cad-modelling', '3D CAD modelling', 'Design', 0.25, 'routine'),
        task('fea-cfd', 'Simulation setup and analysis (FEA, CFD)', 'Analysis', 0.15, 'complex'),
        task('tolerance', 'Tolerance and fit analysis (GD&T)', 'Analysis', 0.05, 'complex'),
        task('drawings-bom', 'Drawings and bill of materials', 'Detailing', 0.15, 'routine'),
        task('design-review', 'Design review and manufacturability checks', 'Review', 0.07, 'complex'),
        task('prototype-test', 'Prototype build and physical testing', 'Prototype', 0.1, 'routine'),
        task('test-reporting', 'Test data analysis and reporting', 'Test reporting', 0.05, 'routine'),
        task('change-release', 'Engineering change and release', 'Release', 0.05, 'routine'),
        task('compliance-docs', 'Documentation and standards compliance', 'Release', 0.05, 'routine'),
      ],
    },
  ];
}

/** Builds a fresh, independent copy each call so editing a case never changes a template. */
function buildTemplates(): WorkTemplate[] {
  return templateSources().map(t => {
    const use = new Map(t.phases.map(p => [p.name, p.aiUse]));
    return {
      ...t,
      phases: t.phases.map(p => ({ name: p.name })),
      tasks: t.tasks.map(k => ({ ...k, aiUse: use.get(k.phase) ?? 0 })),
    };
  });
}

export const DEFAULT_WORK_TEMPLATE_ID = 'software-testing';

/** Every ready-made template, as independent copies. */
export function listWorkTemplates(): WorkTemplate[] {
  return buildTemplates();
}

/** One template by id, or undefined when there is none. */
export function getWorkTemplate(id: string): WorkTemplate | undefined {
  return buildTemplates().find(t => t.id === id);
}

/**
 * The inputs with their phases and work replaced by a template's. Everything else the presenter entered
 * (people, cost, investment, option assumptions, readiness) is kept. An unknown id returns the inputs unchanged.
 */
export function applyWorkTemplate(inputs: BusinessCaseInputs, templateId: string): BusinessCaseInputs {
  const template = getWorkTemplate(templateId);
  if (!template) return inputs;
  return { ...inputs, workTemplateId: template.id, phases: template.phases, tasks: template.tasks };
}
