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
- Never expose server-only secrets in client components or files with `"use client"`

## Input Validation
- **All** API route inputs must be validated with **Zod** before any processing
- Return `400` with structured `{ error: string, details: ZodError }` on validation failure
- Use `z.infer<typeof schema>` for TypeScript types — never duplicate type definitions

## Auth and Data Access Pattern
```ts
// Frontend should call backend APIs through typed utilities
// Authentication and DB access are enforced on the backend
```
- Keep business and ownership checks in backend services and API routes
- Never trust client-provided user identifiers for authorization decisions

## Environment Variables
- Server-only: `DATABASE_URL`, `REDIS_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `OPENAI_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT`, `SENTRY_DSN`
- Client-safe (`NEXT_PUBLIC_`): `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- If a server-only variable is accessed in a client file, it will be `undefined` at runtime — this is a security and runtime bug

## TypeScript
- `strict: true` is enforced — no `any`, no `!` non-null assertions on unknown values
- Prefer `unknown` over `any` for caught errors
- Use `satisfies` operator to validate object shapes against types without widening
