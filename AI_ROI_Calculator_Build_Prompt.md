# Build Prompt – AI ROI Calculator (Node.js Web Application)

> Paste everything below this line into your AI coding assistant (Claude Code or similar) as the build brief.

---

## 0. Role and goal

You are a senior full-stack engineer. Build a production-quality **AI ROI Calculator** web application in **Node.js**. Enterprise decision makers use it to estimate the cost, savings, payback and ROI of introducing AI into a delivery function.

The first use case is **AI-augmented software testing (STLC)**. It is based on an existing Excel model, and the defaults below come from that model. Keep the KPI layer generic so other use cases can be added later.

The application must:

1. Ship with **default values** (Section 4) so it produces a full result as soon as it opens.
2. Let users **edit any input**, add or remove roles and cost lines, reset to defaults, and see which values differ from the defaults.
3. Let users **select the currency** (Section 6).
4. Compare **implementation models**: in-house, outsourced and hybrid.
5. **Export a report** to PDF and Excel, and save or load scenarios as JSON.
6. Fix all the known defects of the original Excel model (Section 3).

Work in small, verifiable steps. Write the calculation engine first, with unit tests that pass the golden tests in Section 10. Build the UI after that.

---

## 1. Tech stack (mandatory)

- **Runtime:** Node.js 20 LTS, TypeScript (strict) throughout, npm workspaces monorepo.
- **`packages/engine`:** pure TypeScript calculation library with no I/O and no framework. The client and the server import the same code. Tested with **Vitest**.
- **`apps/server`:** Express.
  - Input validation with **zod**, using schemas shared with the engine.
  - `helmet`, a JSON body-size limit, basic rate limiting and CORS locked to the client origin.
  - Serves the built client in production.
- **`apps/client`:** React + Vite + Tailwind CSS.
  - **Recharts** for charts.
  - React Hook Form + zod for forms.
  - Zustand for state.
- **PDF export:** server-side **Puppeteer**, which renders a dedicated report HTML template.
- **Excel export:** **ExcelJS**.
- **Persistence (v1):** no database. Scenarios are saved and loaded as JSON files, with browser `localStorage` autosave of the current scenario.
- **Scripts:**
  - `npm run dev` runs client and server concurrently.
  - `npm test` runs the engine tests.
  - `npm run build` and `npm start` produce a single deployable Node process.
- Provide a `Dockerfile`, `.env.example` and a `README.md` with setup instructions.
- Never use `eval` and never interpret formulas from user input. All maths lives in the engine.

---

## 2. Domain model (from the source Excel and deck)

**Three operating states:**

- **Baseline:** manual or current state.
- **Transition:** the "schooling" state. AI is being introduced, with dual-run, extra AI roles and human-in-the-loop (HITL) overhead.
- **Mature:** steady AI-augmented state.

**Timeline:**

- Transition lasts **N months** (input, default 3).
- Cost ramps linearly from the Transition run-rate toward the Mature run-rate: month k (1…N) = `T + (M − T) × (k − 1) / N`.
- Month N+1 onward runs at the Mature run-rate, within a forecast horizon of **H months** (input, default 36, range 12–60).

**Fully loaded monthly OPEX per state:**

```
Direct OPEX  = People cost + Σ(AI/platform, infra, tools, governance, capex amortization, transition, training lines)
Overhead     = Direct OPEX × overhead %   (per state)
Risk reserve = Direct OPEX × risk %       (per state)
Fully loaded = Direct OPEX + Overhead + Risk reserve
```

**Monthly saving** = Baseline fully loaded − scenario fully loaded. A positive value means a lower run cost.

**Three benefit themes**, each reported as a separate line in the benefit ledger (Section 5.5):

- **Cost Reduction:** productivity gains in test creation, scripting, release effort and defect effort.
- **Cost Avoidance:** throughput or velocity gains, i.e. extra output without adding headcount.
- **Pyramid Optimization:** a cheaper grade mix in the Mature state.

**Productivity engine (from deck slide 2):**

```
Stratified LLM/agent evaluation score → composite score (weighted by activity AI-impact)
  → AI productivity factor + AI overhead (HITL, rework, dual run)
  → net effort per STLC activity → FTE and cost → ROI
```

**Recalibration cadence (deck):**

- Transition: monthly for 2 months.
- Mature: monthly for the first 6 months, quarterly after that.

---

## 3. Mandatory fixes to the original Excel model

Implement every item below. Add a unit test for each fix where possible.

| # | Defect in the Excel | Required behaviour in the app |
|---|---|---|
| F1 | ROI % used the baseline-column implementation cost (₹1 Cr) for every state, while payback used different per-state values (₹20 L and ₹2 L). | One **one-time investment** input with itemized lines (setup, integration, training, other) and a **phasing schedule** (month 0 … month N, default 100% in month 0). Payback, ROI, NPV and IRR all use this same investment. |
| F2 | Payback divided by the absolute value of a *negative* saving (transition) and ignored transition losses (mature). | **Payback month** = first month in which cumulative (savings − investment outflows) ≥ 0, read from the monthly cash-flow series. If it never happens within H, show "Not within horizon". Never compute payback from a single month's saving. |
| F3 | Hardcoded values in Monthly OPEX overrode the assumptions tab (LLM tokens mature, transition premium, training). | Every cost line has **one input per state**, stored in one place. Nothing derived is hardcoded. The UI shows each line's source. |
| F4 | Mature effort saving was typed as 18.4%, but the effort numbers give 17.8%. | Compute effort saving % as `1 − state effort / baseline effort` and never accept it as an input. |
| F5 | Overhead % rose from 12% to 14% in Mature without a reason. | Keep it as an editable per-state input with a **required rationale text field** whenever it differs from Baseline. Show the rationale in the report. |
| F6 | Capex amortization was marked "not client chargeable" but was included in the client total. | Each cost line has a `chargeable: boolean` flag. Show both **Total Cost of Ownership (TCO)** (all lines) and **Client-chargeable cost** (chargeable lines only). The user chooses which one drives ROI (default: TCO). |
| F7 | Only Cost Reduction was monetized. | Benefit ledger with Cost Reduction, Cost Avoidance and Pyramid Optimization as separate lines (Section 5.5). Cost Avoidance is **excluded from ROI by default**, with a toggle to include it, to avoid double counting. |
| F8 | KPIs were marked "Used? Yes" but fed no formula (creation effort, velocity, coverage, regression). | Every KPI shown in the UI must feed a calculation. If a KPI is informational only, label it "Info" and leave it out of the inputs that drive results. |
| F9 | People cost came only from the rate card, so effort gains didn't flow into cost. | Two **people-cost modes**: (a) *Staffing plan*, the rate-card FTE (default, matches the Excel); (b) *Effort-derived*, where FTE = effort ÷ working hours, spread across roles by the role mix. Always show the **FTE gap** between staffing plan and effort-derived FTE, with a warning when the gap is larger than ±5%. |
| F10 | AI overhead hours were hardcoded (1,760 / 704). | Derive them: `AI overhead hrs = core effort × (HITL review % + rework % + dual-run %)`, per state. |
| F11 | 12-month horizon only, with no time value of money. | Horizon H of 12–60 months. Annual wage escalation % applied every 12 months. Discount rate gives **NPV** and **IRR** (monthly flows, annualized IRR). |
| F12 | Transition/Mature KPI values were typed in, but they were really baseline × a hidden factor (0.58 / 0.386). | KPI value per state = **override ?? baseline × stage productivity factor**. The factor comes from the productivity engine (Section 5.2). Show which KPIs are overridden. |

---

## 4. Default values (pre-load these and reproduce the Excel)

All monetary defaults are in **INR**. The default scenario name is "AI-Augmented Testing – Reference (LTTS)".

### 4.1 Global assumptions

| Parameter | Baseline | Transition | Mature | Unit |
|---|---|---|---|---|
| Releases per month | 1 | 1 | 1 | count |
| Working hours per FTE per month | 172 | 172 | 172 | hrs |
| Risk / contingency reserve | 8% | 8% | 6% | % of direct OPEX |
| Corporate overhead | 12% | 12% | 14% | % of direct OPEX |
| Defects per month (RCA and verification) | 300 | 300 | 300 | count |
| Transition length N | – | 3 | – | months |

| Global parameter | Default |
|---|---|
| Horizon H | 36 months |
| Discount rate | 10% per year |
| Wage escalation | 0% per year |

Default rationale for F5: "Higher shared-services allocation for the AI CoC, platform governance and specialist roles."

### 4.2 One-time investment (F1)

| Item | Default | Month |
|---|---|---|
| Setup and integration | ₹7,000,000 | 0 |
| Training and enablement | ₹2,000,000 | 0 |
| Other / contingency | ₹1,000,000 | 0 |
| **Total** | **₹10,000,000** | |

### 4.3 Monthly cost lines (₹ per month)

| Line | Category | Baseline | Transition | Mature | Chargeable |
|---|---|---|---|---|---|
| LLM tokens | AI | 0 | 5,039 | 10,000 | Yes |
| Agent orchestrator licence | AI | 0 | 0 | 0 | Yes |
| Vector DB / knowledge base | AI | 0 | 0 | 0 | Yes |
| AI monitoring and evaluation | AI | 0 | 8,332 | 8,332 | Yes |
| Cloud compute (AI/automation) | Infra | 0 | 149,043 | 149,043 | Yes |
| Storage / backup / DR | Infra | 0 | 150,982 | 150,982 | Yes |
| Test management / automation licences | Tools | 0 | 0 | 0 | Yes |
| Security / compliance tools | Tools | 0 | 0 | 0 | Yes |
| Governance and client reporting | Governance | 0 | 300,000 | 300,000 | Yes |
| Capex amortization | Capex | 0 | 100,000 | 100,000 | **No** |
| Transition premium | Transition | 0 | 300,000 | 150,000 | Yes |
| Training and change management | Transition | 0 | 100,000 | 50,000 | Yes |

These are the values that actually drove the Excel results. The assumptions tab held different values for three lines (LLM tokens mature ₹5,039, transition premium transition ₹15 L, training transition ₹2.5 L). Show those three as **"Alternative value from source model"** hints next to the field.

Users can add custom cost lines with their own name, category, per-state values and chargeable flag.

### 4.4 Role rate card

| Role | Baseline FTE | Transition FTE | Mature FTE | Cost/FTE/month (₹) | Vendor bill rate/FTE/month (₹) |
|---|---|---|---|---|---|
| Test Manager / Delivery Lead | 1 | 1.2 | 1 | 350,000 | 600,000 |
| QA Functional Tester | 44 | 42 | 36 | 260,000 | 380,000 |
| Automation Engineer | 15 | 15 | 12 | 260,000 | 450,000 |
| SDET / Framework Engineer | 4 | 4 | 3 | 320,000 | 520,000 |
| Domain SME | 6 | 5 | 4 | 350,000 | 600,000 |
| AI Engineer / Prompt Engineer | 0 | 3 | 2 | 420,000 | 700,000 |
| Data / Knowledge Engineer | 0 | 2 | 1.5 | 420,000 | 650,000 |
| DevOps / Cloud Engineer | 1 | 2 | 1.5 | 350,000 | 600,000 |
| PMO / Reporting Analyst | 1 | 1 | 1 | 220,000 | 420,000 |
| **Total** | **72** | **75.2** | **62** | | |

Roles can be added and removed. Each role also has a grade level (1–5, used for the pyramid chart) and an AI-impacted flag.

### 4.5 KPI baseline (testing use case)

| KPI | Unit | Baseline | Factor applies? | Excel Transition | Excel Mature |
|---|---|---|---|---|---|
| Total test cases | count | 15,253 | No | 15,253 | 15,253 |
| Manual test cases | count | 9,091 | No | 9,091 | 9,091 |
| Automation coverage | % | derived = (total − manual) / total = 40.4% | No | – | – |
| Test case creation effort | hrs/TC | 1.15 | Yes | 0.6671 | 0.4443 |
| Automation script creation effort | hrs/script | 4.0 | Yes | 2.3204 | 1.5456 |
| Testing effort per release | hrs | 12,040 | override | **11,356** | **9,891** |
| Defect RCA effort | hrs/defect | 0.25 | Yes | 0.1450 | 0.0966 |
| Defect verification effort | hrs/defect | 0.40 | override | **0.3668** | **0.3337** |
| Test case creation velocity | TC/tester/week | 35 | Yes (÷ factor) | 60.33 | 90.58 |
| Script creation velocity | scripts/eng/week | 10 | Yes (÷ factor) | 17.24 | 25.88 |
| Regression run duration | machine hrs/cycle | 5,782 | Info | 5,782 | 5,782 |
| Regression runs per month | count | 4 | Info | 4 | 4 |

The values in **bold** are pre-loaded **overrides**, because they don't follow the single factor.

**Default AI overhead** (F10):

| Component | Transition | Mature |
|---|---|---|
| HITL review | 8.0% | 5.0% |
| Rework | 4.0% | 2.1% |
| Dual run | 3.5% | 0% |
| **Total** | **15.5%** | **7.1%** |

These reproduce roughly 1,760 and 704 hrs per month.

### 4.6 Productivity engine defaults (Section 5.2)

- **Mode:** "Direct factor".
- **Effort multiplier:** Transition **0.5801**, Mature **0.3864**. These are the factors implied by the Excel.

---

## 5. Calculation engine specification (`packages/engine`)

The engine exposes one pure function, `calculate(scenario: Scenario): Results`. Use plain `number` arithmetic and round only for display. Every intermediate value must be included in `Results`, so the UI and the report can show the working.

### 5.1 Effort model (per state s)

```
kpi_s(k)          = override_s(k) ?? baseline(k) × factor_s       (velocity KPIs: baseline / factor_s)
coreEffort_s      = testingEffortPerRelease_s × releases_s
aiOverhead_s      = coreEffort_s × (hitl_s + rework_s + dualRun_s)          (0 for baseline)
rcaEffort_s       = rcaHrsPerDefect_s × defects_s
verifyEffort_s    = verifyHrsPerDefect_s × defects_s
totalEffort_s     = coreEffort_s + aiOverhead_s + rcaEffort_s + verifyEffort_s
effortFTE_s       = totalEffort_s / workingHrs_s
fteGap_s          = staffingFTE_s − effortFTE_s
effortSaving%_s   = 1 − testingEffortPerRelease_s / testingEffortPerRelease_baseline
```

Expected values with the defaults:

- Baseline total effort = **12,235 hrs**, effort FTE = **71.13**.
- Mature effort saving = **17.85%**.

### 5.2 Productivity factor

There are two modes, selected in the UI.

**Direct factor:** the user enters the effort multipliers (defaults 0.5801 / 0.3864).

**Evaluation-derived:** implements deck slide 2.

1. **Evaluation dimensions**, each scored 0–100, per architecture tier (LLM/Agents, Multi-Agent, Multi-Turn):
   - Relevance
   - Correctness
   - Hallucination (scored as `100 − hallucination rate`)
   - Tool/Task completion
   - Governance controls
2. **Tier score** = weighted mean of the dimensions. Dimension weights are editable; default 25 / 30 / 20 / 15 / 10.
3. **Composite score C** = weighted mean of the tier scores. Tier weights are editable; default 50 / 30 / 20.
4. **STLC activities**, each with a share of effort (summing to 100%) and a max AI reduction %:

   | Activity | Effort share | Max AI reduction |
   |---|---|---|
   | Test design | 30% | 60% |
   | Script development | 25% | 65% |
   | Execution | 25% | 40% |
   | Defect RCA | 10% | 65% |
   | Reporting | 10% | 50% |

5. Effort multiplier for state s: `factor_s = 1 − Σ(share_a × maxReduction_a) × (C_s / 100) × adoption_s`.
   - `C_s` is the composite score for that state; the user enters evaluation scores separately for Transition and Mature.
   - `adoption_s` is the share of the scope where AI is used (default Transition 100%, Mature 100%).
6. Show the resulting factor next to the "Direct factor" defaults, with a **"Calibrate"** button that solves for the adoption needed to match the direct factor.

### 5.3 Cost model (per state, per implementation model)

**People cost per role** = FTE × unit rate, where the unit rate depends on the implementation model (Section 5.6). In *Effort-derived* mode, replace FTE with `effortFTE_s × (roleFTE_plan / totalFTE_plan)`.

```
direct_s       = peopleCost_s + Σ costLines_s
overhead_s     = direct_s × overhead%_s
risk_s         = direct_s × risk%_s
fullyLoaded_s  = direct_s + overhead_s + risk_s
chargeable_s   = same calculation using only lines with chargeable = true
                 (people are chargeable; overhead and risk are applied to the chargeable direct base)
```

### 5.4 Monthly cash-flow series (m = 0 … H)

```
runCost_m  = ramp(m) using fullyLoaded_T and fullyLoaded_M         (Section 2 timeline)
             × (1 + wageEsc)^floor((m−1)/12) for the people component
baseline_m = fullyLoaded_B, with the same escalation applied to people cost
saving_m   = baseline_m − runCost_m                                (m ≥ 1)
invest_m   = Σ investment items phased to month m                  (m = 0 allowed)
net_m      = saving_m (+ costAvoidance_m if included) − invest_m
cumulative_m = Σ net_0..m
```

**Outputs:**

- Payback month (F2).
- Breakeven month without investment.
- Total savings over H.
- **ROI % over H** = (Σ saving − Σ invest) / Σ invest.
- **Steady-state annual ROI** = (12 × mature saving − Σ invest) / Σ invest.
- **NPV** at the monthly discount rate `(1 + r)^(1/12) − 1`.
- **IRR**, solved by bisection or Newton on monthly flows, annualized. Return `null` if it doesn't converge.
- Lowest cumulative position, and the month it occurs.

### 5.5 Benefit ledger (per month, Mature steady state)

| Theme | Formula |
|---|---|
| Cost Reduction (volume effect) | `(FTE_B − FTE_M) × blendedRate_B`, where `blendedRate_B = peopleCost_B / FTE_B` |
| Pyramid Optimization (mix effect) | `FTE_M × blendedRate_B − peopleCost_M`. This can be negative when costlier AI roles are added; show it as is. |
| Non-people cost delta | `Σ costLines_B − Σ costLines_M` (overhead and risk effects shown separately) |
| Cost Avoidance (optional) | `extraDemandTCs/month × (baselineHrsPerTC − matureHrsPerTC) × blendedHourlyRate_B` + the same for scripts. Inputs: extra test cases per month and extra scripts per month, default 0. Excluded from ROI unless toggled on. |

The ledger lines (excluding Cost Avoidance) must reconcile exactly to the total monthly saving. Show a reconciliation row.

### 5.6 Implementation models

The user selects one model as the primary scenario, and a comparison view shows all three side by side.

- **In-house:** role unit rate = internal cost/FTE.
- **Outsourced (managed service):**
  - Role unit rate = vendor bill rate.
  - Plus a **retained-organisation %** (default 10% of vendor people cost) for governance.
  - Plus an optional vendor platform fee per month (default 0).
  - Plus a one-time vendor transition fee, which is added to the investment (default 0).
- **Hybrid:** per role, % outsourced (default 50%). The unit rate is the blend of internal cost and bill rate. The retained-organisation % applies to the outsourced portion only.

The baseline can also be set as in-house or outsourced (default in-house), so a "current vendor vs. AI-enabled vendor" comparison is possible.

### 5.7 Sensitivity

- **Tornado chart:** ±20% on the productivity factor, AI cost lines, role rates, overhead %, transition length and investment, with NPV as the output.
- **Two-way table:** productivity factor vs. transition length, with payback month as the output.

---

## 6. Currency handling

- Currency selector in the header with at least INR, USD, EUR, GBP, JPY, AED, SGD, AUD, CAD and CHF.
- Each scenario stores a **base currency** (default INR) in which all amounts are entered.
- On a currency change, ask the user which of two behaviours they want:
  1. **Relabel**: keep the numbers and change the currency (use this when re-entering client data in its own currency).
  2. **Convert**: multiply every monetary input by an FX rate.
- FX rates come from an **editable FX table** in Settings. Ship static default rates with an "as of" date, and warn that they are indicative. An optional live-rate fetch can be a later enhancement; don't call any external API by default.
- Format with `Intl.NumberFormat` and the currency's locale.
  - INR supports **lakh/crore** notation (₹2.36 Cr, ₹15.8 L) or a full number.
  - Other currencies use K/M/B compact notation.
  - The user toggles between compact and full.
- The report and exports use the selected currency and state the FX rate used, if any.

---

## 7. User interface

The layout is a single-page application with a left navigation, a sticky summary bar and a right-hand live results panel. Results update live on every input change (debounced 200 ms).

1. **Header:** scenario name, currency selector, implementation model selector, Save / Load / Reset to defaults, Export.
2. **Wizard and tabs**, which can be used in order or jumped between:
   1. **Context:** client name, use case, horizon, transition length, discount rate, wage escalation.
   2. **Team and rates:** editable role rate card grid (add/remove roles, FTE per state, cost and bill rate), people-cost mode toggle, FTE gap indicator.
   3. **Effort and KPIs:** KPI baseline grid, per-state override cells (shaded when overridden, with a reset icon), AI overhead %.
   4. **AI productivity:** direct vs. evaluation-derived mode, evaluation score sliders, activity weights, Calibrate button.
   5. **Costs:** cost lines grid (per state, chargeable flag, category), overhead and risk % per state with rationale (F5), one-time investment items and phasing.
   6. **Implementation model:** in-house / outsourced / hybrid parameters.
   7. **Results dashboard.**
3. **Input UX:**
   - Every field shows its default as placeholder or helper text.
   - Changed fields are highlighted, with a "Changed from default" count in the header.
   - Each field has a reset icon.
   - zod validation with inline errors: no negative FTE, percentages within 0–100, activity shares summing to 100%.
   - Tooltips explain every input.
4. **Results dashboard:**
   - KPI tiles: monthly saving (Mature), annual saving, payback month, ROI % over H, NPV, IRR, effort saving %, FTE B → T → M.
   - **Cumulative cash-flow chart** with the investment, transition dip, breakeven point and payback marker.
   - Monthly OPEX by state, as a stacked bar by category.
   - Benefit ledger waterfall, from Baseline to Mature.
   - FTE pyramid by grade for Baseline vs. Mature.
   - Implementation-model comparison table and chart.
   - Sensitivity tornado.
   - TCO vs. client-chargeable toggle.
   - Warnings panel: FTE gap > 5%, payback not within horizon, negative pyramid effect, overrides in use, overhead rationale missing.
5. The UI must be accessible (keyboard navigation, labelled inputs, WCAG AA contrast), responsive down to tablet width, and support light and dark themes.

---

## 8. Export and report

The **Export** menu offers four options:

1. **PDF report** (server-side Puppeteer, A4 landscape, company-neutral styling with a logo upload option). Sections:
   1. Cover: scenario name, client, date, currency, implementation model.
   2. Executive summary: KPI tiles plus a 3–5 sentence auto-generated narrative from the numbers, e.g. "Mature-state savings of ₹15.8 L per month; payback in month 13 …".
   3. Cumulative cash-flow chart and the monthly forecast table.
   4. Monthly OPEX by state with cost-line detail (TCO and chargeable).
   5. Benefit ledger with reconciliation.
   6. Team and FTE: role table, pyramid, FTE gap.
   7. Effort and KPI table, with overrides marked.
   8. Implementation-model comparison.
   9. Sensitivity.
   10. Assumptions appendix: every input, with values that differ from the defaults marked, and the overhead rationale.
   11. Methodology and disclaimers.
2. **Excel workbook** (ExcelJS) with these sheets:
   - Summary, Inputs, Monthly OPEX, Forecast (H months), Benefit Ledger, Roles, KPIs, Model Comparison.
   - Formatted numbers in the chosen currency, frozen headers.
   - Inputs are in yellow cells. Output cells contain values.
   - The Forecast sheet's cumulative column uses Excel formulas so the client can audit it.
3. **Scenario JSON:** full input set plus schema version, which can be reloaded with Load.
4. **CSV:** the monthly forecast only.

Export file names follow the pattern `AI-ROI_<ScenarioName>_<YYYY-MM-DD>.<ext>`.

---

## 9. API (Express)

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/defaults` | Default scenario (Section 4) |
| GET | `/api/currencies` | Currency list with default FX table |
| POST | `/api/calculate` | Body: Scenario → Results (also computed client-side; the server endpoint is the source of truth for exports) |
| POST | `/api/export/pdf` | Body: Scenario + display options → PDF stream |
| POST | `/api/export/xlsx` | → XLSX stream |
| GET | `/api/health` | Health check |

- All bodies are validated with zod. Invalid input returns 400 with field paths.
- Limit request bodies to 1 MB.
- Don't log scenario contents, since they may hold commercial data.

---

## 10. Golden tests (must pass, defaults, INR, in-house, staffing-plan mode)

| Check | Expected |
|---|---|
| People cost B / T / M | 19,640,000 / 21,290,000 / 17,405,000 |
| Direct OPEX B / T / M | 19,640,000 / 22,403,396 / 18,323,357 |
| Fully loaded OPEX B / T / M | **23,568,000.00 / 26,884,075.20 / 21,988,028.40** |
| Mature monthly saving | 1,579,971.60 |
| Transition monthly saving | −3,316,075.20 |
| Forecast M2 / M3 run cost | 25,252,059.60 / 23,620,044.00 |
| Cumulative saving at M12 (no investment) | 9,167,565.60 |
| Lowest cumulative (no investment) | −5,052,178.80 at M3 |
| Breakeven month without investment | 7 |
| Payback month (₹1 Cr in M0) | **13** |
| Total savings over 36 months | 47,086,884.00 |
| ROI % over 36 months | 370.87% |
| NPV at 10% per year, 36 months | ≈ 29,610,225 (±1) |
| Baseline effort FTE | 71.13 |
| Mature effort saving % | 17.85% |
| Benefit ledger (Mature): volume effect | (72 − 62) × 272,777.78 = 2,727,777.78 |
| Benefit ledger (Mature): mix effect | 16,912,222.22 − 17,405,000 = −492,777.78 |
| Benefit ledger reconciliation | Ledger total = monthly saving (to 0.01) |
| Currency convert | Converting INR → USD → INR at reciprocal rates returns the original inputs (to 0.01) |

Also add tests for:

- IRR when it doesn't exist (all negative flows) returns `null`.
- Payback "not within horizon".
- Hybrid at 0% equals in-house, and hybrid at 100% equals outsourced (without the retained-organisation %).
- Effort-derived people mode.
- Each of F1–F12.

---

## 11. Non-functional requirements

- Engine test coverage ≥ 90%.
- The UI recalculates in under 100 ms for H = 60.
- PDF generation takes under 5 s.
- ESLint and Prettier, with strict TypeScript and no `any` in the engine.
- Security:
  - Run `npm audit` with no high-severity issues.
  - No user-supplied HTML in the PDF template; escape all text.
  - Launch Puppeteer sandboxed, and give it no network access beyond the local report route.
- No authentication in v1. Structure the code so SSO (OIDC) and a database for saved scenarios can be added later.
- Code is commented where the business logic is non-obvious. Each formula in the engine references the section of this brief it implements.

---

## 12. Out of scope for v1 (design for, don't build)

- Recalibration mode: entering actual monthly telemetry KPIs and showing variance against plan on the deck's cadence. Leave a placeholder tab and data structure for it.
- Additional AI use cases beyond testing. Keep the KPI catalogue as configuration (JSON) so new use cases can be added without engine changes.
- Live FX feeds, multi-user collaboration, and authentication.

---

## 13. Deliverables

1. Working monorepo with `README.md`: setup, scripts, architecture diagram, and how each Excel defect (F1–F12) was resolved.
2. All golden tests and fix tests passing (`npm test`).
3. Sample exports generated from the default scenario: `samples/AI-ROI_Reference.pdf`, `.xlsx` and `.json`.
4. A short `METHODOLOGY.md` explaining every formula in plain language for client-facing use.

**Order of work:**

1. Engine and tests.
2. API.
3. UI inputs.
4. Dashboard.
5. Exports.
6. Polish.

Stop after step 1 and show the golden test results before continuing.
