---
name: user-story-format
description: "Creates a properly formatted user story with Given/When/Then acceptance criteria and Definition of Done. Use when: writing user stories, creating GitHub issues for development tasks, defining acceptance criteria, breaking down SDLC tasks into implementable stories."
argument-hint: "Describe the feature or task to turn into a user story"
---

# User Story Format

Creates consistently structured user stories following the DarkFactory spec-driven principle. Every story becomes a GitHub issue with clear, testable acceptance criteria.

## When to Use
- ProjectManager agent converting SDLC tasks into implementable stories
- Creating GitHub issues from SDLC plan items
- When breaking down a phase into parallel workstreams

## Procedure

1. **Understand the task** — read the relevant section of `docs/SDLC_PLAN.md` and the tech stack context
2. **Identify user type** — who benefits: `parent user`, `subscriber`, `system (worker)`, `admin`
3. **Define the goal** — one clear outcome the user achieves
4. **Write 3–5 acceptance criteria** — each as Given/When/Then
5. **Add technical notes** — relevant stack constraints (e.g. "must use Supabase RLS", "must enqueue BullMQ job")
6. **Fill Definition of Done** — standard checklist every story requires
7. **Assign priority** — P0 (blocking), P1 (current sprint), P2 (next sprint)
8. **Output** — the filled template below, ready to paste into a GitHub issue

## Story Template

Load and fill: [story-template.md](./templates/story-template.md)

## Priority Guidelines

| Label | Meaning |
|-------|---------|
| `P0` | Blocks other work or is a Phase gate requirement |
| `P1` | Current phase — should be done this sprint |
| `P2` | Next phase — do not start until P1s are complete |

## GitHub Issue Labels to Apply
- `darkfactory` — all stories created by this pipeline
- `phase-N` — matches the SDLC phase number (e.g. `phase-3`)
- `P0` / `P1` / `P2`
- `story` — user story (vs `bug`, `chore`, `spike`)
