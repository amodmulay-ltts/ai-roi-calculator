# Executive AI Business Case: Build Specification

This is the build specification for the new app described in `CONCEPT_EXEC.md`. It is written for a coding model. Follow it literally. Where it gives a number, a name, a formula or a sentence, use exactly that.

## 0. Rules for the coding model

1. Read `CLAUDE.md`, `CONCEPT_EXEC.md` and this file completely before writing code.
2. Do **one task at a time**, in the order of section 9. Finish it, run its checks, commit, then start the next.
3. Work on a feature branch per task (`feature/exec-t1-types`, and so on). Merge to `main` only when that task's checks pass.
4. **Do not modify** `packages/engine`, `apps/client`, `apps/server`, or any existing test. The new app is separate and does **not** import `@ai-roi-calc/engine`.
5. Do not invent behaviour, numbers, wording or options. If something is not specified, stop and write the question in `EXEC_QUESTIONS.md`, then continue with the parts that do not depend on it.
6. Do not add dependencies that are not listed in section 2.
7. All monetary values are **EUR**. All percentages are stored as **fractions from 0 to 1** in code and shown as percentages (0 to 100) in the UI.
8. Every numeric result must come from the `bizcase` package. The UI never does financial arithmetic.
9. All numbers in the defaults (section 4) are **placeholders**. The UI must label them "Assumption to validate" wherever they are shown as editable values.

## 1. What is being built

A presenter-led web app that builds a one-piece-of-work business case for AI, for management. The work is a lifecycle chosen from a template (software testing, the whole software lifecycle, product development or mechanical design) or built by hand. It compares four ways of running AI (local, hybrid, enterprise, frontier), shows which pays back, shows a conservative, expected and stretch range, states what must be true for the case to hold, and prints a one-page summary.

Out of scope: login, a server, a database, multiple use cases, multiple currencies, revenue benefits, discounting or NPV, PDF generation on a server.

## 2. Repository layout and commands

Create exactly these two new workspaces. The root `package.json` already includes `packages/*` and `apps/*`.

```
packages/bizcase/            name: @ai-roi-calc/bizcase   (pure TypeScript, no I/O, vitest)
  package.json
  tsconfig.json
  vitest.config.ts
  src/index.ts               re-exports everything public
  src/types.ts
  src/defaults.ts
  src/validate.ts
  src/calc.ts
  src/compare.ts
  src/breakeven.ts
  src/narrative.ts
  src/format.ts
  src/__tests__/*.test.ts

apps/exec/                   name: @ai-roi-calc/exec      (React 18 + Vite + Tailwind + zustand + recharts)
  package.json
  index.html
  vite.config.ts             dev port 5174, build outDir ../../dist/exec
  tailwind.config.js, postcss.config.js, tsconfig.json
  src/main.tsx, src/App.tsx, src/index.css
  src/store.ts
  src/screens/{Situation,Opportunity,RightSize,Investment,Result,Risks,Decision}.tsx
  src/components/*.tsx
```

Copy the structure and configuration style of `packages/engine` (for `bizcase`) and `apps/client` (for `exec`): same TypeScript settings, same `"type": "module"`, same `exports` block, same Tailwind and PostCSS setup. Dependencies of `apps/exec`: `@ai-roi-calc/bizcase`, `react`, `react-dom`, `zustand`, `recharts`. Dev dependencies as in `apps/client`, plus `vitest` is **not** needed in the app.

Add these root scripts (do not remove any existing script):

```
"dev:exec": "npm run build -w packages/bizcase && npm run dev -w apps/exec",
"test:bizcase": "npm test -w packages/bizcase",
"build:exec": "npm run build -w packages/bizcase && npm run build -w apps/exec"
```

`bizcase` must be built (`tsc`) before the app can typecheck, exactly as `engine` is for the current client.

## 3. Domain types

Put these in `packages/bizcase/src/types.ts` exactly. Export all of them.

```ts
export type TierId = 'local' | 'enterprise' | 'frontier';
export type PostureId = 'local' | 'hybrid' | 'enterprise' | 'frontier';
export type CaseId = 'conservative' | 'expected' | 'stretch';
export type Difficulty = 'routine' | 'complex';
export type DataConstraint = 'public-ok' | 'restricted' | 'sovereign';
export type ReadinessAnswer = 'ready' | 'partial' | 'not-ready';
export type Verdict = 'positive' | 'marginal' | 'negative';

/** A kind of work, belonging to one lifecycle phase. */
export interface TaskMix {
  id: string;           // unique within the case
  name: string;
  phase: string;        // name of one of the case's phases
  /** Share of in-scope effort, 0..1. All shares must sum to 1: they split one whole. */
  share: number;
  difficulty: Difficulty;
}

/** A lifecycle phase and how much of its work AI is used on. */
export interface WorkPhase {
  name: string;
  /** Share of this phase's work where AI is used at maturity, 0..1. Independent for each phase: these do NOT add up to 100%. */
  aiUse: number;
}

/** A ready-made starting point. Its figures are placeholders, not measured data. */
export interface WorkTemplate {
  id: string;
  name: string;
  industry: string;
  description: string;
  phases: WorkPhase[];
  tasks: TaskMix[];
}

export interface TierAssumptions {
  /** Fraction of a routine task's effort AI removes before review, 0..1. */
  reductionRoutine: number;
  reductionComplex: number;
  /** Fraction of the removed effort that comes back as human review and rework, 0..1. */
  reviewRoutine: number;
  reviewComplex: number;
  /** EUR per hour of AI-assisted work. */
  usageCostPerAssistedHour: number;
  /** EUR per month: licences, infrastructure, operations. */
  platformMonthly: number;
  /** EUR one-time. */
  setup: number;
}

export interface Readiness {
  data: ReadinessAnswer;
  skills: ReadinessAnswer;
  sponsorship: ReadinessAnswer;
  compliance: ReadinessAnswer;
}

export interface BusinessCaseInputs {
  customerName: string;
  teamSize: number;               // FTE in scope, > 0
  loadedCostPerFteYear: number;   // EUR per year, > 0
  hoursPerFteMonth: number;       // default 160, > 0
  dataConstraint: DataConstraint;
  workTemplateId: string;         // the template the work was last started from ('custom' once built by hand)
  phases: WorkPhase[];            // 1..12 phases, in display order
  tasks: TaskMix[];               // 1..40 kinds of work, each in one of the phases
  cashShare: number;              // share of released capacity counted as real savings, 0..1
  retiredCostMonthly: number;     // EUR per month of cost removed outright (tools, contractors), >= 0
  rampMonths: number;             // integer 1..24: months to full effect
  governanceMonthly: number;      // EUR per month, >= 0
  dataReadinessInvestment: number;// EUR one-time, >= 0
  governanceSetup: number;        // EUR one-time, >= 0
  trainingPerFte: number;         // EUR one-time per FTE, >= 0
  hybridComplexTier: TierId;      // tier used for complex tasks in the hybrid posture
  tiers: Record<TierId, TierAssumptions>;
  readiness: Readiness;
}

/** The tasks of one phase added up. */
export interface PhaseResult {
  name: string;
  aiUse: number;              // as entered
  baselineHours: number;
  assistedHours: number;
  netSavedHours: number;
  netEfficiency: number;      // net saved / baseline hours, 0..1 (0 when the phase has no work)
}

/** What happens to one kind of work under a posture, in hours per month at maturity. */
export interface TaskResult {
  id: string;
  name: string;
  phase: string;
  tier: TierId;
  baselineHours: number;      // total hours x share of work
  assistedHours: number;      // baseline hours x the phase's AI use
  grossRemovedHours: number;  // assisted hours x effort AI removes
  reviewReworkHours: number;  // removed hours that come back as review and rework
  netSavedHours: number;      // gross removed minus review and rework
  netEfficiency: number;      // net saved / baseline hours, 0..1 (0 when there is no baseline work)
}

export interface CaseResult {
  postureId: PostureId;
  caseId: CaseId;
  netHoursSavedPerMonth: number;   // at maturity
  /** Hours of in-scope work per month before AI. */
  totalHours: number;
  grossRemovedHoursPerMonth: number;
  reviewReworkHoursPerMonth: number;
  /** Net share of in-scope effort freed after review and rework: netHoursSavedPerMonth / totalHours, 0..1. */
  netEfficiency: number;
  /** The bridge to net efficiency, as shares of in-scope effort: gross removed minus review and rework. */
  grossEfficiency: number;
  reviewReworkEfficiency: number;
  /** Share of all in-scope effort that AI is used on: assisted hours / total hours, 0..1. */
  aiReach: number;
  tasks: TaskResult[];
  phases: PhaseResult[];   // in the order of the case's phases
  capacityFte: number;             // netHoursSavedPerMonth / hoursPerFteMonth
  capacityValuePerMonth: number;   // EUR, all released capacity at the hourly cost
  countedSavingPerMonth: number;   // capacityValue x effective cash share
  retiredCostPerMonth: number;     // cost removed outright, as entered
  redeployedValuePerMonth: number; // capacityValue minus counted saving (NOT counted anywhere)
  usageCostPerMonth: number;       // at maturity
  platformAndGovernancePerMonth: number;
  steadyNetPerMonth: number;       // counted saving + retired cost - usage - platform and governance, at maturity
  investment: number;              // one-time, month 0
  /** Breakdown of `investment`; the amounts add up to it exactly. */
  investmentLines: { label: string; amount: number }[];
  paybackMonth: number | null;     // first month 1..36 with cumulative >= 0, else null
  netValue36: number;              // cumulative at month 36 (undiscounted)
  roiPercent: number | null;       // netValue36 / investment x 100; null when investment is 0
  cumulative: number[];            // length 37: index m is the cumulative position at month m
  verdict: Verdict;
}

export interface PostureSummary {
  postureId: PostureId;
  allowed: boolean;
  disallowedReason: string | null;
  tiersUsed: TierId[];
  expected: CaseResult;
  conservative: CaseResult;
  stretch: CaseResult;
}

export interface ValidationIssue { field: string; message: string; }
```

## 4. Defaults

Put in `packages/bizcase/src/defaults.ts` as `createDefaultInputs(): BusinessCaseInputs`, returning a **fresh deep copy** each call. Exact values:

| Field | Value |
|---|---|
| customerName | `''` |
| teamSize | 30 |
| loadedCostPerFteYear | 80000 |
| hoursPerFteMonth | 160 |
| dataConstraint | `'public-ok'` |
| workTemplateId | `'software-testing'` |
| cashShare | 0.7 |
| retiredCostMonthly | 0 |
| rampMonths | 6 |
| governanceMonthly | 3000 |
| dataReadinessInvestment | 60000 |
| governanceSetup | 25000 |
| trainingPerFte | 800 |
| hybridComplexTier | `'enterprise'` |
| readiness | all four answers `'ready'` |

Phases and tasks come from the `software-testing` template. Phases (each with its own AI use; these are independent and do not add up to 100%):

| Phase | aiUse |
|---|---|
| Design | 0.8 |
| Build | 0.8 |
| Execute | 0.8 |
| Analyse | 0.8 |
| Report | 0.8 |

Tasks, in this order:

| id | name | phase | share | difficulty |
|---|---|---|---|---|
| testDesign | Test design | Design | 0.30 | complex |
| scriptDev | Script development | Build | 0.25 | routine |
| execution | Test execution | Execute | 0.25 | routine |
| defectAnalysis | Defect analysis | Analyse | 0.10 | complex |
| reporting | Reporting | Report | 0.10 | routine |

The other templates (`software-lifecycle`, `product-lifecycle`, `mechanical-design`) are defined in `packages/bizcase/src/templates.ts`. Every figure in them is a placeholder.

Tiers:

| Tier | reductionRoutine | reductionComplex | reviewRoutine | reviewComplex | usageCostPerAssistedHour | platformMonthly | setup |
|---|---|---|---|---|---|---|---|
| local | 0.30 | 0.10 | 0.20 | 0.50 | 0 | 7000 | 130000 |
| enterprise | 0.50 | 0.40 | 0.15 | 0.25 | 2.5 | 10000 | 90000 |
| frontier | 0.55 | 0.55 | 0.15 | 0.20 | 11 | 1000 | 30000 |

Constants (not inputs), also in `defaults.ts`:

```ts
export const HORIZON_MONTHS = 36;
export const MAX_REDUCTION = 0.9;
export const CASE_FACTORS = {
  conservative: { effectiveness: 0.75, investment: 1.25, rampDelta: 3, cash: 0.8 },
  expected:     { effectiveness: 1,    investment: 1,    rampDelta: 0, cash: 1 },
  stretch:      { effectiveness: 1.15, investment: 0.9,  rampDelta: -1, cash: 1 },
} as const;
export const READINESS_POINTS = { ready: 0, partial: 1, 'not-ready': 2 } as const;
export const GAP_EFFECTIVENESS_PER_POINT = 0.025;
export const GAP_INVESTMENT_PER_POINT = 0.025;
export const MARGINAL_ROI_PERCENT = 50;
```

## 5. Calculation (exact)

Put in `calc.ts`. The function is pure and does not round.

```ts
export function calculateCase(inputs: BusinessCaseInputs, postureId: PostureId, caseId: CaseId): CaseResult
```

Assume the inputs are valid (the UI validates first).

**5.1 Tier per task.** For posture `local`, `enterprise`, `frontier`: every task uses that tier. For `hybrid`: a `routine` task uses `local`; a `complex` task uses `inputs.hybridComplexTier`. `tiersUsed` is the set of distinct tiers across the 5 tasks.

**5.2 Readiness gap.** `gap = sum of READINESS_POINTS over the four answers` (0 to 8).

**5.3 Case parameters.** With `f = CASE_FACTORS[caseId]`:
```
effMult   = (1 - GAP_EFFECTIVENESS_PER_POINT * gap) * f.effectiveness
invMult   = (1 + GAP_INVESTMENT_PER_POINT * gap) * f.investment
ramp      = max(1, rampMonths + ceil(gap / 2) + f.rampDelta)
cashShare = min(1, max(0, inputs.cashShare * f.cash))
```
`calculateCase` takes an optional fourth argument `overrides?: { effectivenessMultiplier?: number; cashShare?: number }`. If `effectivenessMultiplier` is given, multiply `effMult` by it. If `cashShare` is given, use it **instead of** the computed `cashShare` (still clamped 0..1). The break-even functions use these overrides. The UI does not.

**5.4 Hours.**
```
totalHours = teamSize * hoursPerFteMonth
hourlyCost = loadedCostPerFteYear / 12 / hoursPerFteMonth
for each task t:
  assisted_t = totalHours * t.share * aiUse(t.phase)   // aiUse = the AI use of the phase named by t.phase; 0 if no phase has that name
  reduction_t = min(MAX_REDUCTION, tier.reduction{Routine|Complex by t.difficulty} * effMult)
  review_t = tier.review{Routine|Complex by t.difficulty}
  removed_t = assisted_t * reduction_t
  netSaved_t = removed_t * (1 - review_t)
  usage_t = assisted_t * tier.usageCostPerAssistedHour
netHoursSavedPerMonth = sum netSaved_t
usageCostPerMonth = sum usage_t
```

**5.4a Efficiency.** Net efficiency is the headline measure of "expected efficiency with AI". It is not an input: each phase's AI use says how much of that phase's work AI reaches, while efficiency is what is actually freed after review and rework.
```
totalHours             = teamSize * hoursPerFteMonth
grossRemovedHours      = sum removed_t
reviewReworkHours      = sum (removed_t * review_t) = grossRemovedHours - netHoursSavedPerMonth
netEfficiency          = totalHours > 0 ? netHoursSavedPerMonth / totalHours : 0
grossEfficiency        = totalHours > 0 ? grossRemovedHours / totalHours : 0
reviewReworkEfficiency = totalHours > 0 ? reviewReworkHours / totalHours : 0
per task: baselineHours = totalHours * share; assistedHours = assisted_t; netEfficiency_t = baselineHours > 0 ? netSaved_t / baselineHours : 0
```

**5.4b Phases.** AI use is set for each phase and is independent: there is no rule that the phase values add up to anything.
```
aiReach = totalHours > 0 ? sum assisted_t / totalHours : 0
per phase p (in the order of inputs.phases): baselineHours = sum of its tasks' baselineHours; assistedHours, netSavedHours likewise;
  netEfficiency = baselineHours > 0 ? netSavedHours / baselineHours : 0
```

**5.5 Value.**
```
capacityValuePerMonth   = netHoursSavedPerMonth * hourlyCost
countedSavingPerMonth   = capacityValuePerMonth * cashShare
redeployedValuePerMonth = capacityValuePerMonth - countedSavingPerMonth
capacityFte             = netHoursSavedPerMonth / hoursPerFteMonth
```

**5.6 Costs.**
```
platformAndGovernancePerMonth = sum of tier.platformMonthly over DISTINCT tiersUsed + governanceMonthly
investment = (sum of tier.setup over DISTINCT tiersUsed + dataReadinessInvestment + governanceSetup + trainingPerFte * teamSize) * invMult
steadyNetPerMonth = countedSavingPerMonth + retiredCostMonthly - usageCostPerMonth - platformAndGovernancePerMonth
```
`investmentLines` is exactly these four items in this order, each already multiplied by `invMult`, so they add up to `investment`:
1. `Platform setup`: sum of `tier.setup` over distinct `tiersUsed`
2. `Data readiness`: `dataReadinessInvestment`
3. `Governance setup`: `governanceSetup`
4. `Training`: `trainingPerFte * teamSize`

**5.7 Timeline.** `cumulative[0] = -investment`. For month `m` from 1 to 36:
```
factor = min(1, m / ramp)
net_m  = (countedSavingPerMonth + retiredCostMonthly) * factor
         - usageCostPerMonth * factor
         - platformAndGovernancePerMonth          (full from month 1, not ramped)
cumulative[m] = cumulative[m-1] + net_m
```
`paybackMonth` = smallest `m` in 1..36 with `cumulative[m] >= 0`, else `null`. `netValue36 = cumulative[36]`. `roiPercent = investment > 0 ? netValue36 / investment * 100 : null`.

**5.8 Verdict.**
```
netValue36 <= 0                         -> 'negative'
roiPercent !== null && roiPercent < 50  -> 'marginal'   (use MARGINAL_ROI_PERCENT)
otherwise                               -> 'positive'
```

**5.9 Constraints (`compare.ts`).**
```ts
export function allowedTiers(c: DataConstraint): TierId[]
//   'public-ok'  -> ['local','enterprise','frontier']
//   'restricted' -> ['local','enterprise']
//   'sovereign'  -> ['local']
export function tiersForPosture(inputs, postureId): TierId[]
export function compareAll(inputs): Record<PostureId, PostureSummary>
export function recommendedPosture(inputs): PostureId | null
```
A posture is `allowed` only if every tier it uses is allowed. If not allowed, `disallowedReason` is exactly:
- `restricted`: `Needs a public cloud model, which your data rules do not allow.`
- `sovereign`: `Needs a model outside your own infrastructure, which your data rules do not allow.`

A disallowed posture still gets computed results (`expected`, `conservative`, `stretch`), but the UI must not offer it as a recommendation. `recommendedPosture` returns the **allowed** posture with the highest `expected.netValue36`, or `null` if none is allowed (cannot happen, since `local` is always allowed). Ties: the first in the order `local, hybrid, enterprise, frontier`.

**5.10 Break-even (`breakeven.ts`).** Both use the expected case.
```ts
export function breakEvenEffectiveness(inputs, postureId): number | null
export function breakEvenCashShare(inputs, postureId): number | null
```
- Effectiveness: `f(k) = calculateCase(inputs, p, 'expected', { effectivenessMultiplier: k }).netValue36`. If `f(0) >= 0` return `0`. If `f(5) < 0` return `null`. Otherwise bisect on `[0, 5]` for exactly 60 iterations, moving `hi = mid` when `f(mid) >= 0`, else `lo = mid`. Return `hi`.
- Cash share: `g(c) = calculateCase(inputs, p, 'expected', { cashShare: c }).netValue36`. If `g(1) < 0` return `null`. If `g(0) >= 0` return `0`. Otherwise bisect on `[0, 1]`, 60 iterations, same rule. Return `hi`.

**5.11 Narrative (`narrative.ts`).**
```ts
export function headline(postureLabel: string, r: CaseResult): string
export function whatMustBeTrue(inputs, postureId): string[]
export function readinessCost(inputs, postureId): number   // netValue36 with all answers 'ready' minus netValue36 as entered, expected case; >= 0
```
`headline` uses the verdict:
- positive: `{Posture} AI pays back in month {payback} and returns {netValue36} over 3 years (expected case).`
- marginal: `{Posture} AI pays back in month {payback} but returns only {netValue36} over 3 years; the case is sensitive to assumptions.`
- negative: `{Posture} AI does not pay back within 36 months at current assumptions.`

`{Posture}` is the label (`Local`, `Hybrid`, `Enterprise`, `Frontier`). Money uses `formatMoney` from section 5.12.

`whatMustBeTrue` returns these sentences, in this order, skipping any that do not apply:
1. If `breakEvenEffectiveness` is `null`: `Even at five times the assumed effect this option does not pay back.` Else if the value is `0`: `The case holds even if AI delivers none of the assumed effect.` Else: `AI must deliver at least {X}% of the assumed effort reduction to break even.` where `X = Math.round(value * 100)`.
2. If `breakEvenCashShare` is `null`: `Even if all released capacity became real savings, this option does not pay back.` Else if `0`: `The case holds even if no released capacity becomes a real saving.` Else: `At least {Y}% of released capacity must turn into real savings.` where `Y = Math.round(value * 100)`.
3. If `readinessCost(...)` is greater than 0: `Readiness gaps reduce the 3-year value by {formatMoney(readinessCost)}.`

**5.12 Formatting (`format.ts`).** Use exactly:
```ts
export function formatMoney(v: number): string {
  const sign = v < 0 ? '-' : '';
  const a = Math.abs(v);
  if (a >= 1_000_000) return `${sign}€${(a / 1_000_000).toFixed(1)}M`;
  if (a >= 100_000) return `${sign}€${Math.round(a / 1000)}K`;
  return `${sign}€${Math.round(a).toLocaleString('en-US')}`;
}
export function formatPayback(m: number | null): string {
  return m === null ? 'Not within 36 months' : `Month ${m}`;
}
export function formatRoi(r: number | null): string {
  return r === null ? 'n/a' : `${Math.round(r)}%`;
}
```

**5.13 Validation (`validate.ts`).** `validateInputs(inputs): ValidationIssue[]`, empty when valid. Rules, with these exact messages:

| Field | Rule | Message |
|---|---|---|
| teamSize | > 0 | `Team size must be greater than zero.` |
| loadedCostPerFteYear | > 0 | `Annual cost per person must be greater than zero.` |
| hoursPerFteMonth | > 0 | `Hours per month must be greater than zero.` |
| phases | at least one, at most 12 | `Add at least one phase.` / `Use at most 12 phases.` |
| phases.{i}.name | not blank, different from every other phase | `Each phase needs a name.` / `Phase names must be different.` |
| phases.{i}.aiUse | 0..1 (each on its own; **no rule links the phases**) | `{name}: AI use must be between 0% and 100%.` |
| tasks | at least one, at most 40 | `Add at least one kind of work.` / `Use at most 40 kinds of work.` |
| tasks | shares sum within 0.0001 of 1 | `Work mix must add up to 100%.` |
| tasks.{id} | name not blank; id unique; share 0..1; phase is one of the phases | `Each kind of work needs a name.` / `Two kinds of work share the same identifier.` / `{name}: share must be between 0% and 100%.` / `{name}: choose one of the phases.` |
| cashShare | 0..1 | `Cash share must be between 0% and 100%.` |
| rampMonths | integer 1..24 | `Ramp must be a whole number of months from 1 to 24.` |
| retiredCostMonthly, governanceMonthly, dataReadinessInvestment, governanceSetup, trainingPerFte | >= 0 | `{Label} cannot be negative.` |
| tiers.{id}.* | fractions 0..1; costs >= 0 | `{Tier} assumption "{field}" is out of range.` |

## 6. Expected results (golden tests)

Write these as vitest tests. Compare numbers with `toBeCloseTo(value, 1)` unless stated. `payback` is exact.

**6.1 Hand-checkable mini case.** Start from `createDefaultInputs()` and set: `teamSize 10`, `loadedCostPerFteYear 96000`, `cashShare 1`, `phases` replaced by one phase `{ name: 'Design', aiUse: 1 }`, `retiredCostMonthly 0`, `rampMonths 1`, `governanceMonthly 0`, `dataReadinessInvestment 0`, `governanceSetup 0`, `trainingPerFte 0`, readiness all `'ready'`. Replace `tasks` with one task `{ id: 'testDesign', name: 'Test design', phase: 'Design', share: 1, difficulty: 'routine' }`. Set `tiers.local = { reductionRoutine 0.5, reductionComplex 0.5, reviewRoutine 0.2, reviewComplex 0.2, usageCostPerAssistedHour 0, platformMonthly 1000, setup 50000 }`. Posture `local`, case `expected`:

| Field | Value |
|---|---|
| netHoursSavedPerMonth | 640 |
| capacityFte | 4 |
| capacityValuePerMonth | 32000 |
| countedSavingPerMonth | 32000 |
| redeployedValuePerMonth | 0 |
| platformAndGovernancePerMonth | 1000 |
| steadyNetPerMonth | 31000 |
| investment | 50000 |
| paybackMonth | 2 |
| netValue36 | 1066000 |
| roiPercent | 2132 |
| breakEvenEffectiveness | 0.0747 (precision 3) |

(Check by hand: 1600 hours x 1.0 AI use x 0.5 x 0.8 = 640 hours; 640 x 50 = 32,000.)

**6.2 Default inputs, expected case, all four postures.**

| Posture | netHours | capacityFte | capacityValue | counted | redeployed | usage | platform+gov | steadyNet | investment | payback | netValue36 | roi % | verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| local | 629.76 | 3.94 | 26240 | 18368 | 7872 | 0 | 10000 | 8368 | 239000 | 35 | 16328 | 6.8 | marginal |
| hybrid | 1013.76 | 6.34 | 42240 | 29568 | 12672 | 3840 | 20000 | 5728 | 329000 | null | -187112 | -56.9 | negative |
| enterprise | 1440 | 9 | 60000 | 42000 | 18000 | 9600 | 13000 | 19400 | 199000 | 15 | 418400 | 210.3 | positive |
| frontier | 1752.96 | 10.96 | 73040 | 51128 | 21912 | 42240 | 4000 | 4888 | 139000 | 33 | 14748 | 10.6 | marginal |

`recommendedPosture(createDefaultInputs())` is `'enterprise'`.

**6.3 Break-even values at defaults** (precision 3).

| Posture | breakEvenEffectiveness | breakEvenCashShare |
|---|---|---|
| local | 0.9735 | 0.6814 |
| hybrid | 1.1889 | 0.8322 |
| enterprise | 0.7026 | 0.4918 |
| frontier | 0.9914 | 0.6940 |

`whatMustBeTrue(createDefaultInputs(), 'enterprise')` equals exactly:
```
[
  'AI must deliver at least 70% of the assumed effort reduction to break even.',
  'At least 49% of released capacity must turn into real savings.'
]
```

**6.4 Cases, enterprise, default inputs.**

| Case | netHours | counted | steadyNet | investment | payback | netValue36 | roi % |
|---|---|---|---|---|---|---|---|
| conservative | 1080 | 25200 | 2600 | 248750 | null | -217550 | -87.5 |
| expected | 1440 | 42000 | 19400 | 199000 | 15 | 418400 | 210.3 |
| stretch | 1656 | 48300 | 25700 | 179100 | 10 | 668700 | 373.4 |

**6.5 Readiness.** Default inputs with `readiness = { data: 'partial', skills: 'partial', sponsorship: 'partial', compliance: 'partial' }` (gap 4), enterprise, expected: `netHours 1296`, `counted 37800`, `steadyNet 15200`, `investment 218900`, `payback 21`, `netValue36 229600`, `roi 104.9`. `readinessCost` is `188800` (418400 minus 229600). With all four `'not-ready'` (gap 8), enterprise, conservative: `steadyNet -2440`, `investment 298500`, `payback null`, `netValue36 -449700`.

**6.6 Constraints.**
- `public-ok`: all four postures allowed.
- `restricted`: `local`, `hybrid`, `enterprise` allowed; `frontier` not allowed, with the `restricted` reason text.
- `restricted` and `hybridComplexTier = 'frontier'`: `hybrid` not allowed.
- `sovereign`: only `local` allowed; `hybrid`, `enterprise` and `frontier` carry the `sovereign` reason text.

**6.8 Efficiency at default inputs, expected case.**

| Posture | grossRemovedHours | reviewReworkHours | netHours | netEfficiency |
|---|---|---|---|---|
| local | 844.8 | 215.04 | 629.76 | 13.12% |
| hybrid | 1305.6 | 291.84 | 1013.76 | 21.12% |
| enterprise | 1766.4 | 326.4 | 1440 | 30.00% |
| frontier | 2112 | 359.04 | 1752.96 | 36.52% |

Enterprise by task (baseline, assisted, gross removed, review and rework, net saved, net efficiency): test design 1440, 1152, 460.8, 115.2, 345.6, 24%; script development 1200, 960, 480, 72, 408, 34%; test execution 1200, 960, 480, 72, 408, 34%; defect analysis 480, 384, 153.6, 38.4, 115.2, 24%; reporting 480, 384, 192, 28.8, 163.2, 34%. In hybrid at defaults, test design and defect analysis use the enterprise tier and the other three use the local tier.

**6.9 Other templates (enterprise, expected case, default option assumptions).** From an independent reference model.

| Template | Phase AI use (they add up to) | aiReach | netHours | netEfficiency |
|---|---|---|---|---|
| software-testing | 80% each (400%) | 80% | 1440 | 30.00% |
| software-lifecycle | 60, 50, 90, 85, 80, 70 (435%) | 77.2% | 1424.88 | 29.685% |
| mechanical-design | 50, 45, 55, 70, 50, 5, 80, 75 (430%) | 52.25% | 954.9 | 19.894% |

Mechanical design by phase (net efficiency): Concept 15%, Design 19.125%, Analysis 16.5%, Detailing 29.75%, Review 15%, Prototype 2.125%, Test reporting 34%, Release 31.875%. With local assumptions, mechanical design is 9.025%. Setting only the Prototype phase to 80% AI use makes that phase 34% and leaves every other phase unchanged. Every template splits its effort across the work as exactly 100%, puts every kind of work in a listed phase, and passes validation.

**6.7 Other tests to write.** `investmentLines` for any case sums to `investment` (check enterprise defaults: `[90000, 60000, 25000, 24000]`, sum `199000`; with the gap-4 readiness: each multiplied by `1.1`). Validation: default inputs give no issues; a work mix summing to 0.9 gives the `Work mix must add up to 100%.` issue; `rampMonths 0` gives the ramp issue. `createDefaultInputs()` returns an independent copy (mutating one does not affect the next). `formatMoney`: `418400` gives `€418K`, `1066000` gives `€1.1M`, `19400` gives `€19,400`, `-187112` gives `-€187K`. `headline('Enterprise', enterpriseExpected)` equals `Enterprise AI pays back in month 15 and returns €418K over 3 years (expected case).`; hybrid at defaults gives `Hybrid AI does not pay back within 36 months at current assumptions.`

## 7. User interface

One page, no routing. A header, a step bar and one screen at a time. Follow the look of the existing app: Tailwind, white cards on `bg-gray-50`, blue (`blue-600`) as the single accent, rounded-xl borders, generous spacing. Plain business wording. No jargon (no "tokens", "FTE rates", "sourcing preset").

**Look and feel: the same as VALUEAI** (the original app in `apps/client`). Use its Tailwind palette (the sky `blue` scale in `tailwind.config.js`), the system font stack, `bg-gray-50` pages, white `rounded-xl border-gray-200` cards, and its colours for charts (blue `#1d4ed8`, sky `#0ea5e9`, grey `#9ca3af`, grid `#e5e7eb`, zero line `#374151`). Copy `ltts-logo.png`, `favicon.png` and `apple-touch-icon.png` from `apps/client/public` into `apps/exec/public`. The page title is `VALUEAI AI Business Case · L&T Technology Services`.

**Page shell.** A sticky block (hidden in print) holding the header and the step bar. Below it a `max-w-7xl` main area with, in order: the case identity, the placeholder notice, the screen, and a footer.
- **Header:** white with a bottom border. On the left the L&T Technology Services logo (`h-12`), a thin vertical divider, and the title block `VALUEAI` (`text-lg font-semibold`) over `AI Business Case` (`text-xs text-gray-500`). On the right the buttons `Reset to defaults` (secondary: bordered, confirm first) and `Print summary` (primary: `bg-blue-600`).
- **Step bar:** under the header, `bg-gray-50/95` with a bottom border. Seven steps, in order: `1 Situation`, `2 Opportunity`, `3 Right-size`, `4 Investment`, `5 Result`, `6 Risks`, `7 Decision`, as text buttons with an underline on the current one. Clicking a step goes there; do not lock steps. At the right, a quiet running result for the selected option's expected case, shown only when the inputs are valid: `{3-year net value}`, `month {n}` (or `no payback`) and `ROI {n}%`.
- **Case identity:** the customer name as an editable page heading (`text-3xl font-bold`, placeholder `Customer name`, accessible name `Customer name`), and under it `Work in scope: {name}`, `People: {n}` and `Currency: EUR`.
- **Placeholder notice:** a blue-tinted box with the label `Placeholder assumptions · not verified` and the text `Every starting figure is a placeholder, not a benchmark or a vendor price. Replace them with the customer's figures before using a result in a decision.`
- **Each screen** starts with a small uppercase label (its step name). Forms sit in a narrower centred column; the option cards and the dashboard use the full width. `Back` (secondary) and `Next` (primary) buttons under each screen.
- **Footer:** `VALUEAI — AI Business Case` over `A presenter-led business case for management`.
- Everything in this shell except the decision summary is hidden in print.

**Validation rule for all screens:** if `validateInputs` returns issues, show them in a red list at the top of the screen and show no results on screens 3 to 7 (show `Fix the inputs on the earlier steps to see results.` instead).

**Plain-language labels:** show the stored fractions as percentages in inputs (`70`, with a `%` suffix). Convert on read and write.

**Screen 1: Situation**
- `Work in scope`: a select listing the four templates (`Software testing`, `Software development lifecycle`, `Product development lifecycle`, `Mechanical system design`), plus `Custom (edited)` once the phases or work are changed by hand. Under it, the template's industry and description. Choosing a template replaces the phases and work and keeps everything else; it asks first when the case is custom.
- Inputs: `People in scope` (teamSize), `Annual cost per person (EUR, fully loaded)` (loadedCostPerFteYear), `Data rules` radio with exactly three options:
  - `Public cloud AI is acceptable` (`public-ok`)
  - `Restricted: no public cloud AI` (`restricted`)
  - `Sovereign: must stay on our own infrastructure` (`sovereign`)
- Live line under the inputs: `Today: {teamSize} people, {formatMoney(teamSize*loadedCostPerFteYear)} a year, {Math.round(teamSize*hoursPerFteMonth).toLocaleString('en-US')} hours a month.`

**Screen 2: Opportunity**
- A note: `AI use is set for each phase on its own: the percentages do not need to add up to 100%. The split of work below does.`
- One block per phase, in order. Each block has: an editable phase name; the phase's `AI use` (a percentage input from 0 to 100, independent of every other phase); `Remove phase` (shown when there is more than one phase; asks first if the phase has work, and removes that work too); a table of the phase's work (editable name, `Share of work (%)`, `Type` toggle `Routine` or `Complex`, `Remove`); and `Add work`.
- `Add phase` below the blocks. Renaming a phase moves its work with it. Any change of structure (add, remove or rename a phase, add or remove work) makes the case `custom`; changing a value does not.
- Under the blocks: `Total {n}%` (the split of work, red if not 100), `Assumption to validate`, and help text per type. Routine: `Repetitive, well-defined work. AI usually does well.` Complex: `Judgement-heavy work. AI needs stronger models and more review.`
- Live tiles using the selected posture's expected case: `Hours freed per month` (netHoursSavedPerMonth, rounded), `People equivalent` (capacityFte, one decimal) and `Net efficiency gain` (netEfficiency as a percentage with one decimal).
- A caption `Shown for the {Posture} option. AI is used on {n}% of all the work.` (n = aiReach).
- Two charts: `How the efficiency is built` (a waterfall of `Effort AI removes` = grossEfficiency, `Review and rework` = minus reviewReworkEfficiency, `Net efficiency` = netEfficiency, in percent of in-scope effort) and `Where the effort is saved` (for each phase, two bars: its `AI use` and its `Net efficiency`).

**Screen 3: Right-size** (the most important screen)
- A headline first: `{Posture} creates the most value: {3-year net value}` for the recommended option (or `No option pays back. {Posture} comes closest: {value}` when none pays back).
- Then the data-rules gate as one line: `Data rules: {label}. {n} of 4 options are open to you.`
- Four posture cards side by side (stack on narrow screens). Card order: Local, Hybrid, Enterprise, Frontier. Each card shows: name; one-line description (below); verdict badge (`Pays back` for positive, `Marginal` for marginal, `Does not pay back` for negative); `Run cost per month` (usage + platform and governance); `Investment`; `Net per month at maturity` (steadyNetPerMonth); `Payback` (`formatPayback`); `3-year net value`; `Break-even` line. Click selects the posture (blue ring). The recommended posture has a `Recommended` tag. A disallowed card is greyed, not selectable, and shows its `disallowedReason`.
- Descriptions: Local: `Open models on your own infrastructure. No usage charges; lower capability.` Hybrid: `Routine work on local models, complex work on a stronger model.` Enterprise: `Contracted or private commercial models with predictable pricing and data controls.` Frontier: `Most capable public models, paid per use.`
- Break-even line text: from `breakEvenEffectiveness`: `null` gives `Cannot break even.`; otherwise `Breaks even if AI delivers {Math.round(v*100)}% of the assumed effect.` (when v is 0, `Breaks even at any effect.`).
- One bar chart: `3-year net value by option` (recharts `BarChart`, one bar per posture, `netValue36` of the expected case). Bars: `#1d4ed8` when positive, `#b91c1c` when negative. Label the axis with `formatMoney`. Include a visible text alternative: the same values in the cards.
- A collapsed section `Assumptions to validate` containing an editable table of the three tiers (all fields of `TierAssumptions`, percentages shown as %), the `hybridComplexTier` select (`Enterprise` or `Frontier` or `Local`), and the note `These are placeholder values. Replace them with the customer's figures and current vendor prices.`
- Do not add any other text to this screen beyond what is listed.

**Screen 4: Investment**
- Inputs: `Data readiness investment (EUR)`, `Governance and assurance setup (EUR)`, `Training per person (EUR)`, `Governance running cost per month (EUR)`, `Cost removed outright per month (EUR)` with help `Tools or contractors that would no longer be needed.`, `Share of released capacity counted as real savings (%)` with help `Only capacity that leaves payroll or avoids hiring is a saving. The rest is redeployed and is not counted.`, `Months to full effect` (rampMonths).
- A list of the selected posture's `investmentLines` (expected case), followed by a `Total` row showing `investment`.

**Screen 5: Result**
- Three columns: Conservative, Expected, Stretch, for the selected posture. Rows: `Payback`, `3-year net value`, `3-year return`, `Net per month at maturity`, `Capacity released (people equivalent)`, `Counted as saving per month`, `Redeployed, not counted per month`.
- One line chart `Cumulative position`, 3 lines (one per case) over months 0 to 36, y-axis formatted with `formatMoney`, a zero reference line. Expected line `#1d4ed8` solid, conservative `#6b7280` dashed, stretch `#0ea5e9` dashed.
- Above the table, the `headline` sentence for the expected case, as a bold heading.

**Screen 6: Risks**
- Four questions, each a three-option radio (`Ready`, `Partly ready`, `Not ready`):
  - `Data`: `Is the data AI needs available, clean and accessible?`
  - `Skills`: `Does the team have the skills to run and review AI-assisted work?`
  - `Sponsorship`: `Is there named executive ownership and budget?`
  - `Compliance`: `Are the security, privacy and regulatory questions answered?`
- Below: `What must be true` as a bulleted list from `whatMustBeTrue` for the selected posture. A line `Readiness gap: {gap} of 8.`

**Screen 7: Decision** (a graphical one-page summary, also the print layout)
- Top: customer name and date; the `headline` with a verdict badge (`Pays back`, `Marginal` or `Does not pay back`); five tiles for the expected case (`Payback`, `3-year net value`, `Net per month at maturity`, `Investment`, `Net efficiency gain` with the people equivalent under it); and the line `Range: {conservative} to {stretch}`.
- Nine panels in a grid (two columns on screen, three in print):
  1. `Cumulative position`: line chart, three cases, zero line.
  2. `3-year net value by option`: grouped bars (conservative, expected, stretch) for the four options, with a line of each option's verdict (`Local: Marginal`, and so on).
  3. `How the efficiency is built`: the waterfall from screen 2, with `AI is applied to {n}% of the work.` under it.
  4. `Where the effort is saved`: one net-efficiency bar for each phase.
  5. `Monthly position at maturity`: bars for `Saving` (countedSavingPerMonth), `Cost cut` (retiredCostPerMonth), `AI usage` and `Platform` (both drawn below zero) and `Net` (steadyNetPerMonth), with the caption `Saving is the counted share. Platform includes governance.`
  6. `One-time investment`: one stacked bar of the investment lines, with `Total {investment}` under it.
  7. `Safety margin`: a bar for `AI effect needed to break even` (break-even against an assumed 100%, scale to 150%), a bar for `Share of released capacity that must become savings` (break-even against the entered cash share, scale to 100%), and a gauge of eight blocks for the readiness gap with `Readiness gap: {gap} of 8.` A bar is blue when break-even is at or below the assumption and red when it is above, and shows `Cannot break even` when there is none.
  8. `What must be true`: the `whatMustBeTrue` sentences.
  9. `The ask` and `Next steps`: two editable text areas (defaults: `Approve a pilot on the highest-volume work to validate these assumptions.` and `1. Replace placeholder assumptions with customer data.\n2. Confirm data and governance readiness.\n3. Run a pilot and measure the effect.`).
- The fixed line `Assumptions are presenter-entered and not independently verified.` always at the bottom.
- Charts have a fixed size (so they print the same as they show) and a text name for assistive technology. The verdict line and the sentences give every chart's message in text.
- `Print summary` goes to this step and then calls `window.print()`; it is disabled while the inputs are invalid. `@media print` CSS in `index.css` hides the header, step bar and buttons and shows only this summary: A4 landscape, no shadows, backgrounds kept. It must print on one page.

## 8. State and persistence

`apps/exec/src/store.ts` (zustand): `inputs: BusinessCaseInputs`, `selectedPosture: PostureId | null`, `step: number`, `ask: string`, `nextSteps: string`. Actions: `setInputs(partial)`, `setTier(tierId, partial)`, `setTask(id, partial)`, `setReadiness(key, answer)`, `selectPosture(id)`, `setStep(n)`, `reset()`. The effective selected posture is `selectedPosture ?? recommendedPosture(inputs)`; if the selected one becomes disallowed, fall back to `recommendedPosture`. Persist `inputs`, `selectedPosture`, `ask`, `nextSteps` to `localStorage` under the key `execcase.v1` (not `step`). Load defensively: if the stored value is malformed or fails `validateInputs` shape checks, ignore it and use defaults. Compute results with `useMemo` from `inputs`.

## 9. Tasks (do in order)

For each task: create the branch, implement, run its checks, commit with a clear message, merge to `main`, then start the next.

| Task | Deliverable | Done when |
|---|---|---|
| T0 | Scaffold `packages/bizcase` and `apps/exec` per section 2, root scripts added, a placeholder `App` showing the title | `npm run test:bizcase` runs (zero tests is fine), `npm run build:exec` succeeds |
| T1 | `types.ts`, `defaults.ts`, `validate.ts`, `format.ts` with the tests in 6.7 (defaults, validation, formatting) | `npm run test:bizcase` passes |
| T2 | `calc.ts` with `calculateCase` and tests 6.1 and 6.2 | tests pass; 6.1 and 6.2 values match |
| T3 | Cases and readiness in `calc.ts`; `compare.ts` with constraints and recommendation; tests 6.4, 6.5, 6.6 | tests pass |
| T4 | `breakeven.ts`, `narrative.ts`; tests 6.1 (break-even), 6.3, headline and `whatMustBeTrue` tests from 6.3 and 6.7 | tests pass |
| T5 | App shell: store, header, step bar, Screen 1 and Screen 2, validation display | `npm run build:exec` passes; screens render defaults and live tiles |
| T6 | Screen 3 (cards, chart, assumptions section) | build passes; the four cards show the 6.2 values at defaults |
| T7 | Screen 4 and Screen 5 | build passes; Screen 4 lines add to the investment; Screen 5 shows the 6.4 values for enterprise |
| T8 | Screen 6, Screen 7, print CSS, persistence, reset | build passes; reload keeps inputs; print preview shows only the summary on one page |
| T9 | Short `apps/exec/README.md` (what it is, `npm run dev:exec`, `npm run test:bizcase`, the placeholder-assumptions warning); update `CONCEPT_EXEC.md` step register statuses to `Implemented` only for steps that are built and verified | all checks pass; no lint-visible TypeScript errors in the new workspaces |

## 10. Checks before every commit

1. `npm run test:bizcase` passes.
2. `npm run build:exec` passes (it typechecks `bizcase` and `exec`).
3. `npm test -w packages/engine` still passes (proves you broke nothing).
4. `git status` shows no changes outside `packages/bizcase`, `apps/exec`, the root `package.json` scripts, `CONCEPT_EXEC.md`, `EXEC_QUESTIONS.md` and `EXEC_BUILD_SPEC.md`.
5. Do not stage `package-lock.json` changes unrelated to the two new workspaces.

## 11. Do not

- Do not import from `@ai-roi-calc/engine`, `apps/client` or `apps/server`.
- Do not add libraries, a router, a UI kit, a form library, or a test runner for the app.
- Do not round inside calculations; round only when formatting.
- Do not show a number the `bizcase` package did not compute.
- Do not describe default values as facts, benchmarks or vendor prices anywhere in the UI.
- Do not add features, screens, options or wording that this document does not list.

## 12. If something is unclear

Stop that part of the work. Add a numbered entry to `EXEC_QUESTIONS.md` with: the task, the exact sentence in this spec that is unclear, and the two or three readings you considered. Continue with any part that does not depend on the answer.
