---
name: design-system-release
description: "Prepares design-system release artifacts for token and style guide updates. Use when: versioning design-system changes, creating changelog entries, generating migration notes for frontend consumers."
---

# Design System Release

Packages and communicates design-system changes.

## Procedure
1. Detect token and style guide changes
2. Classify change impact (major/minor/patch)
3. Generate changelog section and migration notes
4. Mark deprecated tokens and replacement paths
5. Publish release summary for frontend team

## Output Format
```
=== Design System Release Report ===
Version: X.Y.Z
Impact: major|minor|patch
Changes:
- [change]

Migration Notes:
- [note]
```
