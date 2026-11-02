# VALUEAI ROI Calculator: Self-Assessment

Date: 2026-10-04
Scope: the calculation engine (`packages/engine/src/engine.ts`), how the client feeds it (wizard, role templates, delivery model, currency), and whether a consultant could put the output in front of a customer.

> **Currency follow-up (2026-10-19):** The historical issue below is resolved. New/reference defaults are converted from source INR to EUR at the configured indicative rate (100 INR/EUR); the loaded Vantara example is also authored in EUR. INR figures below describe the earlier defect, not current defaults.

---

## Verdict

**The financial core is sound, but the tool is not ready for customers yet.**

The cost model works. So do the transition ramp, the NPV and the ROI formulas, and they reproduce the reference Excel to the cent. The problems are in what surrounds that core:

- One bug makes every payback month wrong.
- The historical currency issue described in section 2 has been fixed.
- The delivery-model choice either does nothing or pushes the result the wrong way.
- The headline ROI comes from headcount the user typed in, not from the AI productivity model. A customer who asks "why does AI save 10 FTE?" gets no answer the tool can trace.

All of these can be fixed. Items 1–3 below are small changes. Item 4 is the one that decides whether the tool is credible.

---

## What is sound (keep as is)

| Area | Status |
|---|---|
| Cost per state: people + cost lines → overhead and risk → fully loaded | Correct. Matches golden values exactly. |
| Transition ramp `T + (M − T) × (k − 1) / N` | Correct. |
| NPV with monthly rate `(1 + r)^(1/12) − 1` | Correct. The golden test fails only because its tolerance (0.05) is tighter than the spec (±1). |
| ROI % over the horizon, total savings, breakeven without investment, lowest cumulative position | Correct. |
| Benefit ledger (volume, mix, non-people, overhead, risk) | Reconciles to the monthly saving. |
| Pure engine with no I/O, shared by client and server | Good architecture. Keep it. |

Tests: **25 of 27 pass.** The 2 failures are the payback bug (real) and the NPV tolerance (test is too strict).

---

## Critical: these produce wrong numbers

### 1. Payback month double-counts the month-0 investment

In `engine.ts:268–269`, month 0 sets `cumulativeCashFlow = -investment`. Then line 308 adds `netCashFlow` (also `-investment`) on top. Evidence from the default scenario:

```
month 0: investment 10,000,000 → cumulative −20,000,000   (should be −10,000,000)
payback: month 19                                         (spec: month 13)
```

- **Effect:** every payback month shown so far is too late by (investment ÷ monthly saving) months. The cumulative cash-flow chart is shifted down by the full investment.
- NPV and ROI are not affected, because they don't read the cumulative series.
- **Fix:** delete the extra assignment. This is a one-line change.

### 2. Resolved: the earlier defaults labelled INR amounts as EUR

- At the time of this assessment, defaults were labelled EUR while retaining source-Excel INR-scale amounts. This could show a QA tester as **€260,000 per month** and baseline OPEX as **€23.6M per month**. These were examples of the defect, not valid current EUR defaults.
- **Resolution:** The reference scenario is converted from INR to EUR during default creation. For example, the source rate ₹260,000/FTE/month is €2,600/FTE/month at the default 100 INR/EUR rate. Currency changes offer convert or relabel, with editable FX rates.

### 3. The delivery model is cosmetic on the dashboard, and wrong in the wizard

- **Dashboard:** the engine never reads `primaryModel`. Selecting AI+BCC vs Onshore on the dashboard recalculates and gives an identical result.
  - My previous message said it "recalculates financial metrics in real-time" and "adjusts team roles". That was inaccurate, and I'm correcting it here.
- **Wizard:** `adjustRolesForDeliveryModel` applies its multipliers to **all three states, including baseline**. Baseline is the customer's current cost, so it shouldn't change when they pick a future model. Two consequences:
  - **BCC-only** multiplies baseline *and* mature cost by 0.45. The savings shrink to 45% of onshore, so the tool says offshoring saves *less* money. That is the opposite of reality.
  - **AI-only** cuts baseline FTE by 65%. The baseline then looks like a 25-person team, and the savings almost disappear.
- The multipliers themselves (0.35, 0.65, 0.85, +15% for roles with "AI" in the name) are hardcoded guesses. A user can't see or edit them.

---

## Structural: numbers compute, but you can't defend them to a customer

### 4. The AI productivity model doesn't drive the money

The engine has two parallel tracks that never meet:

- **Effort track:** KPIs × productivity factor (0.58 / 0.39) → effort hours → "effort FTE" → effort saving 17.85%.
- **Money track:** people cost = **Mature FTE per role typed by the user** × rate.

ROI, NPV and payback come only from the money track. Changing the productivity factor from 0.39 to 0.9 leaves ROI unchanged.

- The "effort-derived" people mode (spec F9) would connect the two tracks, but it isn't implemented. `peopleMode` is never read. Its test only checks that the calculation doesn't crash.
- The "evaluation-derived" productivity mode returns hardcoded constants.

**Why it matters:** for a customer, the AI productivity assumption *is* the business case. Today a consultant can type "12 testers in Mature" and get any ROI they want.

**Recommendation:**
- Make effort-derived the default for new scenarios: Mature FTE of AI-impacted roles = baseline FTE × net effort factor (including HITL and rework overhead).
- Keep staffing-plan mode as an override, and show the gap between the two modes as a warning (spec already requires this).

### 5. The effort model is testing-only, but it's offered for development and support

- The engine requires the KPIs `testing-effort-per-release`, `defect-rca-effort` and `defect-verification-effort`.
- The wizard picks development or support *roles*, but it keeps the testing KPIs, cost lines and investment from the Excel.
- A "support desk" scenario therefore reports effort in test-cases-per-release.

**Recommendation:**
- Give each use case its own activity breakdown: share of effort per activity × maximum AI reduction. The spec's evaluation-derived formula (§5.2) already works this way, and it generalises.
- Templates: Testing, Development, Support/ITSM, plus a Custom template where the user lists activities.

### 6. Features that are present in the UI or types but do nothing

| Feature | State |
|---|---|
| TCO vs client-chargeable toggle | The engine computes the chargeable run cost but always uses `savingFull` for net flow, ROI and NPV. The chargeable baseline also uses the TCO baseline. The toggle has no effect. |
| Cost avoidance (spec F7) | Placeholder that always returns 0. Missing from the ledger. |
| Outsourced / hybrid parameters (retained org %, vendor fees, bill rate) | In the types, never used. `billRatePerFte` is captured on every role and ignored. |
| Wage escalation | Applied to the whole fully loaded cost. The spec says the people component only. Minor. |

### 7. IRR fails silently on good cases

- Bisection is bounded at 200% per year and returns the midpoint whether or not it converged.
- The default scenario already sits at 150%. Short-payback AI cases will often go above 200%, and the tool will report 200%.
- **Fix:** widen the bracket, check that the sign changes across it, and return `null` (shown as ">X%") when the solve doesn't converge.

### 8. The sensitivity analysis varies the wrong things

The tornado chart varies horizon and discount rate. Those are reporting choices, not business uncertainties. The spec asks for:

- productivity factor
- AI cost lines
- role rates
- overhead
- transition length
- investment

Adding the productivity factor today would show a **zero-width bar**. That makes the issue in item 4 visible.

---

## Usability for other customers and consultants

- **Page order:** results, then inputs, then charts, then the model selector, then more results. A customer conversation needs a story: *Current state → Proposed model → Investment → Result → Risks*. Inputs should sit in tabs or a side panel, not in the middle of the results.
- **No comparison view.** The most useful question a customer asks is *"which delivery model is best for us?"* Answering it needs all models calculated side by side against the same baseline, not one selected at a time.
- **No warnings panel:**
  - FTE gap above 5%
  - payback outside the horizon
  - negative pyramid effect
  - overrides in use
- **No narrative.** Your earlier "advice" request belongs here (see the LLM pricing and advice section below).
- **Errors use `alert()`.** There is no autosave to localStorage (required by spec), so a browser refresh in front of a customer loses the scenario.
- **The default scenario is still the LTTS testing reference.** That's fine as a demo, but it shouldn't be what a customer sees first.
- **Not yet verified in a browser.** All verification so far has been build plus unit tests.

---

## LLM pricing and the advice section (your earlier request)

**LLM costs.** Today "LLM tokens" is one flat monthly number per state. I'd model it as usage × price:

- AI-assisted tasks per month × tokens per task × price per million tokens (input and output).
- A selectable model tier (frontier, mid, small) per activity.

Then the cost scales with volume, and the effect of choosing a cheaper model is visible.

**Live price fetching.** I'd push back on fetching prices live by default:

- Most vendors don't publish an official pricing API, so a live fetch means scraping web pages, which breaks without warning.
- A number shown to a customer should be **reproducible**. The same saved scenario must give the same ROI next month.

Instead, ship a curated price table with an "as of" date and the source for each entry. Make every price editable, and save the prices into the scenario file. An optional "check for updated prices" button can come later. This is the same approach the spec takes for FX rates.

**Advice section.** Generate it from rules on the computed numbers, so every sentence can be traced. Examples:

- "Payback in month 13, driven 70% by volume effect"
- "Result is most sensitive to the productivity factor: a 20% shortfall delays payback to month 19"
- "AI+BCC beats Onshore+AI by €X NPV, but carries a transition dip of €Y"

Free-form generated advice would sound generic and can't be audited.

---

## Where I'd change your direction

1. **Delivery model should be two settings, not five fixed options.**
   - *Location mix:* % onshore vs % best-cost country (BCC).
   - *AI adoption:* none, augmented, or AI-first.

   This covers all five of your models, plus blends like "70% BCC + AI". Each setting maps to a transparent, editable parameter: rate per location, and productivity factor per adoption level. It also replaces the current hidden multipliers.

2. **Rename "AI-only" to "AI-first".** Enterprise buyers know someone still owns quality, governance and HITL review. "AI-only" invites the question "who signs off?"

3. **The baseline is set once, from the customer's current state.** Delivery models only change Transition and Mature. That is what makes the comparison meaningful.

---

## Recommended order

| # | Change | Size | Why first |
|---|---|---|---|
| 1 | Fix payback double-count; relax NPV test tolerance | XS | Every payback shown today is wrong |
| 2 | Currency: rate cards per currency, relabel/convert prompt with FX table | S | First-screen credibility |
| 3 | Delivery model: stop modifying baseline, move multipliers into an editable parameter table, have the engine apply them | M | Today it's cosmetic or inverted |
| 4 | Effort-derived people cost as default, so productivity drives FTE and cost | M | Makes the ROI defensible |
| 5 | Side-by-side delivery-model comparison against one baseline | M | The question customers actually ask |
| 6 | Per-use-case activity templates (testing, development, support, custom) | M | Makes non-testing scenarios meaningful |
| 7 | Warnings panel and rule-based advice/narrative | S | Your advice request |
| 8 | LLM usage × price model with dated, editable price table | S–M | Your LLM pricing request |
| 9 | Correct tornado drivers; IRR robustness; chargeable toggle; cost avoidance | S | Spec compliance |
| 10 | Layout restructure (inputs in tabs/side panel, results as a story); autosave; browser testing | M | Usability in front of a customer |

One feature at a time, each tested before moving on (per CLAUDE.md).

---

## Follow-up review checklist — 2026-11-02

This checklist records the follow-up review of the current ROI model. It is intentionally separate from the historical assessment above, whose findings and status describe an earlier code state.

Claude may update the checkboxes as work is completed. Mark an item done only after the relevant implementation and tests pass; update affected user-facing explanations and this repository's business logic documentation where needed. Add a brief verification note or test reference in the final column. Do not mark an item done because a related feature exists in the UI or because the general test suite passes.

| Done | Priority | Suggested change | Completion evidence |
|---|---|---|---|
| [x] | High | **Escalate labor costs only.** Apply annual wage escalation to people costs rather than to all fully loaded operating costs. Recalculate overhead and risk using the intended basis after escalation. | Done: `monthlyRunCost` in `packages/engine/src/engine.ts` escalates labour only and recalculates overhead and risk on the escalated base. Verified by `packages/engine/src/__tests__/forecast.test.ts` (wage escalation block). |
| [ ] | High | **Use one cost basis consistently.** Ensure calculations, dashboard metrics, report, and workbook use the selected TCO or client-chargeable basis. Alternatively, show both bases explicitly and reconcile them. | Add tests for both basis selections and verify exported report/workbook figures reconcile to their stated basis. |
| [ ] | High | **Model labor-savings realization explicitly.** Distinguish effort capacity released from payroll savings actually realized, redeployed, or used to avoid future hiring. Make the assumption visible and avoid presenting every saved hour as immediate cash savings. | Add agreed business rules, input validation, user-facing explanation, and tests for each realization treatment. |
| [ ] | High | **Implement or disable evaluation-derived productivity.** Evaluation scores should drive the calculated productivity factor; if this is not implemented, prevent the UI from implying that the mode is supported. | Tests prove evaluation inputs affect the resulting factor and ROI, or confirm the unsupported mode cannot be selected or misrepresented. |
| [ ] | High | **Resolve delivery-model scope.** The product brief promises in-house, outsourced, and hybrid cost models, while the implementation compares location mix and AI adoption. Implement vendor rates, outsourcing share, retained-organization costs, and fees if these models are required; otherwise revise product descriptions to accurately state what is compared. | Confirmed scope reflected consistently in concept/brief, scenario model, UI, calculations, and tests. |
| [ ] | High | **Make PDF export truthful.** The current “PDF” workflow returns downloadable HTML. Generate an actual PDF, or rename the feature and documentation to describe an HTML report. | Verify response content type, file extension, and output format with a focused export test. |
| [ ] | Medium | **Reconcile the default people-cost mode.** The engine defaults to effort-derived while the build brief specifies staffing-plan as default and golden tests switch modes. Confirm the intended default and align scenario creation, examples, brief, and tests. Verify whether target FTE should follow the documented effort-divided-by-working-hours definition. | Default-mode test and reference-case tests use the agreed behavior; documentation describes the same default. |
| [ ] | Medium | **Clarify the transition-to-mature boundary.** Under the current ramp, month N is still between transition and mature, with mature cost starting in month N+1. Decide whether this is intended and align terminology, formula, and examples. | Tests cover month 1, month N, and month N+1; user-facing descriptions match the chosen timing. |
| [ ] | Medium | **Do not report 0% ROI for zero investment.** When investment is zero, show ROI as unavailable or an explicitly defined alternative rather than dividing by zero conceptually and displaying 0%. | Add tests for zero-investment cases with both positive and zero savings; UI/report/export clearly indicate the chosen representation. |
| [ ] | Medium | **Align the first-use-case brief and example.** The build brief identifies AI-augmented software testing, while the app opens with an automotive software-development example. Confirm the intended first use case and align defaults, example, and documentation. | The agreed use case is consistent across the example scenario, product brief, concept, and applicable tests. |
| [ ] | Ongoing | **Keep `CONCEPT.md` aligned with verified behavior.** Update the concept when agreed business rules change, and keep known implementation gaps visible until the code, tests, and affected user-facing surfaces demonstrate completion. | Concept status and implementation notes reference verified behavior and focused test coverage. |
| [ ] | Ongoing | **Add behavior-focused regression tests.** Tests should assert the intended financial outcomes directly, especially for escalation, cost basis, realization, evaluation mode, and exports—not merely successful calculation or build. | Focused tests pass, followed by the relevant build; remaining limitations are recorded explicitly. |

### Review notes

- The preceding review found the engine test suite passing (101 tests) and the monorepo build completing, with a Vite bundle-size warning.
- Those results establish a useful baseline, but do not by themselves resolve the items above.
- Keep each recommendation open until its completion evidence is recorded. If a recommendation is declined or its scope changes, replace the checkbox with `[x]` only when the rationale and revised decision are documented here.
