---
name: "API Route Standards"
description: "API route coding standards. Applied to all files under the app/api directory."
applyTo: "src/app/api/**/*.{ts,tsx}"
---

# API Route Standards

## Mandatory Pattern (every route)
Every API route handler MUST follow this order:
1. Parse and validate request body/params with **Zod** — return `400` on failure
2. Verify authentication via server-side auth/session guard — return `401` if no authenticated user
3. Verify authorization (user owns the resource) — return `403` if not owner
4. Process business logic
5. Return typed JSON response

```ts
import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'

const schema = z.object({ ... })

export async function POST(req: NextRequest) {
  // 1. Validate input
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  // 2. Auth
  const user = await getAuthenticatedUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 3. Business logic ...
}
```

## Content Safety (AI endpoints)
Routes that write AI-generated content to the database **MUST** run OpenAI Moderation:
```ts
const moderation = await openai.moderations.create({ input: storyText })
if (moderation.results[0].flagged) {
  return NextResponse.json({ error: 'Content safety check failed' }, { status: 422 })
}
```
This applies to: `/api/generate-story` and any future AI-output endpoints.

## Stripe Webhook Route
```ts
// Always verify signature — never skip
const sig = req.headers.get('stripe-signature')!
let event: Stripe.Event
try {
  event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!)
} catch {
  return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
}
```

## Error Responses
Use consistent error shapes:
```ts
// 400 Bad Request
{ "error": "Invalid input", "details": { ... } }

// 401 Unauthorized
{ "error": "Authentication required" }

// 403 Forbidden
{ "error": "Access denied" }

// 422 Unprocessable
{ "error": "Content safety check failed" }

// 500 Internal Error — do NOT expose internal details
{ "error": "Internal server error" }
```

## No PII in Logs
- Never log: email addresses, user IDs, names, child names, story content
- Use Sentry for error capture — Sentry scrubs PII automatically if configured
- `console.log` is forbidden in production API routes — use `console.error` in catch blocks only during development
