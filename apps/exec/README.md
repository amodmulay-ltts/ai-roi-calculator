# AI Business Case (executive app)

A presenter-led tool for a management conversation about AI across a work lifecycle: software testing, the whole software lifecycle, product development or mechanical design, or any lifecycle built by hand. It answers one question: **will AI pay back, how sure are we, and what must be true?**

The app walks through seven steps: Situation, Opportunity, Right-size, Investment, Result, Risks and Decision. It compares four ways of running AI (local, hybrid, enterprise and frontier), shows a conservative, expected and stretch range, and ends with a one-page summary you can print.

The concept is in [CONCEPT_EXEC.md](../../CONCEPT_EXEC.md). The calculation rules and expected results are in [EXEC_BUILD_SPEC.md](../../EXEC_BUILD_SPEC.md).

## Placeholder assumptions

**All default numbers are placeholders.** They are not benchmarks, vendor prices or verified results. Editable values on the Situation, Opportunity and Investment screens carry the label "Assumption to validate". The tier assumptions on the Right-size screen are marked by the "Assumptions to validate" heading and a note instead. Replace them with the customer's figures and current vendor prices before showing any result as a decision basis. The decision screen states that the assumptions are presenter-entered and not independently verified.

## Running it

From the repository root:

```
scripts/start-exec-ubuntu.sh     # one-command start on Ubuntu (checks Node, installs what is missing, starts the app)
scripts\start-exec-windows.bat    # the same on Windows
npm run dev:exec      # builds the calculation package, then starts the app on http://localhost:5174
npm run build:exec    # builds the calculation package and the app into dist/exec
npm run test:bizcase  # runs the calculation package tests
npm run smoke:exec    # drives the built app in Chrome or Edge and checks all seven steps (run build:exec first)
npm run test:all      # every suite in the repository
```

## Look and feel

The app looks and works like VALUEAI, the original calculator: the same L&T Technology Services header and logo, sticky step bar with a running result, cards, colours and chart palette. The logo and icons are copies of the ones in `apps/client/public`.

## Layout

- `packages/bizcase`: the calculation, defaults, validation, break-even searches and narrative. It has no user interface and no I/O.
- `apps/exec`: the React user interface. It shows results computed by `packages/bizcase` and does no financial arithmetic itself.

The app does not use the existing ROI engine in `packages/engine`.

## Saved state

Your inputs, the selected posture, the ask and the next steps are saved in this browser's local storage under the key `execcase.v1`. Saved data that is malformed or fails the checks is ignored, and the defaults are used instead. **Reset to defaults** clears everything, including the ask and next steps, after confirmation.

## Printing

The decision screen (step 7) is a one-page graphical summary. **Print summary** takes you to it and opens the print dialog (it is disabled while the inputs are invalid). The print layout is A4 landscape and hides the header, step bar and buttons. Turn on "Background graphics" in the print dialog if the gauges look empty.

## Scope

One piece of work at a time (a lifecycle from a template, or built by hand), cost and capacity benefits only, EUR only. No login, server or database.

## Work in scope

The first step offers four starting points: software testing, the software development lifecycle, the product development lifecycle and mechanical system design. Each is a list of phases with kinds of work. Edit, add or remove phases and work to describe any other lifecycle or industry.

**AI use is set for each piece of work** and is independent; a phase shows the plain average of the work in it. The percentages do not add up to 100% (a physical prototype phase can be 5% while documentation is 80%). The work inside each phase adds up to 100% on its own, and each phase has a share of all the effort (these add up to 100%).

The templates carry a work breakdown and AI use only. People, cost, investment and the option assumptions stay as entered, so check them when you change industry. Every figure in the templates is a placeholder.

## How it works (presenter deck)

`#/guide` (the "How it works" button in the header) opens an 11-slide, full-screen deck that scrolls and snaps like slides.
Space, Enter, arrows and Page keys move between slides, Home/End jump to the ends, and F toggles full screen, so it works with a clicker.
Figures on the slides come from the placeholder defaults and are labelled illustrative.
