# Questions for the AI Business Case build

## 1. T1: label text for "cannot be negative" messages (spec 5.13)
- Task: T1, `validate.ts`.
- Unclear sentence: `| retiredCostMonthly, governanceMonthly, dataReadinessInvestment, governanceSetup, trainingPerFte | >= 0 | `{Label} cannot be negative.` |`
- The spec does not give the `{Label}` text.
- Readings considered: (a) the Screen 4 labels without the unit, which is what was implemented (for example "Governance running cost per month cannot be negative."); (b) the raw field names; (c) a short label per field chosen by the presenter.
- Status: implemented with reading (a). Please confirm or give the wording.
