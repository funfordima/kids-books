---
name: quality-gate-check
description: "Runs the DarkFactory quality gate: TypeScript compilation check + Vitest test suite with coverage reporting. Use when: verifying a task is done, checking if a phase gate can advance, validating implementation before code review, confirming coverage thresholds are met."
---

# Quality Gate Check

Runs the full DarkFactory evidence gate for this project. No task is "done" and no phase advances without passing both checks.

## When to Use
- Developer agent has finished implementing a user story
- Orchestrator is evaluating whether to accept work as complete
- Before routing to CodeReviewer (saves review time on broken builds)
- When a developer asks "is my work ready for review?"

## Gate Requirements (from SDLC_PLAN.md)
- `tsc --noEmit` exits 0 (zero TypeScript errors)
- `npx vitest run --coverage` exits 0 AND reports ≥ 65% line coverage AND ≥ 65% branch coverage
- 100% of tests pass (zero failing tests)

## Procedure

1. **Run TypeScript check**
   ```
   npx tsc --noEmit
   ```
   - PASS: exits 0, no output
   - FAIL: exits non-zero, output contains error list

2. **Run test suite with coverage**
   ```
   npx vitest run --coverage
   ```
   - PASS: all tests green AND coverage thresholds met
   - FAIL: any test fails OR coverage below 65%

3. **Parse coverage output** — extract line% and branch% from the summary table

4. **Return gate verdict** using the output format below

## Output Format

```
=== Quality Gate Report ===
TypeScript: PASS | FAIL
  [Error list if failed]

Tests: PASS | FAIL
  Total: X | Passed: X | Failed: X | Skipped: X

Coverage:
  Lines:    XX.X%  (threshold: 65%)  PASS | FAIL
  Branches: XX.X%  (threshold: 65%)  PASS | FAIL

=== GATE VERDICT ===
PASS — work is ready for code review
  OR
FAIL — resolve the following before proceeding:
  1. [specific issue]
  2. [specific issue]
```

## On FAIL
- Report exactly which tests failed and why
- Report which files have the lowest coverage (help the developer prioritize tests)
- Do NOT let the Orchestrator advance to the next task until PASS is achieved

## Script Reference
Run [run-gates.sh](./scripts/run-gates.sh) on Linux/macOS or [run-gates.ps1](./scripts/run-gates.ps1) on Windows for a single-command gate check.
