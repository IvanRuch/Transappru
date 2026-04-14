Session kickoff — read project state and orient for the next task.
This command MUST NOT modify files — only read and report.

## Sources to read (in parallel)

1. `Writerside/topics/project-dashboard.md` — current focus, progress
2. `Writerside/topics/dev-web.md` — web feature parity checklist
3. Recent git activity:

```bash
git log -5 --oneline
```

4. Uncommitted work:

```bash
git diff --stat
```

5. Active plan files (if any):

```bash
ls -la .claude/plans/*.md 2>/dev/null && echo "---" && head -30 .claude/plans/*.md 2>/dev/null || echo "No active plans"
```

6. Docker status:

```bash
cd /Volumes/HP_P800/grizodubov/IdeaProjects/TransApp_upd/payment-service && docker compose ps 2>/dev/null || echo "Docker not running"
```

## Output format (under 20 lines)

```
## Session Start

**Focus:** [current focus from dashboard]
**Uncommitted:** [file count or "clean"]
**Docker:** [running/stopped]
**Active plan:** [plan name + summary or "none"]

### Recent
<last 3 commits one-liner>

### Pending Work
[From dashboard, plan file, or user's last direction]
**What to do:** [1 sentence]
**Reference:** [closest existing code to look at]
```
