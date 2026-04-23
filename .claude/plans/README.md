# Plan files

This directory holds **active implementation plans** produced by Claude in
Plan Mode before a multi-file change. Each plan is a short markdown file
that survives compaction and new sessions.

## When a plan is created

Per `.claude/rules.md` (Context hygiene): any change touching **>3 files**
should start with Plan Mode. When the plan is approved, Claude saves it
here so subsequent sessions can continue execution without re-discovery.

## File naming

```
YYYY-MM-DD-short-title.md
```

Example: `2026-04-23-notification-settings-refactor.md`

## Suggested structure

```markdown
# <Plan title>

**Status:** draft | in-progress | completed | abandoned
**Created:** YYYY-MM-DD
**Last updated:** YYYY-MM-DD

## Goal

One paragraph. What success looks like.

## Scope

- What is in scope
- What is explicitly out of scope

## Steps

- [ ] Step 1 (file.ts:line)
- [ ] Step 2 (file.ts)
- [ ] Step 3

## Notes / open questions

Anything unresolved.
```

## Lifecycle

- `/start` lists active plans at session kickoff (those with status
  `draft` or `in-progress`)
- When a plan is completed, update its `Status` — do NOT delete.
  Completed plans serve as a reference for similar future work.
- Files here are **committed** (tracked). Plans are shared context,
  not per-machine noise.
