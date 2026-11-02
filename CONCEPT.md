# ROI Calculator — Core Concept

## Purpose

This document describes the business logic and decision flow of the ROI calculator. It explains **what the model means and how a case is assembled**, not the equations or code used to calculate it.

Use it as the living concept brief for the product:

- Keep the current behavior understandable to consultants and customers.
- Add new conceptual steps at the end of the step register using the template below.
- Treat a completed step as a requirement for the product. Implement it in the engine and any affected user interface, exports, validation, and tests.
- Keep implementation details, formulas, and code-level design in the source code and technical documentation rather than in this concept document.

## What a business case represents

The calculator compares the cost of continuing a current way of working with the cost of a proposed AI-enabled delivery approach. It makes the proposed approach explicit: the work expected to change, the people and delivery mix required, the AI operating model, the recurring cost of running it, and the investment to get there.

The result is a scenario, not a forecast guarantee. It is only as credible as the baseline, workload, operating assumptions, and evidence agreed by the user. Assumptions should remain visible and editable; a result should be traceable back to the scenario that produced it.

## Conceptual calculation journey

### Step 1 — Establish the scenario and its units

The user identifies the client or fictional example, use case, currency, and planning period. Scenario operating costs, role rates, and investments are expressed in its selected base currency; vendor price lists may retain their published currency and are converted when costed. New/reference defaults use EUR; INR source-model values are reference data and are converted before they become EUR defaults.

Currency conversion changes monetary inputs consistently. Relabelling is a separate, intentional choice that preserves the entered numbers. Neither behavior changes headcount, workload, percentages, or time periods.

### Step 2 — Describe today's baseline

The baseline is the customer's current operating position and is the comparison anchor. It describes the current workload, team, role costs, delivery location mix, and non-people run costs.

Choosing a future delivery model must not rewrite today's baseline. If today's organization already uses offshore delivery, that existing share is described separately from the target model.

### Step 3 — Describe the work and expected demand

Workload is expressed as recurring work items, each with a unit of volume and the effort required per unit. A work item can be AI-assisted or unaffected by AI, and it can carry human review or other AI-related overhead.

The workload provides the bridge between operational assumptions and staffing needs. Additional demand that the team could absorb without hiring is recorded separately as potential cost avoidance; it is not silently treated as a reduction in the existing run cost.

### Step 4 — Describe the AI effect and its limits

The scenario states how much AI is expected to change relevant work during transition and at maturity. The AI effect applies only to work items that are in scope. Human review, rework, and temporary dual-running are considered so that gross productivity improvement is not mistaken for net team effort reduction.

Users may enter a direct productivity assumption or use an evaluation-derived approach. Work-item overrides are explicit exceptions to the general assumption. The displayed effect should distinguish:

- Work directly affected by AI.
- Added effort needed to review, correct, govern, or transition the AI-enabled work.
- Work that remains unchanged.
- The resulting effort and team requirement across all work.

The AI effect is an assumption to validate, not a promise of realized savings.

### Step 5 — Define the team and how it is costed

Roles describe the people needed in each operating state, the applicable rates, and whether a role can move to a lower-cost delivery location. The scenario chooses whether the financial case follows the staffing plan or derives the team from workload effort while preserving the role mix. The staffing plan is the default. Only the share of released labour expected to leave payroll counts as a cash saving; the rest is kept as redeployed capacity.

Both views remain useful: effort indicates the work implied by the workload, while a staffing plan represents the intended organization. Any material gap between them is a signal to review, not a value to conceal.

### Step 6 — Select the target delivery and AI operating model

The target model describes how much work is delivered onshore or in a best-cost location and how much of the proposed AI plan is adopted. Adoption scales the parts of the plan that depend on AI; the existing baseline remains the point of comparison.

The selected AI sourcing approach also describes the operating-cost shape:

- Hosted model use can create usage-based charges.
- Enterprise or private deployments may add platform, qualification, or governance costs.
- Locally hosted models replace per-use charges with infrastructure and operations costs.

Presets are starting assumptions. Their unsourced productivity and operating assumptions must be editable and presented as assumptions, not vendor guarantees.

### Step 7 — Describe recurring cost and one-time investment

Recurring operating costs include the people, AI usage or seats, platform, infrastructure, tools, governance, overhead, and risk appropriate to each state. Each cost belongs to a clear source and applies only to delivery or sourcing choices where it is relevant.

One-time investment describes the cost of moving to the target approach, such as setup, integration, qualification, or training. Its timing matters: a cost incurred before savings begin affects the cash position and payback.

The user can assess either total cost of ownership or the client-chargeable view. These are alternative lenses on the same scenario; the selected lens must be used consistently when calculating and explaining the case.

### Step 8 — Walk through the transition over time

The scenario moves from today's baseline into a transition period and then into a mature operating state. The transition period is the first N months. Costs move gradually from the transition level toward the mature level across those months, and the mature level applies from the month after the transition period (month N+1). During transition, temporary overhead, additional investment, training, and adoption ramp-up may make the case more expensive before it becomes less expensive.

The forecast compares the proposed run cost with the cost of continuing today's baseline over the same horizon. Escalation and discounting reflect the scenario's time assumptions. The sequence of monthly savings, costs, and investment—not a single mature-month comparison—determines the financial story.

### Step 9 — Treat cost avoidance as a separate benefit

Cost avoidance represents extra demand the team can handle without increasing headcount or other baseline capacity. It is distinct from a reduction in the existing workload cost and can be excluded from the financial return when there is a risk of double counting.

When included, it must be clearly identified as a separate assumption and benefit. It must never be presented as a reduction in recurring operating cost.

### Step 10 — Interpret the result

The calculator presents complementary views of the same case:

- **Run-cost comparison:** what it costs to operate in each state.
- **Cash-flow view:** when the investment and savings occur, including temporary transition losses.
- **Payback:** when cumulative net cash flow first recovers the investment, if it does within the horizon.
- **Return and value:** horizon-based return, discounted value, and investment-return rate where meaningful.
- **Benefit explanation:** a ledger that explains the major sources of change and reconciles to the selected cost basis.
- **Sensitivity and advice:** which assumptions matter most, where evidence is weak, and what a decision-maker should validate next.

No one metric should be read in isolation. A favorable mature run rate may coexist with a difficult transition, a long payback, or a result that depends heavily on an unverified productivity assumption.

## Current implementation alignment

The following maps the concept to the current implementation. It records material behavior and limitations so new conceptual steps can be implemented against the actual product.

| Concept area | Current implementation |
|---|---|
| Scenario and currency | The dashboard starts with a fictional automotive example authored in EUR. New/reference scenarios default to EUR by converting the source Excel inputs. Vendor price lists keep their own currency. Currency conversion and relabelling are distinct operations. |
| Baseline and target | Baseline FTE and today's delivery share are separate from the selected target delivery profile. Target AI adoption and location mix affect the proposed case. |
| Workload and AI effect | Work items are represented by KPI/workload entries with volume, effort, optional overrides, and a review-overhead flag. AI review, rework, and dual-running overhead are tracked separately from core work. |
| Team | The staffing plan is the default for new scenarios. Effort-derived mode is opt-in: it keeps the baseline as the customer's actual team and scales later states by the workload ratio, which matches an effort-based team size only when baseline staffing matches baseline effort. The FTE gap is shown for review. Released labour is cashed only for the realised share (default 100%); the rest is kept as redeployed capacity and never counted as saving. |
| Delivery and sourcing | Delivery profiles combine AI adoption and best-cost-country share. Sourcing presets select assumptions for hosted, enterprise, or local operation and filter costs that do not apply. Known gap: outsourced and hybrid vendor pricing (vendor bill rates, retained-organisation share, platform and transition fees) is not implemented and is not offered as a comparison. |
| Costs and investment | Role costs, per-state cost lines, model usage, seats, chargeability, and phased one-time investments contribute to the scenario. |
| Time and financial results | The engine builds a monthly forecast across the transition and mature phases. Wage escalation applies to labour only; overhead and risk are recalculated on the escalated base. Cumulative cash flow and financial metrics use the selected cost basis throughout. ROI is not defined without an investment and shows as n/a. |
| Cost avoidance and explanation | Additional absorbable work is represented separately and can be excluded from return calculations. A benefit ledger, rule-based advice and the realised-labour share explain results. |
| Evaluation-derived productivity | Implemented. The effort reduction is the activity-weighted maximum AI reduction, scaled by the composite evaluation score and adoption, and inputs are validated on import. Default scores are placeholders until an evaluation is entered. The interface still offers only a switch to a direct effort cut. In staffing-plan mode the factor changes effort but not money. |
| Export and reporting | The PDF report is printed by a local Chrome and returns 503 if no browser is available. The HTML and Excel exports state the cost basis and the realised-labour share, and show ROI as n/a without an investment. |

Verified by the engine tests (`forecast`, `productivity`, `golden`) and the server export and PDF tests. Known gaps are listed in the rows above.

## Principles for future steps

1. **Preserve the baseline.** A change to the proposed approach must not silently make today's cost or workload look better.
2. **Separate gross productivity from net benefit.** Account for review, rework, adoption, and transition effort.
3. **Separate cost reduction from cost avoidance.** Avoid counting the same capacity benefit twice.
4. **Time matters.** Explain transition costs and investment timing before describing mature savings.
5. **Keep assumptions explicit.** A preset is a starting point; unsourced assumptions remain visible and editable.
6. **Use one financial lens consistently.** The selected TCO or chargeable basis drives the relevant comparisons and financial metrics.
7. **Explain every material result.** Users should be able to connect an output to an input, an assumption, or a calculation stage.
8. **Keep currencies and units honest.** A label must match the stored monetary values and their conversion history.
9. **Do not silently claim unsupported behavior.** If the implementation does not yet do what a concept step says, mark it as pending or an implementation gap.

## Stepwise documentation approach

### How to add a step

Append a numbered item to the **Future step register**. Keep the entry conceptual: describe the business decision or behavior, not source files, formulas, or a proposed code design. When a step changes an existing rule, say what it replaces.

Before implementation, clarify any unresolved choice that could materially change the case, such as which party bears a cost, whether a benefit is cashable, how it interacts with adoption, or whether it belongs in ROI.

### How a documented step becomes code

For each new step:

1. Read this concept and trace the related current implementation before editing.
2. Confirm the step's intended meaning, boundaries, assumptions, and dependencies. Ask for clarification if more than one materially different interpretation is reasonable.
3. Identify the scenario inputs, calculation stages, user-facing explanations, exports, validation, and compatibility behavior it affects.
4. Define observable examples and acceptance tests for expected behavior, including relevant edge cases.
5. Implement the smallest complete change across all affected surfaces; preserve unrelated work.
6. Run focused tests, then the relevant build or wider tests. Report any remaining gap explicitly.
7. Update the register status and add a concise implementation reference (code areas and test coverage). Do not mark a step implemented based only on documentation or a passing proxy test.

### Step entry template

Copy this template for each new item:

```text
### Step N — [short business concept]

- Status: Proposed | Clarifying | Ready | In progress | Implemented
- Business intent:
- User or decision affected:
- Conceptual behavior:
- In scope:
- Out of scope:
- Assumptions or evidence required:
- Dependencies / interaction with existing steps:
- Example of expected behavior:
- Acceptance criteria:
- Open questions:
- Implementation record: (leave blank until implemented)
```

## Future step register

Use this register to keep future additions visible. Add steps here or append a fully formed step after this section; do not silently change the current conceptual journey.

| Step | Concept | Status |
|---|---|---|
| 1–10 | Current scenario-to-result journey described above | Implemented with the gaps listed in the alignment notes |
| 11 | Next step to be added by the product owner | Reserved |
