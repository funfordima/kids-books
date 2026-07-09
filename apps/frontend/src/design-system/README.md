# Design System (Bootstrap v1)

## Scope
- Location: `apps/frontend/src/design-system`
- v1 includes: design tokens + content style guide
- Enforcement: warning-first

## Structure
- `tokens/` source-of-truth token files
- `generated/` generated output targets (seeded with preview artifacts)
- `content-style-guide.md` product copy rules

## Token Categories
- Colors
- Typography
- Spacing
- Radius
- Shadow
- Motion

## Intended Next Integration
1. Wire Style Dictionary (or equivalent) to generate CSS and TypeScript outputs.
2. Add warning-only checks for raw values and deprecated tokens.
3. Apply content-style checks in pull request validation.
