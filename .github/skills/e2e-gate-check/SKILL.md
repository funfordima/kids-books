---
name: e2e-gate-check
description: "Runs the Playwright end-to-end verification gate and reports pass/fail evidence for SDLC phase advancement. Use when: validating Phase 4 readiness, confirming critical user journeys, and enforcing E2E gate requirements before deployment."
argument-hint: "Optionally provide a Playwright test path or project filter"
---

# E2E Gate Check

Runs Playwright E2E tests as evidence for SDLC gate decisions.

## When to Use
- VERIFY phase for Phase 4 (Testing) to Phase 5 (Deployment)
- Before declaring release-readiness for critical user flows
- When confirming auth isolation and core book generation journey behavior

## Gate Requirements
- `npx playwright test` exits 0
- Critical journey tests pass (signup/login, create flow, read flow, export flow as applicable)
- No unexpected retries/flaky reruns hidden as pass

## Procedure

1. **Check configuration**
   - If no Playwright config or no E2E tests exist, return `BLOCKED` with missing prerequisites

2. **Run E2E tests**
   - Default command: `npx playwright test`
   - Optional focused run: `npx playwright test <path-or-project-filter>`

3. **Collect evidence**
   - Passed/failed totals
   - Failed test names and first-failure causes
   - Artifact paths (trace/video/report) when available

4. **Emit verdict**
   - `PASS` if suite succeeds
   - `FAIL` if any test fails
   - `BLOCKED` if test infrastructure is missing

## Output Format

```
=== E2E Gate Report ===
Command: npx playwright test [optional filter]

Status: PASS | FAIL | BLOCKED

Summary:
- Total: X
- Passed: X
- Failed: X
- Skipped: X

Failures:
1. [test name] — [root cause]

Artifacts:
- [path]

Gate Recommendation:
- PASS: E2E gate clear
- FAIL/BLOCKED: do not advance phase
```

## DarkFactory Rule
- Phase 4 to Phase 5 gate cannot be marked clear without `PASS` or an explicit user-approved temporary waiver.
