---
name: design-token-governance
description: "Runs design token governance checks in apps/frontend and reports warning-first violations. Use when: validating token usage, detecting raw values, reviewing naming consistency, preparing pre-merge design QA evidence."
---

# Design Token Governance

Checks whether frontend code follows token usage policy.

## Policy (v1)
- Target path: `apps/frontend/**`
- Raw hex colors are warnings unless explicitly allowlisted
- Raw spacing values are warnings unless explicitly allowlisted
- Deprecated token names are warnings with suggested replacement

## Procedure
1. Scan styles and components for raw design values
2. Compare used tokens against active and deprecated token registries
3. Emit warning-first report with file-level evidence
4. Suggest automatic replacements where safe

## Output Format
```
=== Design Token Governance Report ===
Mode: warning-only
Violations:
- WARN [rule-id] path/to/file.tsx:line - message

Suggestions:
- path/to/file.tsx:line -> replace X with Y
```
