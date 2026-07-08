#!/usr/bin/env bash
# Post-tool-use formatter — runs Prettier + ESLint on edited TS/TSX files

raw_input=$(cat)
tool_name=$(echo "$raw_input" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_name',''))" 2>/dev/null)
file_path=$(echo "$raw_input" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('filePath',''))" 2>/dev/null)

edit_tools="edit replace_string_in_file create_file multi_replace_string_in_file write_file"

if ! echo "$edit_tools" | grep -qw "$tool_name"; then exit 0; fi
if [ -z "$file_path" ]; then exit 0; fi

# Skip non-source directories
if echo "$file_path" | grep -qE 'node_modules|\.next|dist|build'; then exit 0; fi

ext="${file_path##*.}"

case "$ext" in
  ts|tsx|js|jsx|json|css)
    npx prettier --write "$file_path" 2>/dev/null
    ;;
esac

case "$ext" in
  ts|tsx)
    npx eslint --fix "$file_path" 2>/dev/null
    ;;
esac

exit 0
