# Mobile App Development

## Stack

React Native 0.81.5 + Expo 54 + TypeScript 5.9 (strict) + NativeWind 4.

See `src/CLAUDE.md` for coding conventions and
[Screen Development Conventions](dev-screen-conventions.md) for the mandatory
screen / screen-pair playbook (ADR-003 shared hooks, ADR-005 shared UI,
NativeWind styling rules, prod-ready web checklist).

## Android Studio setup для разработчиков

При **первом** открытии проекта в Android Studio из Dock/Finder
Gradle sync падает на плагине `expo-autolinking-settings` с ошибкой
`Cannot run program "node": error=2, No such file or directory` —
это известная проблема macOS GUI launch (PATH не наследуется из
shell, см. [ADR-010](decision-log.md)).

**Фикс — один раз на машину:**

1. Узнай абсолютный путь к node:
   ```bash
   which node
   # или, если используешь nvm/Volta/fnm и хочешь резолвить симлинки:
   readlink -f $(which node)
   ```
2. Добавь строку в `~/.gradle/gradle.properties` (создай файл, если
   его нет):
   ```properties
   systemProp.expo.node.path=/usr/local/bin/node
   ```
   (подставь свой путь из шага 1)
3. В Android Studio: **File → Sync Project with Gradle Files**.

**Важно:** это нужно **только** для запуска Studio из GUI
(Dock / Finder / JetBrains Toolbox / Spotlight). Из терминала
(`./gradlew assembleDebug`, EAS Build, GitHub Actions) Gradle-сборка
работает и без этой настройки — system property отсутствует,
fallback `"node"` через PATH срабатывает корректно.

Файл `~/.gradle/gradle.properties` user-level, **не** в репо —
каждый разработчик настраивает у себя локально. Патчи в `patches/`
+ `postinstall: "patch-package"` в `package.json` применяются
автоматически после `npm install` / EAS prebuild и обеспечивают
работу `System.getProperty("expo.node.path", "node")` во всех
затронутых пакетах (`expo`, `expo-constants`, `expo-modules-*`,
`@react-native/gradle-plugin`, `@react-native-community/netinfo`,
`react-native-reanimated`, `react-native-worklets`,
`react-native-screens`, `react-native-gesture-handler`).
`@react-native/gradle-plugin` — самый важный: его convention для
`nodeExecutableAndArgs` наследуется codegen-задачами всех RN-библиотек
(`react-native-async-storage`, `react-native-webview`,
`react-native-yamap-plus`, `react-native-safe-area-context` и т.д.),
поэтому одна правка в этом плагине покрывает их все.

## Project Structure

- `app/` — Expo Router file-based routes
- `src/components/` — reusable components
- `src/hooks/` — custom hooks
- `src/services/` — API and integrations
- `src/screens/` — screen logic
- `src/contexts/` — React Context providers
- `src/config/` — feature flags

## Feature Flags

<!-- Document feature flags from src/config/features.ts -->

## Screens

<!-- Document key screens and their routes -->

## Auto list ordering

Vehicle list supports **two sort modes**, chosen by the user via a
toggle in `AutoCountToolbar` (the row above the list). The selection
persists across sessions and platforms (`AsyncStorage`, key
`ta_sort_mode`). See ADR-018 and
`.claude/plans/2026-05-14-auto-list-sort-toggle.md` for the full
design rationale.

| Mode | Default? | Order |
|------|----------|-------|
| `lexicographic` («алфавиту») | **Yes** | server order (backend's `ORDER BY auto_number`) — standard pagination, stable on `loadMore`. |
| `plate_digits` («номеру») | No (opt-in) | numeric segment of licence plate, ascending — «`К123ОР99, М234ХА50, А456БВ77`» (123 < 234 < 456, leading letter and region ignored). Opting in triggers a load-all fetch and shows an info banner. |

### Sort keys (plate_digits)

| Sort key | Source field | Behaviour |
|----------|-------------|-----------|
| Primary  | first digit run of `auto_number_base` (fallback `auto_number`) | numeric ascending |
| Secondary (tie-break) | full `auto_number` | `localeCompare(_, 'ru')` for stable Cyrillic ordering |

### Where it lives

- Sort comparator: `sortAutoListByPlateNumber()` /
  `compareByPlateNumber()` / `plateSortKey()` in
  `src/utils/plateHelpers.ts` — single source of truth.
- Sort mode state + load strategy: `src/hooks/useAutoData.ts`
  (`sortMode` state, `setSortMode()`, `dismissSortBanner()`,
  `LOAD_ALL_LIMIT` constant). The hook is consumed by both
  `AutoListScreen.tsx` and `AutoListScreen.web.tsx`, so mobile and web
  see identical behaviour.
- UI: `SortToggle` (segmented control with a leading «Сортировка по»
  label and two options «алфавиту» / «номеру») + `SortBanner` (info
  banner) in `src/components/auto/`. The control is embedded in
  `AutoCountToolbar` between the count and the «Добавить авто» action.
  On narrow viewports (< 520px width) it wraps onto a second row
  inside the toolbar. Genitive option labels read naturally after the
  «Сортировка по …» prefix; the same shared component renders on both
  mobile and web (RN-Web maps the segmented buttons to focusable
  `<div>`s with the right `accessibilityRole="radio"` semantics).

### How pagination interacts with each mode

This is the critical part — see ADR-018 «Pagination conflict» section.

**`plate_digits` mode — load-all strategy.** Because the backend sorts
strictly lexicographically, naive pagination + client-side numeric sort
causes vehicles to shuffle position when later pages arrive (a vehicle
fetched on page 2 may sort before vehicles already visible from page
1). To eliminate the shuffle, `plate_digits` fetches the **entire
fleet in one request** (`auto_list_limit = 2000`, `auto_list_from = 0`)
and `loadMore()` is a no-op. The full sorted list is held in memory;
scrolling is purely client-side, the list is stable.

Limit `2000` is a generous upper bound for the current data — max
fleet size is 150 vehicles (3 customers above 100, 12 with 40–100).
If a future customer exceeds ~1000 we'll need to either move to
server-side sort (Phase 2 of the plan) or add batched background load.

**`lexicographic` mode — standard pagination.** `auto_list_limit = 10`,
`onEndReached` increments offset, server returns pages in lex order
and pages are appended without client-side re-sort. No shuffle because
no client-side sort is applied.

The client-side `sortAutoListByPlateNumber()` is applied **only** in
`plate_digits` mode. It remains idempotent and ready to become a no-op
the day the backend ships server-side plate-digit sort (Phase 2).

### Info banner (plate_digits mode only)

While `plate_digits` mode is selected, `SortBanner` renders above the
list with a single sentence explaining the load-all behaviour and
hinting at the upcoming server-side sort improvement. It is
dismissible (✕ button), dismissal is persisted to `AsyncStorage` (key
`ta_sort_banner_dismissed`). The banner is removed entirely in Phase 2
when server-side sort replaces load-all.

### Phase 2 plan (server-side sort_by)

When the legacy backend team adds `sort_by: 'plate_digits' |
'lexicographic'` to `/get-auto-list`:

1. Frontend passes `sort_by` matching the active `sortMode`.
2. `plate_digits` mode reverts to standard pagination (`limit=10`,
   `onEndReached`); `LOAD_ALL_LIMIT` and the load-all branch are
   removed.
3. Client-side `sortAutoListByPlateNumber()` is removed (or left as
   an idempotent safeguard).
4. `SortBanner` and its `AsyncStorage` key are deleted.

The toggle UI, persisted choice key, and user-visible behaviour all
stay the same — the transition is invisible to users except for the
disappearance of the first-load spinner in `plate_digits` mode.

### Tests

- `src/utils/__tests__/plateHelpers-sort.test.ts` — 11 cases covering
  `plateSortKey`, `compareByPlateNumber`, and
  `sortAutoListByPlateNumber`: extraction, region irrelevance,
  alphabetical tie-break, missing `auto_number_base` fallback, empty
  input, immutability, idempotency.
- `src/hooks/__tests__/useAutoData.test.tsx` — 7 cases for the sort
  toggle: default mode + LOAD_ALL_LIMIT, lexicographic mode preserves
  server order with `limit=10`, `setSortMode` persists to
  `AsyncStorage`, hydrate from storage on mount, `loadMore` no-op in
  `plate_digits`, pagination in lexicographic mode, `dismissSortBanner`
  persists.

## Sidebar org-list count for the active org

`LeftMenuModal` renders a row per organization the user has access to,
each with `количество авто: <N>` (via shared `OrgListItem`). The active
org's row used to show `0` because of a backend asymmetry — see
`dev-web.md` → "`user_auto_count` for the active org" for the full
explanation; same story applies to mobile.

Mobile fix: `LeftMenuModal` accepts a new `autoListCount: number` prop
and substitutes it for the active row's `user_auto_count`.
`AutoListScreen.tsx` provides the value from `useAutoData.autoListCount`
(coerced via `Number(x) || 0` because backend ships it as a string).

## Data quality monitoring (banner + report button)

Vehicle data (fines / OSAGO / passes / diagnostic-card / RNIS / tolled
roads) flows through provider Avtocod, which itself sources from
state services via СМЭВ (ГИБДД, ФССП, ...). Endpoints stay 200 OK even
when upstream returns partial / stale data — only the user notices
and complains. The user-feedback loop in PR-2 turns those complaints
into a global banner for everyone else, plus a recovery push to the
complainants when the admin marks the incident closed (ADR-012, plan
`.claude/plans/2026-05-04-data-issues-reporting.md`).

The Phase 1 endpoint-observation heuristic (PR #18 — module
`src/utils/providerHealth.ts`, 60s rolling window per provider) was
removed in PR-2: it caught only HTTP 5xx / timeouts / explicit `error`
flags, which are not the dominant failure mode.

### Architecture (PR-2, now)

```
client (mobile/web)                                       backend (payment-service)
                                                          ┌────────────────────────┐
[click "Сообщить о проблеме" on detail screen]            │  POST /data-issues/    │
                                                          │       report           │
DataIssueReportButton                                     │  ─ INSERT data_issues  │
  ─ getCachedUserId() (from useAutoData)                  │  ─ TG admin alert      │
  ─ tryGetFCMToken() (web/native)              ──────►    │  ─ threshold check     │
  ─ POST /data-issues/report                              │     (≥3 distinct       │
                                                          │      users / 6h)       │
                                                          └───────────┬────────────┘
                                                                      │
                                                          payment_db  │
                                                                      ▼
DataProviderStatusBanner (root, sticky amber)             ┌────────────────────────┐
  ▲                                                       │ system_notice          │
  │ subscribe (useSyncExternalStore)                      │  category, message,    │
  │                                                       │  source (admin|auto),  │
useSystemNotice                                           │  deactivated_at        │
  ─ singleton store                       ──────────►     └───────────┬────────────┘
  ─ setInterval(60s) while subscribers > 0                            ▲
  ─ silent failure on poll error                                      │
  ─ kick-poll on first subscribe                          GET /system-notice
```

### Public surface (`src/`)

| File | Role |
|---|---|
| `constants/providerLabels.ts` | `PROVIDER_LABELS` map + `ProviderId` type + `isProviderId` guard. Mirrors backend `DATA_CATEGORIES`. |
| `utils/userIdCache.ts` | AsyncStorage cache of legacy `user.id`, populated by `useAutoData` on every `/get-auto-list` response. Read by `DataIssueReportButton` on submit. |
| `services/dataIssues.ts` | Axios wrappers `reportDataIssue` (POST) + `fetchSystemNotice` (GET). Routes through `Api.payment` (`PAYMENT_API_URL`). |
| `hooks/useSystemNotice.ts` | Module-level singleton with `useSyncExternalStore`. One poll regardless of subscriber count; stops when last subscriber unmounts; silent failure leaves prior snapshot intact. |
| `components/DataIssueReportButton.tsx` | Icon button (`MaterialCommunityIcons name="account-alert"`) + modal with optional comment textarea (max 2000 chars) + submit. Handles 409 (open complaint exists) and missing user_id (defensive). |
| `components/DataProviderStatusBanner.tsx` | Same presenter as Phase 1; source switched from `useDataProviderHealth` → `useSystemNotice`. When backend returns 1 notice, displays its `message` verbatim; when 2+ active, falls back to comma-joined category labels. |

### Banner UX

- Top-sticky amber (`#FFC107`), zIndex 9998 — one tick below
  `NetworkStatusBanner` (zIndex 9999) so offline-red wins when both
  fire (no internet → no provider data either, more severe signal).
- Auto-shows when `GET /system-notice` returns ≥1 notice; auto-hides
  on next poll after backend deactivates all notices.
- Dismissible via ✕ — sessionStorage on web, module-level `let` on
  native. Re-appears automatically when the **set of active categories
  changes** (different incident — signature-based dismiss).
- Mounted in `app/_layout.tsx` next to `NetworkStatusBanner` (no
  per-screen mount).

### Report button placement

On `AutoDetailScreen` (`.tsx` native + `.web.tsx` web), the button
sits in a slim row between the `TabBar` and the `ScrollView` with tab
content. It's rendered **only** for the six provider tabs (passes,
fines, avtodor, osago, diagnostic_card, rnis), not for files or
driver tabs (those are local data, not provider-sourced) — gate via
`isProviderId(currentTab)`.

`autoId` is read from `autoData.id` (web — `useLocalSearchParams`,
native — `this.state.auto_data.id`). `userId` is fetched async on
submit via `getCachedUserId()` — the cache is filled when the user
navigates through `/auto-list`, so by the time they reach detail
screen the cache hit is essentially guaranteed.

### Tests

- `src/hooks/__tests__/useSystemNotice.test.ts` — 4 cases (empty,
  active list, silent failure on error, stable snapshot reference).
- `src/utils/__tests__/userIdCache.test.ts` — 9 cases
  (set/get round-trip, clearing on null/empty/0, defensive null on
  corrupt storage, idempotency).
- MSW handlers for `/system-notice` and `/data-issues/report` in
  `src/test-utils/handlers.ts` — both prod and dev base URLs registered.
- Banner UI test deferred (jsdom + RN renderer + `useSafeAreaInsets`
  remains as in Phase 1; manual QA on staging is the appropriate tool).

## Test infrastructure

Jest 29.7 + jsdom + jest-rn-stub for hooks/utils. Component-level RN
rendering deferred (no jest-expo for SDK 54 yet).

### MSW for network mocks (since 2026-04-30)

`msw@^2` intercepts axios calls at the network layer so hook tests can
exercise real `api.post('/get-auto-list', ...)` paths without leaking
HTTP. Setup files:

- `jest-msw.setup.ts` — listen / resetHandlers / close lifecycle, plus
  Web Streams + fetch polyfills (jsdom env doesn't ship them).
  Wired via `setupFilesAfterEnv`.
- `src/test-utils/server.ts` — shared `setupServer` instance.
- `src/test-utils/handlers.ts` — default handlers for `/get-auto-list`
  and the four detail endpoints (`get-auto-check-{passes,diagnostic-card,fines,osago}`).
- `src/test-utils/factories/` — fixture builders:
  - `makeUserData(overrides)` — active org payload.
  - `makeAutoItem(overrides)`, `makeAutoList(n)` — vehicle list with
    deterministic ids and plates (А100АА77, А101АА77, ...).
  - `makeGetAutoListResponse(overrides)` — full /get-auto-list shape.
- `src/test-utils/index.ts` — public re-exports; tests import from here.

Per-test override pattern:

```ts
import { http, HttpResponse } from 'msw';
import { server, makeGetAutoListResponse, makeAutoList } from '../../test-utils';

it('handles 401', async () => {
  server.use(
    http.post('https://transapp.ru/api/get-auto-list',
      () => new HttpResponse(null, { status: 401 })),
  );
  // ... act + assert
});
```

`onUnhandledRequest: 'error'` — any unmocked outbound request fails the
test, keeping test dependencies honest.

### Hook coverage

| Hook | Tests | What's covered |
|---|---|---|
| `useAutoData` | `useAutoData.test.tsx` (7 cases, MSW) | initial load, updateAutoItem (merge + isolation), loadMore + numeric merge order, 401 → token cleared, resetData clears state + filters, surfaces other_user_list / our_services_list |
| `useInnBinding` | `useInnBinding-validation.test.ts` | INN format validation (10/12 digits) |
| `useRnisCheck` | `useRnisCheck-buttonEnabled.test.ts` | RNIS button gating |
| `useWebPushPermission` | 11 cases | full state machine (idle/snoozed/granted/denied), localStorage persistence |
| `usePassOrder` | `usePassOrder-zoneLogic.test.ts` | zone selection rules |
| `useUserProfile` | `useUserProfile-phone.test.ts` | phone formatting |
| `useDriverList` | `useDriverList-validation.test.ts` | driver name validation |
| `useNotificationList` | `useNotificationList-logic.test.ts` | unread/badge logic |

Deferred for `useAutoData` (separate test file when worth it):

- Latest-wins AbortController (jsdom adapter for axios doesn't expose
  abort behaviour reliably enough for ordering assertions)
- 5-minute cache lifetime (needs fake timers + careful interaction
  with the 500 ms filter debounce)

`switchOrganization`, `navigateToInn`, `passMapBridge`, `alert` —
focused unit suites, no MSW (pure logic / module-level state).

## Planned Improvements

| Task | Screen | Description |
|------|--------|-------------|
| OTP-style PIN input | `screens/auth/PinScreen.tsx` | Replace single TextInput with 4 separate digit fields (as done in `PinScreen.web.tsx`). Auto-advance on input, backspace returns to previous field, paste support. |
