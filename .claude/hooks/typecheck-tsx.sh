#!/bin/bash
# PostToolUse hook: run tsc --noEmit after editing .ts/.tsx files
# Blocks on real type errors. Warns (non-blocking) on unused vars/params,
# which are normal during multi-step edits.

set -uo pipefail

INPUT=$(cat)
TOOL_INPUT=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('file_path',''))" 2>/dev/null || true)

# Only run for .ts/.tsx files (not in payment-service/ or node_modules/)
if [[ "$TOOL_INPUT" == *.ts* ]] && [[ "$TOOL_INPUT" != *payment-service/* ]] && [[ "$TOOL_INPUT" != *node_modules/* ]] && [[ "$TOOL_INPUT" != *transappweb/* ]]; then
    cd "$CLAUDE_PROJECT_DIR"
    # --pretty false: no ANSI codes, reliable grep
    TSC_OUTPUT=$(npx tsc --noEmit --pretty false 2>&1)
    TSC_EXIT=$?

    if [ $TSC_EXIT -ne 0 ]; then
        # Separate real errors from unused-variable warnings
        # TS6133 = declared but never read, TS6196 = declared but never used
        REAL_ERRORS=$(echo "$TSC_OUTPUT" | grep "error TS" | grep -v "TS6133\|TS6196" || true)

        if [ -n "$REAL_ERRORS" ]; then
            # Real type errors — show pretty output and block
            npx tsc --noEmit --pretty 2>&1 | head -30
            echo "TypeScript type errors found — fix before proceeding."
            exit 1
        else
            # Only unused vars/params — warn but don't block
            UNUSED_COUNT=$(echo "$TSC_OUTPUT" | grep -c "TS6133\|TS6196" || true)
            echo "tsc: $UNUSED_COUNT unused variable(s) — will need cleanup before commit"
        fi
    fi
fi
