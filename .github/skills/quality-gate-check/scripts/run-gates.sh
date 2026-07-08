#!/usr/bin/env bash
# DarkFactory Quality Gate — runs TypeScript check + Vitest coverage
# Exit 0 = PASS, Exit 1 = FAIL

set -euo pipefail

PASS=true
echo "=== Quality Gate Check ==="

# --- TypeScript ---
echo ""
echo "[1/2] TypeScript compilation check..."
if npx tsc --noEmit 2>&1; then
  echo "TypeScript: PASS"
else
  echo "TypeScript: FAIL"
  PASS=false
fi

# --- Vitest + Coverage ---
echo ""
echo "[2/2] Vitest tests + coverage..."
if npx vitest run --coverage 2>&1; then
  echo "Tests: PASS"
else
  echo "Tests: FAIL"
  PASS=false
fi

# --- Verdict ---
echo ""
echo "=== GATE VERDICT ==="
if [ "$PASS" = true ]; then
  echo "PASS — work is ready for code review"
  exit 0
else
  echo "FAIL — resolve issues above before proceeding"
  exit 1
fi
