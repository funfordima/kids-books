---
name: "Security Standards (OWASP)"
description: "OWASP Top 10 security standards. Applied to all source files in this project."
applyTo: "**/*.{ts,tsx}"
---

# Security Standards (OWASP Top 10)

## A01 — Broken Access Control
- Supabase RLS is **mandatory** on every table: `auth.uid() = user_id` policy
- Never query the database without going through the authenticated Supabase client
- Middleware at `middleware.ts` validates JWT AND `subscription_status` on all protected routes
- Protected routes: `/dashboard`, `/create`, `/book/[id]`, `/account`

## A02 — Cryptographic Failures
- HTTPS enforced on all environments (Vercel enforces by default)
- All secrets in environment variables — zero secrets in source code or git history
- Never commit `.env.local` or any file containing real secrets
- `SUPABASE_SERVICE_ROLE_KEY` and `STRIPE_SECRET_KEY` are server-side only

## A03 — Injection
- Use **Zod** to validate all external inputs at system boundaries (API routes, Server Actions)
- Use **Supabase SDK** parameterized queries only — never interpolate user input into SQL strings
- Sanitize all content passed to OpenAI Moderation API before using AI output

## A05 — Security Misconfiguration
- RLS must be explicitly enabled (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`) in every migration
- No debug endpoints in production
- All environment variables must be set in Vercel and Railway dashboards — never fall back to default insecure values

## A07 — Authentication Failures
- JWT stored in **httpOnly cookie** only — never `localStorage`
- Session refresh handled by Supabase SSR client automatically
- Rate limiting on auth endpoints (Supabase provides this by default)
- Validate `user` with `supabase.auth.getUser()` server-side — never trust client-provided user IDs

## A09 — Logging Failures
- No PII in logs: no email, no child name, no story content, no user IDs
- Use Sentry for error tracking (errors only, not info/debug)
- Never log OpenAI API keys, Stripe keys, or tokens — even partially

## COPPA Compliance
- Parents create accounts; child names/ages are stored only as story configuration (not as personal profiles)
- No direct child authentication, profiles, or personal data collection
- Do not collect or store child photos, addresses, or identifiable information

## Content Safety
- Every AI-generated story MUST pass OpenAI Moderation API check before being written to the database
- Return `422` and discard the story if flagged — never persist flagged content
- Log moderation failures as errors in Sentry (without the story content)
