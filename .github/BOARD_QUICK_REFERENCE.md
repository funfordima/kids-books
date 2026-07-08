# Agent Quick Reference — GitHub Board State Transitions

This table shows how each agent transitions issues between board columns and which tools they use.

## Board State Machine

```
Backlog → Ready for Dev → In Progress → In Review → Done
  ↑           ↑              ↑              ↑         ↑
  PM          Orch           Dev           CReview   CReview
             (assign)       (create PR)   (move)    (move)
```

## Agent State Transition Matrix

| Agent | Current Status | Action | Next Status | Tool | Evidence |
|-------|---|--------|-----|------|----------|
| **ProjectManager** | — | Create issue + add to board | Backlog | GitHub MCP | Issue URL returned |
| **Orchestrator** | Backlog | Run ANALYZE + DESIGN | Ready for Dev | GitHub MCP | Move issue, assign to Developer |
| **Developer** | Ready for Dev | Start implementation | In Progress | Git (branch) + GitHub MCP | Branch named `feature/N-title` |
| **Developer** | In Progress | Create PR with `closes #N` | In Review | GitHub MCP + PR URL | PR linked in issue, GitHub Actions auto-moves |
| **CodeReviewer** | In Review | Run review checklist + security-audit | Done | GitHub MCP (comment) | APPROVE comment + move to Done |
| **CodeReviewer** | In Review | REQUEST_CHANGES | Changes Requested | GitHub MCP (comment) | REQUEST_CHANGES comment + move column |
| **Developer** | Changes Requested | Re-implement + rerun quality-gate | In Review | Git + GitHub MCP | New commit with `(#N)` + quality gate PASS |
| **Orchestrator** | Done (all phase issues) | Verify gate + mark phase complete | — | SDLC_PLAN.md update | Checklist item checked, commit made |

## Branch Naming Convention

**Format**: `feature/N-story-title`

Examples:
```
feature/1-setup-monorepo
feature/42-story-generation-service
feature/99-e2e-book-flow-test
```

The number is auto-extracted for GitHub Actions automation.

## Commit Message Convention

**Format**: `[type]: [description] (#N)`

Examples:
```
feat: implement GPT-4o story generation (#42)
test: add moderation API tests (#42)
fix: handle rate limit errors in image queue (#42)
refactor: extract story builder to lib/story/ (#42)
```

The `#N` is recognized by GitHub Actions to comment on the issue and trigger board automation.

## PR Description Template

```markdown
[Story title]

Implements [user story summary]

## Changes
- [what was built]
- [what was tested]

## Testing
- [how to test]
- [coverage gained]

Closes #42
```

The `Closes #42` line auto-closes the issue on merge.

## GitHub Actions Automation Timeline

| Event | Trigger | Action | Time |
|-------|---------|--------|------|
| PR opens | Developer creates PR with `closes #42` | Workflow: link-pr-to-issue | ~10s |
| — | Workflow completes | Issue now shows PR link | ~10s |
| PR merges | `closes #42` recognized | Workflow: auto-close-on-merge | ~30s |
| — | Issue closes | Board moves to Done | Auto |

## Quick Checks

**Before starting a story**:
```
Is the issue in "Ready for Dev" status?
Do you have the issue number memorized? (e.g., 42)
```

**Before creating a PR**:
```
Are there tests for all new logic?
Does tsc --noEmit exit 0?
Does vitest --coverage show ≥ 65%?
Is your PR description using "closes #N"?
```

**Before marking a phase complete**:
```
Are all phase issues in "Done" on the board?
Does docs/SDLC_PLAN.md show all phase checkboxes marked [x]?
Have all quality gates passed?
```

## Common Board Queries (via GitHub MCP)

```
# Show me backlog for current phase
@github list issues status:backlog phase:3

# Show me everything in progress
@github list issues status:in-progress

# Show me issues needing review
@github list issues status:in-review

# Show me blocked issues
@github list issues status:changes-requested

# Move an issue to Done
@github move issue 42 to done

# Link a PR to an issue
@github link pr 100 to issue 42
```

## Troubleshooting Board Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| Issue not moving on PR creation | PR description missing `closes #42` | Edit PR description to include `closes #N` |
| PR link not appearing on issue | GitHub Actions not running | Check `.github/workflows/board-automation.yml` committed to main |
| Issue stays in "Done" after re-opening | Manual override needed | Manually change Status field back to appropriate column |
| Developers can't see the board | Project not shared | Go to Project Settings → Access, add team members |
