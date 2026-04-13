Quick project health check — run all diagnostics in parallel and report a compact summary.
This command MUST NOT modify files — only read and report.

## Run in parallel

1. **Git status**:

```bash
cd /Volumes/HP_P800/grizodubov/IdeaProjects/TransApp_upd && git status -s && echo "---" && git log -3 --oneline
```

2. **TypeScript check**:

```bash
cd /Volumes/HP_P800/grizodubov/IdeaProjects/TransApp_upd && npx tsc --noEmit --pretty 2>&1 | tail -5
```

3. **Docker services** (payment-service):

```bash
cd /Volumes/HP_P800/grizodubov/IdeaProjects/TransApp_upd/payment-service && docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "Docker not running"
```

## Output format

Compact status card — under 15 lines:

```
## Status

| Check      | Result                    |
|------------|---------------------------|
| Git        | clean / N uncommitted     |
| TypeScript | 0 errors / N errors       |
| Docker     | N/N services up / down    |
| Last 3     | <commit summaries>        |
```
