# AI Business Case (executive app)

A presenter-led tool for a management conversation about AI in software testing. It answers one question: **will AI pay back, how sure are we, and what must be true?**

The app walks through seven steps: Situation, Opportunity, Right-size, Investment, Result, Risks and Decision. It compares four ways of running AI (local, hybrid, enterprise and frontier), shows a conservative, expected and stretch range, and ends with a one-page summary you can print.

The concept is in [CONCEPT_EXEC.md](../../CONCEPT_EXEC.md). The calculation rules and expected results are in [EXEC_BUILD_SPEC.md](../../EXEC_BUILD_SPEC.md).

## Placeholder assumptions

**All default numbers are placeholders.** They are not benchmarks, vendor prices or verified results. Editable values on the Situation, Opportunity and Investment screens carry the label "Assumption to validate". The tier assumptions on the Right-size screen are marked by the "Assumptions to validate" heading and a note instead. Replace them with the customer's figures and current vendor prices before showing any result as a decision basis. The decision screen states that the assumptions are presenter-entered and not independently verified.

## Running it

From the repository root:

```
npm run dev:exec      # builds the calculation package, then starts the app on http://localhost:5174
npm run build:exec    # builds the calculation package and the app into dist/exec
npm run test:bizcase  # runs the calculation package tests
npm run smoke:exec    # drives the built app in Chrome or Edge and checks all seven steps (run build:exec first)
npm run test:all      # every suite in the repository
```

## Layout

- `packages/bizcase`: the calculation, defaults, validation, break-even searches and narrative. It has no user interface and no I/O.
- `apps/exec`: the React user interface. It shows results computed by `packages/bizcase` and does no financial arithmetic itself.

The app does not use the existing ROI engine in `packages/engine`.

## Saved state

Your inputs, the selected posture, the ask and the next steps are saved in this browser's local storage under the key `execcase.v1`. Saved data that is malformed or fails the checks is ignored, and the defaults are used instead. **Reset to defaults** clears everything, including the ask and next steps, after confirmation.

## Printing

Print the decision screen (step 7) to get the one-page summary. The print layout hides the header, step bar and buttons. Printing from other steps produces a blank page.

## Scope

One use case (software testing), cost and capacity benefits only, EUR only. No login, server or database.
