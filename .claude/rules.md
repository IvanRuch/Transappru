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

## Corrections (accumulated)
