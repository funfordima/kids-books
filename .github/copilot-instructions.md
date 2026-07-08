# AI Children's Book Generator — Project Instructions

## Tech Stack (always current)

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 App Router + TypeScript (strict) + Tailwind CSS |
| Story AI | OpenAI GPT-4o (structured JSON output) |
| Illustration AI | OpenAI DALL-E 3 (async, per page) |
| Job Queue | BullMQ + Upstash Redis |
| Queue Worker | Railway.app (Node.js, always-on) |
| Auth | Supabase Auth (email + Google OAuth, JWT in httpOnly cookie) |
| Database | Supabase PostgreSQL (RLS enforced on every table) |
| Asset Storage | Supabase Storage (book-images, book-pdfs buckets) |
| PDF | @react-pdf/renderer |
| Subscriptions | Stripe (recurring billing + webhooks) |
| Content Safety | OpenAI Moderation API (mandatory before DB write) |
| Deployment | Vercel (web) + Railway.app (worker) |
| Testing | Vitest + V8 coverage + Playwright (E2E) |
| Monitoring | Sentry + Vercel Analytics |

## DarkFactory Operating Mode

This project uses a **DarkFactory multi-agent SDLC pipeline**. All agents operate under these rules:

1. **GitHub Projects board is the canonical source of work** — all stories live as GitHub issues on the board
2. **SDLC plan is the governance model** — `docs/SDLC_PLAN.md` defines phases, gates, and phase advancement criteria
3. **Evidence-based gates** — no task is "done" without checkable proof: TypeScript compiles clean (`tsc --noEmit`), Vitest passes, coverage ≥ 65% (line + branch)
4. **Spec-driven** — implement only what is described in the active user story; do not add unsolicited features
5. **Independent review** — the CodeReviewer agent is read-only; it never edits source code
6. **Role separation** — no agent grades its own work
7. **Non-destructive** — commit to git at every gate checkpoint; never rewrite history
8. **Board automation** — GitHub Actions auto-links PRs to issues, auto-closes issues on merge, auto-adds commit comments

## Coding Conventions

### General
- TypeScript `strict: true` — no `any`, no `!` non-null assertions on unknown values
- Prettier + ESLint enforced (see `post-tool-use` hook)
- No `console.log` in production code; use structured logging or Sentry
- No secrets in source code — use environment variables only

### Next.js 14 App Router
- Prefer **Server Components** by default; add `"use client"` only when browser APIs or hooks are needed
- Use **Server Actions** (`"use server"`) for form mutations; use API routes (`/api/`) for webhook handlers and queue consumers
- Never import `SUPABASE_SERVICE_ROLE_KEY` in client components or `"use client"` files
- Middleware in `middleware.ts` validates JWT and `subscription_status` on all protected routes

### API Routes
- Validate all inputs with **Zod** — return `400` with structured errors on failure
- Verify auth with Supabase SSR client on every request
- Run **OpenAI Moderation API** on every AI output before DB write — reject and return `422` if flagged
- Verify Stripe webhook signatures with `stripe.webhooks.constructEvent()` — return `400` on failure

### Database (Supabase)
- **RLS must be enabled** on every table — `auth.uid() = user_id` policy on all user data
- Never use `service_role` key client-side
- Use parameterized queries only (Supabase SDK) — no string interpolation in SQL
- Schema changes via Supabase migrations, not manual ALTER TABLE

### Queue (BullMQ)
- Retry config: 3 attempts, exponential backoff (1s, 5s, 30s)
- Job TTL: 24 hours
- Worker concurrency: 3 (DALL-E 3 rate limit buffer)

## Testing Standards

- Test file location: co-located `*.test.ts` or `src/__tests__/`
- Mock all external APIs in unit tests: OpenAI, Stripe, Supabase
- Coverage threshold (CI-enforced): **≥ 65% line and branch** across `src/`
- 100% test pass rate required before any phase gate advances

## Security Baseline (OWASP Top 10)

| Risk | Requirement |
|------|------------|
| A01 Broken Access Control | Supabase RLS + middleware subscription check on all protected routes |
| A02 Cryptographic Failures | HTTPS enforced; all secrets in env vars only |
| A03 Injection | Zod on all API inputs; Supabase SDK parameterized queries |
| A07 Auth Failures | JWT in httpOnly cookie; session refresh via Supabase SSR |
| A09 Logging Failures | No PII in logs; Sentry error tracking only |
| COPPA | No child personal data collected; parents create accounts only |

## Environment Variables

Server-side only (never in client bundle): `OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `UPSTASH_REDIS_REST_TOKEN`, `SENTRY_DSN`

Public (safe for client): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
