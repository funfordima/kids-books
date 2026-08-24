---
name: "Security Standards (OWASP)"
description: "OWASP Top 10 security standards. Applied to all source files in this project."
applyTo: "**/*.{ts,tsx}"
---

# Security Standards (OWASP Top 10)

## A01 — Broken Access Control
- Enforce ownership checks in backend services and route guards on every protected endpoint
- Never trust client-provided user IDs for database access decisions
- Middleware at `middleware.ts` validates JWT AND `subscription_status` on all protected routes
- Protected routes: `/dashboard`, `/create`, `/book/[id]`, `/account`

## A02 — Cryptographic Failures
- HTTPS enforced on all environments
- All secrets in environment variables — zero secrets in source code or git history
- Never commit `.env`, `.env.local`, or any file containing real secrets
- For local agent development, load `GH_TOKEN` from the ignored repository root `.env` file only into the current process environment; never print, copy, commit, mount broadly into containers, or expose `.env` contents
- `DATABASE_URL`, `REDIS_URL`, `GOOGLE_CLIENT_SECRET`, `STRIPE_SECRET_KEY`, `S3_SECRET_ACCESS_KEY` are server-side only

## A03 — Injection
- Use **Zod** to validate all external inputs at system boundaries (API routes, Server Actions)
- Use **Prisma** or parameterized queries only — never interpolate user input into SQL strings
- Sanitize all content passed to OpenAI Moderation API before using AI output

## A05 — Security Misconfiguration
- Prisma migrations must preserve least-privilege access patterns and avoid exposing unrestricted cross-user reads
- No debug endpoints in production
- All environment variables must be set in deployment/runtime configuration (Docker/Dokploy and CI) — never fall back to default insecure values

## A07 — Authentication Failures
- JWT stored in **httpOnly cookie** only — never `localStorage`
- Session validation handled server-side on protected routes and API endpoints
- Rate limiting on auth-sensitive endpoints is required
- Validate authenticated user server-side on every protected data access

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
