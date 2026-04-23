---
description: Open a draft PR with an auto-generated structured body
argument-hint: [optional PR title — derived from commits if empty]
---

Open a draft pull request against `master` with a structured body
populated from the current branch's commits and changed files.

## Preconditions (check first, abort with a clear message if violated)

1. Current branch is NOT `master`:
   ```bash
   git rev-parse --abbrev-ref HEAD
   ```
   If `master` — stop. Suggest creating a feature branch:
   `git checkout -b <type>/<short-title>` per `.claude/rules.md` naming.

2. There are commits ahead of `origin/master`:
   ```bash
   git log --oneline origin/master..HEAD
   ```
   If empty — stop. Nothing to PR.

3. Working tree is clean (no uncommitted changes):
   ```bash
   git status -s
   ```
   If dirty — warn, ask the user to commit or stash first.

4. Branch is pushed (or will be pushed):
   ```bash
   git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null || echo NO_UPSTREAM
   ```
   If `NO_UPSTREAM` — run `git push -u origin <branch>` before `gh pr create`.

## Data collection (parallel)

1. `Bash` — commit list (for summary):
   ```bash
   git log --oneline origin/master..HEAD
   ```
2. `Bash` — changed files:
   ```bash
   git diff --name-only origin/master...HEAD
   ```
3. `Bash` — full diff stat:
   ```bash
   git diff --stat origin/master...HEAD
   ```
4. `Bash` — list active plans that might relate to this PR:
   ```bash
   ls -1 .claude/plans/*.md 2>/dev/null | grep -v README
   ```
5. `Bash` — current branch name:
   ```bash
   git rev-parse --abbrev-ref HEAD
   ```

## PR classification

Group changed files to pick the right checklist items. A file may fall into
multiple areas:

| File glob | Area |
|-----------|------|
| `src/**/*.tsx`, `app/**/*.tsx` | Mobile UI |
| `src/**/*.web.tsx`, `app/**/*.web.tsx` | Web UI |
| `src/hooks/**`, `src/utils/**` | Shared logic |
| `payment-service/**/*.py` | Backend |
| `payment-service/tests/**` | Backend tests |
| `Writerside/**` | Documentation |
| `.claude/**`, `CLAUDE.md`, `*CLAUDE.md` | Claude config |
| `.github/workflows/**` | CI/CD |
| `tailwind.config.*` | Design tokens |

## Title

- If `$ARGUMENTS` is provided — use it as-is.
- Else — derive from commits: take the newest Conventional Commit subject
  (first `git log -1 --pretty=%s`). Strip any trailing period. Keep under 70 chars.

## Body template (auto-fill placeholders)

```markdown
## Summary

<2-4 bullets derived from commit messages>

## Changes by area

<only include areas with >=1 changed file>
- **Mobile UI:** <top 3 files + "... and N more" if applicable>
- **Web UI:** <top 3 files>
- **Shared logic:** <top 3 files>
- **Backend:** <top 3 files>
- **Docs:** <top 3 files>
- **Claude config:** <top 3 files>

## What stays the same

<1-2 bullets — what was deliberately NOT touched; from scope discipline>

## Linked plan

<if .claude/plans/ has a matching active plan: link + status; else "none">

## Verify checklist

<include items relevant to classified areas>
- [ ] `npx tsc --noEmit` — 0 errors         (mobile/web UI or shared logic)
- [ ] `npx expo lint` — 0 warnings           (mobile/web UI or shared logic)
- [ ] `npm test` — all green                 (shared logic or new tests)
- [ ] Payment-service tests pass             (backend)
- [ ] `ruff check` clean                     (backend)
- [ ] Mobile + 3 web viewports checked       (UI)
- [ ] Empty / error / loading states shown   (UI)
- [ ] Keyboard navigation + ARIA verified    (web UI)
- [ ] Writerside docs updated                (always, if applicable)
- [ ] ADR written for architectural changes  (architecture)

## Screenshots

<if any Mobile UI / Web UI files changed, include a placeholder>
> ⚠️ UI change — attach before/after screenshots before marking ready.
> Mobile:    [before] [after]
> Web 1440:  [before] [after]
> Web 375:   [before] [after]

## Notes / context

<1 short paragraph or bullets, optional>

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

## Execution

Use HEREDOC to pass the body so formatting is preserved:

```bash
gh pr create --draft --base master --title "<title>" --body "$(cat <<'EOF'
<body>
EOF
)"
```

After creation, output the PR URL and a short instruction:

```
PR created (draft): <URL>

Next steps:
- Add screenshots if UI change
- Run CI locally if not yet: /verify
- When ready: gh pr ready && gh pr merge --squash
```
