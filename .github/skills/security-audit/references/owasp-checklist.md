# OWASP Security Checklist — AI Children's Book Generator

Project-specific security requirements derived from SDLC_PLAN.md Phase 2 Security Design.

## A01 — Broken Access Control

| Check | Where to Verify | Pass Condition |
|-------|----------------|----------------|
| All API routes authenticate the user | `src/app/api/**/*.ts` | Every handler calls `supabase.auth.getUser()` |
| Middleware protects all private routes | `middleware.ts` | Matches `/dashboard`, `/create`, `/book/[id]`, `/account` |
| RLS enabled on all tables | `supabase/migrations/*.sql` | `ENABLE ROW LEVEL SECURITY` + `auth.uid() = user_id` policy on `books`, `pages`, `subscriptions` |
| Cross-user access blocked | Query patterns | No `select * from books` without user filter |

## A02 — Cryptographic Failures

| Check | Pattern to Search | Pass Condition |
|-------|------------------|----------------|
| No secrets in client bundle | `"use client"` files | No `OPENAI_API_KEY`, `SERVICE_ROLE`, `STRIPE_SECRET`, `WEBHOOK_SECRET` |
| No hardcoded keys in source | All `.ts` files | No `sk-`, `whsec_`, `rk_live_`, `service_role` literals |
| HTTPS enforced | Vercel config | `next.config.ts` has HSTS headers or Vercel enforces HTTPS |

## A03 — Injection

| Check | Where to Verify | Pass Condition |
|-------|----------------|----------------|
| Zod validation on all API inputs | `src/app/api/**/*.ts` | Every POST/PUT handler has `schema.safeParse(body)` before logic |
| No SQL string interpolation | All Supabase queries | No `` .eq(`column`, `${userInput}`) `` without SDK escaping |
| Moderation API on AI output | `src/app/api/generate-story/` | `openai.moderations.create()` called before `supabase.insert()` |

## A07 — Authentication Failures

| Check | Where to Verify | Pass Condition |
|-------|----------------|----------------|
| JWT in httpOnly cookie | Supabase SSR client init | `createServerClient` with cookie handlers, not localStorage |
| No token in localStorage | Client components | No `localStorage.setItem('token', ...)` |
| Session refresh handled | Middleware or layout | `supabase.auth.getUser()` used (refreshes automatically) |

## A09 — Logging Failures

| Check | Where to Verify | Pass Condition |
|-------|----------------|----------------|
| No PII in logs | `src/app/api/**`, `src/lib/**` | No `console.log(user.email)`, `console.log(child_name)`, etc. |
| No story content in logs | AI service files | Story text not logged to stdout |
| Sentry used for errors | Error boundaries + catch blocks | `Sentry.captureException(err)` present in critical paths |

## Content Safety

| Check | Where to Verify | Pass Condition |
|-------|----------------|----------------|
| Moderation before DB write | `src/app/api/generate-story/` | `moderations.create()` precedes any `supabase.insert()` |
| 422 on flagged content | Same file | Returns `422` response, does NOT proceed to DB write |
| Moderation error handled | Same file | `try/catch` around moderation call, fails safe (blocks generation) |

## COPPA

| Check | Where to Verify | Pass Condition |
|-------|----------------|----------------|
| No child user accounts | Auth flow | Only parent accounts; no child `users` rows |
| Child data as config only | DB schema | Child name/age stored in `books.config` JSONB, not as separate table |
| No child PII in separate storage | Supabase Storage | No `child-profiles/` bucket |
