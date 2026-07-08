---
name: "Next.js 14 App Router Standards"
description: "Next.js 14 App Router coding standards for this project. Applied to all TypeScript/TSX source files."
applyTo: "**/*.{ts,tsx}"
---

# Next.js 14 App Router Standards

## Component Model
- **Default to Server Components** — do NOT add `"use client"` unless the component uses browser APIs (`window`, `document`, `localStorage`), React hooks (`useState`, `useEffect`, `useRef`), or event handlers
- Add `"use client"` as the **first line** of the file when needed
- Never mix server and client concerns in the same component — extract to a child client component instead

## Server Actions vs API Routes
- Use **Server Actions** (`"use server"`) for form submissions and mutations triggered by UI (e.g. book creation wizard)
- Use **API routes** (`/app/api/`) for:
  - Stripe webhook handlers
  - BullMQ job status polling (`/api/book-status`)
  - PDF export endpoint
  - Any endpoint called by external services

## Data Fetching
- Fetch data directly in Server Components — never use `useEffect` for initial data loading
- Use `cache()` and `revalidate` for expensive server-side fetches
- Never expose `SUPABASE_SERVICE_ROLE_KEY` in client components or files with `"use client"`

## Input Validation
- **All** API route inputs must be validated with **Zod** before any processing
- Return `400` with structured `{ error: string, details: ZodError }` on validation failure
- Use `z.infer<typeof schema>` for TypeScript types — never duplicate type definitions

## Supabase Pattern
```ts
// Server Component / Server Action — use SSR client
import { createServerClient } from '@supabase/ssr'

// Client Component — use browser client
import { createBrowserClient } from '@supabase/ssr'
```
- Never call `createServerClient` in a `"use client"` file
- Always check `user` from `supabase.auth.getUser()` — never trust `getSession()` alone on server

## Environment Variables
- Server-only: `OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `UPSTASH_REDIS_REST_TOKEN`, `SENTRY_DSN`
- Client-safe (`NEXT_PUBLIC_`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- If a server-only variable is accessed in a client file, it will be `undefined` at runtime — this is a security and runtime bug

## TypeScript
- `strict: true` is enforced — no `any`, no `!` non-null assertions on unknown values
- Prefer `unknown` over `any` for caught errors
- Use `satisfies` operator to validate object shapes against types without widening
