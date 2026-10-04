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
| Delivery model panel | Pick Onshore, BCC only, Onshore + AI, AI + BCC or AI-first, and edit its offshore share and AI adoption. |
| Team panel | Choose how headcount is costed: **Derived from AI productivity** (default) or **Staffing plan as entered**. |

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
| Run cost | people + cost lines of €17,500 (existing tools €3,000, AI usage €5,000, AI tools €6,000, AI infrastructure €2,000, governance €1,500) = **€231,020** fully loaded |

**3. Result**

| Metric | Value | Meaning |
|---|---|---|
| Monthly saving (mature) | €45,100 | €276,120 − €231,020 |
| One-off investment | €300,000 | Setup €200K, training €60K, contingency €40K |
| Payback | Month 11 | First month where cumulative savings minus investment is ≥ 0. The transition months cost more than today. |
| NPV (36 months, 10%) | €956K | All monthly cash flows discounted to today |
| ROI (36 months) | 390% | (total savings − investment) ÷ investment, undiscounted |
| IRR | 220% / year | Discount rate at which NPV = 0 |

Switching the delivery model on the same data shows the trade-offs: AI + BCC reaches an NPV of about €3.7M (payback month 5) because offshore rates and AI savings combine.

**What does not work:** the AI running costs and the investment have to be covered first. With the same example, an effort cut of 10% loses about €866K over 36 months, 15% roughly breaks even on monthly cost, 20% pays back only in month 29, and 30% pays back in month 11.

## How the calculation works

States: **baseline** (today), **transition** (first N months, AI being introduced) and **mature** (steady state). Each delivery model is applied to transition and mature only; the baseline never changes.

```
Delivery model      profile = { bccShare, aiAdoption }      (editable per model)
  role rate         onshoreRate × (1 − bccShare + bccShare × bccCostFactor)
                    (transition runs at today's location mix; the monthly ramp migrates it)
  AI plan scaling   value_s = baseline + (planned_s − baseline) × aiAdoption
                    applied to role FTE, AI-specific cost lines, AI-specific investment,
                    productivity factor, KPI overrides and AI overhead

Effort              kpi_s        = override_s ?? baseline × factor_s
                    totalEffort  = core + AI overhead + root-cause + verification
Headcount           effort-derived (default): team_s = baselineTeam × totalEffort_s / totalEffort_B,
                    spread across roles by the staffing plan mix
                    staffing plan: role FTE as entered
Cost                direct = people + cost lines;  fully loaded = direct × (1 + overhead% + risk%)
Monthly ramp        month k ≤ N: T + (M − T) × (k − 1) / N;  month > N: M
Cash flow           saving_m = baseline − run cost;  net_m = saving_m − investment_m
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

`npm test` runs the engine suite: 50 tests. They cover:

- **Golden values** from the source Excel (INR, staffing-plan mode): payback month 13, NPV ≈ 29,610,225, mature saving 1,579,971.60
- **Calculation behaviour:** delivery models, effort-derived headcount, currency round trips, IRR above 200%, the example's story
- **Files:** save/load round trips and rejection of invalid files

Server exports have been checked against a running server. **The UI has not yet been tested systematically in a browser.**

## Known limitations

- The effort model has testing-specific KPIs; development and support templates change roles only (planned).
- Sensitivity analysis varies horizon and discount rate rather than the business drivers (planned).
- The client-chargeable toggle and cost avoidance are not yet applied to ROI (planned).
- FX rates and AI prices are static and editable, not live.
