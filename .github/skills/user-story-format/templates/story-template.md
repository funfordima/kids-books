# User Story Template

All parent stories and subtasks must be written in Markdown.

**Title**: [Concise feature name, <=80 chars]  
**Phase**: Phase N - [Phase Name]  
**Priority**: P0 / P1 / P2  
**Labels**: `darkfactory`, `phase-N`, `story`, `P1`

---

## Product Context

Explain the feature in enough detail for a human developer who has not participated in refinement.

- Product problem:
- Expected user/system behavior:
- Primary user flow:
- Out of scope:
- Dependencies / predecessor stories:
- Feature refinement brief:

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
- [ ] **AC-4**: Given [precondition], When [action], Then [observable result]
- [ ] **AC-5 (failure path)**: Given [invalid or failure condition], When [action], Then [error handling behavior]

---

## Technical Notes

- Must use:
- Must not use:
- Depends on:
- References:
- Data/security constraints:
- Testing notes:
- Commit checkpoint plan:

---

## Required Role Subtasks

- [ ] **Developer subtask**: implement [specific scope], update only this subtask with commits and implementation notes.
- [ ] **Tester / QualityGate subtask**: run [specific gates], update only this subtask with command evidence and PASS/FAIL/BLOCKED.
- [ ] **CodeReviewer subtask**: review [specific PR/story], update only this subtask with APPROVE/REQUEST_CHANGES and findings.

---

## Definition of Done

- [ ] TypeScript compiles clean (`tsc --noEmit` exits 0)
- [ ] Unit tests written and passing for all new logic
- [ ] Vitest coverage >= 65% maintained
- [ ] Tester / QualityGate subtask is PASS
- [ ] Developer, Tester, and CodeReviewer subtasks are updated
- [ ] All external APIs/dependencies mocked in tests where applicable
- [ ] Security checklist passed
- [ ] No `console.log` in production code paths
- [ ] No secrets in source code
- [ ] Code reviewed by CodeReviewer agent
- [ ] PR targets `development`
- [ ] PR description includes `closes #N`
