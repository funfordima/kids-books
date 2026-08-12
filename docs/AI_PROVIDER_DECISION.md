# AI Provider Decision

Last updated: 2026-08-11

## Decision

Step 6 uses provider ports plus server-only configuration instead of hard-coded model IDs in domain logic.

Default environment-controlled model values:
- `OPENAI_TEXT_MODEL=gpt-5.1`
- `OPENAI_IMAGE_MODEL=gpt-image-1`
- `OPENAI_MODERATION_MODEL=omni-moderation-latest`

This supersedes older SDLC wording that named GPT-4o and DALL-E 3 as fixed implementation choices. Those names remain historical planning context only; runtime behavior must flow through typed provider ports and validated environment configuration.

The Step 6 story text also referenced `gpt-5.6-terra` and `gpt-image-2` as July 2026 defaults. A current official-docs check on 2026-08-12 did not confirm those as available API model names. The implementation therefore uses configurable environment defaults aligned with the current OpenAI models/moderation documentation while keeping all domain logic model-agnostic.

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

## Official Documentation Checked

- OpenAI Models: https://platform.openai.com/docs/models
- OpenAI Moderations API: https://platform.openai.com/docs/api-reference/moderations
- OpenAI Responses Structured Outputs: https://platform.openai.com/docs/api-reference/responses
