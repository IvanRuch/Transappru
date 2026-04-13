Web session kickoff — read web project state and orient for the next task.
This command MUST NOT modify files — only read and report.

## Context

This session focuses on `transappweb/` — the React 19 web version.
The goal is adapting mobile app features to the web.

## Sources to read (in parallel)

1. `transappweb/CLAUDE.md` — web coding conventions
2. `Writerside/topics/dev-web.md` — web documentation
3. `Writerside/topics/project-dashboard.md` — overall progress
4. Web project structure:

```bash
ls transappweb/src/
```

5. Recent web-related changes:

```bash
git log -20 --oneline -- transappweb/
```

6. Uncommitted web work:

```bash
git diff --stat -- transappweb/
```

7. Compare mobile screens vs web — find gaps:

```bash
echo "=== Mobile screens ===" && ls src/screens/*/ 2>/dev/null | head -30 && echo "=== Web pages ===" && ls transappweb/src/*.js 2>/dev/null
```

## Output format (under 20 lines)

```
## Web Session Start

**Stack:** React 19, JS, no router
**Last web commit:** [date + message or "no web commits yet"]
**Uncommitted:** [file count or "clean"]

### Mobile → Web Parity
| Mobile Screen | Web Equivalent | Status |
|...|...|...|
(list key screens, mark: done / partial / missing)

### Next Task
[Suggest the highest-priority missing screen or feature]
**What to do:** [1 sentence]
**Reference mobile:** [path to mobile screen to port]
**Reference web:** [closest existing web file to extend]
```
