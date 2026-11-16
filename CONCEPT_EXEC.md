# Executive AI Business Case — Concept (new app)

Status: Built in `apps/exec` with the calculation in `packages/bizcase`. Default values are placeholders, not benchmarks. This document is conceptual: it describes decisions and behaviour, not formulas or code design.

## Purpose and audience

A presenter (an LTTS consultant) uses this tool live with management: CIO, COO, vice presidents, directors. It answers one question in a few minutes: **"If we put AI into this work, will it pay back, how sure are we, and what must be true?"**

It replaces the idea of a detailed estimating model with a guided business case. It is not a self-serve tool, so the presenter supplies judgement and the tool supplies structure, a clear story and honest ranges.

## Scope of the first version

- **One use case at a time.** The design leaves room to roll several into a portfolio later.
- **Cost and capacity benefits only.** Revenue and speed-to-market benefits are out of scope, because they are the hardest to defend.
- **Any lifecycle, not only testing.** The work in scope is a list of lifecycle phases, each with its own kinds of work. Ready-made starting points: software testing (the reference), the whole software lifecycle, product development (hardware and software together) and mechanical design. The presenter can rename, add and remove phases and work, so any other industry can be described.
- **AI use is set for each phase.** Every phase has its own percentage of work where AI is used. These percentages are independent: each describes one phase, not a share of a whole, so they do not add up to 100%. Physical work, such as building a prototype, simply has a low figure. The split of effort across the work does add up to 100%, because it divides one whole.
- **Currency: EUR** by default.
- **Built as a new app.** It has its own small calculation package; the existing app and engine are left untouched.

## The story the tool tells

The results read as a business case, in this order:

1. **Situation.** Today's work, team and cost, in the customer's own words and numbers.
2. **Opportunity.** Which parts of the work AI can change, and how much of the effort that frees. The headline measure is **net efficiency**: the share of in-scope effort freed after review and rework. It is built from how widely AI is used in each phase, how much effort it removes from each kind of work, and what comes back as review. How widely AI is used is an input for each phase; efficiency is a result, shown overall and phase by phase.
3. **Right-sizing.** Which kind of AI runs each part of the work, and what that does to cost and quality. This is the heart of the tool.
4. **Investment.** What it takes to get there: build, data preparation, governance, and change and training.
5. **Result.** Payback, three-year net value and the monthly run position, shown as a range of cases.
6. **Risks and "what must be true".** The few assumptions the answer depends on, and how the result moves if they fail.
7. **The decision.** A one-page graphical summary: the verdict, the range, how the efficiency and the money are built, the safety margin, and what is being asked of the room.

## Right-sizing AI is the central idea

How AI is sourced and how much model is applied to each task decides whether ROI is positive or negative. The tool makes that choice explicit and comparable.

**Four postures:**

- **Local.** Small or open models run on the organisation's own infrastructure. No per-use charge, but infrastructure and operations cost, and a lower capability ceiling.
- **Hybrid.** Simple, high-volume tasks go to local models, and hard or high-stakes tasks go to stronger models.
- **Enterprise.** Contracted or private deployments of commercial models, with predictable pricing, stronger data controls and platform cost.
- **Frontier.** The most capable public models, paid per use. Highest capability and highest unit cost.

**Task-to-model fit.** Each kind of task in the use case is matched to a model class. Two failure modes are made visible:

- **Over-sizing:** a frontier model on routine work inflates run cost until the saving disappears.
- **Under-sizing:** a small model on hard work lowers quality, which adds review and rework and shrinks the benefit that is actually realised.

**What the presenter sees:** the same use case under all four postures side by side, with the sign of the ROI for each. The tool shows where the case turns negative and what extra effectiveness a more capable (and costlier) option would need to justify its price.

**Constraints, not numbers.** Data sensitivity, sovereignty and regulation can rule a posture out regardless of cost. These are a gate shown before the comparison, not a score.

## Value: cost and capacity

- **Cost reduction** is cash that leaves the budget.
- **Capacity released** is time given back. It is only cash if it leaves payroll or avoids hiring, so the tool always asks and shows the share treated as cash. Released capacity that is redeployed is shown separately and never counted as saving.
- Human review, rework and the transition period reduce the gross effect before anything is called a benefit.

## Investment and cost of ownership

Every case includes the costs that tend to be left out: data and integration readiness, governance and assurance, and change management and training, alongside AI usage, platform and infrastructure. The results show when these are paid relative to when savings arrive, since early cost drives payback.

## Readiness and risk

A short set of plain questions (data, skills, sponsorship, compliance) does not produce a score. It widens the range and delays the benefit. A weak answer visibly moves the conservative case.

## Honesty about numbers

No verified external benchmarks are available, and none will be invented.

- Defaults are labelled **assumptions to validate**, and the presenter replaces them with the customer's figures during the session.
- Every result shows its range (conservative, expected, stretch) and which assumptions it leans on most.
- A sourced benchmark can be attached to an assumption later, and the label changes only then.

## Limits of the broader scope

- **The work breakdowns are illustrations.** The shares and AI-use figures in the ready-made lifecycles are placeholders to start a conversation, not measured data. The presenter replaces them with the customer's own split of effort.
- **One blended cost per person.** A mechanical engineer and a software engineer cost different amounts. For now the presenter enters one blended figure for the work in scope.
- **The AI options describe where and how models run.** Local, hybrid, enterprise and frontier fit language-model assistance well. Specialised engineering AI, such as generative design or simulation surrogates, is not modelled as a separate kind of AI yet. It can be represented through the option assumptions and the cost lines, and may deserve its own treatment later.
- **Effort, not output.** The case measures effort freed. It does not claim faster time to market or better product quality.

## Experience principles

- About six to eight plain-language questions up front, then an answer. Detail lives behind an "adjust assumptions" drawer.
- One headline per screen. No page asks a viewer to read tables to find the point.
- Wording an executive uses: investment, payback, run cost, risk. No rate cards or token jargon on the main path.
- A one-page graphical summary for a steering committee: charts first, with the figures and sentences beside them.

## Relation to the current engine

The ideas carry over (monthly forecast with a ramp, payback, labour realisation, AI sourcing choices), but the new model is deliberately simpler and self-contained so that it is easy to explain and to build correctly.

## Decisions taken (change by editing this document first)

1. **Testing archetype tasks:** test design, script development, test execution, defect analysis and reporting, each marked routine or complex. Volumes are not asked for in the first version: the presenter enters team size and cost, and the work mix is a share of effort.
2. **Unit costs for the four postures** are presenter-entered, with clearly labelled placeholder defaults. The presenter replaces them with current vendor prices and customer figures.
3. **Same look and feel as VALUEAI**, with the L&T Technology Services logo, so the two tools read as one product family. The one-page summary prints in the same style.
4. **Conservative case:** the readiness answers shift all three cases, and a fixed, visible spread separates conservative, expected and stretch.
5. **Self-contained model.** The new app has its own small calculation package and does not import the existing engine. The existing app is untouched.

The build is specified in `EXEC_BUILD_SPEC.md`.

## Step register

| Step | Concept | Status |
|---|---|---|
| 1 | Situation: today's work and cost | Implemented |
| 2 | Opportunity: what AI can change | Implemented |
| 3 | Right-sizing across four postures | Implemented |
| 4 | Investment and total cost of ownership | Implemented |
| 5 | Result as a range | Implemented |
| 6 | Risks and what must be true | Implemented |
| 7 | The decision and the export | Implemented (printable one-page summary; no file export) |
