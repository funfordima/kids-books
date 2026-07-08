#!/usr/bin/env bash
# Pre-tool-use guard — blocks dangerous operations (Linux/macOS)

raw_input=$(cat)
tool_name=$(echo "$raw_input" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_name',''))" 2>/dev/null)
tool_input=$(echo "$raw_input" | python3 -c "import sys,json; d=json.load(sys.stdin); print(json.dumps(d.get('tool_input','')))" 2>/dev/null)

dangerous_patterns=(
  'rm[[:space:]]+-rf'
  'DROP[[:space:]]+TABLE'
  'DROP[[:space:]]+DATABASE'
  'TRUNCATE[[:space:]]+TABLE'
  'git[[:space:]]+push.*--force'
  'git[[:space:]]+push.*-f[[:space:]]'
  'git[[:space:]]+reset[[:space:]]+--hard'
  'git[[:space:]]+clean[[:space:]]+-fd'
  '\-\-no\-verify'
  'ALTER[[:space:]]+TABLE.*DROP[[:space:]]+COLUMN'
)

terminal_tools="run_in_terminal execute bash shell terminal"

if echo "$terminal_tools" | grep -qw "$tool_name"; then
  for pattern in "${dangerous_patterns[@]}"; do
    if echo "$tool_input" | grep -qiE "$pattern"; then
      echo "{\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"permissionDecision\":\"deny\",\"permissionDecisionReason\":\"BLOCKED by DarkFactory guard: matched dangerous pattern '$pattern'. Commit your work first and verify intent.\"}}"
      exit 2
    fi
  done
fi

exit 0
