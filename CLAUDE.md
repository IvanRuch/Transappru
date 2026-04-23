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

## Coding conventions (auto-loaded per directory)

- `src/CLAUDE.md` — RN/Expo/TypeScript conventions
- `payment-service/CLAUDE.md` — Python/Litestar/Tortoise conventions
- `transappweb/CLAUDE.md` — Web React conventions

When the user corrects a mistake or establishes a new pattern,
propose adding it to `.claude/rules.md`. Do NOT add rules silently.

## Detailed guides (loaded on demand)

- `.claude/skills/writerside-docs.md` — documentation update guide
- `.claude/skills/payment-db.md` — payment database schema
