import type { CostCalculation, EffortCalculation, Scenario, SeatPricing, State } from './types.js';
import type { DeliveryContext } from './delivery.js';
import { fxFactor } from './currency.js';

/**
 * Published list prices per user per month, as of 2026-10-06. Editable per scenario.
 *
 * `includesUsage` is the field that matters: a seat that bundles usage must not also carry
 * token usage lines, or the same work is paid for twice. Claude Enterprise is the hybrid —
 * a seat price plus usage billed separately at API rates.
 */
export const DEFAULT_SEAT_PRICING: SeatPricing = {
  currency: 'USD',
  asOf: '2026-10-06',
  source:
    'Vendor list prices, business/enterprise tiers. Verify before quoting: seat pricing changed materially during 2026.',
  prices: [
    { id: 'claude-team-standard', label: 'Claude Team — Standard seat', pricePerSeatPerMonth: 25, includesUsage: true },
    { id: 'claude-team-premium', label: 'Claude Team — Premium seat (5× usage)', pricePerSeatPerMonth: 125, includesUsage: true },
    { id: 'claude-enterprise', label: 'Claude Enterprise seat (+ usage at API rates)', pricePerSeatPerMonth: 20, includesUsage: false },
    { id: 'copilot-business', label: 'GitHub Copilot Business', pricePerSeatPerMonth: 19, includesUsage: true },
    { id: 'copilot-enterprise', label: 'GitHub Copilot Enterprise', pricePerSeatPerMonth: 39, includesUsage: true },
    { id: 'cursor-teams', label: 'Cursor Teams', pricePerSeatPerMonth: 40, includesUsage: true },
    { id: 'amazon-q-pro', label: 'Amazon Q Developer Pro', pricePerSeatPerMonth: 19, includesUsage: true },
    { id: 'other-seat', label: 'Other (enter vendor price)', pricePerSeatPerMonth: 0, includesUsage: true },
  ],
};

export interface SeatCostBreakdown {
  total: Record<State, number>;
  /** Monthly cost per assignment id, per state, in the scenario currency. */
  byAssignment: Record<string, Record<State, number>>;
  /** Seats per assignment id, per state, after AI adoption scaling. */
  seatsByAssignment: Record<string, Record<State, number>>;
  totalSeats: Record<State, number>;
}

const STATES: State[] = ['baseline', 'transition', 'mature'];

/**
 * Monthly seat cost: the FTE of the assigned roles × the seat price, scaled by AI adoption.
 * Seats follow the team, so a team that shrinks carries fewer seats — unless the scenario says
 * otherwise by assigning roles whose FTE does not fall.
 */
export function seatCosts(scenario: Scenario, ctx: DeliveryContext, effort: EffortCalculation): SeatCostBreakdown {
  const pricing = scenario.seatPricing;
  const fx = fxFactor(pricing.currency, scenario.baseCurrency, scenario.fxRatesPerEur);
  const result: SeatCostBreakdown = {
    total: { baseline: 0, transition: 0, mature: 0 },
    byAssignment: {},
    seatsByAssignment: {},
    totalSeats: { baseline: 0, transition: 0, mature: 0 },
  };

  for (const assignment of scenario.seatAssignments) {
    const price = pricing.prices.find(p => p.id === assignment.seatPriceId)?.pricePerSeatPerMonth ?? 0;
    const seats = { baseline: 0, transition: 0, mature: 0 };
    const cost = { baseline: 0, transition: 0, mature: 0 };

    for (const state of STATES) {
      // Dangling role ids (role deleted after assignment) contribute nothing rather than throwing
      const fte = assignment.roleIds.reduce((sum, roleId) => {
        const index = scenario.roles.findIndex(r => r.id === roleId);
        return index === -1 ? sum : sum + (effort.roleFte[index]?.[state] ?? 0);
      }, 0);
      // Heavier-than-planned AI use (adoption above 1) cannot create more seats than people
      seats[state] = fte * Math.min(1, ctx.adoption[state]);
      cost[state] = seats[state] * price * fx;
    }

    result.seatsByAssignment[assignment.id] = seats;
    result.byAssignment[assignment.id] = cost;
    for (const state of STATES) {
      result.totalSeats[state] += seats[state];
      result.total[state] += cost[state];
    }
  }
  return result;
}

/** Seat assignments whose seat bundles usage, so attaching token usage would pay twice. */
export function seatsIncludingUsage(scenario: Scenario): string[] {
  return scenario.seatAssignments
    .filter(a => scenario.seatPricing.prices.find(p => p.id === a.seatPriceId)?.includesUsage)
    .map(a => a.name);
}

/**
 * Published reference band for AI coding assistant cost per developer per month.
 * Source: Anthropic, "Manage costs effectively" (code.claude.com/docs/en/costs), which reports
 * roughly $150–250 per developer per month across enterprise Claude Code deployments, around $13
 * per active day. It is a Claude Code figure, not an industry average — a rail to check against,
 * not a target.
 */
export const PER_DEVELOPER_BAND_USD = { low: 150, high: 250, source: 'Anthropic, enterprise Claude Code deployments' };

/** How far outside the band counts as "something is wrong" rather than "this customer differs". */
const IMPLAUSIBLE_FACTOR = 3;

export interface PerDeveloperCost {
  /** Monthly AI cost per developer once mature, in the scenario currency. */
  perDeveloper: number;
  /** Developers the cost is spread over: seats when modelled, otherwise the mature team. */
  developers: number;
  /** True when seats gave the denominator; otherwise it is the whole team and only an approximation. */
  fromSeats: boolean;
  /** The published band converted into the scenario currency. */
  low: number;
  high: number;
  verdict: 'below' | 'within' | 'above';
  /** Outside the band by more than the implausibility factor: likely an input error, not a difference. */
  implausible: boolean;
}

/**
 * AI spend per developer per month, for checking a scenario against the published band.
 * This is a sanity rail: being outside the band is not wrong, but being far outside usually means
 * a token volume or a price is off by an order of magnitude.
 */
export function aiCostPerDeveloper(scenario: Scenario, cost: CostCalculation, effort: EffortCalculation): PerDeveloperCost | null {
  const fromSeats = cost.totalSeats.mature > 0;
  const developers = fromSeats ? cost.totalSeats.mature : effort.staffingFte.mature;
  const aiCost = cost.seatCost.mature + cost.llmCost.mature;
  if (developers <= 0 || aiCost <= 0) return null;

  const usdToScenario = fxFactor('USD', scenario.baseCurrency, scenario.fxRatesPerEur);
  const low = PER_DEVELOPER_BAND_USD.low * usdToScenario;
  const high = PER_DEVELOPER_BAND_USD.high * usdToScenario;
  const perDeveloper = aiCost / developers;

  const verdict = perDeveloper < low ? 'below' : perDeveloper > high ? 'above' : 'within';
  const implausible = perDeveloper < low / IMPLAUSIBLE_FACTOR || perDeveloper > high * IMPLAUSIBLE_FACTOR;
  return { perDeveloper, developers, fromSeats, low, high, verdict, implausible };
}
