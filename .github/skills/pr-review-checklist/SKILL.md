---
name: pr-review-checklist
description: "Structured 5-axis code review checklist for the CodeReviewer agent. Use when: reviewing a pull request, evaluating developer implementation, producing a code review report, running adversarial review against a user story."
argument-hint: "PR branch name or description of the implementation to review"
---

# PR Review Checklist

Produces a structured, adversarial code review across 5 axes. Used exclusively by the CodeReviewer agent, which is **read-only** — this skill produces findings only, never patches.

## When to Use
- CodeReviewer receiving work from Developer
- Orchestrator requesting a review verdict before phase advance
- Ad-hoc review of any implementation

## Procedure

1. **Read the user story** — find the GitHub issue number in the commit message or context; read the acceptance criteria
2. **Read all changed files** — use `read_file` and `search` only (no edits)
3. **Run each axis review** (see below)
4. **Run security-audit skill** as axis 5
5. **Produce the review report** using the [review template](./templates/review-template.md)
6. **Deliver verdict**: APPROVE or REQUEST_CHANGES

## Review Axes

### Axis 1 — Correctness
- Does the implementation match ALL acceptance criteria in the user story?
- Are edge cases handled (empty input, null values, API errors)?
- Does error handling return the correct HTTP status codes?
- Are TypeScript types correct — no `any`, no `!` assertions?

### Axis 2 — Architecture Alignment
- Does the code follow the patterns in `copilot-instructions.md`?
- Are Server vs Client components used correctly?
- Is Zod validation present at the API boundary?
- Does it respect the queue architecture (BullMQ job for image gen, not inline)?
- Are auth and ownership checks enforced server-side before data access?

### Axis 3 — Security
- Invoke the `security-audit` skill — report all findings
- Additional check: does this change introduce any new data exposure?

### Axis 4 — Test Coverage
- Are tests present for all new logic?
- Do tests mock all external APIs/dependencies (OpenAI, Stripe, database wrapper, queue/storage clients)?
- Would the tests catch a regression if the implementation changed?
- Are error paths tested (not just happy path)?

### Axis 5 — Performance & Maintainability
- No N+1 database queries
- No synchronous blocking of the Node.js event loop (no `sleep`, no blocking loops)
- Functions under ~50 lines; files under 300 lines
- No duplicated logic that should be extracted

## Adversarial Mindset
- **Challenge every assumption** — if something looks right, ask: "what would break it?"
- Look for: missing error handling, untested edge cases, implicit trust of user input
- Ask: "could a user access another user's data through this code?"

## Output
Load and fill: [review-template.md](./templates/review-template.md)
