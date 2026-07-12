# Agent Quick Reference - GitHub Board State Transitions

The GitHub Projects board is the canonical source of work. Every parent story must have role-specific subtasks.

## Board State Machine

```text
Backlog -> Ready for Dev -> In Progress -> In Review -> Done
   ^            ^              ^             ^          ^
   PM          Orch        Dev + Tester   Reviewer   Orch verifies
```

## Required Issue Shape

Every implementable feature has:

- Parent user story issue
- Developer subtask
- Tester / QualityGate subtask
- CodeReviewer subtask

ProjectManager creates all of these before development starts. Each agent updates only its own task.

All parent stories and subtasks must use structured Markdown task descriptions.

## Agent State Transition Matrix

| Agent | Current Status | Action | Next Status | Evidence |
|-------|----------------|--------|-------------|----------|
| ProjectManager | none | Run feature refinement | Backlog or refinement blocked | Feature brief |
| ProjectManager | none | Create Markdown parent story + role subtasks | Backlog | Parent and subtask URLs |
| Orchestrator | Backlog | Confirm refinement + hardening READY | Ready for Dev | Board update |
| Developer | Ready for Dev | Start implementation branch | In Progress | Branch `feature/N-title` |
| Developer | In Progress | Commit implementation slices | In Progress | Commits with `#N` |
| Tester | In Progress | Run gates | In Progress or blocked | Tester subtask PASS/FAIL/BLOCKED |
| Developer | Tester PASS | Open PR into `development` | In Review | PR with `closes #N` |
| CodeReviewer | In Review | Review PR + security | Done or Changes Requested | Review report |
| Orchestrator | Role tasks Done | Verify parent story | Done | Parent issue status |
| Integrator | Approved PR | Merge feature into `development` | Done | Merge commit |

## Branch Naming

```text
feature/N-story-title
```

Examples:

```text
feature/1-setup-monorepo
feature/42-story-generation-service
```

## Commit Message Convention

```text
feat: implement story generation service (#42)
test: add moderation tests (#42)
fix: handle image queue retry failure (#42)
```

## PR Requirements

- Target branch: `development`
- Description includes `closes #N`
- Links the parent story
- Mentions Tester result
- Does not merge until CodeReviewer approves

## GitHub Access Preflight

Before any agent starts implementation:

```powershell
.\.tools\bin\gh.exe auth status
.\.tools\bin\gh.exe project list
.\.tools\bin\gh.exe issue list --repo funfordima/kids-books --limit 1
```

If this fails, stop. Do not assign implementation work.

## Token Rule

Routine agent work must use non-interactive GitHub access through a dedicated token or an already-authenticated `gh`.

Agents must not run browser/device OAuth login during normal workflow.

## Product Refinement Rule

Stories must not be created from `docs/SDLC_PLAN.md` alone. ProjectManager must also use feature refinement and current product context. If the product behavior is unclear, create/update a refinement issue instead of creating Developer work.

## Markdown Task Rule

Use the `markdown-task-format` skill for every parent issue, role subtask, PR description, and evidence update.
