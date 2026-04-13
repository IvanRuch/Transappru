Session kickoff — read project state and orient for the next task.
This command MUST NOT modify files — only read and report.

## Sources to read (in parallel)

1. `Writerside/topics/project-dashboard.md` — current focus, progress
2. Recent git activity:

```bash
git log -5 --oneline
```

3. Uncommitted work:

```bash
git diff --stat
```

4. Docker status:

```bash
cd /Volumes/HP_P800/grizodubov/IdeaProjects/TransApp_upd/payment-service && docker compose ps 2>/dev/null || echo "Docker not running"
```

## Output format (under 15 lines)

```
## Session Start

**Focus:** [current focus from dashboard]
**Uncommitted:** [file count or "clean"]
**Docker:** [running/stopped]

### Recent
<last 3 commits one-liner>

### Next Task
[From dashboard or user's last direction]
**What to do:** [1 sentence]
**Reference:** [closest existing code to look at]
```
