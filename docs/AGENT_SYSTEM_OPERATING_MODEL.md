# Agent System Operating Model

Last updated: 2026-08-09

This project must be implemented through the DarkFactory agent system. The goal is to model a real development team, not to let one agent perform every role.

## Non-Negotiable Rules

1. `main` is stable and must not receive direct implementation work.
2. `development` is the integration branch.
3. Every implementation story uses a dedicated feature branch: `feature/N-short-title`.
4. Every work item must be visible on the GitHub Project board before implementation starts.
5. Every work item description must be structured Markdown.
6. No single agent may create the story, implement it, test it, review it, and merge it.
7. Every role updates its own assigned subtask on the board.
8. A story is not Done until quality gates pass and the CodeReviewer approves.
9. Agents must verify the actual GitHub Project field/options before every status transition; documentation names are not a substitute for current board state.
10. A PR is not considered provided until it is linked or added to the Project board, references the parent issue, targets the story's base branch, and uses the story's expected feature branch unless an explicit exception is recorded.

## Required Agent Roles

### Orchestrator

Owns coordination only.

- Reads the board and SDLC plan.
- Runs the non-interactive GitHub access preflight using the repository-approved `gh` binary, including sibling-worktree `.tools/bin/gh.exe` discovery when the active worktree lacks `.tools`.
- Discovers actual Project field IDs and Status options before moving any item.
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
- Confirms the parent story and Developer subtask are on the board and no longer in backlog before the first implementation commit.
- Does not approve or review its own work.

### Tester / QualityGate

Owns verification only.

- Runs build, typecheck, lint, tests, coverage, and smoke checks required by the story.
- Captures exact commands and results.
- Updates only the Tester subtask with PASS/FAIL evidence.
- Moves or requests movement of the Tester subtask to the board's active status before verification starts, then to Done only after PASS.
- Does not write product code except test harness changes explicitly assigned to a Developer story.

### CodeReviewer

Owns independent review only.

- Reviews the PR and committed changes.
- Runs review and security checklists.
- Updates only the Reviewer subtask and PR review/comment.
- Verifies Tester PASS for the same SHA before APPROVE.
- Returns APPROVE or REQUEST_CHANGES.
- Never edits source code.

### Integrator / Release

Owns integration after approval.

- Verifies parent story, subtasks, PR, and gates are all complete.
- Merges feature branch into `development`.
- Does not implement or review feature code.

### WikiCurator

Owns durable project knowledge in the GitHub Wiki.

- Initializes and maintains the GitHub Wiki page map.
- Summarizes requirements, decisions, rationale, architecture, and SDLC progress.
- Links wiki summaries back to board issues, PRs, commits, and repository docs.
- Updates only WikiCurator subtasks.
- Does not implement product code.
- Does not replace the GitHub Projects board as status source of truth.

## Board Item Structure

Every implementable feature has:

- One parent user story issue.
- One Developer subtask.
- One Tester / QualityGate subtask.
- One CodeReviewer subtask.
- One WikiCurator subtask when the story changes requirements, architecture, governance, phase progress, or durable decisions.

The parent story describes product value, functional behavior, acceptance criteria, dependencies, and Definition of Done. Subtasks describe role-specific work and evidence.

## Status Rules

- Parent story starts in `Backlog`.
- Orchestrator moves parent story to `Ready for Dev` only after refinement is complete.
- Developer moves its subtask to `In Progress` when implementation starts.
- Tester moves its subtask to `In Progress` when gates start, then `Done` only when gates pass.
- CodeReviewer moves its subtask to `In Review`, then `Done` or `Changes Requested`.
- Parent story moves to `Done` only after Developer, Tester, and CodeReviewer subtasks are Done and the PR is merged or ready per the active phase rule.
- If a WikiCurator subtask is required, parent story cannot move to `Done` until WikiCurator has updated or explicitly reported `NO_CHANGE`.

When the physical GitHub Project board has fewer statuses than the conceptual workflow, use the real board values and record the mapping in the orchestration notes. For the current `DarkFactory SDLC` board, the available Status values are `Todo`, `In Progress`, and `Done`; therefore `Ready for Dev` and `In Review` are represented by `In Progress` plus structured issue/PR comments.

Before reporting a PR as ready for downstream review, Orchestrator verifies:

- parent story and role subtasks are on the board;
- parent story and Developer subtask left `Todo` before or during recovery;
- PR is on the board or has a recorded blocker explaining why it cannot be added;
- PR body references the parent story and role subtasks;
- expected branch/base are correct;
- exact candidate SHA is recorded on the Developer and Tester subtasks;
- Tester PASS and CodeReviewer state are not inferred from the implementing agent's own statements.

## GitHub Wiki Requirement

Use GitHub Wiki for durable human-readable project memory:

- Requirements summaries.
- Decision log and rationale.
- Architecture summaries.
- Agent workflow summaries.
- SDLC progress summaries.
- Setup and access notes.

WikiCurator owns the wiki. See `docs/WIKI_KNOWLEDGE_BASE_SPEC.md` and `.github/skills/github-wiki-knowledge-base/SKILL.md`.

## Product Refinement Requirement

Stories must not be generated from `docs/SDLC_PLAN.md` alone.

ProjectManager must combine:

- Product requirements and user value from `docs/SDLC_PLAN.md`.
- Spec-driven feature lifecycle output.
- Feature refinement notes for the specific capability.
- Architecture constraints and dependencies.
- Existing implementation state from `docs/PROJECT_STATE.md`.
- Board state and predecessor stories.

If a feature lacks enough product detail for a human developer to implement safely, ProjectManager must create or update a refinement issue before creating implementation subtasks.

## Markdown Task Requirement

All GitHub issue bodies, role subtasks, PR descriptions, and evidence updates must use structured Markdown.

Required parent story sections:

- Product Context
- User Story
- Acceptance Criteria
- Technical Notes
- Required Role Subtasks
- Definition of Done

Required role subtask sections:

- Parent Story
- Role Responsibility
- Inputs
- Required Work
- Output / Evidence
- Status Updates
- Done Checklist

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
  - classic PAT scopes for a public repository: `public_repo`, `project`, `read:org`
  - classic PAT scopes for a private repository: `repo`, `project`, `read:org`

For local development, agents may load `GH_TOKEN` from the repository root `.env` file only into the current process environment. Agents must never print, copy, commit, mount into broad containers, or expose `.env` contents. If `.env` is present, every Docker/container command must avoid mounting the repository root unless the command explicitly excludes secret files.

Agents must not:

- Run `gh auth login` during normal work.
- Run `gh auth logout` unless explicitly instructed.
- Print tokens, `hosts.yml`, or environment secrets.
- Rely on browser/device OAuth for routine board or PR operations.

Before orchestration starts, run:

```powershell
$gh = ".\.tools\bin\gh.exe"
if (-not (Test-Path $gh)) {
  $gh = "..\kids-books\.tools\bin\gh.exe"
}
& $gh auth status
& $gh project list
& $gh issue list --repo funfordima/kids-books --limit 1
& $gh project field-list 1 --owner funfordima --format json
```

If these fail, stop and fix access before assigning implementation work.
