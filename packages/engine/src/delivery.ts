import type {
  CostLine,
  DeliveryProfile,
  ImplementationModel,
  OneTimeInvestmentItem,
  Role,
  Scenario,
  State,
} from './types.js';

export const DELIVERY_MODELS: ImplementationModel[] = ['onshore', 'bcc-only', 'onshore-ai', 'ai-bcc', 'ai-first'];

export const DEFAULT_DELIVERY_PROFILES: Record<ImplementationModel, DeliveryProfile> = {
  onshore: { bccShare: 0, aiAdoption: 0 },
  'bcc-only': { bccShare: 0.8, aiAdoption: 0 },
  'onshore-ai': { bccShare: 0, aiAdoption: 1 },
  'ai-bcc': { bccShare: 0.8, aiAdoption: 1 },
  'ai-first': { bccShare: 0, aiAdoption: 1.25 },
};

export const DEFAULT_BCC_RATE_FACTOR = 0.45;
export interface DeliveryContext {
  adoption: Record<State, number>;
  /** Share of offshore-able work done in the best-cost country, per state. */
  bccShare: Record<State, number>;
  /** Default offshore cost as a fraction of onshore, for roles without their own offshore rate. */
  bccRateFactor: number;
  /** False when the target model is identical to today's delivery (status quo). */
  changeApplies: boolean;
}

export function deliveryContext(scenario: Scenario): DeliveryContext {
  const profile = scenario.deliveryProfiles[scenario.primaryModel];
  return {
    adoption: { baseline: 0, transition: profile.aiAdoption, mature: profile.aiAdoption },
    // Transition runs at today's location mix; the monthly ramp then migrates it to the target mix,
    // which stands in for knowledge transfer / dual running during a location change.
    bccShare: {
      baseline: scenario.baselineBccShare,
      transition: scenario.baselineBccShare,
      mature: profile.bccShare,
    },
    bccRateFactor: scenario.bccRateFactor,
    changeApplies: profile.aiAdoption > 0 || profile.bccShare !== scenario.baselineBccShare,
  };
}

/** Interpolates from the baseline value toward the planned AI value by the adoption level. */
function scaleByAdoption(baseline: number, planned: number, adoption: number): number {
  return baseline + (planned - baseline) * adoption;
}

export function effectiveFte(role: Role, state: State, ctx: DeliveryContext): number {
  if (state === 'baseline') return role.fte.baseline;
  return Math.max(0, scaleByAdoption(role.fte.baseline, role.fte[state], ctx.adoption[state]));
}

/** A role's offshore cost per FTE per month: its own rate, or the onshore rate × the default factor. */
export function offshoreRate(role: Role, bccRateFactor: number): number {
  return role.bccCostPerFte ?? role.costPerFte * bccRateFactor;
}

/** Blend of onshore and offshore rate by the state's offshore share; roles that cannot move stay onshore. */
export function effectiveRate(role: Role, state: State, ctx: DeliveryContext): number {
  if (role.offshorable === false) return role.costPerFte;
  const share = ctx.bccShare[state];
  return (1 - share) * role.costPerFte + share * offshoreRate(role, ctx.bccRateFactor);
}

export function effectiveLineAmount(line: CostLine, state: State, ctx: DeliveryContext): number {
  const base = line.monthlyAmount.baseline;
  if (state === 'baseline') return base;
  if (line.aiSpecific) return Math.max(0, scaleByAdoption(base, line.monthlyAmount[state], ctx.adoption[state]));
  return ctx.changeApplies ? line.monthlyAmount[state] : base;
}

export function effectiveInvestment(item: OneTimeInvestmentItem, ctx: DeliveryContext): number {
  if (item.aiSpecific) return item.amount * ctx.adoption.mature;
  return ctx.changeApplies ? item.amount : 0;
}

/** Productivity factor and KPI overrides move from "no change" (1 / baseline) toward the plan by adoption. */
export function effectiveProductivityFactor(factor: number, adoption: number): number {
  return Math.max(0.05, scaleByAdoption(1, factor, adoption));
}

export function effectiveOverride(baseline: number, override: number, adoption: number): number {
  return scaleByAdoption(baseline, override, adoption);
}
