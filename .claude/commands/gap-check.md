End-of-day developer report + startup prompt for tomorrow.
This command MUST NOT modify files — only read and report.

## Sources (read in parallel)

1. Today's commits: `git log --since="00:00" --oneline`
2. Changed files today: `git log --since="00:00" --name-only --pretty=format:""`
3. Uncommitted work: `git diff --stat`
4. Project dashboard: `Writerside/topics/project-dashboard.md`

## Output sections (keep total under 40 lines)

### 1. Что сделано сегодня

Group today's commits by area:
- **Mobile (src/, app/)**: ...
- **Backend (payment-service/)**: ...
- **Web (transappweb/)**: ...
- **Docs (Writerside/, docs/)**: ...

### 2. Что осталось незакрытым

- Uncommitted changes
- TODOs found in today's changed files (grep for TODO/FIXME/HACK)

### 3. Карта прогресса

Summary from project-dashboard.md (if exists)

### 4. Рекомендация на завтра

Next logical task based on what was done and what remains.

### 5. Файлы сессии

List of all files modified today (for compaction context).

### 6. Промпт для первой сессии завтра

```
Задача: [next task]
Контекст: [what was done today]
Образец: [reference file if any]
Незакрытое: [open items]
Предусловия: [Docker up? npm install? etc.]
```
