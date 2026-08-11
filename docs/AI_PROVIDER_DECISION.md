# AI Provider Decision

Last updated: 2026-08-11

## Decision

Step 6 uses provider ports plus server-only configuration instead of hard-coded model IDs in domain logic.

Default environment-controlled model values:
- `OPENAI_TEXT_MODEL=gpt-5.6-terra`
- `OPENAI_IMAGE_MODEL=gpt-image-2`
- `OPENAI_MODERATION_MODEL=omni-moderation-latest`

This supersedes older SDLC wording that named GPT-4o and DALL-E 3 as fixed implementation choices. Those names remain historical planning context only; runtime behavior must flow through typed provider ports and validated environment configuration.

## Rationale

- Keeps generation behavior configurable without code changes.
- Allows tests to mock provider ports without live paid calls.
- Prevents frontend or domain services from depending directly on API keys, SDK globals, raw provider payloads, prompts, or deprecated model assumptions.
- Preserves fail-closed moderation before persistence and picture enqueue.

## Current Boundaries

- Text generation, moderation, image generation, approved-story persistence, approved-page loading, and picture enqueueing are separate ports.
- OpenAI SDK request/response details stay inside backend adapters.
- Automated verification uses mocked providers only.
- Production credential setup, runtime worker packaging, object storage upload, and direct Prisma repository adapters remain later wiring work.
