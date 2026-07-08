# GitHub Projects Board — Setup Instructions

## Overview

DarkFactory agents work with a **GitHub Projects v2 board** as the canonical source of truth for work items and progress tracking. The board provides real-time visibility into which stories are backlog, in progress, in review, or done.

## Quick Setup (5 minutes)

### Step 1: Create the GitHub Project

1. Go to your repository on GitHub
2. Click **Projects** tab
3. Click **New project**
4. Select **Table** (v2 format)
5. Name: `DarkFactory SDLC`
6. Description: `AI Children's Book Generator — multi-agent SDLC pipeline`
7. Click **Create**

### Step 2: Set Up Columns (Status Field)

The board uses a **Status** field to track workflow state:

| Status | Meaning |
|--------|---------|
| Backlog | Created, waiting to be planned |
| Ready for Dev | ANALYZE + DESIGN approved, Developer can start |
| In Progress | Developer is actively implementing |
| In Review | PR created, CodeReviewer is checking |
| Changes Requested | CodeReviewer returned feedback, Developer fixing |
| Done | CodeReviewer approved, phase gate clear |

**Setup**:
1. Click the **+** at the top right of the board
2. Select **Status** → it creates a dropdown field
3. Add options: Backlog, Ready for Dev, In Progress, In Review, Changes Requested, Done

### Step 3: Set Up Custom Fields

Create these additional fields (click **Settings** → **Custom fields**):

| Field Name | Type | Options/Values |
|-----------|------|----------------|
| Phase | Single select | Phase 1, Phase 2, Phase 3, Phase 4, Phase 5, Phase 6 |
| Priority | Single select | P0, P1, P2 |
| PR Link | Text | (free text, auto-filled by GitHub Actions) |

### Step 4: Configure Table View

1. Go back to the board
2. Click **Settings** → **Column layout**
3. Reorder columns to: Status, Phase, Priority, PR Link, Assignees, Created
4. Hide unnecessary columns (Updates, Repository, etc.)

### Step 5: Create a Default View ("Active Sprint")

1. Click **View** dropdown → **New view**
2. Name: `Active Sprint`
3. Filter: `Status is not Backlog AND Status is not Done`
4. Sort by: Phase (ascending), then Priority (ascending P0 → P2)
5. Save

### Step 6: Add GitHub Actions Automation

The `.github/workflows/board-automation.yml` file (already created) provides:
- Auto-link PRs to issues when PR description includes `closes #N`
- Auto-close issues when PR merges
- Auto-add commit comments with issue reference

**Verify it's working**:
```bash
# After the first PR is created and merged:
# - Issue should auto-close
# - PR link should appear in issue body
```

## Using the Board with Agents

### ProjectManager Workflow
```
1. Create GitHub issue with user-story-format template
2. Add to board: Status = Backlog
3. Set fields: Phase = N, Priority = P0/P1/P2
4. Done ✓
```

### Orchestrator Workflow
```
1. Query board: show me "Ready for Dev" issues
2. Move issue: Status = "In Progress" + assign to Developer
3. Monitor: track issues across columns
4. On phase complete: verify all issues in "Done" before advancing
```

### Developer Workflow
```
1. Read issue from board (Status = "In Progress")
2. Create branch: feature/42-story-title
3. Commit: feat: message (#42)
4. Create PR: include "closes #42" in description
5. On merge: issue auto-closes → board auto-updates to "Done"
```

### CodeReviewer Workflow
```
1. Query board: find "In Review" issues
2. Review code
3. Return: APPROVE (move to Done) or REQUEST_CHANGES (move to "Changes Requested")
```

## Dashboard / Reporting

### View 1: Active Work
Filter: `Status is not Backlog AND Status is not Done`
Shows: Everything currently being worked on

### View 2: Phase 3 Backlog
Filter: `Phase is 3 AND Status is Backlog`
Shows: Next planned work

### View 3: Blocked
Filter: `Status is "Changes Requested"`
Shows: Issues awaiting developer fixes

### View 4: Ready to Ship
Filter: `Status is "Done" AND Phase is [current]`
Shows: Completed work in current phase

## Common Workflows

### "What should I work on next?"
1. Open the **Active Sprint** view
2. Look for "Ready for Dev" issues
3. Orchestrator will also tell you

### "Is this phase ready to advance?"
1. Open the board
2. Filter by current Phase
3. Verify ALL issues in "Done" column
4. Run VERIFY phase prompt

### "Track a PR through review"
1. Create PR with `closes #N`
2. Issue automatically links and moves to "In Review"
3. CodeReviewer reviews, moves to "Done" or "Changes Requested"
4. On merge, issue auto-closes

## GitHub MCP Integration

The `.vscode/mcp.json` already includes the GitHub MCP server. This allows agents to:

```
@github list issues status:ready-for-dev
@github move issue 42 to Done
@github create issue "title" in phase 3 with priority p1
@github link pr 100 to issue 42
```

## Troubleshooting

### Issue not auto-closing on PR merge?
- Verify PR description includes `closes #42` (not just `#42`)
- Verify you merged the PR (not just closed it)
- GitHub Actions may take 5-10 seconds to run

### PR link not appearing in issue?
- Verify `.github/workflows/board-automation.yml` is committed to `main`
- Check the Actions tab to see if the workflow ran
- Manually add the link by editing the issue

### Board columns not showing?
- Go to Settings → Custom fields → verify Status field is set up
- Refresh the page
- Try creating a test issue to trigger field creation

## Best Practices

1. **Every issue must have a Phase** — if missing, ask ProjectManager to add it
2. **Every PR must reference an issue** — use `closes #N` in description
3. **Status is the source of truth** — don't rely on issue labels for workflow state
4. **Commit with issue number** — helps with board automation
5. **Move issues between statuses via Orchestrator** — keep it consistent
