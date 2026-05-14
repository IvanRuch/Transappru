# Project Rules (cross-cutting)

Rules learned from user feedback. Updated continuously.
Before adding a new rule — ASK the user for confirmation. Do NOT add silently.

## Where what lives

- **This file** (`.claude/rules.md`): cross-cutting rules — ALWAYS loaded
- `src/CLAUDE.md`: mobile app conventions — auto-loaded for src/ files
- `payment-service/CLAUDE.md`: backend conventions — auto-loaded for payment-service/ files
- `transappweb/CLAUDE.md`: web conventions — auto-loaded for transappweb/ files

Domain-specific corrections go into the corresponding subdirectory CLAUDE.md, not here.

## Legacy Projects (reference only, NOT our code)

Two legacy directories exist in the repo root, both gitignored:

- `/Transappru/` — legacy mobile app (from the previous developer)
- `/transappweb/` — legacy web app (prod site as of Apr 2026),
  source repo: https://gitlab.trade.su/transapp/transappweb

These are NOT part of our codebase. They are kept locally as reference
to ensure feature parity — we must not miss useful functionality when
building our replacement.

**Our codebase:**
- `/src/` — new mobile app (Expo / React Native, TypeScript)
- `/payment-service/` — backend (Python / Litestar)
- Web version — **Expo Web** from `/src/` (ADR-001), in progress

**Rules:**
- NEVER edit files in `/Transappru/` or `/transappweb/`
- NEVER treat `/transappweb/` as "our web version"
- Use legacy code only for reading / comparing features

## Web Development Reference Priority

The **primary reference** for building the web version is the **mobile app** (`/src/`).
It is fully functional and in production — the web must reach feature parity with it.

Legacy web (`/transappweb/`) is a **secondary reference only** — useful to understand
how native mobile plugins (maps, camera, etc.) were replaced for the browser,
but those solutions may be outdated. Prefer finding the best modern web approach
rather than copying legacy web patterns.

## Platform-Specific Files

When editing a component/hook that has both `.ts` and `.web.ts` variants,
always check and update BOTH variants to maintain parity.
Pattern: `Foo.tsx` (native) + `Foo.web.tsx` (web) in the same directory.

## Mobile/Web Parity Rule (ADR-003)

Business logic lives in shared hooks (`src/hooks/use*.ts`), not in screens.

- **Changing business logic** (API calls, validation, state) → edit the shared hook.
  Both platforms get the change automatically.
- **Changing UI** in one screen → check the paired `.web.tsx` / `.tsx` and update if needed.
- **New screen** → create a shared hook first, then both platform screens as thin wrappers.
- **Error handling pattern:** hooks return error strings/states;
  mobile → `Alert.alert(...)`, web → `window.alert(...)` or inline UI.
- **Platform-specific callbacks:** hooks accept optional callbacks for platform behavior
  (e.g. `useInnBinding(onConfirmationClose)`, `useOnboardingFlow(onComplete)`).
- **API client:** always use `api` from `services/api`, never `Api` from `utils/Api`.

Existing shared hooks: useAuthFlow, usePinConfirm, useOnboardingFlow, useNotificationList,
useNotificationSettings, useChargesSelection, usePaymentConfirm, useInnBinding, usePassOrder.
Shared utility: `src/utils/plateHelpers.ts` (GRZ normalization).

## Payment Security

- NEVER hardcode Kazna API keys, tokens, or secrets in source code
- Secrets belong ONLY in `.env` files (which are gitignored)
- Payment amounts MUST be validated server-side (payment-service), never trust client values
- Always use HTTPS for production payment API URLs

## Docker Port Mapping

- Payment service API: localhost:8001 (container 8000)
- Payment DB (PostgreSQL): localhost:5433 (container 5432)
- Main app dev server: localhost:8081 (Expo)

## Session Management

- **Commit often:** after each logical unit of work (feature, fix, refactor), suggest a commit.
  This ensures nothing is lost if the session is restarted.
- **Prefer `browser_snapshot` over `browser_take_screenshot`** for testing — text snapshots
  consume far less context than screenshots. Use screenshots only when visual appearance matters.
- **Proactive session restart:** when the conversation has been long (many tool calls,
  large file reads, multiple screenshots), proactively suggest starting a fresh session.
  Before suggesting, ensure all changes are committed.
- **WebAppLayout rule:** All `.web.tsx` screen components must NOT wrap in `<WebAppLayout>`.
  The authenticated layout (`_layout.web.tsx`) already provides it. Use `<View style={{flex:1}}>` instead.

## Screen & UI work — MUST follow

Any non-trivial work on a screen, screen pair, or shared UI component must
follow the playbook in **`src/CLAUDE.md`** (auto-loaded when working under
`src/`). Specifically:

- Extract business logic into a shared `src/hooks/use<Feature>.ts` hook (ADR-003).
- Extract repeating markup into `src/components/<feature>/` sub-components (ADR-005).
- Use `<ScreenHeader>`, `<WebScreenContainer>`, `showAlert()` — do not reinvent.
- **Style with NativeWind + semantic Tailwind tokens. No hardcoded hex in JSX.**
  Exemplars: `src/screens/charges/ChargesScreen.tsx`, `src/screens/pass/PassScreen.*`.
- Web screens must add a11y polish: ARIA (list, dialog, combobox), keyboard
  navigation, focus trap on modals, loading indicators, `safeBack`.
- For cross-screen reference: [dev-screen-conventions](../Writerside/topics/dev-screen-conventions.md).

## Critical thinking — do not rubber-stamp suggestions

When the user proposes a UI element, behaviour, or technical approach:

1. **Interrogate the actual user need.** Does it solve a task the existing UI
   doesn't already address? (Example: on the map screen I added a "Сбросить"
   button because the user suggested it, without noticing that tapping a new
   location already replaced the pin — the button was redundant.)
2. **Prefer pushing back with a reasoned alternative** over silent compliance.
3. **Propose simpler variants** when the user's idea introduces friction
   (extra steps, modals, toggles, etc.).
4. **Check existing infra first.** Before creating a new utility / component /
   dependency, search for something equivalent already in the project
   (`src/components/`, `src/hooks/`, `src/utils/`, `tailwind.config.js`).

## Scope discipline (do not make unrequested changes)

- Touch ONLY files directly required by the task
- No drive-by refactors, no "while we're here" improvements
- Do NOT add docstrings, comments, or type annotations to code you didn't change
- Do NOT add error handling / validations for scenarios that can't happen
- Do NOT create helpers / abstractions for a single use-site
- If tempted to refactor adjacent code — ASK first, don't just do it
- 3 similar lines are better than a premature abstraction

## Playwright / browser usage (keep context lean)

Playwright snapshots and screenshots consume large amounts of context and
accelerate session degradation. Use sparingly.

- Use Playwright ONLY when:
  - the user explicitly asks to check the UI
  - verifying a visual / layout bug
  - testing an interactive flow that cannot be verified from code
- Do NOT take screenshots after every code change
- For logic / data verification — read the code, do not screenshot
- Prefer `browser_snapshot` (text) over `browser_take_screenshot` (image)
- One snapshot per verification step, not a series

## Read before edit

- NEVER propose changes to a file without reading it first in the current session
- Do not rely on "memory" of file contents from earlier turns — re-read if unsure
- For large files, use `Read` with `offset`/`limit` or `Grep` with `-C` instead of reading in full

## Context hygiene (long sessions)

- Use `Task` tool with `Explore` / `general-purpose` subagent for research,
  multi-file searches, and log analysis. Subagent runs in its own context window
  and returns only the summary.
- Use **Plan Mode** before multi-file (>3 files) implementation work.
- Every ~30 messages or after a large exploration, proactively suggest
  `/compact focus on <current task>` with an explicit focus.
- Between independent tasks suggest `/clear` — do not let one session bleed
  into the next.
- Before `/compact` or session end: ensure all changes are committed, then
  update `Writerside/topics/project-dashboard.md` with current state.

## Git workflow (branches vs direct master)

Default project policy — feature branch + PR for anything non-trivial.
Direct commits to master are allowed only for the narrow exceptions below.

**Direct to master — never (default).** Every commit goes through a PR,
including single-line typos and docs-only updates. Rationale:
`master-push-guard` workflow (ADR-014) flags **every** direct push as
red ❌ regardless of content — using PR-flow keeps the badge green and
the audit trail clean. Convenience of `git push` is not worth a permanent
red commit in `git log --graph`.

**The only exception: production hotfire.** When prod is down and seconds
matter, direct push to master is acceptable as fix-forward. Accept the
red badge as part of the incident audit trail; document the bypass in
`decision-log.md` after the fire is out.

**Feature branch + PR — REQUIRED for everything else, including:**
- Single-line typos and docs-only updates (per the «never default» rule above)
- Multi-file changes (>3 files) — consistent with the Plan Mode rule
- Redesigns or any UX change — PR body MUST include before/after screenshots
- New features, new ADRs
- Any write operation against `payment_db` (data-risk)
- Experiments / prototypes (can be closed without merging)

**Branch naming:**
- `feat/<short-title>` — new capability
- `fix/<short-title>` — bug fix
- `refactor/<short-title>` — structure change, no behaviour change
- `redesign/<screen-or-area>` — UI/UX work
- `chore/<short-title>` — tooling, docs, infra
- `experiment/<short-title>` — exploratory, may be abandoned

**PR conventions:**
- Title follows Conventional Commits (`feat:`, `fix:`, `refactor:`, etc.)
- Keep title short (< 70 chars). Details go in the body.
- Body MUST have: summary, what changes, what stays the same, verify checklist
- UI changes MUST include before/after screenshots (mobile + web if both affected)
- Open as `--draft` if work is incomplete; `gh pr ready` when done
- Squash-merge into master for linear history (`gh pr merge --squash`)
- Delete the branch after merge

**Supporting infra:**
- `/pr-open` — opens a draft PR with an auto-generated structured body
- `.github/workflows/verify.yml` — runs TS + ESLint on every PR
- Active plan files in `.claude/plans/` should be linked from the PR body

## Corrections (accumulated)

- **2026-05-14** (после ADR-017 cutover): «direct-to-master OK для docs»
  было ошибочным правилом — `master-push-guard` (ADR-014) ловит **любой**
  direct push красным badge'ом независимо от content'а. Docs-commit
  `818e5dc` (ADR-017 cutover documentation) подсветил это в реальном
  логе. Правило ужесточено до «PR для всего, hotfire — единственное
  исключение». Источник коррекции: реакция на CI-red badge сразу после
  push'а; ассистент перед push'ем предупреждал, но не предложил
  альтернативу через PR — что было упущением. На будущее: при отсутствии
  active fire — всегда предлагать `git checkout -b <branch> && git push -u
  origin <branch> && /pr-open`.
