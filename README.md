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

## Branding

The L&T Technology Services logo (`apps/client/public/ltts-logo.png`) appears in the header, on the first screen of "How it works" and on the cover of the PDF report, where it is embedded so the downloaded report is self-contained. The favicon is the L&T emblem cropped from the same file. To update the logo, replace that one file.

## Using the app

The app opens with an **example calculation**, marked "Example calculation · fictional data" on screen and in every export. Use it to learn the tool; do not use its figures for a customer.

The dashboard builds from inputs to outcome, with a section bar under the header to jump between parts: **Assumptions** (tabs: Team, Workload, AI seats and usage, Costs and investment) → **AI effect** (how the model is sourced, and the effort cut and review overhead it implies) → **Delivery model** → **Compare models** (all five against the same baseline) → **Cash flow** (cumulative cash position with the payback marker, monthly run cost against today, cost per stage) → **Sensitivity** → **Net value** (NPV, payback, ROI) → **Advice**, which reads the result it sits under.

| Where | What |
|---|---|
| **How it works** | One explanation per dashboard section, in the same order as the page: what it is, how to read it, what to watch for, and a line about your current scenario. Every section carries a **How this works** link that opens the help at that section, and closing returns you to the section you were reading about. Also reachable from the header and from "How this is calculated" on the example banner. Esc closes it. |
| **Scenario** menu | **New scenario** (guided setup for a customer) · **Edit setup** (the same steps, prefilled; jump to any step and apply) · **Open file** (.yaml / .json) · **Load example** |
| **Export** menu | **Save scenario (.yaml)** to reopen later · **PDF report** (HTML, print to PDF) · **Excel workbook** · **JSON** (scenario + results) |
| Currency (header) | Choose **Convert** (multiply every amount by an editable FX rate) or **Relabel** (keep the numbers). Rates are indicative, not live. |
| Advice | Directly under the headline results: a verdict (worth pursuing, marginal, does not pay back, no change), the two most important findings, and further notes. Rule-based, so every statement traces to an input. Also included in the PDF report. |
| Delivery model comparison | Directly under the headline results: all five models calculated on the same baseline and ranked by NPV, with payback, monthly saving, mature team size and investment. The verdict names the best model and how much the selected model gives up. Select a row to make that model active. |
| Delivery model panel | Below the comparison: edit the selected model's offshore share and AI adoption, today's offshore share, and the offshore cost level. |
| Team panel | Choose how headcount is costed: **Derived from AI productivity** (default) or **Staffing plan as entered**. |
| AI sourcing (AI effect section) | Pick **Frontier**, **Enterprise** or **Local / open-weight**. A preset seeds both the cost shape (token price factor, or no token bill plus a self-hosted capacity line) *and* the AI effect (effort cut, review overhead), because a weaker model does less of the work. Everything it writes stays editable, and switching back restores the case — the dated list prices are never rewritten, the premium rides in a factor. |
| AI effect (own section, and setup step 6) | The central assumption: how much AI cuts the effort on AI-assisted work, once mature and during the transition, and the review overhead it needs (human review, rework, dual running) per stage. Shows the effect on the monthly workload and which work items it applies to; items with fixed hours in Workload are not changed by it. The delivery model's AI adoption scales it. |
| Roles editor (Assumptions › Team › Edit roles, FTE and rates) | Edit every role after the scenario is created: name, FTE today / transition / mature, **onshore and offshore cost rate side by side**, and whether the role can be offshored; add and remove roles. An empty offshore rate uses the default percentage from the delivery model. The Team panel lists onshore rate, offshore rate and offshore saving per role. Rates can be entered **per hour or per month** (saved with the scenario) and the **working hours per FTE per month** are editable. With hourly rates, changing the hours keeps the hourly rates and the monthly cost follows. Rates are onshore internal cost; offshore rates come from the delivery model. |
| Cost per developer rail (Assumptions › AI seats and usage) | Seats and tokens together, divided by the seats modelled, shown against Anthropic's published $150–250 per developer per month for enterprise Claude Code deployments. Being outside the band is not wrong; being far outside raises a warning, because that is usually a volume or a price off by an order of magnitude. |
| AI model usage panel | Token cost of the AI models: each usage item is linked to a work item, so requests follow the monthly volume (e.g. 15,000 requests per release). Cost = requests × (input tokens × input price + output tokens × output price). **Edit usage and prices** to change models, requests and tokens, and to edit the dated price table. |
| Sensitivity panel | Which assumption the case depends on most. Each driver moves ±20% on its own and the NPV range is shown: AI effort reduction (share of the assumed reduction that materialises, costs kept), AI running costs (tools, infrastructure, model prices), role rates, overhead and risk %, transition length, one-off investment. A grid shows the payback month for AI effect (60–140%) × transition length. |
| Cost basis (Cost Model) | **Total cost of ownership** (every cost line) or **Client-chargeable cost** (leaves out lines marked not chargeable). The choice drives savings, payback, ROI and NPV. |
| Workload panel | The work the team does each month: volume × hours each, today versus mature. **Edit workload** to change volumes and hours, override hours per state, mark items as AI-assisted or as carrying review overhead, enter extra volume the AI-assisted team absorbs without hiring (cost avoidance), and add or remove items. Cost avoidance is shown separately and counted in ROI only when switched on. |
| Self-hosting reference figures (setup › Costs › Infrastructure) | Dated list prices for Mac mini and cloud GPU options, with the basis shown (purchase ÷ 36 months, or $/hour × 730) and the source named. Pick units, add as a cost line, then edit freely. App-level reference data: only the number you choose lands in the scenario, so stale hardware prices cannot silently move a saved case. |
| Costs step (setup) | Guided buckets — tools and licences, AI tools, infrastructure, governance, transition — with today / transition / mature amounts per line, a running total, and "add a line" per bucket. Writes into the scenario's cost lines; anything that doesn't fit a bucket is kept under **Other**, so an imported scenario never loses a cost. |
| Use-case templates | In setup, step "Team and workload": **Automotive software (ECU / ADAS)**, **Software testing**, **Software development** or **IT support / service desk**. The automotive template (defined in the engine, and the source the Vantara Motors example is built from) has a European onshore team, converted to the scenario currency, with its workload and AI usage, and is preselected when the use case mentions automotive, ECU, ADAS, AUTOSAR, vehicle, ISO 26262 or ASPICE. Each sets roles, a matching workload (sized so the work equals the team) and typical AI model usage. Adjust volumes and the average onshore cost to the customer. |

The current scenario is **saved automatically in this browser** (local storage) and restored on the next visit, with a note saying so. Only one scenario is kept, and it stays on this computer: use **Export › Save scenario** to keep copies or move them elsewhere. A saved entry that fails validation is ignored and the example loads instead. A saved *example* is never restored: the app always starts from the current built-in example, so an old example kept in the browser cannot hide a newer one.

Opening a file or loading the example asks for confirmation before replacing a customer scenario. Files are validated before use: a malformed file shows readable errors instead of being loaded.

## The example, step by step

Vantara Motors (fictional) has a 33-person onshore embedded software team building ECU and ADAS software. All amounts are monthly EUR unless stated. Every figure below is produced by the engine; `npm test` checks the key ones.

**1. Today (baseline)**

| | |
|---|---|
| Workload | 40 requirements × 60 h + 300 SIL test cases × 3 h + 160 safety-relevant code reviews × 2 h + 60 defects × 8 h + 40 ISO 26262 / ASPICE work products × 12 h + 700 h HIL testing, integration and coordination = **5,280 h** = 33 FTE × 160 h |
| Team | 2 software architects (€12,000), 8 senior embedded developers (€10,000), 12 embedded developers (€8,500), 6 test and validation engineers (€8,000), 2 functional safety engineers (€11,000), 2 project leads (€11,500), 1 DevOps engineer (€9,500) |
| Run cost | people €308,500 + toolchain licences €6,000 = €314,500 direct; +12% overhead, +5% risk reserve = **€367,965** |

**2. With AI (mature state, after a 4-month transition)**

| | |
|---|---|
| Productivity | AI cuts the effort per item to 70% on everything except HIL lab and integration time (transition: 85%) |
| AI overhead | Safety-critical code needs more human review: review and rework add 11% to the AI-assisted hours (transition: 23%, including dual running) |
| Workload | 4,580 AI-assisted hours × 0.70 + 11% + 700 h = **4,259 h** |
| Team | 33 × 4,259 / 5,280 = **26.6 FTE**, spread by the staffing plan's mix (now including 1.5 AI engineers) |
| AI model usage | coding assistant on Claude Sonnet 5.5 (20,000 requests, €759) + SIL test generation on Sonnet 5.5 (6,000, €186) + MISRA and safety review agent on Claude Opus 5.5 (800, €110) + safety work product drafting on Opus 5.5 (2,000, €414) = **€1,469** a month, from tokens × list price |
| AI seats | 24.6 engineer seats at Claude Enterprise ($20/seat/month, usage billed separately) = **€425** a month. Seats follow the roles that hold them: 32.3 during the transition, 24.6 once mature |
| Run cost | people + cost lines of €17,000 (toolchain €6,000, AI coding assistant licences €4,000, private IP-protected AI platform €5,000, AI tool qualification and governance €2,000) + model usage + seats = **€323,140** fully loaded |

**3. Result**

| Metric | Value | Meaning |
|---|---|---|
| Monthly saving (mature) | €44,825 | €367,965 − €323,140 |
| One-off investment | €430,000 | Private AI platform and toolchain integration €250K, AI tool qualification and process update €80K, training €60K, contingency €40K |
| Payback | Month 15 | First month where cumulative savings minus investment is ≥ 0. The transition months cost more than today. |
| NPV (36 months, 10%) | €753K | All monthly cash flows discounted to today |
| ROI (36 months) | 224% | (total savings − investment) ÷ investment, undiscounted |
| IRR | 111% / year | Discount rate at which NPV = 0 |

The advice flags that the case needs about 77% of the assumed effort reduction to break even, so the 30% assumption should be validated with a pilot before it is presented as a commitment.

Switching the delivery model on the same data shows the trade-offs: AI + BCC reaches an NPV of about €3.9M (payback month 6) and BCC only about €3.8M, because offshore rates dominate for a team at German-level onshore cost, even with functional safety and project leadership kept onshore.

**What does not work:** the AI running costs, the tool qualification and the investment have to be covered first. With the same example, an effort cut of 10% loses about €1.39M over 36 months, 15% and 20% never pay back, 25% pays back only in month 23, and 30% pays back in month 15. Token costs are small (€1.5K a month); licences, the private platform, qualification and the investment are what the effort reduction has to cover.

## The three flavours of AI

The walkthrough frames every case as a choice between three ways of getting a model, and the calculator models all three the same way (effect on the work, running cost, one-off investment):

| Flavour | What it is | Cost shape |
|---|---|---|
| Frontier | The most capable hosted models, through the vendor's API | Per token, little fixed cost |
| Enterprise | The same class of model inside your own cloud tenant or a private deployment | Per token plus a platform fee and qualification effort |
| Local / open-weight | Models you run on your own hardware | No token bill; fixed hardware and MLOps cost |

The point the numbers make: **the token price is almost never the decision, the effort cut is.** Paying 30% more per token costs about 2% of NPV, while a model that only cuts effort by 18% instead of 30% turns €753K of value into a loss that never pays back. Self-hosting has to reach roughly the same effort cut as frontier before it pays back at all. The presets live in [sourcing.ts](packages/engine/src/sourcing.ts) and each names which of its figures are assumptions rather than published numbers.

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
| Cost per developer | AI spend per developer falls more than 3× outside the published $150–250 band. |

## How the calculation works

States: **baseline** (today), **transition** (first N months, AI being introduced) and **mature** (steady state). Each delivery model is applied to transition and mature only; the baseline never changes.

```
Delivery model      profile = { bccShare, aiAdoption }      (editable per model)
  role rate         (1 − bccShare) × onshoreRate + bccShare × offshoreRate     (offshore-able roles)
                    onshoreRate                                                (roles that stay onshore)
                    offshoreRate = the role's own offshore rate, or onshoreRate × default BCC factor
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

Each role has an onshore and an offshore rate. The offshore rate defaults to 45% of onshore until a role-specific rate is entered, and roles can be marked as staying onshore (in the example: functional safety and project leadership), so their rate never changes with the model.

## Architecture

```
packages/engine/        Pure TypeScript calculation library (no I/O), shared by client and server
  src/engine.ts           calculate(scenario) → results
  src/delivery.ts         delivery-model profiles and their effect on FTE, rates, costs
  src/compare.ts          all delivery models on one baseline, ranked by NPV
  src/advice.ts           rule-based verdict and findings
  src/llm.ts              AI model usage cost and the default price table
  src/seats.ts            per-seat licence cost and the default seat price table
  src/sourcing.ts         frontier / enterprise / local presets
  src/sensitivity.ts      tornado (±20% per driver) and payback grid
  src/currency.ts         FX rates and scenario conversion
  src/templates.ts        automotive use-case template (team, workload, AI usage): single source for setup and the example
  src/example.ts          the Vantara Motors example, built from the automotive template
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

`npm test` runs the engine suite: 91 tests. They cover:

- **Golden values** from the source Excel (INR, staffing-plan mode): payback month 13, NPV ≈ 29,610,225, mature saving 1,579,971.60
- **Calculation behaviour:** delivery models, effort-derived headcount, currency round trips, IRR above 200%, the example's story
- **Files:** save/load round trips and rejection of invalid files

`npm run smoke` serves the built client, drives an installed Chrome (or Edge; set `BROWSER_PATH` to choose) with a throwaway profile, checks the main flows (example, help, guided setup, autosave and restore, corrupt saved data), fails on any console error, and writes full-page screenshots to `.smoke/`. Server exports have been checked against a running server.

## Known limitations

- Cross-functional roles added from a template are scaled with the workload like every other role, which slightly flatters the saving; the setup flags a team/workload gap above 10%.
- FX rates and AI model prices are static and editable, not live (see AI model prices).
