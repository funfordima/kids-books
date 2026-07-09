# User Story Template

**Title**: [Concise feature name, ≤80 chars]
**Phase**: Phase N — [Phase Name]
**Priority**: P0 / P1 / P2
**Labels**: `darkfactory`, `phase-N`, `story`, `P1`

---

## User Story

> As a **[user type]**,
> I want to **[goal / capability]**,
> so that **[benefit / value delivered]**.

---

## Acceptance Criteria

- [ ] **AC-1**: Given [precondition], When [action], Then [observable result]
- [ ] **AC-2**: Given [precondition], When [action], Then [observable result]
- [ ] **AC-3**: Given [precondition], When [action], Then [observable result]
- [ ] **AC-4 (error case)**: Given [invalid condition], When [action], Then [error handling behavior]

---

## Technical Notes

> Stack-specific constraints, implementation hints, and dependencies.

- Must use: [relevant tech, e.g. backend ownership checks, Zod validation, BullMQ queue]
- Depends on: [prior story or infrastructure that must exist first]
- References: [relevant section of SDLC_PLAN.md]

---

## Definition of Done

- [ ] TypeScript compiles clean (`tsc --noEmit` exits 0)
- [ ] Unit tests written and passing for all new logic
- [ ] Vitest coverage ≥ 65% maintained (run `npx vitest run --coverage`)
- [ ] All external APIs/dependencies mocked in tests (OpenAI, Stripe, DB wrapper, queue/storage)
- [ ] Code reviewed by `@code-reviewer` agent
- [ ] Security checklist passed (see `security-audit` skill)
- [ ] No `console.log` in production code paths
- [ ] No secrets in source code
- [ ] Committed to git with message referencing this issue (`closes #N`)
