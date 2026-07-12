---
name: feature-refinement
description: "Turns product intent and SDLC goals into implementation-ready feature briefs before ProjectManager creates user stories and role subtasks."
argument-hint: "Feature idea, SDLC step, or product capability"
---

# Feature Refinement

Use this before creating implementation user stories. It prevents SDLC checklist items from becoming vague engineering tickets with missing product behavior.

## Inputs

- Product intent from `docs/SDLC_PLAN.md`
- Current implementation state from `docs/PROJECT_STATE.md`
- Relevant architecture and security constraints from `.github/copilot-instructions.md`
- Any user clarification in the current conversation
- Existing board issues and predecessor dependencies

## Procedure

1. Define the user or system actor.
2. Define the product outcome in plain language.
3. Identify the functional behavior that must exist when the story is complete.
4. Identify non-functional constraints: security, data isolation, performance, accessibility, safety, and testability.
5. Identify dependencies and blocked prerequisites.
6. Split the feature into the smallest implementation-ready story that still delivers coherent value.
7. Produce role-specific work needs for:
   - Developer
   - Tester / QualityGate
   - CodeReviewer

## Output

```text
=== Feature Refinement Brief ===
Feature:
SDLC reference:
Actor:
Product outcome:

Functional behavior:
- ...

Non-functional constraints:
- ...

Dependencies:
- ...

Implementation-ready story:
- Title:
- Scope:
- Out of scope:

Role subtasks:
- Developer:
- Tester / QualityGate:
- CodeReviewer:

Open questions:
- ...
```

## Decision Rule

If product behavior is still unclear, return `REFINE` and create/update a refinement issue. Do not create Developer tasks from unclear product intent.
