---
description: Web session kickoff — read web project state and orient for the next task
---

Web session kickoff — read web project state and orient for the next task.
READ-ONLY. This command MUST NOT modify files.

Use `/start-web` (not `/start`) when the next task is web-specific.

## Context

Web = **Expo Web** from the shared `/src/` codebase (ADR-001).
Platform-specific screens use `.web.tsx` overrides.
Authenticated layout: `app/(authenticated)/_layout.web.tsx` wraps in `<WebAppLayout>`.

## How to execute

**Launch ALL reads/greps in a SINGLE message as parallel tool calls.**
Do NOT read files sequentially — batch them.

### Reads (parallel)

1. `Read` — `Writerside/topics/dev-web.md` (feature parity checklist, shared hooks)
2. `Read` — `Writerside/topics/project-dashboard.md` (overall progress)
3. `Grep` — `^## ADR-00[1-4]` in `Writerside/topics/decision-log.md` with `-A 8` context
4. `Glob` — `src/screens/**/*.web.tsx` (count web screens)
5. `Glob` — `app/**/*.web.tsx` (count web routes)
6. `Bash` — `git log -5 --oneline && echo --- && git diff --stat`
7. `Bash` — `ls -1 .claude/plans/*.md 2>/dev/null` (active plans)
8. `Bash` — `cd payment-service && docker compose ps --format "table {{.Name}}\t{{.Status}}" 2>/dev/null || echo "docker: not running"`

Do NOT re-read `.claude/rules.md` or `CLAUDE.md` — already in context.

## Output (≤25 lines)

```
## Web Session Start

**Stack:** Expo Web (RNW) · TypeScript · Expo Router
**Last commit:** <date + message>
**Uncommitted:** <file count or "clean">
**Docker:** <running/stopped>
**Active plan:** <name + 1-line summary or "none">

### Feature Parity
<1-3 bullets from dev-web.md — done / missing>

### Web-Specific Files
<N> `.web.tsx` screens · <M> `.web.tsx` routes

### Shared Hooks
<first 5 from dev-web.md hooks list>

### Next Task
**What:** <one sentence from plan/dashboard/user>
**Key files:** <2-3 paths to start from>

### Session Hints
<pick any that apply>
- Multi-file (>3) — use Plan Mode first
- Research-heavy — use `Task` + `Explore` subagent
- Long session expected — consider `/compact focus on <task>` later
```
