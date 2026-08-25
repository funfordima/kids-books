# Project State Snapshot

Last updated: 2026-08-25
Scope: repository-wide status with implementation snapshot and completion logging protocol.

## 1. Current Result (What We Have)

This repository contains project governance, an initialized frontend design-system foundation, the Step 1 monorepo application scaffold, the Step 2 local service configuration, the Step 3 backend module foundation, the Step 4 Prisma persistence schema baseline, the Step 5 provider-independent BullMQ generation queue scaffold, the Step 6 AI safety/provider boundary, the Step 7 accessible Next.js product foundation, the Step 8 secure Stripe subscription implementation, the Step 9 secure PDF export implementation branch, and a Step 10 public template publication implementation branch.

Implemented artifacts:
- SDLC governance plan in `docs/SDLC_PLAN.md`
- Design-system bootstrap in `apps/frontend/src/design-system`
- Design token source files in `apps/frontend/src/design-system/tokens`
- Seed generated token preview in `apps/frontend/src/design-system/generated/tokens.preview.css`
- Content style guide in `apps/frontend/src/design-system/content-style-guide.md`
- npm workspace configuration for `apps/backend`, `apps/frontend`, and `packages/shared`
- Minimal strict-TypeScript NestJS backend with module/controller/service boundaries
- Step 3 backend foundation modules for auth, users, books, templates, and jobs under `apps/backend/src`
- Typed backend auth and domain boundary contracts for Google OAuth readiness/start/callback, replaceable OAuth config source, authenticated parent/session context, protected users/books/templates/jobs controllers, DTO/identifier validation, and explicit deferred-operation errors
- Prisma 7 PostgreSQL schema and initial SQL migration for users, subscriptions, templates, books, book pages, characters, pictures, jobs, ratings, and referral programs under `apps/backend/prisma`
- Backend Prisma generation, validation, and build hooks plus a fail-closed `DatabaseModule`/`PrismaService` boundary for future repository wiring
- BullMQ/Redis generation queue contracts under `apps/backend/src/jobs`, including separate book and picture job payload schemas, deterministic idempotency IDs, centralized retry/retention options, producer and worker factories, lifecycle ports, and sanitized queue errors
- Provider-independent AI generation contracts under `apps/backend/src/generation`, including validated book config, age/story matrix checks, story and image prompt builders, OpenAI provider configuration/adapters, moderation ports, approved-content persistence/page-loading ports, story orchestration, and picture generation processor
- Dated AI provider decision record in `docs/AI_PROVIDER_DECISION.md`
- Accessible strict-TypeScript Next.js App Router product foundation with public landing/pricing/templates/login/auth callback routes, fail-closed protected dashboard/library/create routes, typed backend/auth client boundaries, and a five-step in-memory book wizard
- Consumable `@kids-books/shared` TypeScript package used by both applications, including Step 7 shared wizard Zod contracts, age/story matrix, approved enums, page counts, and same-origin return-path validation
- Secure billing contracts under `apps/backend/src/billing`, including server-owned Stripe Checkout session creation, allowlisted monthly price verification, one-time local trial eligibility, customer mapping, raw-body signed webhook verification, safe event receipts, subscription reconciliation, backend entitlement checks, and success/cancel UI boundaries
- Stripe billing Prisma migration for enriched subscription metadata and unique minimal webhook receipts without raw payload, signature, card, invoice-detail, or secret storage
- Secure PDF export contracts under `apps/backend/src/pdf-exports`, including authenticated export/download routes, Step 8 entitlement checks, ready-book snapshot validation, deterministic content/layout versions, in-process idempotency plus database-backed duplicate-render avoidance, lease-fenced stale pending and failed retry recovery, escaped semantic print HTML, owner/book-scoped private image asset loading with deterministic fallbacks and dimension bounds, a real Puppeteer-backed hardened browser renderer that disables JavaScript and aborts external requests, configured render concurrency limiting, private owner/book-scoped lease-specific PDF storage keys, short-lived signed download responses, sanitized failure mapping, fake/local-port tests, and opt-in real Chromium PDF inspection tests
- PDF export Prisma migrations for private export metadata, per-render lease fencing, and `(book, contentVersion, layoutVersion)` uniqueness without public URLs or raw PDF binary database storage
- Public template publication contracts under `apps/backend/src/templates`, including versioned generalized candidate schema, deterministic privacy scanning, moderation-before-publication, normalized metadata fingerprinting, semantic similarity signature/threshold scanning, conservative accept/duplicate/review/hold decision rules, sanitized audit records, system-only publication entry point, admin-only disable boundary, public read endpoints, and a Prisma repository adapter for ready-book source loading, active-catalog scans, accepted template creation, and immutable decision recording
- Template publication Prisma migration for versioned template fingerprint/signature metadata, disabled-template ownership, and sanitized `template_publication_audits` records without raw source idea, names, prompts, provider responses, or vectors
- Root build, typecheck, lint, test, and V8 coverage scripts plus minimal scaffold tests; ESLint 9 flat configs analyze frontend, backend, and shared source/tests while TypeScript remains a separate gate; generated Prisma client output is reproducible and ignored from source-control/lint/coverage
- Root strict `tsconfig.json` that typechecks backend, frontend, shared source, and co-located tests through literal `npx tsc --noEmit`
- Docker Compose configuration for local PostgreSQL, Redis, and MinIO under `infra/docker`
- Pinned backend PDF renderer runtime Dockerfile under `infra/docker/backend-pdf-runtime.Dockerfile`, with Chromium executable path configuration, non-root runtime user, and `.dockerignore` protection for local `.env`
- Pinned service images, health checks, loopback-only default port bindings, and named persistent volumes
- A safe local environment example plus documented validation, startup, smoke-check, persistence, diagnostics, and destructive-reset workflows

Token categories currently defined:
- Colors
- Typography
- Spacing
- Radius
- Shadow
- Motion

## 2. How It Works (Current System Flow)

The application scaffold and design-system flow now work as follows:

1. Root npm workspaces coordinate the backend, frontend, and shared package.
2. The shared package compiles to `packages/shared/dist` and exposes `SHARED_PACKAGE_VERSION`; both apps resolve it as a workspace dependency.
3. The NestJS backend exposes a minimal root service response through standard module/controller/service boundaries.
4. The backend imports foundational auth, users, books, templates, and jobs modules. Auth exposes readiness/start/callback boundary contracts only, with a replaceable config source and typed authenticated parent/session context but no token exchange or provider call. Users, books, templates, and jobs expose protected controller boundaries that fail closed without an authenticated parent context and return explicit service-unavailable errors for later-step persistence/queue behavior; they do not fabricate product data or connect to repositories, BullMQ, Google OAuth packages, Redis, storage, Stripe, OpenAI, or external providers.
5. Prisma schema validation and client generation run from `apps/backend/prisma.config.ts`; backend build/typecheck generate the local ignored Prisma client from `apps/backend/prisma/schema.prisma`.
6. `DatabaseModule` and `PrismaService` require `DATABASE_URL` before use. Step 8 imports this database boundary through billing so synchronized subscription and webhook receipt state fail closed when persistence is unavailable.
7. The Next.js App Router renders public landing, pricing, templates, login, and auth callback routes plus protected dashboard, library, and create routes. Protected routes call the typed backend session boundary and redirect to login with a validated same-origin return path when no parent session is available.
8. The frontend book wizard keeps personalization in memory only, validates the approved age/story matrix and 8/12/16 page counts through `@kids-books/shared`, submits one typed request through the backend client, disables duplicate submission while pending, and displays only backend-returned queued identifiers or accessible safe error states.
9. Billing checkout is created only by the backend. It verifies the configured Stripe Price is active USD 999 recurring monthly, creates or reuses the mapped Customer with idempotency, rejects active/trialing duplicate subscriptions, applies a one-time local seven-day trial, and returns only the hosted Checkout session identifier and URL.
10. Stripe webhook handling uses the raw request body plus `Stripe-Signature` and `STRIPE_WEBHOOK_SECRET` before parsing side effects. Verified events are stored by unique event ID with safe metadata only, completed duplicates are acknowledged without side effects, failed duplicates remain retryable, unknown verified events are ignored safely, and subscription lifecycle/invoice events reconcile against the current provider Subscription before local entitlement state changes.
11. Backend entitlement checks allow only synchronized `trialing` or `active` state with valid time bounds; missing, expired, incomplete, past-due, unpaid, paused, canceled, unknown, or reconciliation-failed states deny access. Book creation now checks this backend entitlement before deferring generation persistence behavior.
12. The Step 8 pricing/success/cancel UI is informational: it starts hosted Checkout through the backend, verifies success session ownership through the authenticated backend, and never grants access from redirect state alone.
13. PDF export creation is backend-owned. It checks authenticated parent entitlement before loading ready-book content, validates a contiguous nonempty page snapshot, computes a SHA-256 content version with `pdf-layout-v1`, reuses a ready export when present, or atomically claims one render lease for that content/layout version before rendering one escaped semantic print document through a renderer port. Existing pending exports fail closed as in-progress instead of duplicating renderer/storage work, while failed and stale pending exports can be safely reset for retry only through conditional status/lease updates. Image references must remain under the validated owner/book private-object prefix and are loaded through a server-side object-store port; missing/unavailable/unknown-MIME images use deterministic placeholders. Client HTML, URLs, owner IDs, object keys, and filenames are never accepted.
14. PDF export storage is private and lease-fenced: keys are built from validated owner/book UUIDs plus content version, layout version, and render lease so a late stale worker cannot overwrite another worker's completed PDF bytes or checksum. Metadata records content type, attachment disposition, checksum, and byte size, and download requests recheck ownership and entitlement before issuing a short-lived signed URL. The local development object-store adapter is enabled only by explicit local environment variables, validates bucket/key paths, rejects checksum/object collisions, signs download URLs with an env-provided secret, and avoids public ACLs or database binary storage. Asset loading rejects oversized bytes and unsafe PNG/JPEG/WebP dimensions before rendering. The renderer boundary is wired to Puppeteer through an injectable factory and supports a locked-down browser session with JavaScript disabled, request interception enabled, external requests aborted, bounded rendering time, CSS page sizing, configurable Chromium executable path, default non-root sandboxed runtime, opt-in container no-sandbox mode only for root-run local verification, configured render concurrency limiting, stale pending export retry, and guaranteed cleanup.
15. Template publication is backend-owned and fail-closed. A system actor can process a ready private source book through the active `template-publication-v1` pipeline; an existing source/version decision is reused, malformed candidates, privacy hits, moderation failures, unavailable moderation/similarity, stale catalog signatures, and publication races record non-public decisions. Accepted candidates require no fingerprint collision and all semantic scores below 0.90 against active public templates, then the repository atomically creates one public generalized template and sanitized audit. Parents cannot publish or override publication fields; admins can disable accepted templates but cannot force-publish failed safety checks.
16. Source-of-truth token JSON files remain under `apps/frontend/src/design-system/tokens`, with generated artifacts expected under `generated` and the seeded preview retained.
17. Developers copy `infra/docker/.env.example` to the ignored `infra/docker/.env`, validate `infra/docker/compose.yaml`, and start PostgreSQL, Redis, and MinIO with Docker Compose.
18. Compose waits on service-specific health checks and exposes configurable PostgreSQL, Redis, MinIO API, and MinIO console ports on `127.0.0.1` by default.
19. PostgreSQL rows, Redis append-only data, and MinIO objects persist in named volumes across normal stop/start or container recreation; volume deletion remains a separate, explicitly destructive operation.
20. Queue contracts validate schema-versioned identifier-only payloads before enqueue, create deterministic BullMQ-compatible job IDs, apply three total attempts with exponential 1000 ms backoff, retain terminal metadata for 24 hours, and dispatch workers only through injectable processor ports.
21. Story generation validates parent book config, moderates bounded parent text, calls a structured text-generation port, validates exact page ordering/count, moderates generated story and illustration text before persistence, saves only approved story content through a port, and enqueues one idempotent picture job per saved page.
22. Picture generation loads approved page/style data through a port, builds a child-safe no-text image prompt, moderates the prompt, and calls an image provider port. Automated tests mock all provider, persistence, and queue calls; no paid live OpenAI call is required or performed.

## 3. Architecture Baseline (Effective)

Effective baseline (aligned with requirements override):
- Backend: NestJS + TypeScript
- Frontend: Next.js + TypeScript
- Database: PostgreSQL + Prisma
- Queue: Redis + BullMQ
- Auth: Google OAuth
- Storage: MinIO (local/test) and S3 (production)

See `docs/SDLC_PLAN.md` (Requirements Override section) for canonical details.

## 4. What Is Not Implemented Yet

Not yet present in this snapshot:
- Deployment, refunds/proration/customer portal/multi-plan billing, production Stripe account/Price setup, production S3 storage wiring, full deployment wiring, and QA product behavior scheduled for later steps
- Repository classes and database-backed user/book/template/job behavior wired into the protected controllers
- Real Google OAuth package integration, sessions/JWTs, token exchange, and provider callbacks
- Runtime Redis worker process packaging, direct Prisma repository adapters for generation persistence, object storage upload, and production provider credentials/configuration
- Token build pipeline automation (Style Dictionary or equivalent)
- Automated warning-only governance checks wired into CI for token/content validation

## 5. Completion Update Protocol (Required)

When any logically complete implementation is finished, update this file in the same change set.

Required update checklist:
1. Update `Last updated` date.
2. Add a short entry to section 6 (Implementation Log).
3. Reflect any new artifacts in section 1.
4. Update section 2 if behavior/flow changed.
5. Move completed items out of section 4.
6. Add links to evidence (tests, typecheck, docs, or gates) when available.

## 6. Implementation Log

### 2026-08-25 - Step 10 public template publication implementation branch
- Added versioned template publication constants, candidate/result/catalog/audit contracts, system/admin actor boundaries, deterministic generalizer and semantic signature ports, privacy scanner, canonical metadata fingerprinting, cosine similarity scan, and conservative decision mapping for accepted, duplicate, review-required, privacy, moderation, and technical hold outcomes.
- Added `TemplatesService.publishSourceBookAsPublicTemplate` with source/version idempotency reuse, ready-source loading, candidate schema validation, privacy and moderation gates before fingerprinting/publication, active-catalog fingerprint and semantic checks at threshold 0.90, repository-owned accept/record calls, fail-closed provider/catalog/race behavior, public catalog read methods, and admin-only disable checks.
- Added public `/templates/public` read endpoints and an authenticated admin disable endpoint while keeping publication off the parent-facing API.
- Added Prisma schema/migration support for template pipeline/fingerprint/semantic metadata, disabled template metadata, and sanitized immutable `template_publication_audits` without source prose, names, raw vectors, prompts, or provider responses.
- Added focused unit coverage for fingerprint normalization, privacy detections, semantic threshold/catalog readiness, idempotent retry reuse, unique acceptance, duplicate rejection, and system/admin authority.
- Verification status: resolved the local Node blocker by rebuilding Windows `node_modules` shims with system Node/npm after stale workspace junctions prevented npm lifecycle commands. Developer-side gates now pass with `C:\Program Files\nodejs\npm.cmd`: root `npm run lint`, `npm run typecheck`, `npm run build`, and `npm run test:coverage`; targeted backend template tests passed 18 tests across the Step 10 template specs. Coverage passed with shared 100% lines / 85.71% branches, backend 80.65% lines / 69.38% branches across 134 passing tests plus 3 skipped opt-in tests, and frontend 83.01% lines / 78.94% branches across 16 tests. Production `npm audit --omit=dev --json` still reports the same tracked three high, zero critical Prisma/deepmerge findings from #86; npm's available fix remains an unsafe major downgrade to Prisma 6.12.0.

### 2026-08-24 - Step 9 secure PDF export implementation branch
- Added Prisma PDF export metadata and migrations with private storage metadata, checksum/size fields, status tracking, per-render lease fencing, owner/book relations, and unique `(bookId, contentVersion, layoutVersion)` cache identity.
- Added `PdfExportModule` with authenticated `POST /books/:bookId/pdf-exports` and `GET /books/:bookId/pdf-exports/:exportId/download` routes, Step 8 entitlement enforcement, ready-book snapshot validation, content hashing, escaped semantic print HTML, owner/book-scoped local asset loading with deterministic image fallbacks, in-process idempotency, database-backed duplicate-render avoidance, private object key construction, signed local download URLs, sanitized failure handling, and reauthorized short-lived downloads.
- Added a hardened browser-renderer abstraction with disabled JavaScript, request interception, external request aborts, bounded render/PDF calls, print CSS page sizing, `Buffer` normalization, and quiet cleanup of page/session resources.
- Wired the renderer abstraction to real Puppeteer/Chromium through `PuppeteerPdfBrowserFactory`, with exact `puppeteer`/`pdf-parse` dependency pins, configurable Chromium executable path, default browser sandboxing, and an explicit local Docker no-sandbox escape hatch only for root-run verification containers.
- Added a pinned backend PDF runtime Dockerfile using `node:22.23.1-bookworm-slim`, Debian `chromium=151.0.7922.173-1~deb12u1`, `PDF_EXPORT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium`, a non-root runtime user for default Chromium sandboxing, and a root `.dockerignore` that excludes `.env` and generated/dependency folders from Docker build context.
- Added opt-in real-browser PDF inspection coverage for 8, 12, and 16-page books; the evidence test renders actual PDFs, parses page count/text, verifies PDF byte bounds, and remains skipped during normal unit/coverage runs unless `PDF_EXPORT_ENABLE_PUPPETEER_TESTS=true`.
- Added configured render concurrency limiting, render-lease-fenced stale pending and failed retry claims, conditional ready/failed transitions, lease-specific PDF object keys, and PNG/JPEG/WebP image dimension/pixel validation before Chromium decode/layout.
- Added fake/local-port tests for fail-closed entitlement/ownership/readiness, cache reuse, fallback rendering, private metadata, invalid page ordering/text, owner/book image-prefix enforcement, render failure cleanup, browser lockdown behavior, local storage signing/checksum/path validation, download reauthorization, and oversized image limits.
- Scope boundary: Step 9 does not implement AI regeneration, billing changes, public-template publication, reader redesign, social/public sharing, full production deployment, or real S3 adapter wiring. The local private-object adapter requires explicit local env configuration.
- Verification status: sanitized Docker gates passed without mounting repository-root `.env`: root `npm run lint`, `npm run typecheck`, `npm run build`, and `npm run test:coverage`; backend coverage reported 110 tests across 27 files with 78.94% lines and 68.08% branches after concurrency, stale retry, and image-dimension coverage, and frontend coverage reported 16 tests across 5 files with 83.01% lines and 78.94% branches. Focused Step 9 backend verification passed backend lint, backend typecheck, and 6 PDF export unit test files with 41 tests by default after render-lease fencing, with the opt-in integration spec skipped. Real Chromium evidence passed separately in sanitized Docker with Debian `chromium=151.0.7922.173-1~deb12u1`, `PDF_EXPORT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium`, `PDF_EXPORT_CHROMIUM_NO_SANDBOX=true`, and `PDF_EXPORT_ENABLE_PUPPETEER_TESTS=true`: 3 real PDF renders for 8/12/16-page books passed page-count/text/byte inspection. Production `npm audit --omit=dev --json` currently reports three high, zero critical findings through `prisma`/`@prisma/config`/`deepmerge-ts`; npm reports latest Prisma as 7.9.1, and npm's available fix is an unsafe major downgrade to Prisma 6.12.0, so this remains a current upstream dependency-security issue tracked in #86 rather than silently remediated in the PDF export story.

### 2026-08-12 - Step 7 accessible Next.js product foundation
- Added shared Step 7 wizard contracts in `@kids-books/shared`: approved age bands, pronouns, story-type matrix, educational subtypes, settings, illustration styles, 8/12/16 page counts, full Zod wizard validation, and same-origin return-path normalization.
- Added Next.js App Router product routes: public landing, pricing, templates, login, auth callback, and protected dashboard/library/create pages. Protected pages fail closed through the backend session client and do not expose protected content without a verified parent session.
- Added typed frontend backend/auth client boundaries for session, public templates, library, auth entry, and book request submission with safe error unions, credentials-inclusive fetches, request timeouts, and no browser token storage.
- Added a five-step in-memory book wizard for child profile, supporting characters, optional story note, story type, settings, review, and single submission. Pricing remains informational; Stripe execution is excluded until Step 8.
- Added focused shared/frontend tests for matrix validation, safe return paths, public/protected route states, auth callback/login boundaries, typed client failure mapping, wizard validation/submission dedupe, and coverage. Developer verification passed root lint, typecheck, build, coverage, and audit. Frontend coverage: 80.23% lines and 75% branches across 4 test files and 10 tests.
- Scope boundary: Step 7 does not implement Stripe Checkout/subscriptions, PDF/export, public-template publication, advanced reader/page-flip, live AI calls, deployment, repository-backed browser data beyond typed client boundaries, or production analytics.

### 2026-08-12 - Step 8 secure Stripe subscription implementation branch
- Added backend billing module boundaries for server-owned Stripe Checkout, server-only price configuration, idempotent Customer creation/reuse, duplicate active/trialing subscription rejection, local one-time trial eligibility, raw-body signed webhook verification, unique minimal webhook receipts, provider subscription reconciliation, and fail-closed entitlement decisions.
- Extended Prisma schema and migration SQL with enriched subscription metadata plus `stripe_webhook_events`, preserving safe event metadata only and explicitly avoiding raw payload/signature/secret/card storage.
- Added informational pricing, checkout success, and cancel UI boundaries. Hosted Checkout starts through the backend, success verifies session ownership and entitlement through the authenticated backend, and cancel/success redirects never grant access on their own.
- Wired protected book creation through backend entitlement enforcement before existing deferred generation persistence behavior.
- Added mocked Stripe and UI coverage for price/trial/customer/idempotency, invalid price config, duplicate subscriptions, success verification, webhook signature rejection, duplicate/unknown event handling, reconciliation, entitlement expiry, and no-op cancel state.
- Developer verification on the Step 8 branch: root `npm run lint`, `npm run typecheck`, `npm run build`, `npm run test:coverage`, and `npm audit` passed. Root coverage included backend 21 test files/76 tests at 80.47% lines and 68.11% branches, plus frontend 2 test files/8 tests at 95.83% lines and 90% branches.
- Scope boundary: this Step 8 branch intentionally excludes PDF, AI/generation changes, public-template publication, refunds/proration/customer portal/multiple plans, production Stripe account/Price creation, deployment, and raw card handling.

### 2026-08-11 - Step 5 BullMQ generation queue scaffold
- Added backend BullMQ dependencies and queue contracts for separate book and picture generation pipelines, including strict Zod payload schemas, deterministic idempotency IDs, centralized retry/backoff/retention options, queue producer behavior, worker factories, lifecycle ports, and sanitized retryable/non-retryable error classification.
- Updated `JobsService` status to report the implemented BullMQ contract instead of the previous placeholder asset-rendering plan while keeping runtime Redis queue connection optional until worker wiring.
- Added focused mocked Vitest coverage for payload rejection, Redis config parsing, idempotency, retry/retention config, and worker dispatch/failure behavior.
- Developer verification on the Step 5-only branch: `npm run lint -w @kids-books/backend`, `npm run typecheck -w @kids-books/backend`, and `npm run test:coverage -w @kids-books/backend` passed. Backend coverage: 85.77% lines and 65.88% branches across 12 test files and 38 tests.
- Scope boundary: this Step 5 branch intentionally does not include AI provider ports/adapters, story moderation/orchestration, image prompt generation, OpenAI dependencies, runtime worker packaging, direct Prisma writes, or storage uploads. Those remain Step 6 and later work.

### 2026-08-11 - Step 6 AI safety and provider boundary recovery branch
- Added provider-independent AI generation ports and services: server-only OpenAI config, mocked OpenAI adapters, book config validation with age/story matrix and educational subtype rules, exact generated-story schema validation, prompt builders, moderation-before-persistence orchestration, approved-story persistence/page-loading ports, picture-job enqueueing, and child-safe image prompt processing.
- Added `docs/AI_PROVIDER_DECISION.md` to explicitly supersede hard-coded GPT-4o/DALL-E 3 assumptions with environment-controlled provider defaults and typed ports.
- Developer verification on the Step 6 split branch: `npm run lint -w @kids-books/backend`, `npm run typecheck -w @kids-books/backend`, and `npm run test:coverage -w @kids-books/backend` passed. Backend coverage: 88.2% lines and 69.16% branches across 18 test files and 56 tests.
- Scope boundary: this Step 6 branch is a separated recovery branch based on Step 5 queue contracts. It must remain blocked until Step 5 completes Tester PASS, CodeReviewer approval, and required integration evidence.

### 2026-08-09 - Step 4 Prisma core schema and migrations
- Added Prisma 7.9.1 and the PostgreSQL driver adapter to the backend workspace, with reproducible `prisma:generate`, `prisma:format`, and `prisma:validate` scripts and build/typecheck pre-generation hooks.
- Added `apps/backend/prisma/schema.prisma` plus initial migration SQL for the required core entities: users, subscriptions, templates, books, book pages, characters, pictures, jobs, ratings, and referral programs, including ownership, status, publication, uniqueness, moderation, queue, and referral indexes/relations.
- Added a future-facing `DatabaseModule` and `PrismaService` that fail closed without `DATABASE_URL` and are intentionally not imported into `AppModule` yet, so Step 3 API boundaries remain honest until repository-backed behavior is implemented.
- Added focused Vitest coverage for the Prisma database boundary and schema contract, and excluded generated Prisma client output from source-control/lint/coverage noise.
- Remediated dependency audit findings introduced or surfaced during the package update: non-force audit fix cleared `nanoid`/`js-yaml`, and forced audit remediation upgraded Next.js plus `eslint-config-next` to 16.3.0. Full `npm audit` now reports zero vulnerabilities.
- Verification evidence: `npm run prisma:validate -w @kids-books/backend`, root `npm run typecheck`, `npm run lint`, `npm run test`, `npm run test:coverage`, `npm run build`, and `npm audit` all passed. Backend coverage: 90.27% lines/statements and 77.27% branches.

### 2026-08-04 - Step 3 backend foundation modules
- Added NestJS module scaffolding for auth, users, books, templates, and jobs under `apps/backend/src`, and imported those modules into `AppModule`.
- Added typed controllers, services, guard scaffolding, replaceable OAuth config readiness, authenticated-parent/session context, DTO/identifier validation, and explicit deferred-operation errors for Step 3 boundary contracts: Google OAuth readiness/start/callback, user profile lookup, book list/detail/create, template list/detail, and planned job status lookup.
- Added focused Vitest unit coverage for module contracts, guard fail-closed behavior, validation, and explicit service-unavailable deferred operations while intentionally avoiding Prisma schema or migrations, BullMQ implementation, frontend changes, real Google OAuth packages, and network dependencies.
- Developer verification attempted direct npm workspace commands, but this PowerShell environment does not expose `node`, `npm`, or `npx` on PATH despite existing `node_modules`. Equivalent local package checks passed through the Node REPL runtime: TypeScript no-emit for `apps/backend/tsconfig.json`, Vitest for 10 backend test files, and ESLint for 36 backend source/test files.

### 2026-08-03 - Step 2 local PostgreSQL, Redis, and MinIO infrastructure
- Added `infra/docker/compose.yaml` with exactly PostgreSQL, Redis, and MinIO using explicit image versions, health checks, loopback-only configurable host ports, authentication-aware local settings, and separate named volumes.
- Added `infra/docker/.env.example`; active `.env` files remain ignored and the committed values are clearly marked for local development only.
- Added `infra/docker/README.md` with exact configuration validation, healthy startup, service smoke checks, normal lifecycle, persistence, diagnostics, and warned destructive reset commands.
- Developer-side checks rendered the Compose model successfully with the example environment, confirmed the exact three services/images, and confirmed missing required configuration exits unsuccessfully. The implementation and dependency-disposition baseline is candidate `a53937d4d1080b61b312a7d005dd7ed1e6a5d397`.
- In response to the initial audit result, updated Next.js and its matching ESLint config from 16.2.10 to the registry-latest 16.2.12, and regenerated the lockfile with safe non-force remediation of the dev-only `brace-expansion` paths from 1.1.16 and 5.0.7 to 1.1.18 and 5.0.9.
- The independent Tester reported [PASS for exact candidate `a53937d4d1080b61b312a7d005dd7ed1e6a5d397`](https://github.com/funfordima/kids-books/issues/27#issuecomment-5170762611) under revised AC-8: Docker/runtime and root build, typecheck, lint, test, and coverage gates passed; full and production audits reproduced the inherited three-high, zero-critical baseline without a new high/critical finding.
- The three inherited findings through Next.js 16.2.12, PostCSS 8.4.31, and Sharp 0.34.5 remain unresolved and are explicitly deferred to [upstream remediation tracker #70](https://github.com/funfordima/kids-books/issues/70). This disposition permits Step 2 completion under revised AC-8; it does not claim remediation, accept the risk for production, or establish production deployment safety. Re-evaluation remains mandatory before Phase 5 deployment/go-live.
- [PR #71](https://github.com/funfordima/kids-books/pull/71) is open for Step 2. CodeReviewer requested this durable-record correction; independent re-review is required after the documentation-only follow-up commit.

### 2026-07-12 - Step 1 monorepo bootstrap
- Added npm workspace configuration for `apps/backend`, `apps/frontend`, and `packages/shared`, including root build, typecheck, test, and lint orchestration.
- Added a minimal NestJS backend and Next.js App Router frontend with strict TypeScript configurations.
- Added the consumable `@kids-books/shared` package and referenced its exported version contract from both applications.
- Added co-located Vitest checks and V8 coverage configuration with 65% line and branch thresholds without introducing later-step product functionality.
- Reconciled the scaffold with the governance baseline from PR #18 and preserved the existing design-system subtree without changes.
- Updated to audit-remediated dependencies: Next.js 16.2.10 with React 19.2.4, NestJS 11.1.28, TypeScript 5.9.3, and Vitest 4.1.10. The App Router behavior is unchanged; the version update resolves the high-severity findings affecting the original Next.js 14 dependency while the Requirements Override remains version-agnostic.
- Clarified stale legacy architecture/instruction text to use version-neutral Next.js App Router wording. Under the SDLC plan's explicit precedence rule, the Requirements Override supersedes the older Next.js 14 table entry; Next.js 16.2.10 is retained to avoid reintroducing high-severity production findings.
- Added a repository-wide strict TypeScript project covering actual backend, frontend, shared, and test source so the mandatory literal `npx tsc --noEmit` gate performs meaningful work.
- Replaced the backend/shared lint aliases to `tsc` with real typed ESLint 9 flat-config analysis of their source and co-located tests; root `npm run lint` now enforces ESLint in all three workspaces independently from typechecking.
- Added `@nestjs/platform-express` so the backend start command is runnable and uses explicit Nest injection metadata for portable coverage results.
- Developer verification used pinned `node:22.23.1-bookworm-slim`: clean `npm ci`, root build, typecheck, lint, unit tests, and coverage completed successfully; all three workspaces reported 100% line and branch coverage. Backend and frontend startup smoke requests both returned HTTP 200 and resolved `@kids-books/shared` version `0.1.0`.
- Dependency audit result after remediation: zero high or critical findings in both production and complete graphs. npm reports two residual moderate findings for PostCSS 8.4.31 pinned by Next.js 16.2.10; forcing npm's suggested downgrade to Next.js 9.3.3 is incompatible with the App Router and is not accepted. Independent Tester evidence remains required before merge.


### 2026-07-09 - Initial project state snapshot documented
- Captured current repository status and active architecture baseline.
- Recorded design-system bootstrap details and current token/content assets.
- Added mandatory completion update protocol for future logically complete implementations.
