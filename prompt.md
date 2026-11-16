Paste this into Haiku to start. It covers one task, T0, and you reuse the second block for each later task.

## Prompt 1: start (task T0)

```
You are a coding assistant working in the repository /home/amod/dev/ai-roi-calculator.

GOAL
We are building a NEW app called "AI Business Case". The full design is already written. Your job is to build it exactly as specified, one small task at a time. Do not design anything yourself.

READ FIRST (all three, completely, before writing any code)
1. CLAUDE.md
2. CONCEPT_EXEC.md  (what the app is and why)
3. EXEC_BUILD_SPEC.md  (exactly what to build: types, defaults, formulas, expected numbers, screen wording, task list)

YOUR TASK NOW: T0 only (section 9 of EXEC_BUILD_SPEC.md)
Create the two new workspaces packages/bizcase and apps/exec as described in section 2, add the three root scripts, and put a placeholder App that shows the title "AI Business Case".

RULES (these matter most)
- Follow EXEC_BUILD_SPEC.md literally. If it gives a name, number, formula, or sentence, use it exactly.
- Do ONLY task T0. Do not start T1 or write any calculation code yet.
- Do not change anything in packages/engine, apps/client, or apps/server. Do not import from them.
- Do not add any dependency that is not listed in section 2.
- Use a feature branch named feature/exec-t0-scaffold. Never commit directly to main.
- Do not guess. If anything is unclear, write a numbered question in EXEC_QUESTIONS.md (task, the exact unclear sentence, the 2-3 readings you considered) and continue with the parts that do not depend on it.

HOW TO WORK
1. Create the branch.
2. Make the changes.
3. Run the checks from section 10 of the spec:
   - npm run test:bizcase   (zero tests is fine for T0)
   - npm run build:exec
   - npm test -w packages/engine   (must still pass, 128 tests)
4. Run git status. Only these may be changed: packages/bizcase, apps/exec, root package.json scripts, EXEC_QUESTIONS.md. Do not stage package-lock.json changes unrelated to the new workspaces.
5. Commit with a clear message. Do not merge until all checks pass.

WHEN FINISHED, REPORT
- The exact output of each check (pass or fail).
- The list of files you created or changed.
- Anything you were unsure about (or "none").
Then STOP and wait. Do not continue to the next task.
```

## Prompt 2: every later task (T1 to T9)

Replace `Tn` and the branch name each time.

```
Continue the AI Business Case build in /home/amod/dev/ai-roi-calculator.

Re-read EXEC_BUILD_SPEC.md sections 0, 10, 11 and 12, and the section for the task below.

YOUR TASK NOW: Tn only (see the task table in section 9 of EXEC_BUILD_SPEC.md and the sections it references).

Rules:
- Do only this task. Do not start the next one.
- Use the exact values, formulas, names and wording from the spec. The expected numbers in section 6 are the tests: your code must reproduce them. If your result differs from a number in section 6, do not change the number. Re-read the formula and fix your code. If you still think the spec is wrong, add a question to EXEC_QUESTIONS.md and stop.
- Do not modify packages/engine, apps/client or apps/server. Do not add dependencies. Do not add features, screens or wording the spec does not list.
- Branch: feature/exec-tn-<short-name>. Merge to main only after all checks pass.

Before committing, run the section 10 checks and report their exact output:
- npm run test:bizcase
- npm run build:exec
- npm test -w packages/engine

Finish with: the files changed, the check results, and any questions (or "none"). Then STOP.
```

**Tips for working with Haiku**
- **Give it one task at a time.** Don't paste the whole list.
- **Check its report.** Run `npm run test:bizcase` yourself on T2 to T4. The golden numbers in section 6 are the real test of correctness.
- **If it drifts**, tell it which section of the spec it broke and to redo only that part.
- **After T4**, the calculation core is done. If the numbers match, the rest is mostly screens.

I can review each task's result when you paste it back. A short diff or the check output is enough.