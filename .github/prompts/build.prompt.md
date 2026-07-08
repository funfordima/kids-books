---
name: build
description: "BUILD phase — delegates the implementation of a user story to the Developer agent. Passes the story, analyze output, and build order. Use to start implementation of a specific GitHub issue."
agent: Orchestrator
tools: [agent]
---

# BUILD Phase

Delegates implementation to the `@Developer` agent.

## Input
- `story`: GitHub issue number or story title (required)
- `analyze`: ANALYZE phase output (optional — if not provided, Orchestrator runs `/analyze` first)

## Steps

1. Confirm ANALYZE phase is complete and `Readiness: GO` for this story
2. Hand off to `@Developer` with:
   - The user story text and acceptance criteria (from GitHub issue)
   - The ANALYZE output (test cases + build order + proofs)
   - The DESIGN output (file locations + interfaces)
3. Developer implements, writes tests, runs `quality-gate-check` skill
4. Receive result from Developer: PASS or FAIL
5. If PASS → proceed to `/review`
6. If FAIL → return findings to Developer for remediation (max 3 attempts)

## Handoff Message to Developer

```
Implement the following user story:

STORY: [story title] (GitHub #N)
USER STORY: As a [user type], I want [goal], so that [benefit]

ACCEPTANCE CRITERIA:
[AC list from GitHub issue]

BUILD ORDER:
[from ANALYZE output]

TEST CASES TO IMPLEMENT:
[from ANALYZE output]

When done:
1. Run the quality-gate-check skill
2. Report PASS/FAIL back to Orchestrator
3. If PASS, commit with: feat: [story title] (closes #N)
```

## DarkFactory Rule
Developer must NOT proceed to the next story until quality-gate-check returns PASS.
If FAIL persists after 3 attempts, escalate to the user.
