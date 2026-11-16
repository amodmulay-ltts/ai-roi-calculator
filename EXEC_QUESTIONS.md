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

## 11. Same look and feel as VALUEAI, and a start script — Resolved, behaviour changed
- Requested by the product owner. This replaces the earlier decision of "no branding in the first version" (the concept's decision 3), which is updated.
- Decision: the new app uses VALUEAI's identity: the L&T Technology Services logo and favicon, the `VALUEAI` title block with `AI Business Case` as its subtitle, the sticky header and step bar (with a running result like VALUEAI's section bar), the page heading, the blue-tinted notice, uppercase section labels, the footer, and the same chart palette. It is not a copy of the other app's code: both apps share the same Tailwind configuration and assets.
- The customer name moved from the header to the page heading, as VALUEAI shows its scenario name.
- The placeholder notice is new: VALUEAI shows a similar notice for its fictional example, and this app's figures are all placeholders.
- Start scripts: `scripts/start-exec-ubuntu.sh` and `scripts/start-exec-windows.bat`, built the same way as the existing launchers. The Windows script has not been run on Windows.

## 12. AI use on each piece of work, phase shows the average — Resolved, behaviour changed

- Request: "each phase has work items; the AI usage % should be an average of all the work."
- Decision: AI use is now an input on every piece of work (`TaskMix.aiUse`, 0..1, independent of the others). A phase no longer has its own input: it shows the **plain average** of the AI use of the work in it (0 when it has no work). The calculation uses each piece of work's own AI use, weighted by its share of effort, so AI reach and net efficiency come from the work, not from the phase average.
- The templates start every piece of work at its phase's former figure, so the golden numbers in EXEC_BUILD_SPEC.md section 6 are unchanged. `WorkPhase` is now just `{ name }`; `phaseAiUse(inputs, phaseName)` gives the average. Where EXEC_BUILD_SPEC.md says "phase aiUse", read "average of the phase's work".
- Saved data from before this change no longer matches the shape and resets to the defaults.
- Open point: a phase average is simple, not weighted by share of effort, as asked. A phase with a large and a small piece of work can therefore show a different figure from the share of its hours that AI actually reaches.

## 13. Each phase is its own 100%; phases carry a share of all effort — Resolved, behaviour changed

- Request: "each phase shall have 100% share of work and not all phases together."
- Decision: the work inside a phase now adds up to **100% of that phase** (`TaskMix.share`). Because the phases still have to be combined into one case, each phase also has a **share of all effort** (`WorkPhase.effortShare`), and only those phase shares add up to 100% across the phases. The choice was made by the user ("Phase effort share").
- The calculation uses effort share of a piece of work = its phase's effort share x its share of the phase. Templates were converted so that every golden number in EXEC_BUILD_SPEC.md section 6 is unchanged. Where that spec says a task's `share` is a share of all effort, read "phase effort share x share of phase".
- Validation: phase effort adds to 100% ("Phase effort must add up to 100%."); each phase's work adds to 100% ("{phase}: work must add up to 100%."); a phase with no work is flagged. A new phase starts at 0% of effort with one piece of work at 100%, so the case stays valid.
- Saved data from before this change resets to the defaults.

## 14. Every cost figure editable for every option — Resolved, behaviour changed

- Request: not all figures in "How each option's cost is built" were editable in all options (Hybrid was read-only, and shared figures had one box for all).
- Decision: `BusinessCaseInputs.optionOverrides` (optional) holds per-option figures. An option uses its own figure when set and the shared one otherwise. For Hybrid the platform, setup and usage cost per assisted hour can also be set, replacing the local-plus-stronger-model figure. For local, enterprise and frontier those three stay in `tiers`. `optionCosts(inputs, posture)` gives the figures an option really uses; the calculation, the table and the tips all read it.
- Old saved data is still valid (the field is optional). Figures on the Investment step are the defaults for options without their own.
