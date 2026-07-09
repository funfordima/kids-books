---
name: "Testing Standards"
description: "Vitest testing standards for this project. Applied to all test and spec files."
applyTo: "**/*.{test,spec}.{ts,tsx}"
---

# Testing Standards

## Framework & Coverage
- **Test runner**: Vitest with V8 coverage provider
- **Coverage threshold**: ≥ 65% line AND branch across `src/` — CI blocks merge below this
- **Pass rate**: 100% — no failing tests may be committed to main

## File Location
- Co-locate tests next to source: `lib/prompts/builder.ts` → `lib/prompts/builder.test.ts`
- Alternatively use `src/__tests__/` for integration tests
- E2E tests go in `e2e/` and run via Playwright (separate from Vitest)

## Mocking External Services
Always mock these in unit tests — never call live APIs:
```ts
// OpenAI
vi.mock('openai', () => ({ default: vi.fn() }))

// Prisma client wrapper
vi.mock('@/lib/db/prisma', () => ({ prisma: { $transaction: vi.fn() } }))

// Stripe
vi.mock('stripe', () => ({ default: vi.fn() }))

// BullMQ
vi.mock('bullmq', () => ({ Queue: vi.fn(), Worker: vi.fn() }))
```

## Priority Test Modules
These modules drive the 65% coverage baseline — test them first:

| Module | What to Test |
|--------|-------------|
| `lib/prompts/builder.ts` | Prompt generation per story type + age band + educational sub-type |
| `lib/prompts/storyTypes.ts` | Age-type matrix correctness; out-of-range inputs |
| `lib/validation/bookConfig.ts` | Zod schema — valid configs pass; missing required fields fail |
| `lib/queue/imageJobs.ts` | Job payload construction; retry config; TTL values |
| `lib/pdf/layout.ts` | Page layout; text truncation guard; image placeholder fallback |
| `lib/moderation.ts` | Flagged content throws; clean content passes; API errors handled |
| `lib/stripe/webhooks.ts` | Each webhook event type maps to correct DB action |

## API Route Testing (supertest)
```ts
import { testApiHandler } from 'next-test-api-route-handler'
// or use supertest with a test server
```
- Test: valid request → 200 with expected body
- Test: invalid Zod input → 400 with `{ error, details }`
- Test: unauthenticated request → 401
- Test: unauthorized user (wrong user_id) → 403

## Test Structure
```ts
describe('module/feature', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('should [expected behavior] when [condition]', () => {
    // Arrange
    // Act
    // Assert
  })
})
```
