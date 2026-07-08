# DarkFactory Quality Gate — runs TypeScript check + Vitest coverage
# Exit 0 = PASS, Exit 1 = FAIL

$pass = $true

Write-Host "=== Quality Gate Check ==="

# --- TypeScript ---
Write-Host ""
Write-Host "[1/2] TypeScript compilation check..."
& npx tsc --noEmit
if ($LASTEXITCODE -eq 0) {
    Write-Host "TypeScript: PASS"
} else {
    Write-Host "TypeScript: FAIL"
    $pass = $false
}

# --- Vitest + Coverage ---
Write-Host ""
Write-Host "[2/2] Vitest tests + coverage..."
& npx vitest run --coverage
if ($LASTEXITCODE -eq 0) {
    Write-Host "Tests: PASS"
} else {
    Write-Host "Tests: FAIL"
    $pass = $false
}

# --- Verdict ---
Write-Host ""
Write-Host "=== GATE VERDICT ==="
if ($pass) {
    Write-Host "PASS — work is ready for code review"
    exit 0
} else {
    Write-Host "FAIL — resolve issues above before proceeding"
    exit 1
}
