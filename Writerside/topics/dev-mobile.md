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

## RNIS detail block (`AutoDetailScreen.tsx`)

Backend `/get-auto-check-rnis` returns `registrationOk`, `telematicsOk`, `telematics_date` as **strings**.
All interpretation is done by the shared helper `src/utils/rnisStatus.ts` (ADR-022):

```ts
import { getRnisStatus } from '../../utils/rnisStatus';

const status = getRnisStatus(this.state.auto_rnis_data);
// null → "Данные о регистрации в РНИС не найдены"
// status.registered=false → same
// status.registered=true → show registration + telematics block
```

Telematics block is shown **only when `registered === true`**.
Three states: `'never'` / `'stale'` (>24 h, показывает дату) / `'active'` (показывает дату).
Do not add inline comparisons against these backend fields — update `rnisStatus.ts` instead.
Unit tests: `src/utils/__tests__/rnisStatus.test.ts` (13 cases).

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

## Resilient auto-list bootstrap (since 2026-05-20, ADR-023)

The auto-list screen used to gate its entire chrome (drawer toggle,
filter button, notifications, debt indicator, bottom menu) on
`userData.firm`. Any failure of `/get-auto-list` — most commonly a
timeout on a cold/heavy backend call — left `userData.firm === ''`
and the user trapped in a screen with no way out (no drawer → no
logout, no filter button, just «Список авто пуст»). Three coordinated
client-side changes restored resilience without any backend-side
contract change:

1. **Chrome decoupled from data.** `src/screens/auto/AutoListScreen.tsx`
   lines 71 and 216 no longer condition-render on
   `!!(userData && userData.firm)`. Drawer toggle + filter button +
   bottom menu are always present while authenticated. Data-dependent
   inner elements (debt indicator, notification badge, "Мой автопарк"
   header) stay condition-rendered on their own fields and naturally
   render empty when `userData` is not yet populated. Web parity is
   preserved — `AutoListScreen.web.tsx` chrome lives in
   `WebAppLayout`/`WebSidebar` and was never gated on `firm`.

2. **`loadError` API in the data hooks.**
   ```ts
   type LoadErrorKind = 'timeout' | 'network' | 'server' | 'unknown';
   type LoadError = { kind: LoadErrorKind; status?: number } | null;
   ```
   `useAutoData` and `UserDataContext` both expose `loadError`.
   Classification lives in one place — `src/utils/loadError.ts`:
   - `error.code === 'ECONNABORTED'` or `/timeout/i.test(message)` → `timeout`
   - no response but `error.request` set → `network`
   - HTTP 5xx → `server` (with `status`)
   - anything else → `unknown`

   401 is **not** routed through here — the axios interceptor in
   `src/services/api.ts` / `api.web.ts` handles it (clear token +
   redirect to auth), so a banner would never paint. Successful
   responses (`useAutoData.fetchAutoList`, `UserDataContext.syncFromAutoList`)
   clear `loadError` to `null`. `useAutoData.refreshData` (which is
   what the retry button calls via `refreshAutoList`) clears
   `loadError` **synchronously before** firing the new fetch, so the
   retry feels responsive even if the new fetch is also slow.

   Surfaced through `useAutoList` automatically because that hook
   spreads `...dataHook` into its return — no extra propagation code.

3. **`AutoListLoadError` component.**
   `src/components/auto/AutoListLoadError.tsx` renders in the
   `ListEmptyComponent` slot with a Russian subtitle keyed by `kind`
   ("Сервер отвечает дольше обычного.", "Проверьте подключение к
   интернету.", "Сервер недоступен. Попробуйте ещё раз через минуту.",
   default) and a "Попробовать ещё раз" button. The resolution order
   in `ListEmptyComponent` is: in-flight → spinner; `loadError` →
   `<AutoListLoadError>`; otherwise `<AutoListEmptyState>`.

### Per-request `timeout: 60000` for `/get-auto-list`

The global axios timeout is 30 s (`src/services/api.ts:34`) — adequate
for most endpoints. `/get-auto-list` does heavy server-side
aggregation (`user_data` + auto list + counts) and on cold sessions
for some accounts blows past 30 s. The three call sites that hit this
endpoint (`useAutoData.fetchAutoList`, `useAutoData.updateUserDataOnly`,
`UserDataContext.updateUserData`) pass `timeout: 60000` in the axios
config. The constant lives in both files as `GET_AUTO_LIST_TIMEOUT_MS`
— keep them in sync. **No auto-retry** is added: the backend is
already the bottleneck on these failures, an automatic retry storm
would make it worse. Manual retry via the AutoListLoadError button is
the right primitive.

### Persisted `userData` snapshot (cold-start chrome)

`src/utils/userDataCache.ts` provides `readCachedUserData`,
`writeCachedUserData`, `clearCachedUserData` against AsyncStorage key
`ta_user_data_cache_v1` (versioned — bump to invalidate on schema
change). AsyncStorage transparently uses `localStorage` on web, so
one module covers both platforms.

Owners (single owner per platform — no double writes):
- **Native**: `useAutoData.fetchAutoList` writes on the success path
  (guarded by `if (!userDataCtx)`), `useAutoData.updateUserDataOnly`
  also writes. Restore via mount effect in `useAutoData` (also
  guarded by `if (userDataCtx) return`).
- **Web**: `UserDataContext.syncFromAutoList` writes. Restore via
  mount effect in `UserDataProvider`. `useAutoData` skips both
  because the reflection effect mirrors Context → local state.

Restore guard: `setUserData(prev => prev.firm ? prev : cached)` — a
fresh response that races ahead of `AsyncStorage.read` is never
overwritten with a stale snapshot.

Logout (`useUserProfile.logout` and `deleteProfile`) calls
`clearCachedUserData()` so the next login starts clean.

Effect at runtime: a cold start (force-quit / phone reboot) paints
the chrome — drawer toggle, "Мой автопарк" title, debt indicator if
any — from the cached `userData` **before** the fresh `/get-auto-list`
arrives. If that fresh call then times out, the chrome stays and
`AutoListLoadError` appears in the list slot; the user can drawer-out
to logout or retry from the list.

### What was deliberately NOT changed

- No automatic retry with backoff on `/get-auto-list`. Server is the
  bottleneck.
- No port of `UserDataContext` to mobile (a separate architectural
  task, see ADR-020 follow-ups).
- No change to API shape or contract.
- No Sentry / PostHog instrumentation in this PR.
- Logout entry point still lives only on the User Profile screen
  (reachable via drawer → User). Adding a top-level logout shortcut
  is a separate UX decision.

The backend `/get-auto-list` slowness remains the real root cause for
the incident that prompted this change — request to the owner of
that service to diagnose the heavy query for the affected account
stands.

### ADR-024 follow-up (2026-05-20)

Debug-instrumented runs on a physical Android device (`adb logcat`)
revealed three additional client-side defects that were amplifying
the backend cold-call problem. All addressed in ADR-024:

- **Double-fetch on mount.** `useFocusEffect` was firing
  `updateUserData()` (lightweight `limit=0`) in parallel with
  `useEffect([])` firing `loadData()` (heavier `limit=10` /
  `limit=2000`). Two independent abort controllers meant neither
  cancelled the other; both queries hit the backend simultaneously
  for the same user_id. Fixed by a `firstFocusRef` guard in both
  `AutoListScreen.tsx` and `AutoListScreen.web.tsx`: on the very
  first focus pass (initial mount), `updateUserData()` is skipped
  because `loadData()` will refresh userData anyway via the
  `fetchAutoList` success path. On subsequent route focuses (user
  returning from another screen) the lightweight call still fires —
  that's the legitimate use case. (As of ADR-031 the lightweight call
  sends `auto_list_limit=1`, not `0`: the legacy handler does
  `auto_list_limit || 1000`, so `0` expanded to a full-fleet scan.)
- **Native `updateUserDataOnly` dedup.** A module-level
  `_inFlightUpdateUserData: Promise<void> | null` mirrors the
  existing `UserDataContext.inFlightRef` (web, ADR-020). Concurrent
  callers share the existing Promise instead of starting a parallel
  `POST /get-auto-list`. Module scope (not `useRef`) keeps the
  guard alive across hook unmount/remount, matching the lifecycle
  pattern used by `_onboardingRedirectDone` and `_announceShown`
  in the same file.
- **`GET_AUTO_LIST_TIMEOUT_MS` 60s → 90s.** A real prod cold-call
  observed in `adb logcat` took 21s; subsequent calls dropped to
  ~3s. The 60s ceiling from ADR-023 was occasionally cutting off
  responses the backend was about to deliver. 90s adds comfortable
  headroom for the cold path on slow mobile networks while still
  surfacing a clear error UI on genuine outages. No auto-retry —
  the manual Retry button on `AutoListLoadError` remains the right
  primitive.
- **Native `ERR_NETWORK` reclassification.** `classifyLoadError`
  takes an optional `{ durationMs, timeoutMs }`. Native axios emits
  `code === 'ERR_NETWORK'` on timeout (web emits `ECONNABORTED`); if
  the elapsed time is ≥ 90% of the configured timeout, the
  classifier reclassifies as `'timeout'`, so `AutoListLoadError`
  shows «Сервер отвечает дольше обычного» instead of «Проверьте
  подключение к интернету» when the backend is the cause.
  `ETIMEDOUT` is also handled explicitly.

The interceptor debug logs (`⬆️ ⬇️ ✗ [API]`) added during the
investigation are kept, but gated to `__DEV__`. The `metadata.t0`
timestamp is still stamped on the request config unconditionally —
`classifyLoadError` reads it via `error.config?.metadata?.t0` to
compute `durationMs`.

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
