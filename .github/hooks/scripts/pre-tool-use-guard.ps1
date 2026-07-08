# Pre-tool-use guard — blocks dangerous operations
# Reads hook input from stdin, checks for destructive patterns, returns decision

$input = $null
try {
    $rawInput = [Console]::In.ReadToEnd()
    $input = $rawInput | ConvertFrom-Json
} catch {
    # If no stdin, allow (not a tool use we care about)
    exit 0
}

$toolName  = $input.tool_name
$toolInput = $input.tool_input | ConvertTo-Json -Depth 10

# --- Dangerous terminal/shell command patterns ---
$dangerousPatterns = @(
    'rm\s+-rf',
    'Remove-Item.*-Recurse.*-Force',
    'DROP\s+TABLE',
    'DROP\s+DATABASE',
    'TRUNCATE\s+TABLE',
    'git\s+push.*--force',
    'git\s+push.*-f\b',
    'git\s+reset\s+--hard',
    'git\s+clean\s+-fd',
    '--no-verify',
    'ALTER\s+TABLE.*DROP\s+COLUMN',
    'DELETE\s+FROM\s+\w+\s*;?\s*$'   # DELETE without WHERE
)

$isTerminalTool = $toolName -in @('run_in_terminal', 'execute', 'bash', 'shell', 'terminal')

if ($isTerminalTool) {
    foreach ($pattern in $dangerousPatterns) {
        if ($toolInput -match $pattern) {
            $result = @{
                hookSpecificOutput = @{
                    hookEventName         = 'PreToolUse'
                    permissionDecision    = 'deny'
                    permissionDecisionReason = "BLOCKED by DarkFactory pre-tool-use guard: matched dangerous pattern '$pattern'. " +
                                              "Non-destructive operations only. Commit your work first and verify intent."
                }
            }
            $result | ConvertTo-Json -Compress
            exit 2
        }
    }
}

# --- Block editing hook/guard scripts themselves (safety meta-control) ---
$protectedPaths = @(
    '\.github[/\\]hooks',
    '\.github[/\\]copilot-instructions\.md'
)

$isEditTool = $toolName -in @('edit', 'replace_string_in_file', 'create_file', 'multi_replace_string_in_file', 'write_file')

if ($isEditTool) {
    foreach ($path in $protectedPaths) {
        if ($toolInput -match $path) {
            $result = @{
                hookSpecificOutput = @{
                    hookEventName         = 'PreToolUse'
                    permissionDecision    = 'ask'
                    permissionDecisionReason = "Protected path detected: '$path'. Modifying hook scripts or global instructions requires explicit user confirmation."
                }
            }
            $result | ConvertTo-Json -Compress
            exit 0
        }
    }
}

exit 0
