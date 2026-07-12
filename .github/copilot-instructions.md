# AI Children's Book Generator — Project Instructions

## Tech Stack (always current)

| Layer | Technology |
|-------|-----------|
| Backend API | NestJS + TypeScript (strict) |
| Frontend | Next.js (TypeScript strict) |
| Database | PostgreSQL + Prisma ORM |
| Job Queue | Redis (BullMQ) |
| Auth | Google OAuth |
| Asset Storage | MinIO (local/test, S3 compatible) + AWS S3 (production) |
| Local Infrastructure | Docker / Docker Compose |
| PDF | Puppeteer |
| Deployment | Dockerfile-based builds with Dokploy |
| Testing | Vitest + V8 coverage + Playwright (E2E) |
| Monitoring | Sentry + provider-native metrics |

## Product Direction

This project is a SaaS service to generate customizable books with pictures for kids.

- Main customers: parents who want engaging, personalized, educational books for their children.
- Product goal: help children stay interested while learning useful and new things.

### Core Business Entities

- Users
- Templates
- Books
- Characters (parents and children)
- Pictures
- Subscriptions
- Ratings
- ReferralProgram
- Jobs (queue-backed book and picture processing)

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

Additional operating rules:

- Follow `docs/AGENT_SYSTEM_OPERATING_MODEL.md`.
- Use non-interactive GitHub access for routine agent work; see `.github/AGENT_GITHUB_ACCESS.md`.
- Do not rely on browser/device OAuth inside agent workflows.
- ProjectManager must run feature refinement before creating implementation stories.
- ProjectManager must use `spec-driven-feature-lifecycle` before creating implementation stories.
- All story descriptions, subtask descriptions, PR descriptions, and role evidence updates must be structured Markdown.
- Stories must include enough product context for a human developer who does not know the task.
- Every parent story must have Developer, Tester / QualityGate, and CodeReviewer subtasks.
- Add a WikiCurator subtask when work changes requirements, architecture, governance, phase progress, or durable project decisions.
- Each agent updates only its own assigned subtask.
- No single agent may create the story, implement it, test it, review it, and merge it.

## Coding Conventions

### Execution Rules

- Analyze before developing any feature.
- Do not guess on ambiguous requirements; ask clarification questions first and suggest simple options when useful.
- Apply minimalism: implement only what is required for the current feature.
- Prefer the simplest and shortest correct implementation when multiple valid approaches exist.
- Follow the existing project architecture and code style.
- Remove unused code when it is no longer needed.
- For complex tasks, use decomposition: plan, act, check.

### Commit Policy
- Every completed feature/user story must have a corresponding completion commit.
- Use step-by-step commits for logical implementation slices (types/schema, core logic, API, tests, UI) instead of one large commit.
- Every commit for a story must reference the issue number (for example `feat: add queue retry handling (#42)`).
- Do not squash all work into a single catch-all commit before review.
- If a story changes after review feedback, add follow-up fix commits (do not rewrite shared history).

### General
- TypeScript `strict: true` — no `any`, no `!` non-null assertions on unknown values
- Prettier + ESLint enforced (see `post-tool-use` hook)
- No `console.log` in production code; use structured logging or Sentry
- No secrets in source code — use environment variables only

### Backend (NestJS)
- Use module boundaries (`modules/*`) and keep controllers thin, services focused, and providers testable.
- Validate all DTO inputs with `class-validator` and `class-transformer`.
- Keep API contracts explicit with typed DTOs; no implicit `any` payloads.

### Frontend (Next.js)
- Keep UI concerns in Next.js and business/domain logic in backend services.
- Prefer server components when possible; use client components only when browser APIs or client state are required.
- Integrate with backend via typed API client utilities.

### Database (Prisma + PostgreSQL)
- Define schema in `prisma/schema.prisma` and use Prisma Migrate for all schema changes.
- No raw SQL string interpolation; use Prisma APIs or parameterized queries only.
- Index foreign keys and high-read filter fields (for books, pictures, jobs, subscriptions).

### Queue (Redis + BullMQ)
- Queue book generation and picture generation as separate job types.
- Default retry config: 3 attempts with exponential backoff.
- Ensure idempotency for processors and safe retries.

### Storage (MinIO/S3)
- Use MinIO for local/test environments and S3 for production.
- Keep object keys deterministic and scoped by tenant/user/book.
- Store only object URLs/keys in DB; never store binary files directly in PostgreSQL.

## Testing Standards

- Test file location: co-located `*.test.ts` or `src/__tests__/`
- Mock all external integrations in unit tests: OAuth provider, Redis, S3/MinIO, and payment adapters
- Coverage threshold (CI-enforced): **≥ 65% line and branch** across `src/`
- 100% test pass rate required before any phase gate advances

## Security Baseline (OWASP Top 10)

| Risk | Requirement |
|------|------------|
| A01 Broken Access Control | Enforce ownership checks in backend services and guards on every protected endpoint |
| A02 Cryptographic Failures | HTTPS enforced; all secrets in env vars only |
| A03 Injection | DTO/schema validation on all API inputs; Prisma parameterized queries |
| A07 Auth Failures | Secure OAuth flow, token validation, session hardening, and proper callback validation |
| A09 Logging Failures | No PII in logs; Sentry error tracking only |
| COPPA | No child personal data collected; parents create accounts only |

## Environment Variables

Server-side only (never in client bundle): `DATABASE_URL`, `REDIS_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT` (for MinIO), `SENTRY_DSN`

Public (safe for client): only explicitly public frontend config values (for example `NEXT_PUBLIC_API_BASE_URL`)
