---
name: design
description: "DESIGN phase — produces architecture decisions, directory structure, interface definitions, and integration points for the active SDLC phase. Run after EXPAND, before ANALYZE."
agent: Orchestrator
tools: [read, search]
---

# DESIGN Phase

Produces architecture decisions for the active phase. No code is written — only interfaces, directory structure, and integration contracts are defined.

## Steps

1. Read the EXPAND output (or run `/expand` if not done)
2. Read the existing codebase structure (if any)
3. For each in-scope item, define:
   - **Directory/file location** — where will this code live?
   - **Interface** — what are the inputs, outputs, and error types for each function/component?
   - **Integration points** — what external services does this touch (Supabase, OpenAI, BullMQ, Stripe)?
   - **Data flow** — how does data move through the system?
4. Identify any architectural risks or decisions with tradeoffs
5. Confirm alignment with the tech stack in `copilot-instructions.md`

## Output

```
=== DESIGN: Phase N — [Phase Name] ===

Directory Structure:
src/
  app/api/[route-name]/
    route.ts           # API route handler
  lib/[module]/
    index.ts           # Core logic
    index.test.ts      # Co-located tests

Key Interfaces:
- generateStory(config: BookConfig): Promise<Story>
- enqueueImageJobs(bookId: string, pages: Page[]): Promise<void>

Integration Points:
- OpenAI GPT-4o → structured JSON output
- OpenAI Moderation API → check before DB write
- Supabase → insert books + pages
- BullMQ → enqueue one job per page

Architectural Decisions:
1. [Decision] — [rationale] — [tradeoff]

Risks:
- [risk] → [mitigation]
```

## DarkFactory Rule
No code is written in the DESIGN phase. Design must be reviewed and confirmed before ANALYZE begins.
