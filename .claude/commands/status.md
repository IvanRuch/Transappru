---
description: Quick project health check (git + TypeScript + Docker) in parallel
---

Quick project health check — run diagnostics in parallel and report a compact summary.
READ-ONLY. This command MUST NOT modify files.

## How to execute

**Launch ALL checks in a SINGLE message as parallel Bash calls.**

1. **Git**:

```bash
git status -s && echo --- && git log -3 --oneline
```

2. **TypeScript** (last 5 lines of output only — avoids log spam):

```bash
npx tsc --noEmit --pretty 2>&1 | tail -5
```

3. **Docker services**:

```bash
cd payment-service && docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "docker: not running"
```

## Output (≤15 lines)

```
## Status

| Check      | Result                     |
|------------|----------------------------|
| Git        | clean / N uncommitted      |
| TypeScript | 0 errors / N errors        |
| Docker     | N/N services up / stopped  |

### Recent commits
<last 3 commits, one line each>

<if TypeScript has errors, list top 3 with file:line>
```
