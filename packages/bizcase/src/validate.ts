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

const isFraction = (v: number) => v >= 0 && v <= 1;

/** Returns every problem with the inputs. An empty list means the inputs are valid. */
export function validateInputs(inputs: BusinessCaseInputs): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const add = (field: string, message: string) => issues.push({ field, message });

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
