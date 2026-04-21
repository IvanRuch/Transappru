# Screen Development Conventions

Playbook for building and refactoring screens. Applies to every pair
`src/screens/<feature>/<Name>Screen.tsx` + `<Name>Screen.web.tsx`.

Codifies the patterns established during the PassScreen pilot (ADR-003 + ADR-005).
Exemplars to copy from: `src/screens/charges/ChargesScreen.tsx`,
`src/screens/pass/PassScreen.{tsx,web.tsx}` and `src/components/pass/`.

---

## Three layers of sharing

| Layer | Where it lives | When to use |
|---|---|---|
| Business logic | `src/hooks/use<Feature>.ts` | API calls, state, validation, navigation targets, error strings |
| UI sub-components | `src/components/<feature>/*.tsx` + `index.ts` | Repeating markup blocks (cards, tabs, badges, modals, banners) |
| Cross-cutting primitives | `src/components/common/`, `src/components/web/`, `src/utils/` | ScreenHeader, WebScreenContainer, showAlert, etc. |

Screens (`.tsx` and `.web.tsx`) become **thin orchestrators** — they compose
shared pieces, wire up the hook, and add platform-specific layout.

---

## Stack reminder

- **React Native 0.81 + Expo 54 + TypeScript 5.9 strict**
- **Styling:** NativeWind 4 + Tailwind CSS 3 (`tailwind.config.js` has semantic tokens with light/dark variants)
- **Navigation:** Expo Router (file-based in `app/`)
- **HTTP:** `api` from `src/services/api.ts`
- **State:** local hooks + React Context where necessary

---

## Styling rules

### Must-follow

1. **No hardcoded hex in JSX.** Use semantic tokens.
2. **Always pair `dark:` variants** for light/dark tokens.
3. **Add tokens to `tailwind.config.js`** when a color repeats. Don't scatter arbitrary hex.
4. **Web-only classes** work automatically:
   - `cursor-pointer`, `select-none` — ignored on native.
   - `web:shadow-2xl`, `web:hover:bg-...` — platform variants.
5. **Arbitrary values `[...]`** only when no token fits (e.g. one-off `text-[11px]`, `max-w-[420px]`).
6. **Raw HTML `<input>` / `<iframe>`** on web cannot receive className (RN Web doesn't bridge to DOM). Use inline CSS-in-JS in a small `inputStyle()` helper.
7. **Residual `StyleSheet.create`** acceptable for complex structured sets (e.g. a checkbox primitive). Default to className.

### Semantic token cheat-sheet

| Scope | Tokens |
|---|---|
| Background | `bg-light-bg dark:bg-dark-bg`, `bg-bg-secondary`, `bg-bg-elevated` |
| Text | `text-text-primary`, `text-text-secondary`, `text-text-muted`, `text-light-text dark:text-dark-text` |
| Border | `border-border-primary`, `border-border-secondary` |
| Accent | `bg-accent-primary` (gold), `bg-accent-secondary` (dark) |
| Status | `text-status-error`, `bg-status-success`, `text-status-warning` |
| Zone (pass) | `bg-zone-mkad/ttk/sk/inactive` |
| Warning banner | `bg-warning-bg border-warning-border text-warning-text` |

---

## Cross-cutting components — don't reinvent

| Primitive | Path | Purpose |
|---|---|---|
| `ScreenHeader` | `src/components/common/ScreenHeader.tsx` | Back button + title + optional right slot. Replaces inline headers. |
| `WebScreenContainer` | `src/components/web/WebScreenContainer.tsx` | Max-width + centering wrapper for authenticated web screens. |
| `showAlert(title, message?)` | `src/utils/alert.ts` + `.web.ts` | Platform-aware alert. Never `Alert.alert`/`window.alert` directly. |
| `KeyboardAwareScrollView` | `src/components/common/KeyboardAwareScrollView` | Scroll wrapper aware of native keyboard; no-op on web. |

---

## Hook pattern (ADR-003)

```ts
// src/hooks/use<Feature>.ts
export function useFeature() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // ...state, memos, callbacks...

  return {
    // data
    items, selectedId,
    // actions — return error strings instead of alerting
    handleSubmit: async (): Promise<string | null> => { /* ... */ },
    // UI state
    loading, canSubmit,
  };
}
```

Screen usage:

```tsx
const { items, handleSubmit, loading, canSubmit } = useFeature();

const onSubmit = async () => {
  const err = await handleSubmit();
  if (err) showAlert('Ошибка', err);
};
```

---

## Prod-ready web checklist

Every new `.web.tsx` must tick these boxes:

- [ ] `<ScreenHeader>` (not inline header).
- [ ] `<WebScreenContainer maxWidth={N}>` when inside authenticated layout.
- [ ] `safeBack`: `router.canGoBack() ? router.back() : router.replace('/main')`.
- [ ] ARIA roles where applicable:
  - Lists: `accessibilityRole="list"` + items with `accessibilityRole="button"` + `accessibilityLabel`.
  - Dialogs: `accessibilityRole="dialog"`, `accessibilityViewIsModal`.
  - Combobox (autocomplete): `role="combobox"`, `aria-expanded`, `aria-controls`, `aria-autocomplete`, `aria-activedescendant`.
- [ ] Keyboard navigation for interactive lists (ArrowUp/Down/Enter/Escape).
- [ ] Focus trap + ESC-close + overlay-click-close for modals (see `SuccessModal`).
- [ ] Inline loading indicator on async operations (spinner next to affected field, not page-wide).
- [ ] `select-none` on non-editable labels.

---

## Migration checklist (for an untouched screen pair)

Step-by-step procedure when converting an existing pair to the pilot pattern.

1. **Read the paired file and the hook** (`.tsx`, `.web.tsx`, `use<Feature>.ts`).
2. **Identify repeating markup blocks.** List each (e.g. card, tab, badge, modal).
3. **Create `src/components/<feature>/` sub-components** — one per block, + `index.ts` barrel. Keep props platform-neutral.
4. **Extend `tailwind.config.js`** if the feature needs new tokens (e.g. zone colors). Prefer semantic names.
5. **Replace markup in both screens** with the new sub-components.
6. **Replace inline headers** with `<ScreenHeader>`.
7. **Wrap web screen** in `<WebScreenContainer>`.
8. **Replace `Alert.alert` / `window.alert`** with `showAlert`.
9. **Migrate remaining inline styles** to NativeWind classes using semantic tokens.
10. **Web a11y polish:** ARIA, keyboard nav, focus trap on modals, loading indicators, `select-none` on labels.
11. **Typecheck after each logical step:** `npx tsc --noEmit` — no new errors.
12. **Update Writerside docs:**
    - `dev-web.md` — mention new shared components / feature dir.
    - `decision-log.md` — add ADR entry if this introduces a pattern.
    - `project-dashboard.md` — date stamp + Recent Changes line.
13. **Suggest commit** with Conventional Commits prefix (`refactor:`, `feat:`, `fix:`).

---

## Anti-patterns (real mistakes from pilot — do not repeat)

1. **Pattern-matching user requests without criticism.**
   On the pass map I added a "Сбросить" button because the user suggested it.
   Only on a follow-up audit did I notice it was redundant with direct map tap
   (the new tap replaces the old pin automatically). The button got removed.
   **Lesson:** before adding UI, verify it solves a task the existing flow
   doesn't already address.
2. **Keeping legacy `StyleSheet` + hex when refactoring.**
   The original pilot left 59 raw hex literals and ignored the NativeWind stack
   that was already installed. **Lesson:** always check `tailwind.config.js`
   and existing migrated screens (`ChargesScreen.tsx`) before starting.
3. **Source-specific state names when the logic is multi-source.**
   `originalLocationTypeFromMap` broke the "manual-zone" banner for
   previously-entered addresses. Renamed to `detectedLocationType`.
   **Lesson:** pick semantic, source-agnostic names when the underlying
   behaviour applies to multiple flows.
4. **`Platform.OS`-guarding logic that can be URL-driven.**
   The hook's `applyMapData` initially ran only on web because mobile used a
   module-level side channel (`pendingMapData`). The fix was to bridge that
   channel into URL via `router.setParams` at the route wrapper, so the hook
   is single-path. **Lesson:** make mobile follow the web's URL-driven model
   rather than branching by platform in the hook.
5. **Leaving class components in a functional codebase.**
   When converting a screen pair, convert class components to functional +
   hook during the same migration. Don't leave inconsistent architectures.
6. **Ignoring declared stack.**
   NativeWind 4 was installed, documented, and used in `ChargesScreen.tsx`.
   We wrote our pilot with raw `StyleSheet` for several iterations before
   catching it. **Lesson:** at the start of any styling work, open
   `src/CLAUDE.md` and `tailwind.config.js`.

---

## Order of adoption

Screens to migrate next (by ascending complexity):

1. `NotificationListScreen` — smallest web file (99 LOC), good sanity check.
2. `DriverListScreen` — already minimal (36 LOC web).
3. `NotificationSettingsScreen`.
4. `ChargesScreen.web.tsx` (mobile already migrated).
5. `UserScreen`.
6. `PaymentConfirmScreen`.
7. `InnScreen`.
8. `AutoListScreen` — responsive grid, more involved.
9. `AuthScreen` / `PinScreen` — special 2-column web layout.
10. `PassYaMapScreen` — special: Yandex Maps integration (apply ADR-005 here too:
    extract `ZonePolygons`, `PinMarker`, `AddressOverlay`, `WrongLocationBanner`,
    `LoadingAddressOverlay` into `src/components/pass/map/`).
