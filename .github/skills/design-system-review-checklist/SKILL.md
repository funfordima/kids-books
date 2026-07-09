---
name: design-system-review-checklist
description: "Read-only design-system review checklist for CodeReviewer. Use when: reviewing pull requests for design-system compliance, validating token and content policy adherence, producing phase evidence."
---

# Design System Review Checklist

Run this as a read-only review step.

## Axes
1. Token compliance (no unauthorized raw values)
2. Content style compliance (copy rules)
3. Accessibility baseline (semantic structure and a11y hints)
4. Regression risk (visual or behavior deltas)
5. Documentation parity (changes reflected in design docs)

## Output Contract
- Findings ordered by severity: HIGH, MEDIUM, LOW
- Every finding includes: file path, line number, impact, recommended fix
- If no findings: explicitly report "No design-system findings"
