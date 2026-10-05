import type { Role, Currency, KpiInput, LlmUsage, Scenario } from '@ai-roi-calc/engine';
import { fxFactor } from '@ai-roi-calc/engine';

export const ROLE_TEMPLATES: Record<string, Role[]> = {
  testing: [
    {
      id: 'qa-manager',
      name: 'QA Manager',
      fte: { baseline: 1, transition: 1, mature: 1 },
      costPerFte: 320_000,
      billRatePerFte: 520_000,
      gradeLevel: 4,
      isAiImpacted: true,
    },
    {
      id: 'qa-ft',
      name: 'QA Functional Tester',
      fte: { baseline: 20, transition: 18, mature: 12 },
      costPerFte: 260_000,
      billRatePerFte: 380_000,
      gradeLevel: 2,
      isAiImpacted: true,
    },
    {
      id: 'sdet',
      name: 'SDET / Automation Engineer',
      fte: { baseline: 8, transition: 8, mature: 6 },
      costPerFte: 280_000,
      billRatePerFte: 450_000,
      gradeLevel: 3,
      isAiImpacted: true,
    },
    {
      id: 'test-architect',
      name: 'Test Architect',
      fte: { baseline: 1, transition: 1.5, mature: 1.5 },
      costPerFte: 380_000,
      billRatePerFte: 600_000,
      gradeLevel: 5,
      isAiImpacted: true,
    },
    {
      id: 'dev-test',
      name: 'Developer (Integration & Test Support)',
      fte: { baseline: 3, transition: 3, mature: 2 },
      costPerFte: 340_000,
      billRatePerFte: 520_000,
      gradeLevel: 3,
      isAiImpacted: false,
    },
    {
      id: 'ai-engineer',
      name: 'AI Engineer / Prompt Engineer',
      fte: { baseline: 0, transition: 2, mature: 1.5 },
      costPerFte: 420_000,
      billRatePerFte: 700_000,
      gradeLevel: 4,
      isAiImpacted: true,
    },
    {
      id: 'data-engineer',
      name: 'Data Engineer (Test Data, Analytics)',
      fte: { baseline: 0.5, transition: 1, mature: 1 },
      costPerFte: 380_000,
      billRatePerFte: 600_000,
      gradeLevel: 3,
      isAiImpacted: true,
    },
    {
      id: 'project-manager',
      name: 'Project Manager',
      fte: { baseline: 0.5, transition: 0.5, mature: 0.5 },
      costPerFte: 320_000,
      billRatePerFte: 500_000,
      gradeLevel: 4,
      isAiImpacted: false,
    },
  ],

  development: [
    {
      id: 'dev-lead',
      name: 'Development Lead / Architect',
      fte: { baseline: 2, transition: 2, mature: 2 },
      costPerFte: 400_000,
      billRatePerFte: 650_000,
      gradeLevel: 5,
      isAiImpacted: true,
    },
    {
      id: 'developer-senior',
      name: 'Senior Developer',
      fte: { baseline: 8, transition: 8, mature: 6 },
      costPerFte: 350_000,
      billRatePerFte: 550_000,
      gradeLevel: 4,
      isAiImpacted: true,
    },
    {
      id: 'developer-mid',
      name: 'Mid-Level Developer',
      fte: { baseline: 12, transition: 12, mature: 10 },
      costPerFte: 280_000,
      billRatePerFte: 420_000,
      gradeLevel: 3,
      isAiImpacted: true,
    },
    {
      id: 'devops-engineer',
      name: 'DevOps / Cloud Engineer',
      fte: { baseline: 2, transition: 3, mature: 2 },
      costPerFte: 360_000,
      billRatePerFte: 580_000,
      gradeLevel: 4,
      isAiImpacted: true,
    },
    {
      id: 'ai-ml-engineer',
      name: 'AI/ML Engineer',
      fte: { baseline: 0, transition: 2, mature: 2 },
      costPerFte: 420_000,
      billRatePerFte: 700_000,
      gradeLevel: 4,
      isAiImpacted: true,
    },
    {
      id: 'data-scientist',
      name: 'Data Scientist',
      fte: { baseline: 0.5, transition: 1.5, mature: 1.5 },
      costPerFte: 400_000,
      billRatePerFte: 650_000,
      gradeLevel: 4,
      isAiImpacted: true,
    },
    {
      id: 'qa-dev',
      name: 'QA Engineer',
      fte: { baseline: 2, transition: 2, mature: 1.5 },
      costPerFte: 260_000,
      billRatePerFte: 400_000,
      gradeLevel: 2,
      isAiImpacted: false,
    },
    {
      id: 'product-owner',
      name: 'Product Owner / Manager',
      fte: { baseline: 1, transition: 1, mature: 1 },
      costPerFte: 340_000,
      billRatePerFte: 550_000,
      gradeLevel: 4,
      isAiImpacted: true,
    },
    {
      id: 'scrum-master',
      name: 'Scrum Master / Project Manager',
      fte: { baseline: 1, transition: 1, mature: 1 },
      costPerFte: 300_000,
      billRatePerFte: 480_000,
      gradeLevel: 3,
      isAiImpacted: false,
    },
  ],

  support: [
    {
      id: 'support-manager',
      name: 'Support Manager',
      fte: { baseline: 2, transition: 2, mature: 2 },
      costPerFte: 300_000,
      billRatePerFte: 480_000,
      gradeLevel: 4,
      isAiImpacted: true,
    },
    {
      id: 'support-l2',
      name: 'L2 Support Engineer',
      fte: { baseline: 15, transition: 12, mature: 8 },
      costPerFte: 240_000,
      billRatePerFte: 360_000,
      gradeLevel: 2,
      isAiImpacted: true,
    },
    {
      id: 'support-l1',
      name: 'L1 Support Agent',
      fte: { baseline: 30, transition: 24, mature: 15 },
      costPerFte: 180_000,
      billRatePerFte: 280_000,
      gradeLevel: 1,
      isAiImpacted: true,
    },
    {
      id: 'knowledge-engineer',
      name: 'Knowledge Engineer',
      fte: { baseline: 0, transition: 1, mature: 1 },
      costPerFte: 320_000,
      billRatePerFte: 520_000,
      gradeLevel: 3,
      isAiImpacted: true,
    },
    {
      id: 'ai-trainer',
      name: 'AI Training / Feedback Specialist',
      fte: { baseline: 0, transition: 2, mature: 1.5 },
      costPerFte: 260_000,
      billRatePerFte: 420_000,
      gradeLevel: 2,
      isAiImpacted: true,
    },
    {
      id: 'ai-engineer-support',
      name: 'AI Engineer (Support)',
      fte: { baseline: 0, transition: 1, mature: 1 },
      costPerFte: 400_000,
      billRatePerFte: 650_000,
      gradeLevel: 4,
      isAiImpacted: true,
    },
  ],

  allRoles: [
    // Cross-functional roles
    {
      id: 'cio-cto',
      name: 'CIO / CTO / Tech Lead',
      fte: { baseline: 0.5, transition: 1, mature: 0.5 },
      costPerFte: 500_000,
      billRatePerFte: 800_000,
      gradeLevel: 5,
      isAiImpacted: false,
    },
    {
      id: 'po-owner',
      name: 'Product Owner / Function Owner',
      fte: { baseline: 1, transition: 1.5, mature: 1 },
      costPerFte: 360_000,
      billRatePerFte: 580_000,
      gradeLevel: 4,
      isAiImpacted: true,
    },
    {
      id: 'program-manager',
      name: 'Program Manager',
      fte: { baseline: 1, transition: 1.5, mature: 1 },
      costPerFte: 340_000,
      billRatePerFte: 550_000,
      gradeLevel: 4,
      isAiImpacted: false,
    },
    {
      id: 'change-manager',
      name: 'Change Management Lead',
      fte: { baseline: 0, transition: 1, mature: 0.5 },
      costPerFte: 320_000,
      billRatePerFte: 520_000,
      gradeLevel: 4,
      isAiImpacted: false,
    },
    {
      id: 'security-engineer',
      name: 'Security / Compliance Engineer',
      fte: { baseline: 0.5, transition: 1, mature: 0.5 },
      costPerFte: 400_000,
      billRatePerFte: 650_000,
      gradeLevel: 4,
      isAiImpacted: false,
    },
    {
      id: 'data-architect',
      name: 'Data Architect',
      fte: { baseline: 0.5, transition: 1, mature: 1 },
      costPerFte: 400_000,
      billRatePerFte: 650_000,
      gradeLevel: 4,
      isAiImpacted: true,
    },
  ],
};

export type UseCase = 'testing' | 'development' | 'support';

export const USE_CASES: Array<{ id: UseCase; label: string; description: string }> = [
  { id: 'testing', label: 'Software testing', description: 'Releases tested, defects analysed and verified' },
  { id: 'development', label: 'Software development', description: 'User stories, code reviews, bug fixes' },
  { id: 'support', label: 'IT support / service desk', description: 'L1 tickets, L2 incidents, knowledge, problems' },
];

const item = (
  id: string,
  name: string,
  volumeUnit: string,
  volumePerMonth: number,
  hoursPerUnit: number,
  ai: { affected: boolean; review: boolean }
): KpiInput => ({
  id,
  name,
  unit: `hrs per ${volumeUnit.replace(/s$/, '')}`,
  baseline: hoursPerUnit,
  appliesToFactor: ai.affected,
  isVelocity: false,
  overrides: {},
  volumePerMonth,
  volumeUnit,
  reviewOverheadApplies: ai.review,
});

const AI = { affected: true, review: true };
const AI_NO_REVIEW = { affected: true, review: false };
const MANUAL = { affected: false, review: false };

/** Monthly workload per use case, sized to the matching role template's baseline team × 160 h. */
export const WORKLOAD_TEMPLATES: Record<UseCase, KpiInput[]> = {
  testing: [
    item('testing-effort-per-release', 'Testing effort per release', 'releases', 2, 2_540, AI),
    item('defect-rca-effort', 'Defect root-cause analysis', 'defects', 200, 1.0, AI_NO_REVIEW),
    item('defect-verification-effort', 'Defect verification', 'defects', 200, 0.8, AI_NO_REVIEW),
  ],
  development: [
    item('user-stories', 'User story delivery', 'stories', 50, 55, AI),
    item('code-reviews', 'Code reviews', 'pull requests', 200, 1.5, AI),
    item('bug-fixes', 'Bug fixing', 'bugs', 100, 6, AI),
    item('dev-coordination', 'Planning and coordination', 'months', 1, 910, MANUAL),
  ],
  support: [
    item('l1-tickets', 'L1 ticket handling', 'tickets', 9_000, 0.4, AI),
    item('l2-incidents', 'L2 incident resolution', 'incidents', 1_200, 2.5, AI),
    item('knowledge-articles', 'Knowledge articles', 'articles', 60, 3, AI),
    item('problem-management', 'Problem management', 'problems', 20, 16, AI),
    item('support-coordination', 'Shift coordination and reporting', 'months', 1, 420, MANUAL),
  ],
};

const usage = (
  id: string,
  name: string,
  priceId: string,
  kpiId: string,
  requestsPerUnit: number,
  inputTokensPerRequest: number,
  outputTokensPerRequest: number
): LlmUsage => ({ id, name, priceId, kpiId, requestsPerUnit, inputTokensPerRequest, outputTokensPerRequest });

/** Typical AI model usage per use case, linked to the matching workload items. Starting points to adjust. */
export const LLM_USAGE_TEMPLATES: Record<UseCase, LlmUsage[]> = {
  testing: [
    usage('test-generation', 'Test design and generation', 'claude-sonnet-5-5', 'testing-effort-per-release', 15_000, 8_000, 2_000),
    usage('review-agent', 'Test review agent', 'claude-opus-5-5', 'testing-effort-per-release', 2_000, 30_000, 3_000),
    usage('defect-triage', 'Defect triage assistant', 'claude-haiku-4-5', 'defect-rca-effort', 10, 20_000, 1_000),
  ],
  development: [
    usage('coding-assistant', 'Coding assistant', 'claude-sonnet-5-5', 'user-stories', 400, 12_000, 2_000),
    usage('code-review-agent', 'Code review agent', 'claude-opus-5-5', 'code-reviews', 3, 40_000, 2_000),
    usage('bug-analysis', 'Bug analysis', 'claude-sonnet-5-5', 'bug-fixes', 20, 15_000, 1_500),
  ],
  support: [
    usage('ticket-assistant', 'Ticket assistant', 'claude-haiku-4-5', 'l1-tickets', 3, 4_000, 500),
    usage('incident-copilot', 'Incident copilot', 'claude-sonnet-5-5', 'l2-incidents', 15, 12_000, 1_500),
    usage('knowledge-drafting', 'Knowledge article drafting', 'claude-sonnet-5-5', 'knowledge-articles', 30, 10_000, 3_000),
  ],
};

export function detectUseCase(useCaseText: string): UseCase {
  const t = useCaseText.toLowerCase();
  if (t.includes('support') || t.includes('service') || t.includes('ticket') || t.includes('itsm')) return 'support';
  if (t.includes('test') || t.includes('qa')) return 'testing';
  if (t.includes('dev') || t.includes('engineer') || t.includes('build') || t.includes('code')) return 'development';
  return 'testing';
}

export function workloadHours(kpis: KpiInput[]): number {
  return kpis.reduce((sum, k) => sum + (k.volumePerMonth ?? 0) * k.baseline, 0);
}

// Template rates are authored in INR; convert them into the scenario currency.
export function getRolesForUseCase(
  useCase: UseCase,
  includeAll: boolean,
  currency: Currency,
  fxRatesPerEur: Record<Currency, number>
): Role[] {
  const factor = fxFactor('INR', currency, fxRatesPerEur);
  return selectRoles(useCase, includeAll).map(role => ({
    ...role,
    costPerFte: Math.round(role.costPerFte * factor),
    billRatePerFte: Math.round(role.billRatePerFte * factor),
  }));
}

function selectRoles(useCase: UseCase, includeAll: boolean): Role[] {
  let selectedRoles: Role[] = [...ROLE_TEMPLATES[useCase]!];

  // Add cross-functional roles if requested
  if (includeAll) {
    selectedRoles = [...selectedRoles, ...ROLE_TEMPLATES.allRoles];
  }

  // Ensure unique IDs
  const seen = new Set<string>();
  return selectedRoles.filter(role => {
    if (seen.has(role.id)) return false;
    seen.add(role.id);
    return true;
  });
}

/** FTE-weighted average baseline cost per FTE. */
export function averageCostPerFte(roles: Role[]): number {
  const fte = roles.reduce((sum, r) => sum + r.fte.baseline, 0);
  return fte > 0 ? roles.reduce((sum, r) => sum + r.fte.baseline * r.costPerFte, 0) / fte : 0;
}

/** Rescales all role rates so the FTE-weighted average equals `target`, keeping grade ratios. */
export function rescaleRolesToAverage(roles: Role[], target: number): Role[] {
  const current = averageCostPerFte(roles);
  if (current <= 0 || target <= 0) return roles;
  const k = target / current;
  return roles.map(r => ({
    ...r,
    costPerFte: Math.round(r.costPerFte * k),
    billRatePerFte: Math.round(r.billRatePerFte * k),
  }));
}

/** Roles, workload and AI model usage for a use case; replaces all three in the scenario. */
export function applyUseCaseTemplate(scenario: Scenario, useCase: UseCase, includeAll: boolean): Partial<Scenario> {
  return {
    roles: getRolesForUseCase(useCase, includeAll, scenario.baseCurrency, scenario.fxRatesPerEur),
    kpis: structuredClone(WORKLOAD_TEMPLATES[useCase]),
    llmUsage: structuredClone(LLM_USAGE_TEMPLATES[useCase]),
  };
}
