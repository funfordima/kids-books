# AI Children's Book Generator — SDLC Plan

## Decisions

| Decision | Choice |
|----------|--------|
| Core value | Personalization + Educational theme selection (equal weight) |
| Output | Web reader + PDF download |
| Illustrations | AI-generated per page (DALL-E 3) |
| Business model | Monthly subscription — $9.99/mo, 7-day free trial |
| Image queue | BullMQ + Redis (async processing) |
| Auth | Google OAuth |
| Deployment | Dockerfile-based builds with Dokploy |

## Project State Recording Rule

After every logically complete implementation, update `docs/PROJECT_STATE.md` in the same change set.

Minimum required update:
1. Refresh the snapshot date.
2. Append a concise implementation log entry.
3. Document what changed and how it works now.
4. Reference verification evidence when available (typecheck, tests, coverage, or gate output).

---
## Requirements Override (2026-07-09)

This section supersedes conflicting stack or architecture details elsewhere in this document.

### Main Idea

Build a SaaS service that generates customizable books with pictures for kids.
Primary customers are parents who want engaging, useful books that help children learn new things.

### Baseline Technology Stack

- Backend: NestJS (TypeScript)
- Frontend: Next.js (TypeScript)
- Database: PostgreSQL with Prisma ORM
- Queues: Redis (BullMQ)
- Authentication: Google OAuth
- Local infrastructure: Docker / Docker Compose
- Object storage: MinIO (local/test) and S3 (production)

### Core Business Entities

- Users
- Templates
- Books
- Characters (parents and children)
- Pictures
- Subscriptions
- Ratings
- ReferralProgram
- Jobs (queue records for books and pictures)

### Clarifications (2026-07-09)

- Monorepo is required, with separate backend and frontend folders.
- Content generation uses OpenAI text generation + DALL-E image generation.
- Templates are ready-made customizable book templates.
- Public templates are created automatically by the system from parent story ideas.
- Template customization supports character names, illustrations, and similar editable parts.
- Public templates must be privacy-safe and must not contain direct personal details from the source request.
- PDF generation uses Puppeteer.
- Payments and subscriptions use Stripe.
- Deployment target uses Dockerfile-based builds and Dokploy.

### Public Template Generation Policy

1. Parent submits a story idea for a personalized book.
2. System generates the personalized book content and a template-safe generalized variant.
3. Before publishing a template, system runs uniqueness checks against existing public templates.
4. Only unique templates are added to the public template catalog.
5. Non-unique templates are stored only as private/personalized output and are not added to public templates.

### Template Uniqueness Rules (initial)

- Uniqueness scope is global across the full public template catalog.
- Uniqueness must consider both semantic similarity and normalized metadata fingerprint.
- Normalized fingerprint excludes personal identifiers (names, direct personal details).
- If semantic similarity is above threshold and fingerprint collision is detected, treat as duplicate.
- Duplicate templates are not published to public catalog.
- Keep an auditable decision trail for why a candidate template was accepted or rejected.

### Monorepo Structure (baseline)

```text
apps/
  backend/      # NestJS API
  frontend/     # Next.js web app
packages/
  shared/       # shared types, validation schemas, SDK utilities
infra/
  docker/       # docker-compose and local infra config (postgres, redis, minio)
```

### Step-by-Step Implementation Sequence (v1)

1. Monorepo bootstrap with `apps/backend` and `apps/frontend` plus shared package.
2. Local infrastructure via Docker Compose: PostgreSQL, Redis, MinIO.
3. Backend foundation (NestJS): auth (Google OAuth), users, books, templates, jobs modules.
4. Prisma schema + migrations for core entities (Users, Templates, Books, Characters, Pictures, Subscriptions, Ratings, ReferralProgram, Jobs).
5. Queue pipeline (BullMQ + Redis) for book and picture generation jobs.
6. AI integration (OpenAI + DALL-E) with moderation/safety checks before persistence.
7. Frontend foundation (Next.js): auth flow, dashboard, public template catalog, create-book wizard.
8. Stripe subscription flow: checkout, webhook handling, subscription status sync.
9. PDF export service using Puppeteer and secure download endpoint.
10. Public template publication workflow with deduplication and moderation checks.
11. Deployment packaging using Dockerfiles and Dokploy manifests for backend/frontend.
12. QA gates: lint, typecheck, tests, coverage threshold, and smoke tests.


## Phase 0 — Investigation

### Community Research — Real User Pain Points

**Wonderbly reviews.io (2.3★ / 40 reviews):**
- "Barely personalized — just a copy and paste book. $103 for one book."
- "It's agony to read to a child — not a well-written story."
- "Child's name was not incorporated into the storyline, only on the cover."
- "Delivery ruined Mother's Day surprise." → physical books = fragile for occasions
- "Not worth the money — corners dented, text too small."

**Reddit / parent forums (r/Parenting, r/Mommit, r/daddit):**
- Kids memorize every book by heart → need fresh content weekly
- Books don't reflect child's culture or appearance
- Nothing for specific hard situations (moving house, new sibling, mommy sick)
- $40/book is unsustainable — digital subscription at $10/mo is compelling
- Existing AI books "read like a robot wrote them"
- Parents can't control what lesson their child absorbs from a story
- No reading-level matching to a specific child's age

### Top Story Types by Demand (Priority Order)

| Priority | Type | Ages | Evidence |
|---------|------|------|----------|
| **#1** | **Educational** | 3–9 | **Highest parent search intent; values, STEM, life skills** |
| #2 | Big Feelings / Emotional Intelligence | 3–7 | Backed by developmental science; PBS/NAEYC |
| #3 | Bedtime / Routine | 3–6 | Evergreen; Goodnight Moon archetype; Wonderbly bestseller |
| #4 | Animals as Protagonists | 3–9 | Charlotte's Web, Very Hungry Caterpillar; timeless |
| #5 | Adventure & Exploration | 5–9 | Junie B. Jones, Princess in Black; high sales |
| #6 | Family & Sibling Bonds | 3–8 | New sibling transition triggers high demand |
| #7 | Fantasy & Magic | 5–9 | Narnia, Harry Potter; persistent huge market |
| #8 | Humor & Silliness | 4–9 | Dr. Seuss, Dog Man; universal appeal |
| #9 | Identity & Belonging | 3–8 | Fastest growing trend 2022–2026 |
| #10 | School & Social Transitions | 4–8 | First day of school, making friends |
| #11 | Nature & Environment | 4–9 | The Lorax legacy; growing sustainability awareness |
| #12 | Mystery & Problem-Solving | 6–9 | Nate the Great, Encyclopedia Brown; STEM crossover |

### Educational Story Sub-Types (within Educational type)
1. Kindness, Empathy & Sharing (values)
2. Numbers & Counting (math foundations)
3. Letters & Alphabet (literacy readiness)
4. Science & Discovery / Curiosity (STEM)
5. Healthy Habits (sleep, nutrition, hygiene)
6. Community & Helping Others
7. Nature & Environment Care
8. Courage & Facing Fears (resilience)

### Competitor Gap
No competitor combines: quality AI storytelling + educational depth + deep plot personalization + subscription pricing + instant digital delivery.  
Wonderbly's top complaints: "barely personalized", too expensive, physical delivery unreliable.

---

## Tech Stack

| Layer | Choice | Notes |
|-------|--------|-------|
| Frontend | Next.js (App Router) + TypeScript | UI and web reader; version follows the Requirements Override and supported security baseline |
| Backend API | NestJS + TypeScript | Domain logic, auth, API contracts |
| Story AI | OpenAI GPT-4o | Structured JSON output per page |
| Illustration AI | OpenAI DALL-E 3 | Per page, async via queue |
| Job Queue | BullMQ + Redis | Async image generation pipeline |
| Queue Worker | Node.js worker process | Long-running BullMQ consumer |
| Auth | Google OAuth | Parent account sign-in flow |
| Database | PostgreSQL + Prisma ORM | Typed data access and migrations |
| Asset Storage | MinIO (local/test) + S3 (prod) | Generated images + PDFs |
| PDF Generation | Puppeteer | HTML to PDF rendering |
| Subscriptions | Stripe | Recurring billing; webhook-driven state |
| Content Safety | OpenAI Moderation API | Mandatory; every story checked before save |
| Deployment | Docker + Dokploy | Separate backend/frontend deployments |
| Monitoring | Sentry + provider-native metrics | Error tracking + operational health |

### Deployment Architecture

```
[Browser]
    │
[Next.js Frontend App]
  ├── Pages / UI
  ├── Calls NestJS API (HTTPS)
  └── Polls job/book status
        │
[NestJS API]
  ├── Auth endpoints (Google OAuth)
  ├── Books/templates/jobs endpoints
  ├── Stripe webhooks
  ├── Enqueue BullMQ jobs
  └── PDF export via Puppeteer
        │                          │
     [Redis (BullMQ)]         [PostgreSQL + Prisma]
        │                          │
     [Worker Process]          [MinIO/S3 Object Storage]
     (Node.js process)
    └── Consumes jobs
        → DALL-E 3 per page
    → Upload to MinIO/S3
        → Update page.image_url in DB
        → When all pages done → book.status = 'ready'
```

---

## Book Configuration Options (Wizard — 5 Steps)

### Step 1 — Child Profile
- Child's name (text, required)
- Age selector: **3–4 / 5–6 / 7–9** (radio, required) → drives vocabulary, sentence length, page count, moral complexity
- Pronouns: He/Him / She/Her / They/Them

### Step 2 — Supporting Characters
- Best friend's name (optional)
- Pet: name + animal type (optional)
- Sibling's name (optional)
- Other character: custom label + name (optional)

### Step 3 — Story Description (free text, optional)
- Prompt: "Tell us something special, or what you'd like the story to be about"
- Examples shown to guide parents:
  - "My daughter just got a puppy named Biscuit"
  - "My son is scared of the dark"
  - "We're moving to a new house next month"
- Becomes a creative brief injected into the AI prompt

### Step 4 — Story Type
- **Educational** ← highest demand; shows sub-type selector:
  - Kindness & Empathy / Numbers & Counting / Letters & Alphabet /
    Science & Discovery / Healthy Habits / Community Helpers /
    Nature Care / Courage & Resilience
- Big Feelings / Emotional Intelligence
- Bedtime Story
- Adventure & Exploration
- Fantasy & Magic
- Family & Relationships
- Humor & Silliness
- Identity & Belonging
- School & Friendship
- Nature & Environment
- Mystery & Problem-Solving

### Step 5 — Book Settings
- **Setting**: Forest / City / Space / Ocean / Magical Kingdom / Farm / Arctic / Child's Hometown
- **Illustration style**: Watercolor / Cartoon / Storybook Flat / Crayon / Pastel
- **Book length**: Short (8 pages) / Medium (12 pages) / Long (16 pages)

---

## Database Schema

```sql
users
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid()
  email            text UNIQUE NOT NULL
  stripe_customer_id text
  subscription_status text DEFAULT 'inactive'  -- inactive | trialing | active | canceled
  created_at       timestamptz DEFAULT now()

subscriptions
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid()
  user_id          uuid REFERENCES users(id) ON DELETE CASCADE
  stripe_subscription_id text UNIQUE
  plan             text
  status           text
  current_period_end timestamptz

books
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid()
  user_id          uuid REFERENCES users(id) ON DELETE CASCADE
  status           text DEFAULT 'pending'  -- pending | generating | ready | failed
  config           jsonb NOT NULL
    -- { child_name, age_group, pronouns, friend_name, pet_name, pet_type,
    --   sibling_name, story_description, story_type, educational_subtype,
    --   setting, illustration_style, page_count }
  created_at       timestamptz DEFAULT now()

pages
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid()
  book_id          uuid REFERENCES books(id) ON DELETE CASCADE
  page_number      int NOT NULL
  text_content     text NOT NULL
  illustration_description text NOT NULL
  image_url        text
  image_job_id     text
```

---

## Auth Design

- Google OAuth for parent account sign-in
- Backend-managed auth/session validation on protected endpoints
- **Protected routes**: `/dashboard`, `/create`, `/book/[id]`, `/account`
- **Public routes**: `/`, `/login`, `/signup`, `/pricing`
- Backend checks ownership and `subscription_status` before serving protected resources
- Data isolation enforced in NestJS guards/services with per-user ownership checks
- COPPA-aware: only parents create accounts; no direct child data collected

---

## Queue Architecture (BullMQ + Redis)

```
1. POST /api/generate-story
   → Validate input with Zod
   → Call GPT-4o → structured JSON (title + array of {text, illustration_description})
   → Run OpenAI Moderation API on full story text; reject if flagged
  → INSERT book (status: 'generating') + all pages via Prisma
   → Enqueue one BullMQ job per page: { book_id, page_id, illustration_description, style }
   → Return { book_id } to client immediately

2. Worker (always-on Node.js process)
   → Consume jobs from BullMQ
   → Build DALL-E 3 prompt: "{illustration_description}, {style}, children's book
      illustration, vibrant colors, safe for children, no text, no letters"
  → Call DALL-E 3 API → upload image to MinIO/S3
   → UPDATE pages SET image_url = '...' WHERE id = page_id
   → When all pages for a book are done → UPDATE books SET status = 'ready'
   → On failure: retry up to 3× with exponential backoff (1s, 5s, 30s)
   → Job TTL: 24 hours

3. Client polls GET /api/book-status?book_id=X (every 3s)
   → Returns { status, pages_ready, total_pages, pages: [{page_number, image_url}] }
   → Web reader displays each page as its image arrives (no blocking wait)
```

Queue configuration:
- Redis: shared queue backend for API + worker
- BullMQ concurrency: 3 jobs at once per worker (DALL-E 3 rate limit buffer)
- Job retry: 3 attempts, exponential backoff
- Job TTL: 24 hours

---

## Phase 1 — Requirements & Analysis

### Functional Requirements
1. User registration / login (Google OAuth)
2. Subscription management (Stripe — 7-day free trial, then $9.99/month)
3. 5-step book creation wizard (see Configuration Options above)
4. AI story generation: GPT-4o → structured JSON → 8 / 12 / 16 pages
5. Async AI illustration: DALL-E 3 via BullMQ → per page → progressive display
6. Web book reader: page-flip UI, progressive image loading, mobile responsive
7. PDF export: Puppeteer-based rendering, print-optimized, authenticated endpoint
8. User library: all books, status badges, re-read, regenerate, delete
9. Book sharing via unique read-only link (optional feature)

### Non-Functional Requirements
- COPPA-aware: parents create accounts; no child personal data collected directly
- Content safety: OpenAI Moderation API on every generated story before DB write
- Data isolation: strict ownership checks on all protected resources
- Performance: story generation P95 < 30s; first page image < 60s; all images < 3 min
- Accessibility: WCAG 2.1 AA on the book reader
- Security: all OpenAI API keys server-side only; inputs validated with Zod; Stripe webhook signatures verified; HTTPS enforced
- **Unit test coverage: minimum 65% across all source files** (enforced in CI — builds fail below threshold)

### Age × Story Type Matrix

| Story Type | 3–4 | 5–6 | 7–9 |
|-----------|:---:|:---:|:---:|
| Educational (all sub-types) | ✅ | ✅ | ✅ |
| Big Feelings | ✅ | ✅ | — |
| Bedtime | ✅ | ✅ | — |
| Animals | ✅ | ✅ | ✅ |
| Adventure | — | ✅ | ✅ |
| Family & Siblings | ✅ | ✅ | — |
| Fantasy & Magic | — | ✅ | ✅ |
| Humor | ✅ | ✅ | ✅ |
| Identity | ✅ | ✅ | ✅ |
| School Transitions | — | ✅ | ✅ |
| Nature | ✅ | ✅ | ✅ |
| Mystery | — | — | ✅ |

---

## Phase 2 — System Design

### AI Prompt Architecture

**System prompt** (per story type + age band):
- Narrative structure rules (beginning / middle / end; moral arc)
- Vocabulary level: age-adapted (simple nouns + basic verbs for 3–4; richer for 7–9)
- Page count and text-per-page target
- Educational objective (if Educational type + sub-type)
- Safety constraints: age-appropriate themes only, no violence/fear/adult content

**User prompt** (filled from wizard config):
```
Child's name: {child_name} | Age: {age_group} | Pronouns: {pronouns}
Friend: {friend_name} | Pet: {pet_name} ({pet_type}) | Sibling: {sibling_name}
Setting: {setting}
Story brief: {story_description}
Educational focus: {educational_subtype}
```

**Output format** (GPT-4o structured output):
```json
{
  "title": "string",
  "pages": [
    { "text": "string", "illustration_description": "string" }
  ]
}
```

**Illustration prompt** (per page):
```
{illustration_description}, {illustration_style} style, children's book illustration,
vibrant warm colors, safe for children, no text, no words, no letters, no numbers
```

### Security Design (OWASP Top 10)

| Risk | Mitigation |
|------|-----------|
| A01 Broken Access Control | Ownership checks in NestJS guards/services on every protected endpoint |
| A02 Cryptographic Failures | HTTPS enforced; secrets in env vars only; never in client bundle |
| A03 Injection | Zod validation on all API inputs; Prisma parameterized query APIs |
| A07 Auth Failures | Google OAuth token/session validation; secure callback handling; rate limiting |
| A09 Logging Failures | Sentry for errors; no PII in logs |
| Stripe | `stripe.webhooks.constructEvent()` signature verification on every webhook |
| OpenAI | Moderation API blocks any story with flagged content before it reaches DB |

---

## Phase 3 — Implementation

### 3a — Foundation (parallel)
1. **Monorepo scaffold** — `apps/backend` (NestJS), `apps/frontend` (Next.js), `packages/shared`
2. **Local infra setup** — Docker Compose for PostgreSQL, Redis, MinIO
3. **Backend setup** — Google OAuth flow, Prisma base schema, core module scaffolding
4. **Queue setup** — BullMQ queue definitions + worker scaffold connected to Redis

### 3b — Core AI Services (depends on 3a)
5. **Story generation service** — prompt builder (theme + age band + educational sub-type) → GPT-4o structured call → Moderation API check → DB save → enqueue image jobs
6. **Image generation worker** — BullMQ consumer → DALL-E 3 → MinIO/S3 upload → DB update → completion signal

### 3c — UI (parallel with 3b, depends on 3a)
7. **Auth UI** — login, signup, Google OAuth callback pages
8. **Book creation wizard** — 5-step form with Zod validation, step progress indicator, config preview before submit
9. **Web book reader** — page-flip component, progressive image loading (skeleton → image), mobile responsive
10. **User library** — book grid with status badges (Generating / Ready), re-read, regenerate, delete actions

### 3d — Business Layer (parallel with 3b)
11. **Subscription flow** — pricing page → Stripe Checkout → success/cancel → webhook handler → DB update
12. **PDF export** — Puppeteer layout matching web reader, authenticated `/api/export-pdf` endpoint

### 3e — Polish
13. **Onboarding** — first-time user wizard, curated example books to preview
14. **Error recovery** — generation failed state, retry button, polling timeout handling
15. **Prompt coverage** — system prompts for all 12 story types × 3 age bands × 8 educational sub-types

---

## Phase 4 — Testing & QA

| Test Type | Scope | Tool | Pass Criteria |
|-----------|-------|------|--------------|
| **Unit** | Prompt builder, age-type matrix, Zod schemas, queue helpers, PDF layout logic | **Vitest** | **≥ 65% line + branch coverage (CI enforced); 100% tests passing** |
| Integration | All 4 API routes, Stripe webhook | Vitest + supertest | All routes respond correctly |
| E2E | signup → subscribe → wizard → generate → read → PDF | Playwright | Full happy path green |
| Content Safety | Adversarial inputs attempting bad output | Manual + automated | 0 flagged content reaches DB |
| Queue Resilience | DALL-E 3 failure → retry; job TTL expiry | Vitest | Retry logic works; no zombie jobs |
| Auth Isolation | Cross-user book access attempt | Playwright | 403 / ownership guard blocks all cross-user reads |
| Performance | Story generation, first image, all images | Playwright timing | P95: story <30s, first image <60s, all <3min |
| Accessibility | Web reader | axe-core + manual | Lighthouse a11y ≥ 90; keyboard nav works |

### Unit Test Coverage Details

**Target: ≥ 65% line and branch coverage across `src/`**  
Coverage is collected by Vitest with V8 provider and reported in CI.

**Priority modules to cover (drives the 65% baseline):**

| Module | What to test |
|--------|--------------|
| `lib/prompts/builder.ts` | Prompt generation per story type, age band, educational sub-type; character slot injection |
| `lib/prompts/storyTypes.ts` | Age-type matrix — correct types returned per age group; out-of-range inputs |
| `lib/validation/bookConfig.ts` | Zod schema — valid configs pass; missing required fields fail; edge values |
| `lib/queue/imageJobs.ts` | Job payload construction; retry config; TTL values |
| `lib/pdf/layout.ts` | Page layout dimensions; text truncation guard; image placeholder fallback |
| `lib/moderation.ts` | Flagged content throws; clean content passes; error from API handled gracefully |
| `lib/stripe/webhooks.ts` | Each webhook event type maps to correct DB action |

**Vitest coverage config (`vitest.config.ts`):**
```ts
coverage: {
  provider: 'v8',
  reporter: ['text', 'lcov'],
  thresholds: {
    lines: 65,
    branches: 65,
  },
  exclude: ['**/*.test.ts', 'node_modules', '.next', 'app/**'],
}
```

**CI enforcement:** Coverage check runs on every pull request. Merging is blocked if thresholds are not met.

---

## Phase 5 — Deployment

### Infrastructure

| Service | Provider | Purpose |
|--------|---------|---------|
| Frontend | Dokploy-managed container | Next.js web app deployment |
| Backend API | Dokploy-managed container | NestJS API deployment |
| Worker | Dokploy-managed container | BullMQ consumer for generation jobs |
| Queue | Redis | BullMQ backend |
| Database | PostgreSQL | Application data store via Prisma |
| Object storage | MinIO (local/test) + S3 (prod) | Image and PDF assets |
| Payments | Stripe | Subscription billing + webhooks |
| Error tracking | Sentry | Real-time error alerting |
| Metrics | Provider-native metrics | Service/resource monitoring |

### Environment Variables Required

```
# OpenAI
OPENAI_API_KEY=

# Backend/Data
DATABASE_URL=
REDIS_URL=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Object Storage
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_BUCKET=
S3_REGION=
S3_ENDPOINT=                      # required for MinIO in local/test

# Sentry
SENTRY_DSN=

# Public frontend config
NEXT_PUBLIC_API_BASE_URL=
```

### Go-Live Checklist
- [ ] All env vars set in deployment environment dashboards
- [ ] No secrets in source code or git history
- [ ] Ownership checks and authorization guards verified on protected endpoints
- [ ] Stripe webhook endpoint registered and signature verification passing
- [ ] OpenAI Moderation API tested with edge-case inputs in production
- [ ] Worker deployed and consuming jobs from Redis
- [ ] Smoke test: account creation → subscription → book generated → PDF downloaded
- [ ] Sentry receiving test event
- [ ] Custom domain configured; TLS active
- [ ] Metrics dashboard reachable for frontend/backend/worker

---

## Phase 6 — Post-Launch

### Week-1 KPIs to Track
- Signups, activation rate (% who create ≥1 book), trial → paid conversion, churn rate
- Most popular story types, age groups, educational sub-types
- Story quality ratings (thumbs up/down per book)
- PDF download rate (signals intent to keep/print)

### Iteration Cadence
- **Biweekly**: review low-rated books → refine system prompts
- **Monthly**: add new story themes based on usage analytics
- **Quarterly**: evaluate new features against roadmap

### Post-MVP Roadmap
1. Audio narration (ElevenLabs TTS — read-aloud mode)
2. Mobile app (React Native, shared story data)
3. Multilingual stories (Spanish, French, German)
4. Print-on-demand integration (Printful or Gelato API)
5. Teacher / classroom accounts (bulk generation, curriculum themes)
6. Child photo upload → style-transfer to illustration character

---

## Verification Checklist

- [ ] **Phase 1**: Requirements reviewed; age-type matrix confirmed; prompt templates reviewed for child safety
- [ ] **Phase 2**: Architecture diagram approved; DB schema reviewed; ownership and authz model verified
- [ ] **Phase 3**: All features implemented; zero TypeScript errors; zero console errors in production build
- [ ] **Phase 4**: All tests green; **unit test coverage ≥ 65% verified in CI**; Lighthouse accessibility ≥ 90; zero content safety failures; auth isolation verified
- [ ] **Phase 5**: Smoke test passes; Stripe test payment processed end-to-end; Sentry receiving events; all env vars verified
- [ ] **Phase 6**: Week-1 KPIs reviewed; first prompt iteration shipped based on user ratings

---

## Scope — Excluded from MVP

- Mobile native app (iOS/Android)
- Audio narration / TTS read-aloud
- Physical print-on-demand delivery
- Multilingual story support
- Social sharing / public book gallery
- Teacher / school admin accounts
- Child photo upload → illustration character matching
