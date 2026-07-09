---
name: design-system-bootstrap
description: "Bootstraps a code-first design system inside apps/frontend with tokens and content style guide foundations. Use when: initializing design system v1, creating initial token files, writing first-party usage docs, adding warning-only checks."
---

# Design System Bootstrap

Creates the initial, code-first design system baseline for this project.

## Scope
- Frontend-only location: `apps/frontend`
- v1 coverage: design tokens + content style guide
- Enforcement mode: warning-only
- No Figma dependency required

## Inputs
- Token categories to initialize (colors, typography, spacing, radius, shadow, motion)
- Content style guide focus (tone, vocabulary level, microcopy rules)
- Theme policy (single theme or multiple themes)

## Procedure
1. Create token source files under `apps/frontend/src/design-system/tokens/`
2. Create generated token output targets under `apps/frontend/src/design-system/generated/`
3. Add a style guide at `apps/frontend/src/design-system/content-style-guide.md`
4. Add README usage docs at `apps/frontend/src/design-system/README.md`
5. Add warning-only lint/check scripts to frontend package scripts
6. Produce a bootstrap summary with created files and next actions

## Output Format
```
=== Design System Bootstrap Report ===
Scope: apps/frontend
Mode: warning-only
Created:
- [file path]
- [file path]

Warnings:
- [warning]

Next:
1. [next step]
2. [next step]
```
