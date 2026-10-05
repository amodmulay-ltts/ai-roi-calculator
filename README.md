# VALUEAI – AI ROI Calculator

Web application for estimating the cost, savings, payback and ROI of introducing AI into an enterprise delivery function (first use case: software testing). Consultants use it with a customer to compare delivery models, from onshore to AI-first, against the customer's current team.

> **Status:** under active development and not yet customer-ready. Done and planned work is tracked in [TASK.md](TASK.md); the reasoning behind the fix order is in [REVIEW_Self_Assessment.md](REVIEW_Self_Assessment.md).

## Quick start

Prerequisites: Node.js 20 LTS, npm 10+.

```bash
npm install
npm run build -w packages/engine   # the client and server import the built engine
npm run dev                        # client http://localhost:5173, server http://localhost:3001
npm test                           # engine tests (Vitest, runs once)
npm run smoke                      # browser smoke test on the built app (needs Chrome or Edge installed)
npm run build                      # production build of engine, server and client
```

## Using the app

The app opens with an **example calculation**, marked "Example calculation · fictional data" on screen and in every export. Use it to learn the tool; do not use its figures for a customer.

| Where | What |
|---|---|
| **How it works** (header) | Full-screen walkthrough you scroll screen by screen: the idea, the example step by step, when AI does *not* pay off, and which delivery model works best. All figures are calculated live from the example. Also opened from "How this is calculated" on the example banner. Esc closes it. |
| **Scenario** menu | **New scenario** (guided setup for a customer) · **Edit setup** (the same steps, prefilled; jump to any step and apply) · **Open file** (.yaml / .json) · **Load example** |
| **Export** menu | **Save scenario (.yaml)** to reopen later · **PDF report** (HTML, print to PDF) · **Excel workbook** · **JSON** (scenario + results) |
| Currency (header) | Choose **Convert** (multiply every amount by an editable FX rate) or **Relabel** (keep the numbers). Rates are indicative, not live. |
| Advice | Directly under the headline results: a verdict (worth pursuing, marginal, does not pay back, no change), the two most important findings, and further notes. Rule-based, so every statement traces to an input. Also included in the PDF report. |
| Delivery model comparison | Directly under the headline results: all five models calculated on the same baseline and ranked by NPV, with payback, monthly saving, mature team size and investment. The verdict names the best model and how much the selected model gives up. Select a row to make that model active. |
| Delivery model panel | Below the comparison: edit the selected model's offshore share and AI adoption, today's offshore share, and the offshore cost level. |
| Team panel | Choose how headcount is costed: **Derived from AI productivity** (default) or **Staffing plan as entered**. |
| AI model usage panel | Token cost of the AI models: each usage item is linked to a work item, so requests follow the monthly volume (e.g. 15,000 requests per release). Cost = requests × (input tokens × input price + output tokens × output price). **Edit usage and prices** to change models, requests and tokens, and to edit the dated price table. |
| Sensitivity panel | Which assumption the case depends on most. Each driver moves ±20% on its own and the NPV range is shown: AI effort reduction (share of the assumed reduction that materialises, costs kept), AI running costs (tools, infrastructure, model prices), role rates, overhead and risk %, transition length, one-off investment. A grid shows the payback month for AI effect (60–140%) × transition length. |
| Cost basis (Cost Model) | **Total cost of ownership** (every cost line) or **Client-chargeable cost** (leaves out lines marked not chargeable). The choice drives savings, payback, ROI and NPV. |
| Workload panel | The work the team does each month: volume × hours each, today versus mature. **Edit workload** to change volumes and hours, override hours per state, mark items as AI-assisted or as carrying review overhead, enter extra volume the AI-assisted team absorbs without hiring (cost avoidance), and add or remove items. Cost avoidance is shown separately and counted in ROI only when switched on. |
| Use-case templates | In setup, step "Team and workload": **Software testing**, **Software development** or **IT support / service desk**. Each sets roles, a matching workload (sized so the work equals the team) and typical AI model usage. Adjust volumes and the average onshore cost to the customer. |

The current scenario is **saved automatically in this browser** (local storage) and restored on the next visit, with a note saying so. Only one scenario is kept, and it stays on this computer: use **Export › Save scenario** to keep copies or move them elsewhere. A saved entry that fails validation is ignored and the example loads instead.

Opening a file or loading the example asks for confirmation before replacing a customer scenario. Files are validated before use: a malformed file shows readable errors instead of being loaded.

## The example, step by step

Northwind Insurance (fictional) has a 31-person onshore testing team. All amounts are monthly EUR unless stated. Every figure below is produced by the engine; `npm test` checks the key ones.

**1. Today (baseline)**

| | |
|---|---|
| Workload | 2 releases × 2,300 h + 200 defects × (1.0 h root-cause + 0.8 h verification) = **4,960 h** = 31 FTE × 160 h |
| Team | 1 test manager (€11,000), 20 test analysts (€7,000), 8 automation engineers (€8,000), 2 SDETs (€9,000) |
| Run cost | people €233,000 + existing tools €3,000 = €236,000 direct; +12% overhead, +5% risk reserve = **€276,120** |

**2. With AI (mature state, after a 3-month transition)**

| | |
|---|---|
| Productivity | AI cuts effort per release and per defect to 70% (transition: 85%) |
| AI overhead | Human review and rework add 7% to core testing effort (transition: 20%, including dual running) |
| Workload | 2 × 2,300 × 0.70 + 7% + 200 × 1.8 × 0.70 = **3,697 h** |
| Team | 31 × 3,697 / 4,960 = **23.1 FTE**, spread by the staffing plan's mix (now including 1.5 AI engineers) |
| AI model usage | 30,000 test-generation requests on Claude Sonnet 5.5 (€931) + 4,000 review-agent requests on Claude Opus 5.5 (€621) + 2,000 defect-triage requests on Claude Haiku 4.5 (€43) = **€1,595** a month, from tokens × list price |
| Run cost | people + cost lines of €12,500 (existing tools €3,000, AI tools €6,000, AI infrastructure €2,000, governance €1,500) + AI model usage = **€227,036** fully loaded |

**3. Result**

| Metric | Value | Meaning |
|---|---|---|
| Monthly saving (mature) | €49,084 | €276,120 − €227,036 |
| One-off investment | €300,000 | Setup €200K, training €60K, contingency €40K |
| Payback | Month 10 | First month where cumulative savings minus investment is ≥ 0. The transition months cost more than today. |
| NPV (36 months, 10%) | €1.08M | All monthly cash flows discounted to today |
| ROI (36 months) | 437% | (total savings − investment) ÷ investment, undiscounted |
| IRR | 256% / year | Discount rate at which NPV = 0 |

Switching the delivery model on the same data shows the trade-offs: AI + BCC reaches an NPV of about €3.8M (payback month 5) because offshore rates and AI savings combine.

**What does not work:** the AI running costs and the investment have to be covered first. With the same example, an effort cut of 10% loses about €744K over 36 months, 15% saves only €4K a month and never pays back, 20% pays back in month 23, and 30% pays back in month 10. Token costs are small here (€1.6K a month); licences, infrastructure and the investment are what the effort reduction has to cover.

## AI model prices

The price table is stored inside each scenario, so a saved scenario always reproduces the same result. Defaults are Anthropic's first-party API list prices, USD per million tokens, as of 2026-09-25:

| Model | Input | Output |
|---|---|---|
| Claude Fable 5.1 | $10 | $50 |
| Claude Opus 5.5 | $4 | $20 |
| Claude Sonnet 5.5 | $2 | $10 |
| Claude Haiku 4.5 | $1 | $5 |

Prices for other vendors' models are not shipped, because they could not be verified: add them to the table from the vendor's price list. Prices are deliberately **not fetched live**: vendors publish no stable pricing API, and a figure shown to a customer must not change silently between two openings of the same scenario. The advice flags prices older than 90 days. USD prices are converted with the scenario's FX rates.

## How the advice works

`advise(scenario, results)` in the engine applies fixed rules to the calculated figures:

| Rule | Triggers when |
|---|---|
| Verdict | **No change**: the model equals today's setup. **Does not pay back**: no payback in the horizon or NPV ≤ 0. **Marginal**: ROI < 50% or payback after 60% of the horizon. Otherwise **worth pursuing**. |
| Break-even realisation | Share of the assumed AI effort reduction needed for NPV ≥ 0, found by bisection while all costs and the investment stay in. Flagged as a check above 70%. |
| AI running costs | AI-specific monthly costs, including model usage, take more than 50% of the people saving. |
| FTE gap | Staffing plan and workload-based team differ by more than 5%. |
| Transition budget | Lowest cumulative cash position before payback, and the monthly cost above today during transition. |
| Overrides | Work items with fixed hours, which the productivity factor does not change. |
| Pyramid effect | The mature team costs more per person (negative mix effect). |
| Overhead rationale | Overhead % changes without a stated reason (F5). |
| Model prices | The price table is more than 90 days older than the scenario date. |

## How the calculation works

States: **baseline** (today), **transition** (first N months, AI being introduced) and **mature** (steady state). Each delivery model is applied to transition and mature only; the baseline never changes.

```
Delivery model      profile = { bccShare, aiAdoption }      (editable per model)
  role rate         onshoreRate × (1 − bccShare + bccShare × bccCostFactor)
                    (transition runs at today's location mix; the monthly ramp migrates it)
  AI plan scaling   value_s = baseline + (planned_s − baseline) × aiAdoption
                    applied to role FTE, AI-specific cost lines, AI-specific investment,
                    productivity factor, KPI overrides and AI overhead

Workload            hours_s(item) = volume × hoursEach_s,  hoursEach_s = override_s ?? hoursEach × factor_s
                    core = items with review overhead;  other = the rest
                    totalEffort  = core × (1 + (hitl + rework + dualRun) × aiAdoption) + other
                    effort saving % = 1 − core_s / core_baseline
AI model usage      requests = volume(linked item) × requestsPerUnit
                    cost_s   = requests × (inTokens × inPrice + outTokens × outPrice) / 1e6 × FX × aiAdoption
Headcount           effort-derived (default): team_s = baselineTeam × totalEffort_s / totalEffort_B,
                    spread across roles by the staffing plan mix
                    staffing plan: role FTE as entered
Cost                direct = people + cost lines;  fully loaded = direct × (1 + overhead% + risk%)
Monthly ramp        month k ≤ N: T + (M − T) × (k − 1) / N;  month > N: M
Cash flow           saving_m = baseline − run cost   (TCO or client-chargeable basis)
                    net_m = saving_m (+ cost avoidance_m if counted) − investment_m
Cost avoidance      extra volume × (hours each today − hours each with AI incl. review overhead)
                    × today's people cost per hour
Metrics             payback = first month with cumulative net ≥ 0
                    ROI = (Σ saving − Σ investment) / Σ investment
                    NPV at monthly rate (1 + r)^(1/12) − 1;  IRR by bisection, annualised
```

Delivery model defaults:

| Model | Offshore share | AI adoption |
|---|---|---|
| Onshore | 0% | 0% (status quo when today's team is onshore) |
| BCC only | 80% | 0% |
| Onshore + AI | 0% | 100% (the AI plan as entered) |
| AI + BCC | 80% | 100% |
| AI-first | 0% | 125% |

BCC cost is 45% of onshore by default. Role rates are entered as onshore rates.

## Architecture

```
packages/engine/        Pure TypeScript calculation library (no I/O), shared by client and server
  src/engine.ts           calculate(scenario) → results
  src/delivery.ts         delivery-model profiles and their effect on FTE, rates, costs
  src/compare.ts          all delivery models on one baseline, ranked by NPV
  src/advice.ts           rule-based verdict and findings
  src/llm.ts              AI model usage cost and the default price table
  src/sensitivity.ts      tornado (±20% per driver) and payback grid
  src/currency.ts         FX rates and scenario conversion
  src/example.ts          the Northwind example
  src/defaults.ts         reference scenario from the source Excel (INR), legacy-file normalisation
  src/schema.ts           zod validation for any untrusted scenario (files, API)
  src/serialize.ts        YAML save / YAML+JSON load
  src/__tests__/          Vitest suite
apps/server/            Express API: validation, HTML report, Excel export
apps/client/            React + Vite + Tailwind dashboard
```

## API

All POST endpoints take a scenario as the JSON body and reject invalid scenarios with `400` and a list of reasons.

| Method | Path | Returns |
|---|---|---|
| GET | `/api/health` | Health check |
| GET | `/api/defaults` | Reference scenario |
| GET | `/api/currencies` | Supported currencies and indicative FX rates |
| POST | `/api/calculate` | Results |
| POST | `/api/export/json` | Scenario + results as a download |
| POST | `/api/export/pdf` | HTML report as a download (print to PDF) |
| POST | `/api/export/xlsx` | Excel workbook |

Security: helmet, CORS locked to the client origin, rate limiting, 1 MB body limit, schema validation with bounds (e.g. horizon 12–60 months), HTML-escaped user text plus a script-blocking Content-Security-Policy in reports, and sanitised download file names.

## Tests

`npm test` runs the engine suite: 69 tests. They cover:

- **Golden values** from the source Excel (INR, staffing-plan mode): payback month 13, NPV ≈ 29,610,225, mature saving 1,579,971.60
- **Calculation behaviour:** delivery models, effort-derived headcount, currency round trips, IRR above 200%, the example's story
- **Files:** save/load round trips and rejection of invalid files

`npm run smoke` serves the built client, drives an installed Chrome (or Edge; set `BROWSER_PATH` to choose) with a throwaway profile, checks the main flows (example, help, guided setup, autosave and restore, corrupt saved data), fails on any console error, and writes full-page screenshots to `.smoke/`. Server exports have been checked against a running server.

## Known limitations

- Cross-functional roles added from a template are scaled with the workload like every other role, which slightly flatters the saving; the setup flags a team/workload gap above 10%.
- FX rates and AI model prices are static and editable, not live (see AI model prices).
