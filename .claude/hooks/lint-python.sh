#!/bin/bash
# PostToolUse hook: auto-fix and format Python files with ruff
# Non-blocking: auto-fixes what it can, warns about the rest, never blocks edits.
# Rationale: intermediate edits during multi-step work often have transient lint
# issues that the agent will fix in subsequent edits. Blocking each step kills flow.

set -uo pipefail

INPUT=$(cat)
FILE=$(echo "$INPUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('tool_input',{}).get('file_path',''))" 2>/dev/null || true)

# Only run for .py files in payment-service/
if [[ "$FILE" == *payment-service/*.py ]]; then
    cd "$CLAUDE_PROJECT_DIR/payment-service"
    REL_PATH="${FILE#*payment-service/}"

    # Check if ruff is available locally
    if ! command -v ruff &>/dev/null; then
        # Try via docker if running
        if docker compose ps payment-service 2>/dev/null | grep -q "running"; then
            docker compose exec -T payment-service ruff check --fix --quiet "$REL_PATH" >/dev/null 2>&1
            docker compose exec -T payment-service ruff format --quiet "$REL_PATH" >/dev/null 2>&1
        fi
        exit 0
    fi

    # 1. Auto-fix safe issues (imports, formatting) — fully silent
    ruff check --fix --quiet "$REL_PATH" >/dev/null 2>&1

    # 2. Format — fully silent
    ruff format --quiet "$REL_PATH" >/dev/null 2>&1

    # 3. Report remaining issues — one-line summary, never block
    if ! ruff check --quiet "$REL_PATH" >/dev/null 2>&1; then
        SUMMARY=$(ruff check "$REL_PATH" 2>/dev/null | tail -1)
        echo "ruff: $SUMMARY (auto-fixed what was possible, remaining need manual fix)"
    fi
fi

# Always exit 0 — never block edits
exit 0
