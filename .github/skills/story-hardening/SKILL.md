---
name: story-hardening
description: "Hardens a draft user story before development by adversarially grilling acceptance criteria and validating consistency against SDLC/architecture docs. Use when: reviewing new stories before dev handoff, finding missing edge cases, preventing ambiguous requirements from reaching implementation."
argument-hint: "Provide the story draft and the SDLC task reference"
---

# Story Hardening

Runs a pre-development requirements challenge pass. This is a combined equivalent of "grill-me" + "grill-with-docs" behavior for the DarkFactory workflow.

## When to Use
- ProjectManager has drafted a story and needs to validate quality before finalizing the issue
- Orchestrator wants to reduce rework risk before routing to Developer
- Any story has unclear Given/When/Then outcomes or weak failure-mode criteria

## Inputs
- Story draft (title, user story, acceptance criteria, technical notes, DoD)
- SDLC reference in `docs/SDLC_PLAN.md`
- Relevant governance constraints from `.github/copilot-instructions.md`

## Procedure

1. **Challenge AC clarity**
   - Verify every acceptance criterion is testable, specific, and observable
   - Reject vague phrases like "works", "fast", or "user-friendly" without measurable conditions

2. **Challenge missing cases**
   - Ensure each story includes at least one invalid-input or failure-path acceptance criterion
   - Identify auth/authz, ownership, and retry/error behavior gaps where relevant

3. **Check documentation alignment**
   - Cross-check story technical notes against `docs/SDLC_PLAN.md`
   - Flag conflicts with stack decisions or phase scope

4. **Check dependency readiness**
   - Verify prerequisites are explicit (modules, env vars, schema, services)
   - If missing prerequisites would block implementation, mark the story as blocked

5. **Emit hardening verdict**
   - `READY` when no blockers remain
   - `REFINE` when blockers exist

## Output Format

```
=== Story Hardening Report ===
Story: [title]

Status: READY | REFINE

Findings:
1. [CRITICAL|WARN] [issue summary]
   Evidence: [AC or technical note snippet]
   Recommendation: [specific revision needed]

Revised Acceptance Criteria:
- Given ... When ... Then ...

Decision:
- READY: story can proceed to Developer handoff
- REFINE: update issue draft and rerun story-hardening
```

## DarkFactory Rule
- Do not pass a story to Developer if `Status: REFINE`.
- Story hardening happens before implementation, not during code review.
