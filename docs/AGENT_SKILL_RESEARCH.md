# Agent Skill Research

Last updated: 2026-07-12

This document records reusable agent-skill and spec-driven-development repositories reviewed for the DarkFactory workflow.

## Selection Criteria

- Strong alignment with spec-first or agent-team workflows.
- Clear Markdown artifacts that can be adapted into `.github/skills`.
- Good fit for GitHub Projects, issues, pull requests, and role-specific agents.
- No requirement to vendor unreviewed executable code.

## Reviewed Repositories

| Repository | Stars at review | Fit | Decision |
|------------|-----------------|-----|----------|
| `github/spec-kit` | 119,901 | Very high | Reuse concepts and local templates; do not vendor CLI yet |
| `OthmanAdi/planning-with-files` | 25,231 | Medium | Reuse durable Markdown planning idea through board/issues instead of adding another planning store |
| `SpillwaveSolutions/sdd-skill` | 85 | Medium | Reuse summary/status concepts; avoid direct dependency |
| `Priivacy-ai/spec-kitty` | 1,407 | Medium | Track as future option for Kanban/worktree ideas; not added now |
| `mxyhi/ok-skills` | 449 | Low/medium | Track as curated-skill reference; no direct import |
| `agent-sh/agnix` | 339 | Medium | Track as future validation/lint idea for `SKILL.md` and agent docs |

## Spec Kit Findings

Spec Kit is the best match for this project because it emphasizes:

- Specification before implementation.
- Product intent before technical plan.
- Explicit planning artifacts.
- Task generation from validated plans.
- Analysis/checklist steps before implementation.
- Project-local overrides and reusable templates.
- Role-oriented bundles.

Adopted locally:

- A `spec-driven-feature-lifecycle` skill for DarkFactory.
- Markdown-first task artifacts.
- Explicit feature refinement before user stories.
- Separate specification, plan, task, implementation, verification, and review responsibilities.

Not adopted yet:

- The `specify` CLI.
- `.specify/` generated project structure.
- External extensions/presets/bundles.

Reason: the project already has a GitHub-board-driven agent workflow. Adding the CLI before the governance contract stabilizes would create two competing sources of truth.

## Planning-With-Files Findings

The useful idea is durable Markdown state for long-running agent work. DarkFactory already uses GitHub issues, Projects, and `docs/PROJECT_STATE.md` as durable state, so adding a second file-plan system is unnecessary now.

Adopted locally:

- The rule that subtask descriptions and role updates must be Markdown and survive context loss.
- Board issues remain the canonical durable state.

## SDD Skill Findings

The useful ideas are:

- Summaries after workflow commands.
- Explicit rationale for major decisions.
- Feature status tracking.
- Brownfield support.

Adopted locally:

- Feature refinement brief.
- Role-specific evidence updates.
- Parent-story status remains separate from subtask status.

## Future Candidates

- Add a `skill-doc-lint` or validation skill inspired by `agent-sh/agnix`.
- Add a durable `feature-status-dashboard` if GitHub Projects becomes insufficient.
- Evaluate Spec Kit CLI after `development` contains the stable agent governance model.

## GitHub Wiki Research

GitHub Wiki is appropriate for durable project memory because GitHub documents it as a repository documentation area for long-form content such as project usage, design, and core principles. GitHub also supports editing wiki content locally through the separate `OWNER/REPO.wiki.git` repository once the first page exists.

Adopted locally:

- Added `WikiCurator` agent.
- Added `github-wiki-knowledge-base` skill.
- Added `docs/WIKI_KNOWLEDGE_BASE_SPEC.md`.
- Wiki is for human-readable summaries and decisions; board/issues/PRs remain the source of truth for live workflow state.

## Source Links

- https://github.com/github/spec-kit
- https://github.com/OthmanAdi/planning-with-files
- https://github.com/SpillwaveSolutions/sdd-skill
- https://github.com/Priivacy-ai/spec-kitty
- https://github.com/mxyhi/ok-skills
- https://github.com/agent-sh/agnix
- https://docs.github.com/en/communities/documenting-your-project-with-wikis/about-wikis
- https://docs.github.com/en/communities/documenting-your-project-with-wikis/adding-or-editing-wiki-pages
