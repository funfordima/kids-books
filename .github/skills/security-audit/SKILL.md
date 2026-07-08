---
name: security-audit
description: "Runs a project-specific OWASP Top 10 security audit against the current codebase. Use when: reviewing code for security issues, completing a code review, verifying a phase gate, before any deployment, checking COPPA compliance."
---

# Security Audit

Runs the project-specific OWASP Top 10 security checklist against the current implementation. Called by the CodeReviewer agent at the end of every review session.

## When to Use
- CodeReviewer completing a review (mandatory)
- Developer self-checking before requesting review
- Orchestrator verifying Phase 4 gate (security must be clean before deploy)

## Procedure

1. Load the [OWASP checklist](./references/owasp-checklist.md) for this project
2. For each check, search the relevant source files (use `grep_search` or `semantic_search`)
3. Record PASS / WARN / FAIL for each item with file+line evidence
4. Produce a final verdict

## Quick Checks (run these searches)

### A01 — Access Control
- Search for routes in `src/app/api/` that DON'T call `supabase.auth.getUser()`
- Verify `middleware.ts` exists and protects `/dashboard`, `/create`, `/book/[id]`, `/account`
- Verify all Supabase tables have RLS enabled in migrations

### A02 — Cryptographic Failures
- Search for: `OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY` — ensure NONE appear in `"use client"` files or `src/app/` client components
- Search for any hardcoded key patterns: `sk-`, `whsec_`, `rk_live_`

### A03 — Injection
- Search all API routes — verify each has `z.object(...)` Zod schema before processing input
- Check for any raw SQL string interpolation: `${` inside Supabase query strings

### A07 — Auth Failures
- Verify JWT stored in httpOnly cookie (check Supabase SSR client configuration)
- Verify no `localStorage.setItem` calls with tokens

### A09 — Logging Failures
- Search for `console.log` in `src/app/api/` and `src/lib/` — flag any that might log PII
- Verify Sentry is used for errors, not informational logging

### Content Safety
- Verify `/api/generate-story` calls `openai.moderations.create()` BEFORE writing to Supabase
- Check that moderation failure returns `422` and does NOT write to DB

### COPPA
- Verify no `children` table or equivalent storing child personal profiles
- Verify child data (name, age) is only stored inside `books.config` JSONB — not as a separate user record

## Output Format

```
=== Security Audit Report ===

A01 Broken Access Control:   PASS | WARN | FAIL
  Evidence: [file:line or "not found"]

A02 Cryptographic Failures:  PASS | WARN | FAIL
  Evidence: [file:line or "not found"]

A03 Injection:               PASS | WARN | FAIL
  Evidence: [file:line or "not found"]

A07 Auth Failures:           PASS | WARN | FAIL
  Evidence: [file:line or "not found"]

A09 Logging Failures:        PASS | WARN | FAIL
  Evidence: [file:line or "not found"]

Content Safety:              PASS | WARN | FAIL
  Evidence: [file:line or "not found"]

COPPA Compliance:            PASS | WARN | FAIL
  Evidence: [file:line or "not found"]

=== SECURITY VERDICT ===
PASS — no critical findings
  OR
FAIL — N critical findings, M warnings:
  CRITICAL: [description] at [file:line]
  WARN: [description] at [file:line]
```

## Severity Rules
- **FAIL** (any = block approval): exposed secret, missing auth on route, missing RLS, missing Moderation API call, SQL injection risk
- **WARN** (must be logged, may not block): `console.log` with possible PII, missing rate limiting, missing error boundary
- **PASS**: check confirmed, evidence found
