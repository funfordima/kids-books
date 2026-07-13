---
name: github-wiki-knowledge-base
description: "Plan, initialize, and maintain the GitHub Wiki as a Markdown knowledge base for project requirements, decisions, rationale, architecture, workflows, and durable SDLC context."
argument-hint: "Wiki update request, project decision, or SDLC milestone"
---

# GitHub Wiki Knowledge Base

Use this skill when project knowledge needs to be preserved in the GitHub Wiki.

The Wiki is for durable human-readable knowledge. It complements but does not replace:

- GitHub Projects board for status.
- GitHub issues for parent stories and subtasks.
- Pull requests for code review and merge discussion.
- Repository docs for executable governance/specifications.

## Required Inputs

- Assigned WikiCurator subtask.
- Relevant source docs, issues, PRs, and commits.
- `docs/WIKI_KNOWLEDGE_BASE_SPEC.md`.
- GitHub Wiki state.

## Procedure

1. Verify GitHub Wiki is enabled.
2. Check whether `https://github.com/funfordima/kids-books.wiki.git` exists.
3. If the wiki repo does not exist, create the initial `Home.md` page through the GitHub UI or by the first supported wiki commit flow.
4. Clone or update the wiki repo locally when available.
5. Create or update Markdown pages from the approved page map.
6. Include source links to issues, PRs, commits, and repository docs.
7. Commit wiki changes with concise messages.
8. Update the WikiCurator subtask with page links and evidence.

## Recommended Page Map

- `Home.md` - index, current status, key links.
- `Project-Overview.md` - product vision, target users, business model.
- `Requirements.md` - functional and non-functional requirements summary.
- `Architecture.md` - system architecture and major components.
- `Agent-Workflow.md` - Orchestrator, ProjectManager, Developer, Tester, CodeReviewer, WikiCurator responsibilities.
- `Decision-Log.md` - dated decisions, rationale, alternatives, source links.
- `SDLC-Progress.md` - phase summaries and links to board/PRs.
- `Setup-And-Access.md` - GitHub token access, branch model, local setup notes.
- `_Sidebar.md` - navigation.

## Update Triggers

WikiCurator must be assigned after:

- A major product requirement changes.
- A major architecture decision is made.
- A governance/workflow rule changes.
- A phase completes.
- A feature PR merges into `development`.
- A blocker or important operational lesson is discovered.

## Markdown Rules

- Use headings, lists, and tables where useful.
- Link to source-of-truth artifacts.
- Include decision dates.
- Keep pages concise; prefer links over duplicating long issue/PR content.
- Never include secrets, credentials, private tokens, or sensitive child/family details.

## Output

```text
=== Wiki Knowledge Base Report ===
Result: UPDATED | NO_CHANGE | BLOCKED

Wiki state:
- enabled:
- repo exists:

Pages changed:
- ...

Source links:
- ...

Next update trigger:
- ...
```
