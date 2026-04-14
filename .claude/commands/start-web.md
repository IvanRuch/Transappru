Web session kickoff — read web project state and orient for the next task.
This command MUST NOT modify files — only read and report.

## Context

Web version uses **Expo Web** from the shared `/src/` codebase (ADR-001).
Platform-specific screens use `.web.tsx` overrides. Layout: `_layout.web.tsx` wraps in `WebAppLayout`.

## Sources to read (in parallel)

1. `Writerside/topics/dev-web.md` — feature parity checklist, shared hooks, Yandex Maps, CI/CD
2. `Writerside/topics/project-dashboard.md` — overall progress
3. `Writerside/topics/decision-log.md` — architectural decisions (ADR-001 through ADR-004)
4. `.claude/rules.md` — session management, WebAppLayout rule, mobile/web parity
5. Recent git activity:

```bash
git log -5 --oneline
```

6. Uncommitted work:

```bash
git diff --stat
```

7. Active plan files:

```bash
ls -la .claude/plans/*.md 2>/dev/null && echo "---" && head -30 .claude/plans/*.md 2>/dev/null || echo "No active plans"
```

8. List web-specific screen files:

```bash
echo "=== .web.tsx screens ===" && find src/screens -name "*.web.tsx" | sort && echo "=== .web.tsx routes ===" && find app -name "*.web.tsx" | sort
```

## Output format (under 25 lines)

```
## Web Session Start

**Stack:** Expo Web (React Native Web), TypeScript, Expo Router
**Last commit:** [date + message]
**Uncommitted:** [file count or "clean"]
**Active plan:** [plan name + summary or "none"]

### Feature Parity
[Summary from dev-web.md checklist — what's done, what's missing]

### Web-Specific Files
[count] .web.tsx screens, [count] .web.tsx routes

### Shared Hooks
[list from dev-web.md — useAuthFlow, usePinConfirm, etc.]

### Next Task
[From plan file, dashboard, or user's direction]
**What to do:** [1 sentence]
**Key files:** [paths to start from]
```
