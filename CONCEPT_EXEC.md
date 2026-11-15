# Executive AI Business Case — Concept (new app)

Status: Draft for review. No code yet. This document is conceptual: it describes decisions and behaviour, not formulas or code design.

## Purpose and audience

A presenter (an LTTS consultant) uses this tool live with management: CIO, COO, vice presidents, directors. It answers one question in a few minutes: **"If we put AI into this work, will it pay back, how sure are we, and what must be true?"**

It replaces the idea of a detailed estimating model with a guided business case. It is not a self-serve tool, so the presenter supplies judgement and the tool supplies structure, a clear story and honest ranges.

## Scope of the first version

- **One use case at a time.** The design leaves room to roll several into a portfolio later.
- **Cost and capacity benefits only.** Revenue and speed-to-market benefits are out of scope, because they are the hardest to defend.
- **First use case: software testing.** Other use cases follow as archetypes.
- **Currency: EUR** by default.
- **Built as a new app.** The existing calculation engine is reused as the back end where it fits; the existing app is left untouched.

## The story the tool tells

The results read as a business case, in this order:

1. **Situation.** Today's work, team and cost, in the customer's own words and numbers.
2. **Opportunity.** Which parts of the work AI can change, and how much of the effort that frees.
3. **Right-sizing.** Which kind of AI runs each part of the work, and what that does to cost and quality. This is the heart of the tool.
4. **Investment.** What it takes to get there: build, data preparation, governance, and change and training.
5. **Result.** Payback, three-year net value and the monthly run position, shown as a range of cases.
6. **Risks and "what must be true".** The few assumptions the answer depends on, and how the result moves if they fail.
7. **The decision.** What is being asked of the room, and what to validate next.

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

## Experience principles

- About six to eight plain-language questions up front, then an answer. Detail lives behind an "adjust assumptions" drawer.
- One headline per screen. No page asks a viewer to read tables to find the point.
- Wording an executive uses: investment, payback, run cost, risk. No rate cards or token jargon on the main path.
- A one-page summary export for a steering committee.

## Reuse from the current engine

Monthly forecast with transition, payback, net present value, labour realisation, cost basis, and AI sourcing presets all carry over. Needed additions: model-class choice per task, hybrid routing, quality-driven rework, the extra cost categories, and range cases.

## Open points for the product owner

1. Which task types make up the first (testing) archetype, and who supplies the volumes?
2. Where do the four postures' unit costs come from, given no verified numbers? Proposed: presenter-entered from current vendor price lists, with prices dated and shown as such.
3. Does the one-page export need LTTS branding and a particular template?
4. Is the conservative case a fixed haircut or built from the readiness answers? Proposed: built from the readiness answers.

## Step register

| Step | Concept | Status |
|---|---|---|
| 1 | Situation: today's work and cost | Proposed |
| 2 | Opportunity: what AI can change | Proposed |
| 3 | Right-sizing across four postures | Proposed |
| 4 | Investment and total cost of ownership | Proposed |
| 5 | Result as a range | Proposed |
| 6 | Risks and what must be true | Proposed |
| 7 | The decision and the export | Proposed |
