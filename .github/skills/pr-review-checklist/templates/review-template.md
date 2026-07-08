# Code Review Report

**Story / PR**: #[issue number] — [story title]
**Reviewer**: @code-reviewer (read-only, DarkFactory)
**Date**: [date]
**Branch**: [branch name]

---

## Axis 1 — Correctness

**Verdict**: PASS | WARN | FAIL

| AC | Status | Notes |
|----|--------|-------|
| AC-1: [description] | ✅ / ⚠️ / ❌ | [evidence: file:line] |
| AC-2: [description] | ✅ / ⚠️ / ❌ | [evidence: file:line] |
| AC-3: [description] | ✅ / ⚠️ / ❌ | [evidence: file:line] |
| AC-4 error case: [description] | ✅ / ⚠️ / ❌ | [evidence: file:line] |

**Findings**:
- [specific finding with file:line reference]

---

## Axis 2 — Architecture Alignment

**Verdict**: PASS | WARN | FAIL

- [ ] Server/Client component split correct
- [ ] Zod validation at API boundary
- [ ] Supabase client used correctly (SSR vs browser)
- [ ] Queue architecture followed (BullMQ for async)
- [ ] Environment variables used correctly (no secrets in client)

**Findings**:
- [specific finding with file:line reference]

---

## Axis 3 — Security

**Verdict**: PASS | WARN | FAIL

*(See security-audit output below)*

**Security Audit Summary**:
- A01 Access Control: PASS / FAIL — [note]
- A02 Cryptographic: PASS / FAIL — [note]
- A03 Injection: PASS / FAIL — [note]
- A07 Auth: PASS / FAIL — [note]
- A09 Logging: PASS / FAIL — [note]
- Content Safety: PASS / FAIL — [note]
- COPPA: PASS / FAIL — [note]

**Critical Findings** (must fix before approval):
- [finding: file:line]

---

## Axis 4 — Test Coverage

**Verdict**: PASS | WARN | FAIL

- [ ] Tests present for all new logic
- [ ] External APIs mocked (OpenAI, Stripe, Supabase)
- [ ] Error paths tested (not just happy path)
- [ ] Tests would catch regressions

**Findings**:
- [specific finding]

---

## Axis 5 — Performance & Maintainability

**Verdict**: PASS | WARN | FAIL

- [ ] No N+1 database queries
- [ ] No blocking event loop operations
- [ ] Functions ≤50 lines, files ≤300 lines
- [ ] No duplicated logic

**Findings**:
- [specific finding with file:line reference]

---

## Summary

| Axis | Verdict |
|------|---------|
| Correctness | ✅ PASS / ⚠️ WARN / ❌ FAIL |
| Architecture | ✅ PASS / ⚠️ WARN / ❌ FAIL |
| Security | ✅ PASS / ⚠️ WARN / ❌ FAIL |
| Tests | ✅ PASS / ⚠️ WARN / ❌ FAIL |
| Performance | ✅ PASS / ⚠️ WARN / ❌ FAIL |

## Required Changes (must fix before APPROVE)
1. [CRITICAL] [description] — [file:line]
2. [CRITICAL] [description] — [file:line]

## Suggestions (non-blocking)
- [SUGGESTION] [description] — [file:line]

---

## Final Verdict

### ✅ APPROVED
> All axes pass. Implementation matches all acceptance criteria. Ready for phase gate check.

### ❌ REQUEST_CHANGES
> N critical issues require resolution before this work can be approved. See "Required Changes" above.
> Developer must address all CRITICAL items and request re-review.
