import { z } from 'zod';
import type { Scenario } from './types.js';
import { CURRENCIES } from './currency.js';
import { DELIVERY_MODELS } from './delivery.js';
import { normalizeScenario } from './defaults.js';

const text = z.string().max(200);
const money = z.number().finite().min(0).max(1e12);
const share = z.number().finite().min(0).max(1);
const perState = <T extends z.ZodTypeAny>(t: T) => z.object({ baseline: t, transition: t, mature: t });
const currency = z.enum(CURRENCIES as [string, ...string[]]);
const model = z.enum(DELIVERY_MODELS as [string, ...string[]]);

const role = z.object({
  id: text,
  name: text,
  fte: perState(z.number().finite().min(0).max(100_000)),
  costPerFte: money,
  billRatePerFte: money,
  gradeLevel: z.number().int().min(1).max(5),
  isAiImpacted: z.boolean(),
});

const costLine = z.object({
  id: text,
  name: text,
  category: text,
  monthlyAmount: perState(money),
  chargeable: z.boolean(),
  aiSpecific: z.boolean().optional(),
});

const investment = z.object({
  id: text,
  name: text,
  amount: money,
  month: z.number().int().min(0).max(60),
  aiSpecific: z.boolean().optional(),
});

const kpi = z.object({
  id: text,
  name: text,
  unit: text,
  baseline: z.number().finite(),
  appliesToFactor: z.boolean(),
  isVelocity: z.boolean(),
  overrides: z.object({ transition: z.number().finite(), mature: z.number().finite() }).partial(),
  volumePerMonth: z.number().finite().min(0).max(1e8).optional(),
  volumeUnit: text.optional(),
  reviewOverheadApplies: z.boolean().optional(),
});

const overheadPct = z.object({ hitl: share, rework: share, dualRun: share });

const llmPricing = z.object({
  currency,
  asOf: text,
  source: z.string().max(500),
  prices: z
    .array(
      z.object({
        id: text,
        label: text,
        inputPerMTok: z.number().finite().min(0).max(100_000),
        outputPerMTok: z.number().finite().min(0).max(100_000),
      })
    )
    .max(100),
});

const llmUsage = z.object({
  id: text,
  name: text,
  priceId: text,
  kpiId: text.optional(),
  requestsPerUnit: z.number().finite().min(0).max(1e9),
  inputTokensPerRequest: z.number().finite().min(0).max(1e8),
  outputTokensPerRequest: z.number().finite().min(0).max(1e8),
});

/** Accepts current files and files saved before delivery profiles / FX rates existed. */
const scenarioFile = z.object({
  id: text,
  name: text,
  clientName: text,
  useCase: text,
  baseCurrency: currency,
  fxRatesPerEur: z.record(currency, z.number().finite().positive()).optional(),
  scenarioDate: text,
  isExample: z.boolean().optional(),
  globalAssumptions: z.object({
    releasesPerMonth: z.number().finite().min(0).max(10_000).optional(),
    workingHrsPerFtePerMonth: z.number().finite().positive().max(744),
    defectsPerMonth: z.number().finite().min(0).max(1e7).optional(),
    transitionLengthMonths: z.number().int().min(1).max(24),
    riskReservePercent: perState(share),
    corporateOverheadPercent: perState(share),
    overheadRationale: perState(z.string().max(2000)),
  }),
  timeValue: z.object({
    horizonMonths: z.number().int().min(12).max(60),
    discountRateAnnual: z.number().finite().min(-0.5).max(1),
    wageEscalationAnnual: z.number().finite().min(-0.5).max(1),
  }),
  aiOverheadPercent: perState(overheadPct),
  roles: z.array(role).min(1).max(500),
  peopleMode: z.object({ mode: z.enum(['staffing-plan', 'effort-derived']) }),
  kpis: z.array(kpi).max(500),
  costLines: z.array(costLine).max(500),
  llmUsage: z.array(llmUsage).max(200).optional(),
  llmPricing: llmPricing.optional(),
  oneTimeInvestment: z.array(investment).max(500),
  productivityFactor: z.union([
    z.object({ mode: z.literal('direct-factor'), transition: z.number().finite().positive(), mature: z.number().finite().positive() }),
    z.object({ mode: z.literal('evaluation-derived') }).passthrough(),
  ]),
  primaryModel: z.string().max(50),
  deliveryProfiles: z
    .record(model, z.object({ bccShare: share, aiAdoption: z.number().finite().min(0).max(2) }))
    .optional(),
  bccRateFactor: z.number().finite().min(0).max(2).optional(),
  baselineBccShare: share.optional(),
  costChargeable: z.enum(['tco', 'chargeable']),
  costAvoidanceIncludedInRoi: z.boolean(),
  costAvoidanceExtraTestCasesPerMonth: z.number().finite().min(0).optional(),
  costAvoidanceExtraScriptsPerMonth: z.number().finite().min(0).optional(),
});

export type ParseScenarioResult = { ok: true; scenario: Scenario } | { ok: false; errors: string[] };

/** Validates untrusted scenario data (file import, API body). Accepts `{ scenario }` wrappers. */
export function parseScenario(data: unknown): ParseScenarioResult {
  const candidate =
    data && typeof data === 'object' && 'scenario' in data ? (data as { scenario: unknown }).scenario : data;
  const parsed = scenarioFile.safeParse(candidate);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.slice(0, 5).map(i => `${i.path.join('.') || 'file'}: ${i.message}`),
    };
  }
  const scenario = normalizeScenario(parsed.data as unknown as Scenario);
  if (!scenario.kpis.some(k => k.volumePerMonth !== undefined)) {
    return { ok: false, errors: ['kpis: no workload items (inputs with a monthly volume), so effort cannot be calculated'] };
  }
  return { ok: true, scenario };
}
