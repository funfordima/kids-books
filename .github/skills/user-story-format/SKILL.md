---
name: user-story-format
description: "Creates detailed implementation-ready user stories with product context, Given/When/Then acceptance criteria, role subtasks, and Definition of Done."
argument-hint: "Describe the refined feature or task to turn into a user story"
---

# User Story Format

Creates consistently structured stories for the DarkFactory agent system. Every story must be readable by a human developer who knows the repository but has no prior context about this specific task.

## When To Use

- ProjectManager converts a refined feature into a parent GitHub issue.
- ProjectManager creates role-specific Developer, Tester, and CodeReviewer subtasks.
- A phase task needs to become implementation-ready work.

## Required Inputs

- Feature refinement brief from `feature-refinement`.
- Spec-driven lifecycle report from `spec-driven-feature-lifecycle`.
- Markdown section requirements from `markdown-task-format`.
- Relevant `docs/SDLC_PLAN.md` section.
- Current `docs/PROJECT_STATE.md`.
- Relevant architecture/security/testing constraints.
- Board dependencies and predecessor stories.

## Procedure

1. Read the feature refinement brief.
2. Read the relevant SDLC and project-state sections.
3. Identify actor: parent user, subscriber, system worker, admin, or developer/operator.
4. Define the product goal in plain language.
5. Write product context in Markdown: problem, expected behavior, primary flow, out of scope, and dependencies.
6. Write 4-8 Given/When/Then acceptance criteria, including at least one failure path.
7. Add technical notes tied to the project stack.
8. Add required Markdown role subtasks:
   - Developer
   - Tester / QualityGate
   - CodeReviewer
9. Add Definition of Done.
10. Assign priority.

## Priority Guidelines

| Label | Meaning |
|-------|---------|
| `P0` | Blocks other work or is a phase gate requirement |
| `P1` | Current phase and should be done this sprint |
| `P2` | Next phase or not eligible until current gates clear |

## GitHub Issue Labels

Parent story:

- `darkfactory`
- `phase-N`
- `story`
- `P0` / `P1` / `P2`

Subtasks:

- `darkfactory`
- `phase-N`
- `subtask`
- `developer-task` / `tester-task` / `reviewer-task`

## Story Template

Load and fill: [story-template.md](./templates/story-template.md)
