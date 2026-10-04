import type { Role, Currency } from '@ai-roi-calc/engine';
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

// Template rates are authored in INR; convert them into the scenario currency.
export function getRolesForUseCase(
  useCase: string,
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

function selectRoles(useCase: string, includeAll: boolean): Role[] {
  const lowerCase = useCase.toLowerCase();

  let selectedRoles: Role[] = [];

  // Detect use case and select template
  if (lowerCase.includes('test') || lowerCase.includes('qa')) {
    selectedRoles = [...ROLE_TEMPLATES.testing];
  } else if (lowerCase.includes('dev') || lowerCase.includes('engineer') || lowerCase.includes('build')) {
    selectedRoles = [...ROLE_TEMPLATES.development];
  } else if (lowerCase.includes('support') || lowerCase.includes('service') || lowerCase.includes('customer')) {
    selectedRoles = [...ROLE_TEMPLATES.support];
  } else {
    // Default to testing if unclear
    selectedRoles = [...ROLE_TEMPLATES.testing];
  }

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
