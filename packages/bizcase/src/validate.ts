import type { BusinessCaseInputs, TierId, ValidationIssue } from './types.js';

const TIER_LABEL: Record<TierId, string> = { local: 'Local', enterprise: 'Enterprise', frontier: 'Frontier' };

/** Labels for the non-negative cost fields, as shown on the Investment screen without the unit. */
const NON_NEGATIVE_LABEL: Record<
  'retiredCostMonthly' | 'governanceMonthly' | 'dataReadinessInvestment' | 'governanceSetup' | 'trainingPerFte',
  string
> = {
  retiredCostMonthly: 'Cost removed outright per month',
  governanceMonthly: 'Governance running cost per month',
  dataReadinessInvestment: 'Data readiness investment',
  governanceSetup: 'Governance and assurance setup',
  trainingPerFte: 'Training per person',
};

const isFraction = (v: number): boolean => v >= 0 && v <= 1;

/** Returns every problem with the inputs. An empty list means the inputs are valid. */
export function validateInputs(inputs: BusinessCaseInputs): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const add = (field: string, message: string): void => {
    issues.push({ field, message });
  };

  if (!(inputs.teamSize > 0)) add('teamSize', 'Team size must be greater than zero.');
  if (!(inputs.loadedCostPerFteYear > 0)) add('loadedCostPerFteYear', 'Annual cost per person must be greater than zero.');
  if (!(inputs.hoursPerFteMonth > 0)) add('hoursPerFteMonth', 'Hours per month must be greater than zero.');

  const shareSum = inputs.tasks.reduce((sum, t) => sum + t.share, 0);
  if (Math.abs(shareSum - 1) > 0.0001) add('tasks', 'Work mix must add up to 100%.');
  for (const t of inputs.tasks) {
    if (!isFraction(t.share)) add(`tasks.${t.id}.share`, `${t.name}: share must be between 0% and 100%.`);
  }

  if (!isFraction(inputs.adoption)) add('adoption', 'Adoption must be between 0% and 100%.');
  if (!isFraction(inputs.cashShare)) add('cashShare', 'Cash share must be between 0% and 100%.');

  if (!(Number.isInteger(inputs.rampMonths) && inputs.rampMonths >= 1 && inputs.rampMonths <= 24)) {
    add('rampMonths', 'Ramp must be a whole number of months from 1 to 24.');
  }

  for (const key of Object.keys(NON_NEGATIVE_LABEL) as (keyof typeof NON_NEGATIVE_LABEL)[]) {
    if (!(inputs[key] >= 0)) add(key, `${NON_NEGATIVE_LABEL[key]} cannot be negative.`);
  }

  for (const tierId of Object.keys(TIER_LABEL) as TierId[]) {
    const tier = inputs.tiers[tierId];
    for (const field of Object.keys(tier) as (keyof typeof tier)[]) {
      const value = tier[field];
      const isCost = field === 'usageCostPerAssistedHour' || field === 'platformMonthly' || field === 'setup';
      const ok = isCost ? value >= 0 : isFraction(value);
      if (!ok) add(`tiers.${tierId}.${field}`, `${TIER_LABEL[tierId]} assumption "${field}" is out of range.`);
    }
  }

  return issues;
}

const TASK_IDS = ['testDesign', 'scriptDev', 'execution', 'defectAnalysis', 'reporting'];
const TIER_KEYS: TierId[] = ['local', 'enterprise', 'frontier'];
const TIER_FIELDS = [
  'reductionRoutine',
  'reductionComplex',
  'reviewRoutine',
  'reviewComplex',
  'usageCostPerAssistedHour',
  'platformMonthly',
  'setup',
];
const NUMBER_FIELDS = [
  'teamSize',
  'loadedCostPerFteYear',
  'hoursPerFteMonth',
  'adoption',
  'cashShare',
  'retiredCostMonthly',
  'rampMonths',
  'governanceMonthly',
  'dataReadinessInvestment',
  'governanceSetup',
  'trainingPerFte',
];
const READINESS_KEYS = ['data', 'skills', 'sponsorship', 'compliance'];

const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Checks that untrusted data (for example saved in a browser) has the shape of the inputs: every field present
 * with the right type, and every option one of its allowed values. It does not check value ranges; use
 * validateInputs for that, after this passes.
 */
export function isBusinessCaseInputs(value: unknown): value is BusinessCaseInputs {
  if (!isRecord(value)) return false;
  if (typeof value.customerName !== 'string') return false;
  if (!NUMBER_FIELDS.every(key => isFiniteNumber(value[key]))) return false;
  if (!['public-ok', 'restricted', 'sovereign'].includes(value.dataConstraint as string)) return false;
  if (!TIER_KEYS.includes(value.hybridComplexTier as TierId)) return false;

  const tasks = value.tasks;
  if (!Array.isArray(tasks) || tasks.length !== TASK_IDS.length) return false;
  const tasksOk = tasks.every(
    (t, i) =>
      isRecord(t) &&
      t.id === TASK_IDS[i] &&
      typeof t.name === 'string' &&
      isFiniteNumber(t.share) &&
      (t.difficulty === 'routine' || t.difficulty === 'complex'),
  );
  if (!tasksOk) return false;

  const tiers = value.tiers;
  if (!isRecord(tiers)) return false;
  const tiersOk = TIER_KEYS.every(id => {
    const tier = tiers[id];
    return isRecord(tier) && TIER_FIELDS.every(field => isFiniteNumber(tier[field]));
  });
  if (!tiersOk) return false;

  const readiness = value.readiness;
  if (!isRecord(readiness)) return false;
  return READINESS_KEYS.every(key => ['ready', 'partial', 'not-ready'].includes(readiness[key] as string));
}
