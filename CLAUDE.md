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

## Context & session hygiene (MANDATORY)

Long sessions degrade quality. Actively protect the context window:

- **Research / multi-file search → use subagent.** Launch `Task` with
  `subagent_type=Explore` (or `general-purpose`) instead of reading many files
  in the main session. Only the subagent's summary enters the main context.
- **Multi-file changes (>3 files) → Plan Mode first.** Investigate and present
  a plan for approval before editing.
- **Proactive compaction.** After a large exploration or every ~30 messages,
  suggest `/compact focus on <current task>` with explicit focus.
- **Proactive `/clear`.** When the user switches to an unrelated task,
  suggest committing and running `/clear` instead of continuing.
- **Read before edit.** Always re-read a file in the current session before
  editing it. Do not trust "memory" of file contents.
- **Prefer text over images.** `browser_snapshot` over `browser_take_screenshot`.
  Use Playwright only when visual verification is actually required.
- **Use `context7` MCP** for library docs instead of reading `node_modules`.

## Project rules (ALWAYS read)

See `.claude/rules.md`

## Coding conventions (auto-loaded per directory)

- `src/CLAUDE.md` — RN/Expo/TypeScript conventions
- `payment-service/CLAUDE.md` — Python/Litestar/Tortoise conventions
- `transappweb/CLAUDE.md` — Web React conventions

When the user corrects a mistake or establishes a new pattern,
propose adding it to `.claude/rules.md`. Do NOT add rules silently.

## Detailed guides (loaded on demand)

- `.claude/skills/writerside-docs.md` — documentation update guide
- `.claude/skills/payment-db.md` — payment database schema
