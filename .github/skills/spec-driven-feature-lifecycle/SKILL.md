---
name: spec-driven-feature-lifecycle
description: "DarkFactory adaptation of Spec Kit-style spec-driven development. Use before creating implementation stories so product intent becomes specs, plans, board subtasks, gates, and review evidence."
argument-hint: "Feature request or SDLC step"
---

# Spec-Driven Feature Lifecycle

This skill adapts the useful parts of Spec Kit-style development to the existing DarkFactory GitHub board and agent roles.

It does not replace the board. It turns product intent into Markdown artifacts and role-specific issues before implementation.

## Required Inputs

- User request or feature idea.
- Relevant `docs/SDLC_PLAN.md` section.
- Current `docs/PROJECT_STATE.md`.
- Existing board issues and dependencies.
- Product constraints and user outcomes.

## Lifecycle

### 1. Constitution Check

Confirm the feature follows:

- `docs/AGENT_SYSTEM_OPERATING_MODEL.md`
- `.github/copilot-instructions.md`
- Branch model: `main` stable, `development` integration, feature branches for work.
- GitHub access contract in `.github/AGENT_GITHUB_ACCESS.md`.

### 2. Specify

Define the feature in Markdown:

- Actor
- Product problem
- User/system outcome
- Primary flow
- Out of scope
- Functional requirements
- Failure cases

Do not include implementation details yet unless they are already fixed project constraints.

### 3. Clarify

Identify missing product behavior, unresolved dependencies, or ambiguous acceptance criteria.

If the feature is unclear, return `REFINE` and create/update a refinement issue. Do not create Developer subtasks.

### 4. Plan

Translate the specification into project-aware technical constraints:

- Backend / frontend / shared / infra areas touched
- Data and security constraints
- Testing approach
- Dependencies and blockers
- Expected branch and PR path

### 5. Task Breakdown

Create board-visible Markdown tasks:

- Parent user story
- Developer subtask
- Tester / QualityGate subtask
- CodeReviewer subtask

Each task must have:

- Markdown sections
- Inputs
- Outputs
- Acceptance/evidence checklist
- Owner role
- Status update rules

### 6. Analyze

Before development starts, check:

- Parent story has product context.
- Acceptance criteria are testable.
- Role subtasks exist.
- Dependencies are explicit.
- Tester gates are defined.
- CodeReviewer cannot approve without Tester PASS.

### 7. Implement

Only Developer implements. Developer updates only the Developer subtask.

### 8. Verify

Only Tester / QualityGate runs authoritative gates. Tester updates only the Tester subtask.

### 9. Review

Only CodeReviewer reviews. CodeReviewer updates only the Reviewer subtask and PR review/comment.

### 10. Converge

Orchestrator compares:

- Parent story acceptance criteria
- Developer evidence
- Tester evidence
- Reviewer verdict
- PR state
- Board fields

Any missing work becomes a new board task or reviewer change request.

## Output

```text
=== Spec-Driven Feature Lifecycle Report ===
Feature:
Status: READY | REFINE | BLOCKED

Specification:
- ...

Clarifications:
- ...

Plan:
- ...

Board tasks:
- Parent:
- Developer:
- Tester:
- Reviewer:

Gate checklist:
- ...

Decision:
- ...
```
