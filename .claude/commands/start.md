---
description: Session kickoff — read project state and orient for the next task
---

Session kickoff — read project state and orient for the next task.
READ-ONLY. This command MUST NOT modify files.

Use `/start` for generic sessions, `/start-web` when the next task is web-specific.

## How to execute

**Launch ALL reads in a SINGLE message as parallel tool calls.**
Do NOT read sequentially.

### Reads (parallel)

1. `Read` — `Writerside/topics/project-dashboard.md` (current focus, progress)
2. `Read` — `.claude/session-state.md` IF EXISTS (auto-saved by PreCompact hook — previous session's state)
3. `Bash` — `git log -5 --oneline && echo --- && git diff --stat`
4. `Bash` — `ls -1 .claude/plans/*.md 2>/dev/null | grep -v README` (active plans; if any, read their Status line)
5. `Bash` — `cd payment-service && docker compose ps --format "table {{.Name}}\t{{.Status}}" 2>/dev/null || echo "docker: not running"`

Do NOT re-read `CLAUDE.md` or `.claude/rules.md` — already auto-loaded.

## Output (≤22 lines)

```
## Session Start

**Focus:** <from dashboard>
**Uncommitted:** <file count or "clean">
**Docker:** <running/stopped>
**Active plan:** <name + Status or "none">

### Recent
<last 3 commits, one line each>

### Carried over from previous session
<if session-state.md exists: 1-2 lines summary, otherwise omit this block>

### Next Task
**What:** <one sentence>
**Reference:** <closest existing file to look at>

### Session Hints
<pick any that apply>
- Multi-file (>3) — use Plan Mode first; save approved plan to `.claude/plans/`
- Research-heavy — use `Task` + `Explore` subagent
- Web-specific task — consider `/start-web` instead
```
