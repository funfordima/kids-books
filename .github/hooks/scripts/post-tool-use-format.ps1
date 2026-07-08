# Post-tool-use formatter — runs Prettier + ESLint on edited TypeScript/TSX files
# Triggered after every file edit tool call

$input = $null
try {
    $rawInput = [Console]::In.ReadToEnd()
    $input = $rawInput | ConvertFrom-Json
} catch {
    exit 0
}

$toolName = $input.tool_name
$editTools = @('edit', 'replace_string_in_file', 'create_file', 'multi_replace_string_in_file', 'write_file')

if ($toolName -notin $editTools) { exit 0 }

# Extract file path from tool input
$toolInput = $input.tool_input
$filePath  = $toolInput.filePath

if (-not $filePath) { exit 0 }

# Only format TypeScript/TSX/JS/JSX source files
$formattableExtensions = @('.ts', '.tsx', '.js', '.jsx', '.json', '.css')
$ext = [System.IO.Path]::GetExtension($filePath).ToLower()

if ($ext -notin $formattableExtensions) { exit 0 }

# Skip node_modules and .next
if ($filePath -match 'node_modules|\.next|dist|build') { exit 0 }

# Run Prettier
$prettierResult = & npx prettier --write $filePath 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Prettier warning on $filePath : $prettierResult"
}

# Run ESLint fix on TS/TSX only
if ($ext -in @('.ts', '.tsx')) {
    $eslintResult = & npx eslint --fix $filePath 2>&1
    if ($LASTEXITCODE -gt 1) {
        Write-Host "ESLint error on $filePath : $eslintResult"
    }
}

exit 0
