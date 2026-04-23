End-of-day developer report + startup prompt for tomorrow.
READ-ONLY. This command MUST NOT modify files.

## Sources (launch in parallel)

1. `Bash` — today's commits:
   ```bash
   git log --since="00:00" --oneline
   ```
2. `Bash` — changed files today:
   ```bash
   git log --since="00:00" --name-only --pretty=format:"" | sort -u | sed '/^$/d'
   ```
3. `Bash` — uncommitted work:
   ```bash
   git diff --stat && echo --- && git status -s
   ```
4. `Read` — `Writerside/topics/project-dashboard.md`
5. `Grep` — `TODO|FIXME|HACK` across today's changed files (use file list from step 2)

## Output (≤40 lines total)

### 1. Что сделано сегодня

Group commits by area:
- **Mobile (src/, app/):** ...
- **Backend (payment-service/):** ...
- **Web-specific (.web.tsx):** ...
- **Docs (Writerside/):** ...

### 2. Что осталось незакрытым

- Uncommitted files (count + top 5)
- TODO/FIXME/HACK found today (file:line + note)
- Failing tests (if known from session)

### 3. Карта прогресса

1-3 line summary from `project-dashboard.md`.

### 4. Рекомендация на завтра

Next logical task based on today's work and open items.

### 5. Файлы сессии

Full list of files modified today (for compaction context).

### 6. Промпт для первой сессии завтра

```
Задача: <next task>
Контекст: <what was done today, 1 line>
Образец: <reference file>
Незакрытое: <open items>
Предусловия: <Docker up? npm install? env vars?>
Команды для старта: /start or /start-web, then /status
```
