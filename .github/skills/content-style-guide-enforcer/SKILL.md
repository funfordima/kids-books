---
name: content-style-guide-enforcer
description: "Audits UI copy in apps/frontend against the content style guide and emits warning-only findings. Use when: reviewing UX copy, checking tone consistency, validating age-appropriate language, preparing release QA."
---

# Content Style Guide Enforcer

Applies content rules to UI copy in frontend files.

## Scope
- Files: `apps/frontend/**/*.{ts,tsx,md,mdx}`
- Rules source: `apps/frontend/src/design-system/content-style-guide.md`

## Checks
- Tone consistency (supportive, parent-focused, concise)
- Reading complexity thresholds
- Banned words or phrases list
- CTA wording consistency and error message clarity

## Output Format
```
=== Content Style Report ===
Mode: warning-only
Findings:
- WARN [rule-id] path/to/file.tsx:line - message

Suggested rewrite:
- Before: "..."
- After:  "..."
```
