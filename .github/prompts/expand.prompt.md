---
name: expand
description: "EXPAND phase — clarifies scope from the SDLC plan and generates a precise implementation scope for a given phase or task. Use when starting a new phase or feature to lock down what will and won't be built."
agent: Orchestrator
tools: [read, search]
---

# EXPAND Phase

Clarifies scope from `docs/SDLC_PLAN.md` and produces a locked implementation scope document before any design or coding begins.

## Input
- Phase number or task description (optional — defaults to active phase from sdlc-phase-tracker)

## Steps

1. Use the `sdlc-phase-tracker` skill to identify the active phase and pending tasks
2. Read the relevant phase section of `docs/SDLC_PLAN.md` in full
3. List every in-scope item (from the SDLC plan)
4. Explicitly list out-of-scope items (deferred to later phases)
5. Identify dependencies (what must be built first)
6. Confirm: are there any ambiguities in the requirements?

## Output

```
=== EXPAND: Phase N — [Phase Name] ===

IN SCOPE (will be built):
- [item 1]
- [item 2]

OUT OF SCOPE (explicitly deferred):
- [item]

Dependencies (must exist before this phase):
- [dependency]

Ambiguities requiring clarification:
- [question] → [assumed answer, or "needs user input"]

Scope locked: YES / NO (pending clarification)
```

## DarkFactory Rule
Scope must be locked before DESIGN phase begins. If ambiguities exist, surface them to the user and stop.
