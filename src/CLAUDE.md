# Mobile App (React Native / Expo) — Development Rules

## Stack

React Native 0.81.5 + Expo 54 + TypeScript 5.9 (strict).
Styling: NativeWind 4 / Tailwind CSS. Navigation: Expo Router (file-based).
HTTP: Axios (`src/services/api.ts`). State: React Context + custom hooks.

## Project Structure

- `app/` — Expo Router file-based routes (screens entry points)
- `app/(authenticated)/` — auth-protected route group
- `src/components/` — reusable UI components (by domain: auto/, charges/, common/, web/)
- `src/hooks/` — custom hooks (one hook per file, `useXxx.ts` naming)
- `src/services/` — API services (api.ts, payment.ts, firebase.ts)
- `src/types/` — TypeScript interfaces (one file per domain)
- `src/screens/` — screen logic components (by feature subdirectory)
- `src/contexts/` — React Context providers
- `src/config/` — feature flags (`features.ts`)
- `plugins/` — Expo config plugins (JS, `withXxx` naming)

## Platform-Specific Files

Use `.web.tsx` / `.web.ts` suffix for web-specific implementations.
React Native picks the platform-specific file automatically.
Examples: `NetworkStatusBanner.web.tsx`, `usePushNotifications.web.ts`, `api.web.ts`

## API Client

- Main API: `Api.get/post/put/delete()` from `src/services/api.ts`
- Payment API: `Api.payment.get/post()` — separate Axios instance (port 8001)
- 401 responses auto-clear token from AsyncStorage
- Use `@/*` path alias for imports (maps to project root)

## Styling — MANDATORY rules

**All new or refactored UI must use NativeWind (Tailwind CSS) classes.**
Raw `StyleSheet.create` with hardcoded hex is a legacy pattern — migrate when touching a file.

### Must-follow

1. **No hardcoded hex in component JSX.** Use semantic tokens from `tailwind.config.js`:
   - Backgrounds: `bg-light-bg dark:bg-dark-bg`, `bg-bg-secondary`, `bg-bg-elevated`
   - Text: `text-text-primary`, `text-text-secondary`, `text-text-muted`, `text-light-text dark:text-dark-text`
   - Borders: `border-border-primary`, `border-border-secondary`
   - Accent: `bg-accent-primary` (gold), `bg-accent-secondary` (dark)
   - Status: `text-status-error`, `bg-status-success`
   - Feature-specific (pass): `bg-zone-mkad/ttk/sk/inactive`, `bg-warning-bg border-warning-border text-warning-text`
2. **Always pair light/dark variants** for tokens that have them (`bg-light-bg dark:bg-dark-bg`, `text-light-text dark:text-dark-text`). Do NOT use just one side.
3. **Add new design tokens to `tailwind.config.js`** instead of arbitrary hex when a color repeats 2+ times across the codebase.
4. **Web-only classes** (ignored on native): `cursor-pointer`, `select-none`, `web:shadow-2xl`, `web:hover:bg-...`. Use for buttons, links, non-selectable labels.
5. **Arbitrary values `[...]`** are OK for one-offs: `text-[11px]`, `max-w-[420px]`, `bg-[#F0F0F0]` (only when no semantic token fits).
6. **Raw HTML elements** (plain `<input>`, `<iframe>`) on web cannot use NativeWind className — bridge does not reach DOM primitives. Use inline CSS-in-JS object for those only.
7. **Residual `StyleSheet.create`** is acceptable for complex structured sets (e.g. checkbox primitives in ChargesScreen), but default to className.

### Exemplars

- `src/screens/charges/ChargesScreen.tsx` — full NativeWind adoption with dark mode.
- `src/screens/pass/PassScreen.{tsx,web.tsx}` — pilot of ADR-005 + NativeWind.
- `src/components/pass/*` — cross-platform sub-components using only classes.

## Screen Architecture — screen pairs and shared UI

### ADR-003: shared business logic in hooks

Every screen pair (`.tsx` + `.web.tsx`) **must** extract its business logic into
a single `src/hooks/use<Feature>.ts` hook — state, API calls, validation,
navigation, error strings.

- Hooks return error strings/states, never call `Alert.alert` / `window.alert`
  directly.
- Screens use `showAlert` from `src/utils/alert` for error messages.
- Platform-specific behaviour passed via callbacks
  (e.g. `useInnBinding(onConfirmationClose)`).
- API client: always `api` from `services/api`.

### ADR-005: shared UI sub-components

For every screen pair with repeating markup (zone tabs, suggestion cards,
modals, banners, vehicle cards, etc.):

1. Create `src/components/<feature>/` directory.
2. Put each reusable visual unit in its own `.tsx` file.
3. Add `index.ts` barrel export.
4. Screen `.tsx` / `.web.tsx` become thin orchestrators that compose these.

### Required cross-cutting components

| Component | Path | Use |
|---|---|---|
| `ScreenHeader` | `src/components/common/ScreenHeader.tsx` | Top bar with back + title + optional right slot. Drop inline headers. |
| `WebScreenContainer` | `src/components/web/WebScreenContainer.tsx` | Desktop max-width centering wrapper for web screens inside WebAppLayout. |
| `showAlert` | `src/utils/alert.ts` + `.web.ts` | Cross-platform alert shim. Never call `Alert.alert` or `window.alert` directly. |

### Prod-ready web requirements (non-negotiable)

Any new web screen `.web.tsx` must include:

- `<ScreenHeader>` (not inline header).
- `<WebScreenContainer maxWidth={820}>` (or feature-appropriate width) when inside authenticated layout.
- `safeBack` pattern: `router.canGoBack() ? router.back() : router.replace('/main')`.
- ARIA roles where applicable:
  - Lists: `accessibilityRole="list"` + items with `accessibilityRole="button"` + `accessibilityLabel`.
  - Dialogs: `accessibilityRole="dialog"`, `accessibilityViewIsModal`.
  - Comboboxes (autocomplete input + suggestions): `role="combobox"`, `aria-expanded`, `aria-controls`, `aria-autocomplete`, `aria-activedescendant`.
- Keyboard navigation for interactive lists (ArrowUp/Down/Enter/Escape).
- Focus trap + ESC-close + overlay-click-close for modals.
- Inline loading indicator on async operations (not just a generic spinner).
- `select-none` on non-editable labels (prevents stray selection highlighting).

### Migration checklist (use when touching any screen pair)

Before writing code on a screen pair:

1. **Read the paired file** (`.tsx` ↔ `.web.tsx`) and the hook.
2. **Identify repeating markup** — extract to `src/components/<feature>/`.
3. **Replace `Alert.alert` / `window.alert`** with `showAlert`.
4. **Replace inline headers** with `<ScreenHeader>`.
5. **Wrap web content** in `<WebScreenContainer>` (for authenticated layout).
6. **Migrate styles** to NativeWind classes using semantic tokens.
7. **Add web a11y polish** (ARIA, keyboard nav, focus trap, loading).
8. **Typecheck** after each step: `npx tsc --noEmit`.
9. **Update Writerside docs** (`dev-web.md`, `decision-log.md`, `project-dashboard.md`).
10. **Suggest a commit** for the logical unit.

## Anti-patterns — things to push back on, not silently accept

These are mistakes made and corrected during the Pass pilot. Do NOT repeat.

1. **Don't add UI without interrogating its purpose.** When asked "add button X", first verify it solves a real user task the existing UI doesn't already address. Mirror the "Сбросить" fiasco: a button I added on a user suggestion without checking it was redundant with a direct tap.
2. **Don't keep raw `StyleSheet` + hex when refactoring.** Migrate to tokens in the same PR. Do not create new drift.
3. **Don't leave `originalLocationTypeFromMap`-style source-specific state names** when the logic applies to multiple sources — rename early (e.g. `detectedLocationType`).
4. **Don't Platform.OS-guard logic that can be URL-driven on both platforms.** If mobile uses a side-channel (module variable, focus event), bridge it into URL params via `router.setParams` so the hook is unified.
5. **Don't leave class components in a functional codebase** when converting a screen pair. Convert to functional + hook during the same migration.
6. **Don't ignore the project's declared stack.** Before styling a component, check `tailwind.config.js` and existing NativeWind screens (`ChargesScreen.tsx`, `PassScreen.*`). Don't reinvent StyleSheet.

## Naming Conventions

## TypeScript

- Strict mode enabled, path alias `@/*` → `./*`
- `tsconfig.json` extends `expo/tsconfig.base`
- Types in `src/types/` — one file per domain (auto.ts, charges.ts, payment.ts)

## Feature Flags

- `src/config/features.ts` controls release toggles
- Pattern: `__DEV__ || ENABLE_X_IN_RELEASE`

## Naming Conventions

- Components: PascalCase (`InAppNotification.tsx`)
- Hooks: camelCase with `use` prefix (`useAutoData.ts`)
- Services: camelCase (`payment.ts`)
- Types: camelCase file, PascalCase interfaces
- Screens dirs: kebab-case (`fine-payment/`)

## Corrections (from user feedback)
