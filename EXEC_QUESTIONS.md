# Questions for the AI Business Case build

All questions raised during the build are resolved below. Each records the decision and why, so a future change can start from the reasoning.

## 1. T1: label text for "cannot be negative" messages (spec 5.13) — Resolved
- Task: T1, `validate.ts`.
- The spec did not give the `{Label}` text. The product owner was not sure either.
- Decision: use the Screen 4 labels without the unit (for example "Governance running cost per month cannot be negative."). They are the words the presenter already sees next to the field, so the message names the field the presenter just edited.
- Implemented: yes, unchanged.

## 2. T6: labels for the assumptions table and the hybrid select (spec screen 3) — Resolved
- Task: T6, `AssumptionsTable.tsx`.
- The spec gave no row or column labels for the tier table, the hybrid select, or the first column.
- Decision: plain business labels ("Routine work: effort removed (%)", "Platform per month (EUR)", "Complex work in hybrid runs on", column "Assumption"). Field names like `reductionRoutine` are jargon, which the concept rules out for this audience.
- Implemented: yes. Each row now also carries "Assumption to validate", and every input has an accessible name.

## 3. T8: printing from steps 1 to 6 gave a blank page — Resolved, behaviour changed
- The print layout shows only the decision summary, so printing from any other step printed nothing.
- Decision: **Print summary** first goes to step 7, then opens the print dialog. It is disabled, with an explanation, while the inputs are invalid, because step 7 shows no summary then.

## 4. T8: date format on the summary — Resolved
- The spec gave no format.
- Decision: day, month name and year in British order (for example "15 November 2026"). A month name avoids confusion between day-first and month-first dates for an international audience.

## 5. T8: what Reset to defaults clears — Resolved
- Decision: everything, including the ask and next steps. The button is labelled "Reset to defaults" and asks for confirmation, so a partial reset would be surprising. Saved data is replaced on the next change.

## 6. Right-size table had no per-value "Assumption to validate" label (spec section 0, rule 9) — Resolved, behaviour changed
- Decision: a label under each row of the tier table, matching the other screens.

## 7. Saved data could crash or mislead loading — Resolved, behaviour changed
- Found in review, not raised earlier. The saved-data check ran value validation on data of unknown shape, so a saved scenario with a missing tier or a wrong option could throw while loading, and an invalid readiness answer would have produced "NaN" on screen.
- Decision: a shape check lives in the tested calculation package (`isBusinessCaseInputs`) and runs before the value checks. Anything that fails is ignored and the defaults are used.

## 8. Is "share of work where AI is used" the right measure of expected efficiency? — Resolved, behaviour changed
- Raised by the product owner after the app was built.
- Finding: no, not as the headline. That input is rollout reach (how much of the work AI is applied to). What a manager means by efficiency is the net share of effort freed after review and rework, which the model already computed (netHours / total hours) but never showed. The real efficiency assumptions (how much effort AI removes per kind of work, and how much comes back as review) sat inside the Right-size assumptions table.
- Decision: show **net efficiency gain** as the headline measure, and show how it is built (effort AI removes, minus review and rework) and where it comes from (per kind of work). Keep adoption as an input but state what it means. Net efficiency is a result, never an input.
- Not done, possible later: adoption per kind of work (routine work is usually adopted sooner than complex work). One shared figure is simpler to present and is stated on the dashboard.

## 9. The decision screen is now a graphical dashboard, printed A4 landscape — Resolved, behaviour changed
- Requested by the product owner: a summary that shows everything graphically.
- Decision: the decision screen is a nine-panel dashboard (six charts, a safety-margin panel, the sentences, and the ask). It prints on one A4 landscape page, because a dashboard of panels needs width, which also matches the original brief's landscape report. Charts have a fixed size, because a resizing chart does not re-measure reliably when the browser switches to print layout.
- The comparison table was removed: its content is in the options chart and the verdict line under it.

## 10. Whole-lifecycle and non-software scope, with AI use per phase — Resolved, behaviour changed
- Requested by the product owner: cover the entire software or product lifecycle, including mechanical system design in other industries, and give each phase its own AI-use percentage that is not forced to add up to 100%.
- Reading taken: each phase has an **AI use** percentage (how much of that phase's work AI is used on). The values are independent of each other. The **split of effort across the work still adds up to 100%**, because it divides one whole. If the intent was to drop that rule too, the alternative is to enter people or hours per phase instead of shares.
- Decision: the work is a list of phases, each with kinds of work. Four ready-made templates (software testing, the software lifecycle, the product lifecycle and mechanical design) start the conversation, and everything can be edited. The single global adoption figure is replaced by per-phase AI use, which also lets physical work (prototype build) carry a very low figure.
- Templates carry the work breakdown only. They do not carry cost assumptions: a mechanical design team may need different people cost, tooling cost and option assumptions, and the presenter enters those.
- Placeholders: every share and AI-use figure in the templates is illustrative. They were not measured and should be replaced with the customer's figures.
- Not done: AI that is not a language model (generative design, simulation surrogates) is not a separate kind of AI yet; the one blended cost per person; and effort is measured, not output or time to market.
