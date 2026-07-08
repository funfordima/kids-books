---
name: review
description: "REVIEW phase — delegates implementation review to the CodeReviewer agent. CodeReviewer is read-only and adversarial. Returns APPROVE or REQUEST_CHANGES. Use after BUILD phase quality gate passes."
agent: Orchestrator
tools: [agent]
---

# REVIEW Phase

Delegates adversarial code review to the `@CodeReviewer` agent.

## Precondition
BUILD phase quality gate must have returned PASS before this phase starts.

## Input
- `story`: GitHub issue number or story title (required)
- Quality gate has passed (confirmed by Orchestrator)

## Steps

1. Hand off to `@CodeReviewer` with:
   - The user story (GitHub issue number + ACs)
   - The list of files changed by Developer
2. CodeReviewer runs independently:
   - `pr-review-checklist` skill (5 axes)
   - `security-audit` skill (OWASP checklist)
3. Receive review report: APPROVE or REQUEST_CHANGES
4. If **APPROVE** → proceed to `/verify`
5. If **REQUEST_CHANGES** → return findings to Developer with:
   - All CRITICAL findings (must fix)
   - All WARN findings (should fix)
   - Developer re-implements and re-runs quality gate
   - Re-route back to CodeReviewer for re-review

## Handoff Message to CodeReviewer

```
Review the implementation for this user story:

STORY: [story title] (GitHub #N)
ACCEPTANCE CRITERIA:
[AC list]

FILES CHANGED:
[list of files modified/created by Developer]

Please:
1. Run the pr-review-checklist skill (all 5 axes)
2. Run the security-audit skill
3. Verify every acceptance criterion is met
4. Return APPROVE or REQUEST_CHANGES with specific file:line findings
```

## DarkFactory Rule
CodeReviewer is read-only. It cannot edit files — this is enforced by its tool configuration.
The Orchestrator must NOT accept an implementation without a completed review.
REQUEST_CHANGES must route back to Developer — never bypass to verify.
