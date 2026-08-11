# Agent Quick Reference - GitHub Board State Transitions

The GitHub Projects board is the canonical source of work. Every parent story must have role-specific subtasks.

## Board State Machine

```text
Todo -> In Progress -> Done
 ^          ^           ^
 PM     Orch + roles   Orchestrator after role evidence
```

The current physical GitHub Project board has only `Todo`, `In Progress`, and `Done`.
Conceptual states such as `Ready for Dev`, `In Review`, and `Changes Requested` must be represented with `In Progress` plus structured issue/PR comments.

## Required Issue Shape

Every implementable feature has:

- Parent user story issue
- Developer subtask
- Tester / QualityGate subtask
- CodeReviewer subtask
- WikiCurator subtask when durable project knowledge must be updated

ProjectManager creates all of these before development starts. Each agent updates only its own subtask.

All parent stories and subtasks must use structured Markdown descriptions.

## Agent State Transition Matrix

| Agent | Current Status | Action | Next Status | Evidence |
|-------|----------------|--------|-------------|----------|
| ProjectManager | none | Run feature refinement | Todo or refinement blocked | Feature brief |
| ProjectManager | none | Create Markdown parent story + role subtasks | Todo | Parent and subtask URLs |
| Orchestrator | Todo | Confirm refinement + hardening READY | In Progress | Parent and Developer subtask board update |
| Developer | In Progress | Start exact story branch | In Progress | Branch `feature/N-title` |
| Developer | In Progress | Commit implementation slices for one parent issue only | In Progress | Commits with `#N` |
| Tester | In Progress | Re-run authoritative gates on exact SHA | In Progress or Done | Tester subtask PASS/FAIL/BLOCKED |
| Developer | Tester PASS | Open PR into `development` | In Progress | PR with `closes #N` |
| CodeReviewer | In Progress + Tester PASS | Review PR + security | Done or blocking comment | Review report |
| WikiCurator | Knowledge update required | Update GitHub Wiki | Done or blocked | Wiki page links |
| Orchestrator | Role subtasks Done | Verify parent story | Done | Parent issue status |
| Integrator | Approved PR | Merge feature into `development` | Done | Merge commit |

## Branch Naming

```text
feature/N-story-title
```

Never combine parent stories in a branch name or implementation branch. For example, `feature/5-6-generation-pipeline` is invalid.

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
- Contains exactly one parent story

## GitHub Access Preflight

Before any agent starts implementation:

```powershell
.\.tools\bin\gh.exe auth status
.\.tools\bin\gh.exe project list
.\.tools\bin\gh.exe issue list --repo funfordima/kids-books --limit 1
.\.tools\bin\gh.exe project field-list 1 --owner funfordima --format json
```

If this fails, stop. Do not assign implementation work.

## Token Rule

Routine agent work must use non-interactive GitHub access through a dedicated token or an already-authenticated `gh`.

Agents must not run browser/device OAuth login during normal workflow.

## Product Refinement Rule

Stories must not be created from `docs/SDLC_PLAN.md` alone. ProjectManager must also use feature refinement and current product context. If the product behavior is unclear, create/update a refinement issue instead of creating Developer work.

## Markdown Task Rule

Use the `markdown-task-format` skill for every parent issue, role subtask, PR description, and evidence update.

## Hard Stops

- If parent story or Developer subtask is still `Todo`, Developer must not edit files.
- If a predecessor story is not complete, a dependent story stays `Todo`.
- If one branch contains multiple parent stories, Tester blocks verification and CodeReviewer requests changes.
- Developer checks are not Tester PASS; Tester must rerun gates independently on the exact SHA.
