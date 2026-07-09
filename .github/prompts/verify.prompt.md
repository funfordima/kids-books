---
name: verify
description: "VERIFY phase — independent final verification before a phase is marked complete. Confirms all acceptance criteria are met end-to-end, all gate requirements pass, and the phase checklist is fully checked. Run after REVIEW APPROVE before advancing to the next SDLC phase."
agent: Orchestrator
tools: [read, search, execute]
---

# VERIFY Phase

Independent final verification. This phase confirms the phase gate is met before advancing. It is distinct from REVIEW — it checks the system end-to-end, not just the code.

## When to Run
- After CodeReviewer returns APPROVE for the last story in a phase
- Before updating any phase checklist item in `docs/SDLC_PLAN.md`
- Before declaring a phase complete to the user

## Verification Steps

### For Phase 3 (Implementation) → Phase 4 (Testing) gate:
- [ ] `npx tsc --noEmit` exits 0 (run quality-gate-check skill)
- [ ] All features in the Phase 3 checklist are implemented
- [ ] No `console.log` in production paths
- [ ] No secrets in source code (grep check)

### For Phase 4 (Testing) → Phase 5 (Deployment) gate:
- [ ] `npx vitest run --coverage` exits 0
- [ ] Line coverage ≥ 65% (from coverage report)
- [ ] Branch coverage ≥ 65% (from coverage report)
- [ ] Run `e2e-gate-check` skill and require `Status: PASS`
- [ ] Accessibility: Lighthouse a11y ≥ 90 on book reader (if applicable)
- [ ] Zero content safety test failures

### For Phase 5 (Deployment) → Phase 6 (Post-Launch) gate:
- [ ] Smoke test passes: signup → subscribe → generate → read → PDF download
- [ ] Stripe test payment processed end-to-end
- [ ] Sentry receiving test events
- [ ] All environment variables set in Docker/Dokploy deployment configuration
- [ ] Ownership/access checks validated in backend routes/services
- [ ] Worker service deployed and consuming BullMQ jobs

## Output

```
=== VERIFY: Phase N → Phase N+1 Gate ===

Gate Requirements:
- [x] [requirement met — evidence]
- [ ] [requirement NOT met — what's missing]

Gate Status: CLEAR / BLOCKED

If CLEAR:
  Recommend: Advance to Phase N+1
  Action: Update docs/SDLC_PLAN.md checklist items

If BLOCKED:
  Blocking items:
  1. [specific issue — what must be done to clear it]
```

## Evidence Collection Notes
- Use `quality-gate-check` for TypeScript and Vitest coverage evidence.
- Use `e2e-gate-check` for Playwright E2E evidence.
- If E2E is `BLOCKED` due to missing configuration, gate status remains `BLOCKED` unless a user-approved temporary waiver is explicitly documented.

## DarkFactory Rule
Only the Orchestrator may update the `docs/SDLC_PLAN.md` checklist after VERIFY returns CLEAR.
Never update checklist items without verification evidence.
