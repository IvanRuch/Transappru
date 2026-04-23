Technical verification of changed files.
READ-ONLY. This command MUST NOT modify files.

Argument: `$ARGUMENTS`
- empty (default) — today's commits
- `HEAD~N` — last N commits
- `staged` — only staged files

## Scope selection

Based on `$ARGUMENTS`:
- Default: `git log --since="00:00" --name-only --pretty=format:""`
- `HEAD~N`: `git diff --name-only HEAD~N`
- `staged`: `git diff --cached --name-only`

Group changed files by area: `src/` + `app/` (mobile/web), `payment-service/`, other.
Run only the checks relevant to the areas that changed.

## Checks (run relevant ones in parallel)

### TypeScript (when `src/` or `app/` changed)

```bash
npx tsc --noEmit --pretty 2>&1 | tail -20
```

### ESLint (when `.ts` / `.tsx` changed)

```bash
npx expo lint 2>&1 | tail -20
```

### Python lint (when `payment-service/` changed)

```bash
cd payment-service && ruff check app/
```

### Test coverage (payment-service writes)

For each changed file in `payment-service/app/controllers/`:
- `Grep` for matching test in `payment-service/tests/` by endpoint path
- Write operations (INSERT/UPDATE/DELETE) without a test → flag as missing

### Security (on all changed files)

Use `Grep` with these patterns (changed files only):
- Secrets: `(api[_-]?key|token|password|secret)\s*=\s*["'][^"']+["']` (case-insensitive)
- Non-HTTPS payment URLs: `http://.*(kazna|payment|pay)`
- Staged `.env`: run `git diff --cached --name-only | grep -E "\\.env"`

## Output: verdict table

```
## Verify: <scope>

| Check      | Status | Details                |
|------------|--------|------------------------|
| TypeScript | ✅/❌  | N errors               |
| ESLint     | ✅/⚠️  | N warnings             |
| Ruff       | ✅/❌  | N issues               |
| Tests      | ✅/⚠️  | N endpoints untested   |
| Security   | ✅/❌  | clean / <details>      |

<if any failure: top 3 findings with file:line>
```
