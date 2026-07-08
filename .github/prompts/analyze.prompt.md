---
name: analyze
description: "ANALYZE phase — converts acceptance criteria into a concrete build plan: test cases, build order, proof requirements. Produces the readiness spec that Developer uses to implement. Run after DESIGN, before BUILD."
agent: Orchestrator
tools: [read, search]
---

# ANALYZE Phase

Pre-build readiness check. Converts acceptance criteria into concrete test cases, determines build order, and identifies proof requirements before the Developer writes a single line.

## Steps

1. For each acceptance criterion (AC) in the user story:
   - Write the specific Vitest test case that would verify it (test name + what to mock + what to assert)
   - Identify what must be mocked (OpenAI, Stripe, Supabase, BullMQ)
2. Define build order — what must be implemented first?
3. List proofs required (what evidence confirms each AC is met?)
4. Identify any missing information that would block implementation

## Output

```
=== ANALYZE: [Story Title] (#N) ===

AC-1: [description]
  Test: it('should [behavior] when [condition]', ...)
  Mocks: vi.mock('openai'), vi.mock('@supabase/ssr')
  Assert: expect(result).toEqual({ ... })
  Proof: HTTP 200 with correct shape; DB record created

AC-2: [description]
  Test: it('should return 400 when input is invalid', ...)
  Mocks: none needed
  Assert: expect(response.status).toBe(400)
  Proof: Zod error in response body

Build Order:
1. Zod schema (lib/validation/bookConfig.ts)
2. Core service function (lib/story/generate.ts)
3. API route handler (app/api/generate-story/route.ts)
4. Tests for all of the above

Blockers / Missing Info:
- [blocker, or "none"]

Readiness: GO / BLOCKED
```

## DarkFactory Rule
If `Readiness: BLOCKED`, stop and resolve blockers before handing off to Developer.
Every AC must have a corresponding test case before BUILD starts.
