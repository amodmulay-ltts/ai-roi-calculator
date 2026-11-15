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
