---
name: github-board-setup
description: "GitHub Projects (board) setup guide for DarkFactory. Creates and configures a GitHub Project board with SDLC phase columns, automation rules, and PR linking. Use when: setting up a new repository, initializing the board for the first time, understanding board workflows, configuring GitHub Actions for automation."
---

# GitHub Projects Board Setup

The DarkFactory agents work with a **GitHub Projects board** as the canonical source of stories and progress tracking.

## Board Structure

### Project Type
- **Project format**: GitHub Projects v2 (table view)
- **Visibility**: Public (recommended) or Private (if sensitive)
- **Link**: `/projects/N` in the repository

### Column Structure (Status Field)

| Column | When Story Moves Here | Agent Responsibility |
|--------|---------------------|---------------------|
| **Backlog** | Created but not assigned | ProjectManager (initial creation) |
| **Ready for Dev** | ANALYZE phase complete, DESIGN approved | Orchestrator (handoff trigger) |
| **In Progress** | Developer starts implementation | Developer (auto-move on commit or manual) |
| **In Review** | quality-gate-check PASS, sent to CodeReviewer | CodeReviewer (receives work) |
| **Changes Requested** | CodeReviewer returns REQUEST_CHANGES | Developer (manual move + fix) |
| **Done** | CodeReviewer APPROVE + VERIFY phase clear | Orchestrator (phase gate pass) |

### Custom Fields (in addition to Status)

| Field | Type | Purpose |
|-------|------|---------|
| Phase | Single select | Maps to SDLC_PLAN.md phase (Phase 1–6) |
| Priority | Single select | P0 (blocking) / P1 (current) / P2 (next) |
| Story Points | Number | Optional: complexity estimate |
| PR Link | Text | URL to the pull request (auto-filled by GitHub Actions) |

## Setup Steps

### 1. Create the GitHub Project

```bash
# Via GitHub UI:
# 1. Go to Repository → Projects tab
# 2. Click "New project"
# 3. Select "Table" template
# 4. Name: "DarkFactory SDLC"
# 5. Description: "AI Children's Book Generator — Phase-driven development"
```

### 2. Configure Columns & Fields

**Default view columns**:
- Status (select from list above)
- Phase (Phase 1–6)
- Priority (P0, P1, P2)
- PR Link (text field for URL)
- Assignees
- Created date

### 3. Automation Rules (GitHub Actions)

Create `.github/workflows/board-automation.yml`:

```yaml
name: Board Automation

on:
  pull_request:
    types: [opened, ready_for_review, converted_to_draft]
  issues:
    types: [opened]
  workflow_dispatch:

jobs:
  link-pr-to-issue:
    runs-on: ubuntu-latest
    steps:
      - name: Link PR to board issue
        uses: actions/github-script@v6
        with:
          script: |
            const pr = context.payload.pull_request;
            if (!pr) return;
            
            // Extract issue number from PR description or branch name
            const issueMatch = pr.body?.match(/#(\d+)/) || pr.head.ref.match(/#(\d+)/);
            if (!issueMatch) return;
            
            const issueNumber = parseInt(issueMatch[1]);
            const issue = await github.rest.issues.get({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: issueNumber
            });
            
            // Add PR link to issue body if not present
            if (!issue.data.body?.includes(pr.html_url)) {
              const newBody = (issue.data.body || '') + `\n\n**PR**: [${pr.number}](${pr.html_url})`;
              await github.rest.issues.update({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: issueNumber,
                body: newBody
              });
            }

  update-board-status:
    runs-on: ubuntu-latest
    steps:
      - name: Update board when PR opened
        uses: actions/github-script@v6
        with:
          script: |
            const pr = context.payload.pull_request;
            if (!pr) return;
            
            // Fetch associated issue
            const issueMatch = pr.body?.match(/#(\d+)/) || pr.head.ref.match(/#(\d+)/);
            if (!issueMatch) return;
            
            const issueNumber = parseInt(issueMatch[1]);
            // Note: Direct board updates require GraphQL; implement via GitHub Projects API
```

### 4. Manual Setup (Current Workaround)

Until full GitHub Actions automation is in place:

1. **When issue is created**: ProjectManager adds to board in "Backlog"
2. **When moving to "Ready for Dev"**: Orchestrator moves column, assigns to @Developer
3. **When PR opened**: Developer includes `closes #N` in PR description
4. **When PR links issue**: GitHub auto-adds "PR" field link
5. **When PR merged**: Issue auto-closes (if PR description had `closes #N`), moves to "Done"

### 5. Board Filters & Views

**View 1: Active Sprint**
- Filter: Status ≠ Backlog AND Status ≠ Done
- Sort by: Phase, then Priority (P0 → P2)
- Purpose: What the team is currently working on

**View 2: Phase 3 Backlog**
- Filter: Phase = 3 AND Status = Backlog
- Sort by: Priority, then Created
- Purpose: Planning next sprint

**View 3: Blocked Issues**
- Filter: Status = "Changes Requested" OR custom "Blocked" label
- Sort by: Priority
- Purpose: Issues waiting for developer fixes

## Agent Board Workflows

### Orchestrator
```
1. Load board via GitHub MCP
2. Filter: Status = "Ready for Dev", Phase = Active
3. List to user: "Next 3 stories ready to build"
4. On task complete: move issue → "Done" via GitHub Projects API
```

### ProjectManager
```
1. Create GitHub issue with user-story-format template
2. Auto-add to board: Status = "Backlog"
3. Set: Phase, Priority fields
4. Return: issue URL to Orchestrator
```

### Developer
```
1. Read issue from board (Status = "In Progress")
2. Create branch: feature/N-story-title (N = issue number)
3. Implement + tests
4. Create PR with: "closes #N" in description
5. Merge → issue auto-closes + board auto-updates
```

### CodeReviewer
```
1. Find issues in "In Review" column
2. Run review checklist
3. Return: APPROVE → move to "Done", or REQUEST_CHANGES → move to "Changes Requested"
```

## GitHub MCP Configuration

The GitHub MCP tool (already in `.vscode/mcp.json`) provides:
- Query issues/PRs/projects
- Create/update issues
- Link PRs to issues
- Move issues between columns (via GraphQL)

Example query:
```
@github list issues in digital-ggods repo with label:darkfactory and status:ready-for-dev
```

## Best Practices

1. **Every issue gets a Phase label** — required, not optional
2. **Every PR references an issue** — include `closes #N` or `fixes #N` in description
3. **Status field is the source of truth** — don't rely on issue labels for workflow state
4. **Auto-move to "In Progress" on commit** — Developer commits with `#N` in message → webhook updates board
5. **Board review before phase advance** — Verify all "In Review" issues are approved before marking phase complete
