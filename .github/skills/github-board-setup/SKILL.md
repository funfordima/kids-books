---
name: github-board-setup
description: "GitHub Projects (board) setup guide for DarkFactory. Creates and configures a GitHub Project board with SDLC phase fields, automation rules, and PR linking. Use when setting up a new repository, initializing the board, understanding board workflows, or configuring GitHub Actions automation."
---

# GitHub Projects Board Setup

The DarkFactory agents work with a GitHub Projects board as the canonical source of stories and progress tracking.

## Board Structure

### Project Type

- Project format: GitHub Projects v2 table view
- Visibility: Public or Private
- Project name: `DarkFactory SDLC`

### Status Field

The current physical board has exactly these Status options:

| Status | Meaning | Owner |
|--------|---------|-------|
| `Todo` | Created but not routed or blocked by predecessor | ProjectManager / Orchestrator |
| `In Progress` | Active story, verification, review, or blocked recovery represented by comments | Orchestrator + active role |
| `Done` | Required role evidence is complete and Orchestrator verifies the parent gate | Orchestrator |

Do not assume physical `Backlog`, `Ready for Dev`, `In Review`, or `Changes Requested` options exist. Represent those conceptual states with `In Progress` plus structured issue or PR comments.

### Custom Fields

| Field | Type | Purpose |
|-------|------|---------|
| Phase | Single select | Maps to `docs/SDLC_PLAN.md` phase, Phase 1 through Phase 6 |
| Priority | Single select | P0 blocking, P1 current, P2 next |
| Story Points | Number | Optional complexity estimate |
| PR Link | Text | URL to the pull request |

## Required Workflow

1. ProjectManager creates Markdown parent story and role subtasks.
2. ProjectManager adds all items to the board with Status `Todo`, then re-queries the board to verify presence, Phase, Priority, and Status.
3. Orchestrator picks the next eligible `Todo` story only after predecessors are complete.
4. Orchestrator moves the parent story and Developer subtask to `In Progress` before any source edits.
5. Developer implements exactly one parent story on `feature/N-story-title`.
6. Developer records branch, commits, changed files, commands, and known gaps on only the Developer subtask.
7. Tester reruns authoritative gates on the exact SHA. Developer-run checks are not Tester PASS.
8. Developer opens a PR to `development` with `closes #N` only after Tester PASS.
9. CodeReviewer reviews only after Tester PASS and verifies the PR contains exactly one parent story.
10. Orchestrator moves parent and role subtasks to `Done` only after required role evidence and integration rules are satisfied.

## Manual Board Recovery

If work starts while the parent story or Developer subtask is still `Todo`:

1. Stop implementation.
2. Move only the currently eligible parent story and Developer subtask to `In Progress`.
3. Leave dependent stories in `Todo` with a blocking comment.
4. Add a structured recovery comment to the Developer subtask.
5. Split or discard changes if one branch contains multiple parent stories.

## Views

### Active Sprint

- Filter: Status = `In Progress`
- Sort by: Phase, then Priority

### Phase Backlog

- Filter: Phase = active phase and Status = `Todo`
- Sort by: Priority, then Created

### Blocked Work

- Filter: Status = `In Progress` plus `Blocked` label or structured blocking comments.

## Agent Board Workflows

### Orchestrator

```text
1. Discover board fields and Status options.
2. Verify parent story and role subtasks are present.
3. Pick one eligible Todo story.
4. Move parent story and Developer subtask to In Progress.
5. Route Developer.
6. Verify role evidence before Done.
```

### ProjectManager

```text
1. Create structured Markdown issues.
2. Add parent and subtasks to board as Todo.
3. Set Phase and Priority.
4. Re-query and return board evidence.
```

### Developer

```text
1. Verify parent and Developer subtask are In Progress.
2. Create feature/N-story-title.
3. Implement exactly one parent issue.
4. Update only Developer subtask.
5. Hand off to Tester.
```

### Tester

```text
1. Verify board state and exact SHA.
2. Run required gates independently.
3. Update only Tester subtask with PASS, FAIL, or BLOCKED.
```

### CodeReviewer

```text
1. Verify Tester PASS for the reviewed SHA.
2. Verify PR references one parent issue and targets development.
3. Run review and security checklist.
4. Update only Reviewer subtask and PR review/comment.
```

## Best Practices

1. Every issue gets Phase and Priority fields.
2. Every PR references exactly one issue with `closes #N`.
3. Status field is the source of truth; labels do not replace workflow state.
4. Never rely on commit auto-move. Orchestrator verifies board state before source edits.
5. Board review happens before phase advancement.
