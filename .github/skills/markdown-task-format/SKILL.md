---
name: markdown-task-format
description: "Ensures every GitHub issue, parent story, and role subtask is written as structured Markdown with consistent sections and checklists."
argument-hint: "Task description or issue body"
---

# Markdown Task Format

All story and subtask descriptions in this repository must be Markdown. This applies to parent stories, role subtasks, refinement issues, PR descriptions, and evidence updates.

## Parent Story Required Sections

```markdown
# [Story Title]

## Product Context

## User Story

## Acceptance Criteria

## Technical Notes

## Required Role Subtasks

## Definition of Done
```

## Role Subtask Required Sections

```markdown
# [Role] Task: [Short Title]

## Parent Story

## Role Responsibility

## Inputs

## Required Work

## Output / Evidence

## Status Updates

## Done Checklist
```

## Evidence Update Required Sections

```markdown
## Status

PASS | FAIL | BLOCKED | APPROVE | REQUEST_CHANGES

## Evidence

- ...

## Commands / Links

- ...

## Follow-up

- ...
```

## Rules

- Use headings, lists, and checklists.
- Avoid unstructured paragraphs as the only story or subtask body.
- Include links to parent story, PR, branch, commits, and board items where applicable.
- Include exact role ownership.
- Include enough context for a human developer or reviewer who has not seen the conversation.
- Do not include secrets, tokens, or private credentials.
