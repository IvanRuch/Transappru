Technical verification of changed files.
This command MUST NOT modify files — only read and report.

Argument: $ARGUMENTS (default: today's commits; `HEAD~3`: last 3 commits; `staged`: only staged files)

## Scope selection

Determine which files changed based on $ARGUMENTS:
- Default (empty): `git log --since="00:00" --name-only --pretty=format:""`
- `HEAD~N`: `git diff --name-only HEAD~N`
- `staged`: `git diff --cached --name-only`

## Checks

### 1. TypeScript (for src/ and app/ files)

```bash
cd /Volumes/HP_P800/grizodubov/IdeaProjects/TransApp_upd && npx tsc --noEmit --pretty
```

### 2. ESLint (for changed .ts/.tsx files)

```bash
cd /Volumes/HP_P800/grizodubov/IdeaProjects/TransApp_upd && npx expo lint
```

### 3. Python lint (for payment-service/ files)

```bash
cd /Volumes/HP_P800/grizodubov/IdeaProjects/TransApp_upd/payment-service && ruff check app/
```

### 4. Test coverage (payment-service only)

For each changed endpoint in `payment-service/app/controllers/`, search `tests/` for matching test file.
Write operations without tests → flag as missing.

### 5. Security patterns

- Search changed files for hardcoded secrets (API keys, tokens, passwords)
- Check that .env files are not staged
- Verify payment amounts validated server-side

## Output: Verdict table

```
## Verify: [scope]

| Check      | Status | Details           |
|------------|--------|-------------------|
| TypeScript | ✅/❌  | N errors          |
| ESLint     | ✅/❌  | N warnings        |
| Ruff       | ✅/❌  | N issues          |
| Tests      | ✅/⚠️  | N endpoints untested |
| Security   | ✅/❌  | details           |
```
