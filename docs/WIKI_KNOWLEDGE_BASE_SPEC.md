# Wiki Knowledge Base Specification

Last updated: 2026-07-12

## Purpose

The GitHub Wiki should preserve durable, human-readable project knowledge:

- Product requirements and product rationale.
- Architectural decisions and tradeoffs.
- Agent workflow and operating rules.
- SDLC phase progress and important links.
- Setup/access notes that help future contributors understand the project.

The Wiki is not a replacement for the GitHub Projects board, issues, PRs, or repository docs.

## Current State

- Repository: `funfordima/kids-books`
- Wiki feature: enabled
- Wiki repo state: not initialized yet; `kids-books.wiki.git` does not exist until the first wiki page is created.
- Required format: Markdown

## Responsible Agent

The responsible role is **WikiCurator**.

WikiCurator owns wiki initialization, page structure, updates, and freshness checks. Other agents may request wiki updates, but they do not directly own wiki content.

## Required Skill

Use `.github/skills/github-wiki-knowledge-base/SKILL.md`.

Related skills:

- `markdown-task-format`
- `spec-driven-feature-lifecycle`
- `feature-refinement`

## Source Of Truth Boundaries

| Artifact | Source of truth for |
|----------|---------------------|
| GitHub Projects board | Work status and progress |
| GitHub issues | Parent stories, subtasks, acceptance criteria, role evidence |
| Pull requests | Code review, implementation discussion, merge history |
| Repository docs | Executable governance, specifications, agent rules |
| GitHub Wiki | Human-readable project memory, summaries, decisions, rationale |

Wiki pages must link back to source artifacts instead of duplicating long records.

## Initial Page Map

| Page | Purpose |
|------|---------|
| `Home.md` | Index, current project links, status summary |
| `Project-Overview.md` | Product vision, users, business model |
| `Requirements.md` | Functional and non-functional requirements summary |
| `Architecture.md` | System architecture, services, data/storage/queue overview |
| `Agent-Workflow.md` | Agent roles, branch model, board workflow |
| `Decision-Log.md` | Dated decisions, rationale, alternatives, links |
| `SDLC-Progress.md` | Phase summaries, board links, PR links |
| `Setup-And-Access.md` | GitHub access, token auth, local setup notes |
| `_Sidebar.md` | Wiki navigation |

## Update Triggers

Orchestrator must create or assign a WikiCurator subtask when:

- Product requirements materially change.
- Architecture changes.
- Agent workflow/governance changes.
- A major feature merges into `development`.
- An SDLC phase completes.
- A blocker becomes important project knowledge.
- A decision is made that future contributors need to understand.

## Wiki Update Workflow

1. Orchestrator creates or routes a WikiCurator subtask.
2. WikiCurator reads source artifacts.
3. WikiCurator updates Markdown wiki pages.
4. WikiCurator commits wiki changes to the wiki repository.
5. WikiCurator updates its subtask with page links and evidence.
6. Orchestrator verifies wiki update evidence before closing the parent story if wiki update was required.

## Required Wiki Page Standards

- Markdown only.
- Clear headings.
- Dated decisions.
- Links to issues, PRs, commits, and docs.
- Concise summaries; avoid copying full issue or PR bodies.
- No secrets, credentials, tokens, or sensitive child/family data.
- No status claims that conflict with the board.

## First Initialization Recommendation

The first WikiCurator implementation should initialize:

- `Home.md`
- `Agent-Workflow.md`
- `Decision-Log.md`
- `_Sidebar.md`

Then later feature work can expand the product and architecture pages.

## References

- GitHub Docs: About wikis - https://docs.github.com/en/communities/documenting-your-project-with-wikis/about-wikis
- GitHub Docs: Adding or editing wiki pages - https://docs.github.com/en/communities/documenting-your-project-with-wikis/adding-or-editing-wiki-pages
