# Agent System Operating Model

Last updated: 2026-07-12

This project must be implemented through the DarkFactory agent system. The goal is to model a real development team, not to let one agent perform every role.

## Non-Negotiable Rules

1. `main` is stable and must not receive direct implementation work.
2. `development` is the integration branch.
3. Every implementation story uses a dedicated feature branch: `feature/N-short-title`.
4. Every work item must be visible on the GitHub Project board before implementation starts.
5. No single agent may create the story, implement it, test it, review it, and merge it.
6. Every role updates its own assigned task or subtask on the board.
7. A story is not Done until quality gates pass and the CodeReviewer approves.

## Required Agent Roles

### Orchestrator

Owns coordination only.

- Reads the board and SDLC plan.
- Chooses the next eligible story.
- Assigns work to specialist agents.
- Moves parent story status only when role outputs justify it.
- Does not write product code.
- Does not review code.

### ProjectManager

Owns refinement and planning.

- Converts product requirements plus SDLC phase goals into human-readable user stories.
- Creates the parent story issue.
- Creates role-specific subtasks for Developer, Tester, and CodeReviewer.
- Adds all issues/subtasks to the board.
- Sets Phase, Priority, parent linkage, and initial status.
- Does not write or review source code.

### Developer

Owns implementation only.

- Works from the Developer subtask and parent story acceptance criteria.
- Creates/uses the story feature branch.
- Commits logical implementation slices referencing the issue number.
- Updates only the Developer subtask with implementation progress and gate notes.
- Does not approve or review its own work.

### Tester / QualityGate

Owns verification only.

- Runs build, typecheck, lint, tests, coverage, and smoke checks required by the story.
- Captures exact commands and results.
- Updates only the Tester subtask with PASS/FAIL evidence.
- Does not write product code except test harness changes explicitly assigned to a Developer story.

### CodeReviewer

Owns independent review only.

- Reviews the PR and committed changes.
- Runs review and security checklists.
- Updates only the Reviewer subtask and PR review/comment.
- Returns APPROVE or REQUEST_CHANGES.
- Never edits source code.

### Integrator / Release

Owns integration after approval.

- Verifies parent story, subtasks, PR, and gates are all complete.
- Merges feature branch into `development`.
- Does not implement or review feature code.

## Board Item Structure

Every implementable feature has:

- One parent user story issue.
- One Developer subtask.
- One Tester / QualityGate subtask.
- One CodeReviewer subtask.

The parent story describes product value, functional behavior, acceptance criteria, dependencies, and Definition of Done. Subtasks describe role-specific work and evidence.

## Status Rules

- Parent story starts in `Backlog`.
- Orchestrator moves parent story to `Ready for Dev` only after refinement is complete.
- Developer moves its subtask to `In Progress` when implementation starts.
- Tester moves its subtask to `In Progress` when gates start, then `Done` only when gates pass.
- CodeReviewer moves its subtask to `In Review`, then `Done` or `Changes Requested`.
- Parent story moves to `Done` only after Developer, Tester, and CodeReviewer subtasks are Done and the PR is merged or ready per the active phase rule.

## Product Refinement Requirement

Stories must not be generated from `docs/SDLC_PLAN.md` alone.

ProjectManager must combine:

- Product requirements and user value from `docs/SDLC_PLAN.md`.
- Feature refinement notes for the specific capability.
- Architecture constraints and dependencies.
- Existing implementation state from `docs/PROJECT_STATE.md`.
- Board state and predecessor stories.

If a feature lacks enough product detail for a human developer to implement safely, ProjectManager must create or update a refinement issue before creating implementation subtasks.

## GitHub Access Contract

Agents must use non-interactive GitHub access.

Recommended setup:

- Use a dedicated GitHub token for the agent system.
- Provide it through `GH_TOKEN` for the active session or authenticate `gh` with `--with-token`.
- Required token permissions/scopes:
  - repository contents read/write for `funfordima/kids-books`
  - issues read/write
  - pull requests read/write
  - Projects read/write
  - classic PAT scopes: `repo`, `project`, `read:org`

Agents must not:

- Run `gh auth login` during normal work.
- Run `gh auth logout` unless explicitly instructed.
- Print tokens, `hosts.yml`, or environment secrets.
- Rely on browser/device OAuth for routine board or PR operations.

Before orchestration starts, run:

```powershell
.\.tools\bin\gh.exe auth status
.\.tools\bin\gh.exe project list
.\.tools\bin\gh.exe issue list --repo funfordima/kids-books --limit 1
```

If these fail, stop and fix access before assigning implementation work.
