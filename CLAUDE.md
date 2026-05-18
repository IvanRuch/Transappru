# TransApp — Project Instructions

## Language

Communicate in Russian. Code comments, variable names, and commit messages in English.

## Documentation Update Rule (MANDATORY)

After every successful code change, update relevant Writerside documentation:

| Condition | File | Action |
|-----------|------|--------|
| Always | `Writerside/topics/project-dashboard.md` | Update progress, date |
| Payment endpoint changed | `Writerside/topics/api-payment.md` | Add/update endpoint docs |
| RN screen/component | `Writerside/topics/dev-mobile.md` | Document screen/component |
| Web changed | `Writerside/topics/dev-web.md` | Document changes |
| Architecture decision | `Writerside/topics/decision-log.md` | Add ADR-NNN entry |
| Feature flag changed | `Writerside/topics/dev-mobile.md` | Update feature flags section |

Do NOT skip documentation updates. They are part of the task, not a separate step.
Full guide: `.claude/skills/writerside-docs.md`

## Write Operations — TDD Rule (payment-service)

When implementing any write operation (INSERT/UPDATE/DELETE against payment_db):
1. **Test first**: write a test that exercises the endpoint before implementing
2. **Use transactions**: wrap write operations with proper error handling
3. For changes touching >3 files, create a brief plan in chat before coding

## Git Commit & Push

- English commit messages, **Conventional Commits**: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`
- Include documentation files in the same commit as code
- After completing a task, proactively suggest committing
- Do NOT push without explicit user approval

## Compaction

When compacting, ALWAYS preserve:
- List of modified files in this session
- Current test status (pass/fail)
- Active task context and pending TODO items
- Which Writerside topics were updated

## Project rules (ALWAYS read)

See `.claude/rules.md` — full cross-cutting ruleset: scope discipline,
Playwright usage, read-before-edit, context hygiene (subagent for research,
Plan Mode for multi-file changes, proactive `/compact focus on <task>` and
`/clear`), mobile/web parity, payment security, and more.

Session state between compactions is auto-saved to `.claude/session-state.md`
by the `PreCompact` hook — `/start` reads it back on next session.

## Project Tasks

`.claude/tasks.md` — единственный источник open/done задач проекта.
Файл закоммичен в репо; в Obsidian vault виден через симлинки
`<vault>/1 Projects/TransApp/tasks.md` (на этот файл) и
`<vault>/1 Projects/TransApp/plans` (на `.claude/plans/`). Репо
владеет файлами, vault только рендерит.

### Структура

```markdown
## Открытые
- [ ] ...

## Выполнено
- [x] ... ✅ 2026-05-15
```

При закрытии: `[x]`, добавить `✅ YYYY-MM-DD`, переместить строку
в **верх** `## Выполнено`. Никогда не удалять выполненные —
история сохраняется, фильтрация делается dashboard-запросом.

### Каноничный формат строки

```
- [ ] `[transapp]` <self-explanatory summary> — [[plans/<basename>]] 🔼 ⏳ <date> #project/transapp
```

Обязательно:
- Префикс `` `[transapp]` `` в literal backticks (CSS-хук для
  vault-снэппета `tasks-prefix-dim`).
- `#project/transapp` в конце строки.
- Vault-relative wikilink `[[plans/<basename>]]` без пути
  `.claude/` и без расширения `.md` — резолвится через симлинк
  `1 Projects/TransApp/plans/`.
- Self-explanatory description: будущему-себе понятно из dashboard'а
  без открытия плана. Не «реализовать план», а конкретно
  («Дедуп `/get-auto-list` через UserDataContext (web, ADR-020)»).

Опционально: priority (`🔺`/`⏫`/`🔼`/`🔽`/`⏬`), `⏳ scheduled`,
`📅 due` (только hard deadlines), `🛫 start`, `#epic/<slug>` для
группировки нескольких задач одного направления.

Полная спецификация — глобальный `~/.claude/CLAUDE.md` → раздел
«Cross-project task tracking».

### Plan ↔ Tasks

После `ExitPlanMode` (когда план записан в `.claude/plans/<basename>.md`):
дописать строку в `## Открытые` со ссылкой `[[plans/<basename>]]` и
self-explanatory summary. Wikilink — vault-relative, не `.claude/plans/...`.

Когда план реализован — пометить ту же строку `[x]` **в том же коммите**
что и реализация, переместить в `## Выполнено`. Summary не переписывать
на момент закрытия (`✅ <date>` просто append).

### Commit

- Stage by name: `git add .claude/tasks.md`, никогда `git add -A`.
- Conventional Commits, без `--no-verify`. См. `## Git Commit & Push`.
- Логические границы: правка `tasks.md` идёт **вместе** с кодом/планом
  в одном коммите, не отдельным «обновил чек-боксы».
- Push — только по явной команде пользователя.

## Coding conventions (auto-loaded per directory)

- `src/CLAUDE.md` — RN/Expo/TypeScript conventions
- `payment-service/CLAUDE.md` — Python/Litestar/Tortoise conventions
- `transappweb/CLAUDE.md` — Web React conventions

When the user corrects a mistake or establishes a new pattern,
propose adding it to `.claude/rules.md`. Do NOT add rules silently.

## Detailed guides (loaded on demand)

- `.claude/skills/writerside-docs.md` — documentation update guide
- `.claude/skills/payment-db.md` — payment database schema
