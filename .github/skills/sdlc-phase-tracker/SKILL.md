---
name: sdlc-phase-tracker
description: "Reads docs/SDLC_PLAN.md and reports the current active phase, gate status, and next pending tasks. Use when: identifying current project phase, checking what to work on next, verifying gate completion, getting SDLC context before starting work."
---

# SDLC Phase Tracker

Reads `docs/SDLC_PLAN.md` (the DarkFactory source of truth) and surfaces the current project state.

## When to Use
- At the start of any agent session to establish current context
- Before routing work to any agent (Orchestrator uses this first)
- When unsure which phase is active or what to implement next
- When checking whether gate requirements have been met

## Procedure

1. **Read the SDLC plan** — load `docs/SDLC_PLAN.md` in full
2. **Identify active phase** — the lowest-numbered phase that still has unchecked (`- [ ]`) items in its Verification Checklist
3. **List pending tasks** — extract all `- [ ]` items from the active phase section
4. **Identify completed items** — count all `- [x]` items across all phases
5. **Report gate requirements** — state what must be true before the current phase is complete

## Output Format

Return a structured report in this format:

```
=== SDLC Phase Tracker Report ===
Active Phase: Phase N — [Phase Name]
Completed items: X / Y total

Current Phase Gate Requirements:
- [ ] [requirement 1]
- [ ] [requirement 2]

Next 5 Pending Tasks (in priority order):
1. [task description] (Phase N)
2. [task description] (Phase N)
...

Gate Status: BLOCKED / CLEAR
Reason: [why blocked, or what evidence would clear it]
```

## Gate Rules (DarkFactory)
- **Phase 3 → 4 gate**: All implementation tasks in Phase 3 complete AND `tsc --noEmit` exits 0
- **Phase 4 → 5 gate**: `npx vitest run --coverage` exits 0 AND coverage ≥ 65% line + branch
- **Phase 5 → 6 gate**: Smoke test passes; Stripe test payment processed; Sentry receiving events
- Any phase can only advance when its Verification Checklist is fully checked

## Notes
- If `docs/SDLC_PLAN.md` is not found, report the error and stop
- If ALL checklist items are checked, report "All phases complete — project ready for post-launch"
