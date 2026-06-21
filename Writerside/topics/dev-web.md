# Web Version

## Current State (as of 2026-04-22)

Web version is **in active development** using Expo Web from the shared `/src/` codebase.
Auth flow, onboarding, INN registration, auto-list, auto detail (8 tabs), driver management, charges,
notifications, notification settings, and user profile are working.

## Legacy Web App (reference only)

| Property | Value |
|----------|-------|
| Location | `/transappweb/` (gitignored) |
| Source repo | https://gitlab.trade.su/transapp/transappweb |
| Stack | React 19, plain JavaScript, no router |
| Status | **Currently in production** — to be replaced |
| Key files | `Auth.js`, `Auto.js`, `AutoList.js`, `DriverList.js`, `Inn.js`, `Pin.js`, `User.js` |

The legacy web app was built by the previous developer as a standalone JS project,
separate from the legacy mobile app (`/Transappru/`).

## Legacy Mobile App (reference only)

| Property | Value |
|----------|-------|
| Location | `/Transappru/` (gitignored) |
| Status | Legacy, not maintained |

## Our Plan (ADR-001)

Build the new web version using **Expo Web** from the same `/src/` codebase.
See [Decision Log](decision-log.md) ADR-001.

**Approach:**
- Run `npx expo start --web` against `/src/`
- Use `.web.tsx` overrides where native and web UX diverge
- Use `Platform.select` for minor platform differences
- Platform-gate features that can't work on web (push, camera, etc.)

## Feature Parity Checklist

Use legacy apps as reference to ensure nothing useful is missed.

| Legacy Screen | Mobile (`/src/`) | Web (new) | Notes |
|---------------|------------------|-----------|-------|
| Auth (`Auth.js`) | `screens/auth/AuthScreen.tsx` | ✅ Done | `.web.tsx`: two-column layout, HTML input, phone formatting, cursor lock after "+7" |
| PIN (`Pin.js`) | `screens/auth/PinScreen.tsx` | ✅ Done | `.web.tsx`: 4 separate OTP-style digit fields, auto-advance, backspace, paste support |
| Auto list (`AutoList.js`) | `screens/auto/AutoListScreen.tsx` | ✅ Done | `.web.tsx`: responsive grid, inline search bar, equal-height cards per row (via `fillHeight` on `AutoListItem`). Card button row uses **proportional flex by label length** — see "Auto card button row layout" below |
| Auto detail (`Auto.js`) | `screens/auto/AutoDetailScreen.tsx` | ✅ Done | `.web.tsx`: functional component, 8 tabs split into `web/` sub-components, HTML file upload, browser download, responsive tab bar |
| Driver list (`DriverList.js`) | `screens/drivers/DriverListScreen.tsx` | ✅ Done | `.web.tsx`: wraps DriversTab in WebAppLayout |
| INN (`Inn.js`) | `screens/inn/InnScreen.tsx` | ✅ Done | `.web.tsx`: INN binding + RNIS check, latin→cyrillic |
| User (`User.js`) | `app/user.tsx` | ✅ Done | `user.web.tsx`: org info, contact CRUD, logout, delete profile |
| Charges | `screens/charges/ChargesScreen.tsx` | ✅ Done | `.web.tsx`: grouped fines, filter pills, selection, payment footer |
| Notifications | `screens/notifications/NotificationListScreen.tsx` | ✅ Done | `.web.tsx`: click-to-mark-viewed, blue indicator |
| Notification settings | `screens/notifications/NotificationSettingsScreen.tsx` | ✅ Done | `.web.tsx`: two-level toggle tree, optimistic updates |
| Fine detail | `screens/auto/AutoFineScreen.tsx` | ✅ Done | `.web.tsx`: display-only, route params, SHOW_PAYMENT_UI payment button |
| Payment confirm | `screens/fine-payment/PaymentConfirmScreen.tsx` | ✅ Done | `.web.tsx`: commission calc, FIO validation, custom toggle, inline errors |
| Payment webview | `screens/fine-payment/FinePaymentWebViewScreen.tsx` | ✅ Done | `.web.tsx`: iframe-based payment page |
| Payment success | `screens/fine-payment/FinePaymentSuccessScreen.tsx` | ✅ Done | `.web.tsx`: success message, navigation back |
| Pass ordering | `screens/pass/PassScreen.tsx` | ✅ Done | `.web.tsx`: 2-stage autocomplete, zone tabs, vehicle list, /add-address. Sidebar "Пропуск" → AutoListScreen?mode=pass (auto-opens AddAutoModal, card click marks vehicles, footer "Заказать пропуск") → PassScreen |
| Pass map | `screens/pass/PassYaMapScreen.tsx` | ✅ Done | `.web.tsx`: Yandex Maps JS API v3 (ADR-004). Zone polygons (МКАД/ТТК/СК), click-to-select address via `/get-address-map`, returns data to PassScreen. Shared polygon data in `src/data/moscowZonePolygons.ts` |
| Onboarding | `screens/onboarding/OnBoardingScreen.tsx` | ✅ Done | `.web.tsx`: image left, text+nav right, skip button |
| Services | `screens/services/OurServicesScreen.tsx` | ✅ Works | No `.web.tsx` needed — renders well inside WebAppLayout |

## First-Login Flow

When a new user logs in for the first time, three flags from `trans_konsalt.session` table
control which screens/modals are shown:

| Flag | Screen/Modal | Where checked |
|------|-------------|---------------|
| `onboarding_viewed = 0` | Onboarding carousel (`/onboarding`) | `useAutoData.ts` via `/get-auto-list` response (`onboarding_expired` field) |
| `announce_our_services_viewed = 0` | "Наши услуги" modal | `useAutoData.ts` via `/get-auto-list` response |
| `add_notification_viewed = 0` | Notification info popup | Not yet implemented |

**Flow:** index → auth → pin → auto-list → (redirect to onboarding if needed) → back to auto-list → "Наши услуги" modal.

**Anti-loop protection:** Module-level flags `_onboardingRedirectDone` and `_announceShown` in `useAutoData.ts`
prevent infinite redirect loops when the server returns stale flag values (e.g. multiple session records).

## Logout

`handleLogout()` in `app/user.tsx` removes the token from AsyncStorage and uses `router.replace('/')`.
The token is saved to `saved_token_for_return` for quick re-login via PinScreen.

## Debug Logging

Console logs are added for key auth flow events (visible in browser DevTools):

- **PinScreen** (`/confirm-token`): `phone_inn_bind`, `is_manager`, `onboarding_expired` with human-readable labels
- **useAutoData** (`/get-auto-list`): `onboarding_expired` flag value and interpretation
- **OnBoardingScreen** (`/get-onboarding`): marks onboarding as viewed on mount
- **API interceptor**: all requests/responses logged with `⬆️`/`⬇️` prefixes

Note: `onboarding_expired` can come as string `"0"` or number `0` from API — both are handled.

## Shared Hooks (ADR-003)

Business logic extracted from screen pairs into shared hooks — screens are thin UI wrappers.
See [Decision Log](decision-log.md) ADR-003.

| Hook | Screens | Key exports |
|------|---------|-------------|
| `useAuthFlow` | AuthScreen | phone, polling, agreements, submit |
| `usePinConfirm` | PinScreen | submitPin, error modal, navigation |
| `useOnboardingFlow` | OnBoardingScreen | slides, current, handleNext/Skip |
| `useNotificationList` | NotificationListScreen | notifications, loading, markAsViewed |
| `useNotificationSettings` | NotificationSettingsScreen | settings, toggleMaster/Auto, error state |
| `useChargesSelection` | ChargesScreen | filter, selection, grouped data, pay |
| `usePaymentConfirm` | PaymentConfirmScreen | charges, commission, FIO, discount, pay |
| `useInnBinding` | InnScreen | INN, RNIS check, modals, bind |
| `usePassOrder` | PassScreen | address autocomplete, zone, vehicles, order |

**Pattern:** hooks return error strings/states; mobile → `Alert.alert`, web → `window.alert` or inline UI.
Hooks use `api` from `services/api`. Platform-specific behavior via callbacks (e.g. `useInnBinding(onConfirmationClose)`).

**Utility:** `src/utils/plateHelpers.ts` — shared GRZ normalization (Latin→Cyrillic, allowed chars, digits-only).

## Conventions playbook

All new/refactored screens must follow [Screen Development Conventions](dev-screen-conventions.md) —
the mandatory playbook covering ADR-003 (shared hooks), ADR-005 (shared UI),
NativeWind styling rules, prod-ready web checklist, and migration procedure.

## Shared UI Sub-components (ADR-005)

After shared hooks (ADR-003), the UI layer was still duplicated ~70% between `.tsx` and `.web.tsx`
screen pairs. ADR-005 introduces per-feature shared sub-components in `src/components/<feature>/`
plus cross-cutting helpers. Screens become thin orchestrators. Visual parity between platforms is enforced.

| Feature dir | Components | Status |
|---|---|---|
| `src/components/pass/` | `ZoneTabs`, `LocationBadges`, `SuggestionItem`, `VehicleCard`, `ManualZoneBanner`, `SuccessModal` | ✅ Pilot done (PassScreen) |
| `src/components/charges/` | (pre-existing) `ChargeCard`, `ChargesFilterPanel` | ✅ Already shared |
| `src/components/auto/` | (pre-existing) `AutoListItem`, `AutoListMenu`, `FindAutoPanel`, `modals/*` | ✅ Already shared |
| `src/components/sidebar/` | `OrgListItem` | ✅ Done (WebSidebar + LeftMenuModal parity) |
| `src/components/notifications/` | TBD | ⏳ Next |
| `src/components/inn/`, `user/`, `payment/`, `auth/` | TBD | ⏳ Planned |

**Cross-cutting helpers:**

| File | Purpose |
|------|---------|
| `src/utils/alert.ts` + `.web.ts` | `showAlert(title, message?)` — `Alert.alert` on mobile, `window.alert` on web |
| `src/utils/switchOrganization.ts` | `switchOrganization(inn)` — single-source org-switch request. Returns discriminated union `{ status: 'ok' \| 'auth_required' \| 'error' }`. Handles `auth_required=1` response and HTTP 401 by clearing the stored token. Used by both `useAutoActions` (mobile) and `WebSidebar` (web). |
| `src/utils/navigateToInn.ts` | `navigateToInn(router, userData, checkRnis)` — canonical push to `/(authenticated)/inn` with the exact params `useInnBinding` expects (`user_data` JSON-serialised, `check_rnis` as `"0" \| "1"`). Ensures both sidebars keep mobile and web in lockstep across three flows: register-new, add-account, RNIS-only check. |
| `src/components/web/WebScreenContainer.tsx` | Desktop max-width + centering wrapper (default 820px), used inside authenticated web screens |
| `src/components/common/ScreenHeader.tsx` | Cross-platform header (Pressable + accessibilityRole + cursor:pointer on web). Replaces inline web headers |
| `src/components/common/PlateField.tsx` | Russian license plate input (305×80 visual + RUS/flag caption). Uses `useSafariAutofillFix` + `Platform.select` so the `<input>` on web fills its box and Safari autofill overlays don't pollute the UI. Consumed by `AddAutoModal` and both `InnScreen` variants. |
| `src/hooks/useSafariAutofillFix.ts` | Ref-counted global style hiding `::-webkit-contacts-auto-fill-button` + per-input attr stripper. Web-only; no-op on native. |

**Prod-ready web features layered on top (pilot on PassScreen):**
- ARIA combobox over the address `<input>` + suggestion list
- Keyboard navigation: ArrowUp/ArrowDown/Enter/Escape through suggestions
- Inline loading indicator during autocomplete
- `SuccessModal` with focus trap, ESC close, overlay-click close, focus restore
- `safeBack` pattern: `router.canGoBack() ? router.back() : router.replace('/main')` for direct-URL entries

**Pattern for new screens:**
1. Extract shared sub-components into `src/components/<feature>/*.tsx` + `index.ts` barrel
2. Migrate both `.tsx` and `.web.tsx` to use them (delete inline markup)
3. Wrap web screen content in `<WebScreenContainer maxWidth={...}>` if it lives inside authenticated layout
4. Replace `Alert.alert` / `window.alert` with `showAlert()`
5. Replace inline headers with `<ScreenHeader>`
6. Add web a11y polish (ARIA where applicable, keyboard nav, loading states)

## Auto list sort toggle («Сортировка по …»)

Vehicle list supports two sort modes — see the canonical
**[«Auto list ordering» section in dev-mobile.md](dev-mobile.md)** for
the full specification, rationale, and Phase 2 migration plan. Both
platforms share the same hook (`useAutoData`) and the same `SortToggle`
shared component (segmented control with a leading «Сортировка по»
label and two options «алфавиту» / «номеру»), embedded in
`AutoCountToolbar`.

Web-specific notes:

- `AutoCountToolbar` lives directly under the screen header on
  `AutoListScreen.web.tsx`, between the active filter chips (if any)
  and the `FlatList`. Width is the full viewport (no
  `WebScreenContainer` wrapper at this level).
- Sort mode persists via `AsyncStorage` which on web is backed by
  `localStorage`. The lazy initializer in `useAutoData` reads the
  stored value synchronously at first render so the toggle never
  flashes the default on page load.
- The info banner (`SortBanner`) appears between `AutoCountToolbar`
  and the grid when `sortMode === 'plate_digits'` and the user hasn't
  dismissed it. On `plate_digits` the entire fleet is fetched in one
  request (`auto_list_limit = 2000`), so the first paint after toggle
  switch may take ~1–2s on slow networks for large fleets; the
  responsive grid handles the result the same way it handles a normal
  paginated load.

## Auto card button row layout

`AutoListItem` (shared between mobile and web via ADR-005) renders two
rows of toggle buttons inside each card:

| Row | Buttons (RU labels) | Label lengths | `flex` per button |
|---|---|---|---|
| 1 | «Штрафы», «Платные дороги» | 7, 14 chars | **7, 14** |
| 2 | «ОСАГО», «ДК», «РНИС» | 5, 2, 4 chars | 1, 1, 1 |

**Why proportional, not plain `flex: 1`.** Equal `flex: 1` on Row 1
forced the longer label to wrap to a second visual line on narrow
cards (e.g. 4-column grid on a 16-inch laptop: 1680px viewport / 240px
sidebar → ~348px card → ~150px per button → «Платные дороги» + chevron
icon overflowed and wrapped). Proportional flex (`7 : 14` ≈ `1 : 2`
mirrors the underlying character-count ratio) gives the longer button
twice the horizontal real estate, which leaves comfortable padding at
every grid width.

**Row 2 stays `flex: 1`** for each button because all three labels are
short (≤ 5 chars) and any allocation strategy produces visually
acceptable results; equal flex keeps the row symmetric.

### Pass-row cells (above the button rows)

Same rationale applies to the pass-info row that sits above the toggle
buttons. The row shows up to four cells:

| Cell | Source / typical content | `flex` | Width % |
|---|---|---|---|
| Icon | `pass_item.png` (20×20 fixed image) | **2** | 10% |
| Тип пропуска | `item.check_passes_year_propusktype` («СК», «МКАД», «ТТК», …; 2–4 chars) | **3** | 15% |
| Тип действия | `item.check_passes_year_type_of_pass_string` («Дневной», «Ночной», «Круглосуточный»; 6–14 chars) | **6** | 30% |
| Статус | «Действителен» / «Аннулирован» (fixed, 11–12 chars) | **9** | 45% |

Total 20 units across the four cells. The `2 / 3 / 6 / 9` ratio reflects
the actual rendered width of each label class:

- Cyrillic at the default 14pt RN font averages ~9.5px per character,
  so «Действителен» renders at ~114px — needs at least a 134px cell
  to read comfortably with ~10px of horizontal padding on each side.
- «Дневной» (~66px rendered) is the median label; its column also has
  to accept the outlier «Круглосуточный» (~133px), which truncates via
  `numberOfLines={1}` when present.
- «СК» / «МКАД» / «ТТК» fit in a much narrower cell (~45px) so the
  column doesn't waste space and visually balances the row.

Previous allocations `1 / 2 / 2 / 3` (total 8) and `1 / 2 / 3 / 4`
(total 10) gave 25–40% of row width to the propusktype column while
squeezing status to 37.5–40%. Visually the propusktype cell looked
overpadded while «Действителен» either truncated to «Действител…»
(when guarded by `numberOfLines={1}`) or quietly overflowed its cell
(when not) — both unacceptable on a 4-column 16-inch layout.

**Secondary pass-row** («Еще один пропуск» for cars with two passes)
uses the same `2 / 3 / 6 / 9` allocation for visual parity.

**Status заявки row** (3 cells, no icon column) uses `2 / 3 / 5`
(total 10) — different label set (`status_header` is typically 10–20
chars, independent calibration).

**Fallback / loading-state rows** use `flex 18` for the single content
cell next to the icon (icon `flex 2` + content `flex 18` = data-row
total 20) — visual parity with cards that have full pass data.

`styles.passCell` uses `minHeight: 29` (not fixed `height`) so any
unexpected wrap won't break the row's vertical rhythm.
`styles.passCellText` carries `flexShrink: 1` + `minWidth: 0` for the
same RN-Web ellipsis reason as `checkTabText`. Every dynamic-text Text
inside a pass-row cell is `numberOfLines={1}` (guardrail against
unusually long propusktype / type strings).

**Stylesheet contract** (`src/components/auto/AutoListItem.tsx`,
`styles.checksRow` + `styles.checkTab` + `styles.checkTabInner` +
`styles.checkTabText`):

- `checksRow` uses `gap: 6` instead of per-tab `marginRight` — no
  trailing-child special case, additions/removals don't ripple.
- `checkTab` defines `minHeight: 29` (not fixed `height`) +
  `paddingHorizontal: 8` / `paddingVertical: 4` + `borderRadius: 4`.
  No `flex` in the base style — set inline at the call site.
- `checkTabInner` is the row-flex container for `<Text> + <Image>`
  with `flexShrink: 1` + `minWidth: 0` so the Text child can truncate
  via `numberOfLines={1}` instead of pushing the chevron past the
  right edge.
- `checkTabText` carries the same `flexShrink: 1` + `minWidth: 0` —
  required for RN-Web to apply `text-overflow: ellipsis` when
  `numberOfLines={1}` is set on a Text inside a row-flex parent.
- Every `<Text>` inside a check tab is given `numberOfLines={1}` as a
  guardrail. If the proportional ratio is ever miscalibrated (e.g. a
  future label exceeds 14 chars), text truncates with `…` instead of
  silently wrapping and breaking the card's vertical rhythm.

**Rule for adding new toggle buttons to the row**: compute `flex` as
the character count of the label (rounded). If the new button shares a
row with siblings, keep the same ratio logic — the sum of all `flex`
values is the only thing that matters for distribution, so adding a
6-char button to Row 2 next to «ОСАГО»/«ДК»/«РНИС» as `flex: 6` next
to `flex: 5 / 2 / 4` produces visually proportional widths.

## Yandex Maps (Web — ADR-004)

Mobile uses `react-native-yamap-plus` (native SDK). Web uses **Yandex Maps JS API v3** loaded dynamically.

| File | Purpose |
|------|---------|
| `screens/pass/PassYaMapScreen.web.tsx` | Full map screen — loads Yandex API, renders polygons, click-to-select, address resolution |
| `data/moscowZonePolygons.ts` | Shared polygon coordinates (МКАД 1348pts, ТТК 1052pts, СК 461pts) — both native `{lon,lat}[]` and web `[lon,lat][]` formats |
| `screens/pass/PassYaMapScreen.tsx` | Mobile screen — imports from shared polygons file |

**Key implementation details:**
- Dynamic script loading (`api-maps.yandex.ru/v3/`) — no bundle bloat, cached via module-level promise
- `@yandex/ymaps3-reactify` wraps imperative API into React components (`YMap`, `YMapFeature`, `YMapMarker`, `YMapListener`)
- `reactify.useDefault()` for uncontrolled map location (center/zoom)
- Click handler via `YMapListener onClick` → `/get-address-map` API → address overlay + "Добавить" button
- "Добавить" returns `address_map_data` as JSON in URL params to PassScreen
- `_layout.web.tsx` provides `WebAppLayout` — map screen uses `<View style={{flex:1}}>` (no double sidebar)
- API key: `e2f7a3f4-a2db-4aa1-beac-eae772516bf1` (web key, separate from mobile `9247644d-...`)

## API Client

All `.web.tsx` screens use `import api from '../../services/api'` (the unified API client).
The old `utils/Api.ts` is no longer used in web screens.

### `/api/*` proxy on `lk.transapp.ru` (ADR-025, 2026-05-20)

Since the cutover (ADR-017) the web frontend lives on our Yandex
Cloud VM and `/api/*` is reverse-proxied to Ivan's legacy perl
backend through `nginx/nginx.prod.conf`. Two non-obvious points:

1. **Upstream targets the prod-apex vhost.** `upstream main_api`
   points at `transapp.ru:443` (185.76.253.6), the same vhost the
   mobile app hits direct. The proxy also forces `Host: transapp.ru`
   and `proxy_ssl_name transapp.ru` because Ivan's perl router
   selects the vhost by `Host` header, not by IP. Before ADR-025
   the config pointed at `ivan.trans-konsalt.ru` (staging IP
   .4, staging vhost on Ivan's side) — a leftover from the dev
   config (`src/services/api.web.ts` uses staging for `localhost`
   web-dev). Symptoms of the bug: response payloads 36 646 bytes
   instead of 36 662, frequent multi-second spikes on
   `lk.transapp.ru` that did not appear on mobile.
2. **Upstream keepalive is on.** `keepalive 16` in the upstream
   block plus `proxy_http_version 1.1` + `proxy_set_header
   Connection ""` in the location block. Without the second pair,
   nginx silently falls back to a fresh TLS handshake per request
   even though the `keepalive` directive is set.

If you change the proxy target in the future, keep the trio in
sync: `upstream server`, `proxy_set_header Host`, `proxy_ssl_name`.

## AutoDetailScreen (web)

The mobile version is a single 2400-line class component. The web version is split into sub-components:

| File | Purpose |
|------|---------|
| `AutoDetailScreen.web.tsx` | Orchestrator — header, STS input, tab routing |
| `web/useAutoDetail.ts` | Hook: all state + 11 API endpoints |
| `web/TabBar.tsx` | Tab navigation (desktop: row, mobile: horizontal scroll) |
| `web/PassesTab.tsx` | Vehicle passes |
| `web/FinesTab.tsx` | Traffic fines (paid/unpaid, payment button) |
| `web/AvtodorTab.tsx` | Toll roads (paid/unpaid) |
| `web/OsagoTab.tsx` | Insurance policy |
| `web/DiagnosticCardTab.tsx` | Diagnostic card |
| `web/RnisTab.tsx` | RNIS registry check (see note below) |
| `web/FilesTab.tsx` | File management |
| `web/FileEditModal.tsx` | Upload/edit files (HTML `<input type="file">`) |
| `web/FileDeleteModal.tsx` | Delete confirmation |
| `web/PaginatedList.tsx` | "Show more" for long lists |

**`RnisTab.tsx` — RNIS field interpretation.** Backend `/get-auto-check-rnis` returns `registrationOk`, `telematicsOk`, `telematics_date` **as strings** (`'1'`, `'0'`, `'2026-05-16 15:52:39'`). Do not compare these with strict equality against numbers. Use the shared helper `src/utils/rnisStatus.ts`:

```ts
import { getRnisStatus } from '../../../utils/rnisStatus';

const status = getRnisStatus(data); // null → "не найдены"
// status.telematics: 'never' | 'stale' | 'active'
// status.lastTransmissionAt: string | null
```

Three-way telematics states (mirrors legacy `transappweb/src/Auto.js:881-913`):

| `telematics` | Shown text |
|---|---|
| `'never'` | Навигационные данные в РНИС не поступали |
| `'stale'` | Последняя передача телематики более суток назад + дата |
| `'active'` | Телематика передается. + дата (if any) |

Telematics block is rendered **only when `status.registered === true`**. See ADR-022.

**Key web replacements:**
- `DocumentPicker` → HTML `<input type="file">` via `useRef`
- `RNFS.downloadFile` → `window.open(url, '_blank')`
- `Alert.alert` → `window.alert()` / `window.confirm()`
- `Api` (utils/) → `api` (services/) — CORS-friendly
- Tabs lazy-load data on first visit

## Shared Components — Web Fixes

**AddAutoModal** (`components/auto/modals/AddAutoModal.tsx`) — shared between mobile and web, no `.web.tsx` override.

Input validation (`hooks/useAutoActions.ts`):
- GRZ base: only Cyrillic АВЕКМНОРСТУХ + digits 0-9; Latin ABEKMHOPCTYX auto-converted to Cyrillic; auto-uppercase
- Region code: digits only (`/^[0-9]*$/`), max 3 chars
- STS: same Cyrillic/Latin/digit filter as GRZ base, max 10 chars
- Validation logic matches `InnScreen.web.tsx` / `InnScreen.tsx`

Safari autofill prevention (web only):
- `useEffect` strips RN-generated HTML attributes (`autocomplete`, `autocorrect`, `autocapitalize`, `spellcheck`, `rows`, `virtualkeyboardpolicy`, `inputmode`) via refs — matches minimal attribute signature of search input (no autofill)
- CSS pseudo-element hiding for `::-webkit-contacts-auto-fill-button` / `::-webkit-credentials-auto-fill-button`

Layout fixes:
- `Platform.select` for three TextInput styles (`plateBaseInput`, `plateRegionInput`, `stsInput`) — web: `padding: 0`, native: original values
- `overflow: 'hidden'` + explicit `width/height: '100%'` on web inputs — prevents click/cursor mismatch
- Click-outside-to-close: `Pressable` overlay with `onPress={onCancel}`, `stopPropagation` on modal content
- Lighter overlay: `rgba(0,0,0,0.2)`, `boxShadow` on web for floating card effect
- `animationType="fade"` instead of `"slide"`

## Form submit on Enter (web)

Web users expect Enter to submit a single-action form once it's valid.
Manager team flagged this missing on the auth screens. Implemented for
all three submit-style auth/registration forms (search/filter inputs
intentionally excluded — there's no submit there).

| Screen | File | Trigger | Gating | Action |
|---|---|---|---|---|
| Phone entry | `screens/auth/AuthScreen.web.tsx` | **Capture-phase** `keydown` listener on a `<View ref={formRef}>` wrapping the whole card (see "Checkbox edge case" below) | `!buttonDisabled` (= `phoneValid && checked && !isSubmitting`) | `handleSubmit()` |
| SMS PIN | `screens/auth/PinScreen.web.tsx` | Enter branch in existing `handleDigitKeyDown` (any of 4 fields) | full code matches `/^\d{4}$/` | `submitPin(code)` |
| INN | `screens/inn/InnScreen.web.tsx` via `InnInput` | `onSubmitEditing` (RN Web maps Enter → onSubmitEditing) | `innValid` | `handleBindInn()` |
| Plate (RNIS check) | `screens/inn/InnScreen.web.tsx` via `PlateField` (region field) | `onSubmitEditing` on the region `<TextInput>` | `rnisButtonEnabled` | `handleCheckRnis()` |

**Pattern rules:**
1. Every Enter handler reads the **same gate** as the visible button's
   `disabled` prop. Mouse-click and keyboard paths cannot drift apart.
2. `e.preventDefault()` before invoking the handler — keeps page-level
   forms (if any are added later) from double-firing.
3. For shared components (`InnInput`, `PlateField`) the prop is the
   standard RN `onSubmitEditing` — additive, optional. Native callers
   that don't pass it see no behaviour change.
4. Reference implementation for ad-hoc HTML inputs: `PassScreen.web.tsx`
   (`onInputKeyDown` in the address autocomplete).

### Checkbox edge case (AuthScreen)

`AgreementsCheckbox` is a shared component built on
`<Pressable accessibilityRole="checkbox">`. On web, react-native-web
renders Pressable as a focusable `<div>` whose own `keydown` handler
treats Enter as "press" → fires `onToggle`. So if the user clicks the
checkbox to mark consent (focus jumps from the phone input to the
checkbox `<div>`) and then presses Enter, Pressable un-checks the
agreement **before** any handler on the input runs — the form ends up
gated, not submitted.

Fix: AuthScreen attaches a **capture-phase** `keydown` listener to a
`<View ref={formRef}>` wrapping the whole card. Capture fires before
any descendant's bubble handler, so we `preventDefault() +
stopPropagation()` and call `handleSubmit()` ourselves. Pressable
never sees the event; the checkbox stays in whatever state it was.

```tsx
const formRef = useRef<View>(null);
useEffect(() => {
  const node = formRef.current as unknown as HTMLDivElement | null;
  if (!node) return;
  const handler = (e: KeyboardEvent) => {
    if (e.key !== 'Enter' || buttonDisabled) return;
    e.preventDefault();
    e.stopPropagation();
    handleSubmit();
  };
  node.addEventListener('keydown', handler, true); // capture
  return () => node.removeEventListener('keydown', handler, true);
}, [buttonDisabled, handleSubmit]);
```

Same pattern would apply to any future form whose layout mixes plain
inputs with Pressable buttons that should not steal Enter. PinScreen
and InnScreen don't need it — those forms have no focusable
non-submit interactive elements between input and submit.

## Sidebar (WebSidebar.tsx)

- "Как работать" link conditionally shown only when `onboarding_expired === 0`
- Organization list with switch support — uses shared `OrgListItem` (see below)
- Services dropdown (expandable)
- Responsive: collapses below 900px viewport width
- Modal-based actions (no route change) reuse the mobile components:
  `RnisCheckModal`, `AddAccountModal`, `InviteUserModal`, `ContactsModal`
  ("Обратная связь"). All four are mounted by the sidebar; data feeds
  from the same `/get-auto-list` payload `loadData()` already pulls
  (`user_data.manager_data`, `user_data.tech_support_data`, `id`, `inn`).

### Modal style canon

Web modals share one visual language (centered card on a translucent
overlay, `borderRadius: 25`, web `boxShadow: '0 8px 32px rgba(0,0,0,0.18)'`
with native shadow fallback via `Platform.select`, `animationType="fade"`,
ESC-to-close on web). Reference implementation: `AddAutoModal.tsx`. Same
structure used by `AddAccountModal`, `RnisCheckModal`, `InviteUserModal`,
and the web variant of `ContactsModal`.

`maxWidth` is content-driven:

| Modal | maxWidth | Why |
|-------|----------|-----|
| Single-input flows (AddAuto, AddAccount, RnisCheck) | `400` | one column, comfortable on phone-width viewport too |
| Long-form (InviteUser) | `440` | three fields + description block |
| Multi-card (ContactsModal.web) | `480` | two cards × 3 actions with separators — `400` was cramped |

When a modal needs a bottom-sheet shape on native (e.g. action sheets
with horizontal action rows), keep that as `Component.tsx` and add a
matching `Component.web.tsx` that uses the centered-card canon. Metro
picks the right variant per platform automatically — no `Platform.OS`
forking inside one file. Verified: a mobile `Modal.tsx` does **not**
leak into the web JS bundle when a sibling `Modal.web.tsx` exists
(grep `/_expo/static/js/web/*.js` for the bottom-sheet's unique style
markers like `justifyContent:"flex-end",margin:0` — zero matches).

### Sidebar data freshness (UserDataContext, ADR-020)

Shared snapshot for `userData`, `otherUserList`, `autoListCount`,
`ourServicesList`, `onboardingExpired` lives in
`src/contexts/UserDataContext.tsx` and is mounted by
`app/(authenticated)/_layout.web.tsx`. Both `WebSidebar` and
`AutoListScreen.web` consume it — one in-flight `/get-auto-list` with
`auto_list_limit: 0` at any moment, one snapshot.

`UserDataContext.updateUserData()` triggers a refresh. The component
owns *when* to call it; the Context owns *how* (in-flight Promise
dedup, AbortController on unmount, silent error handling for
non-critical sidebar UX).

**Trigger inventory (live as of 2026-05-14):**

| Trigger | Where | Why |
|---|---|---|
| Component mount | `WebSidebar` `useEffect([refresh, pathname])` | Initial load. |
| `pathname` change | `WebSidebar` `useEffect([refresh, pathname])` | User navigated — any counts may have changed. |
| `document.visibilitychange` → visible | `WebSidebar` `useEffect([refresh])` | User switched tabs and came back; may have received notifications elsewhere. |
| Successful `switchOrg` | `WebSidebar.switchOrg` | After optimistic swap, background reconcile of any drifted fields. |
| Route focus | `AutoListScreen.web` `useFocusEffect` | Returns from auto detail / settings; refresh badge counts. |

All five collapse into **at most one** outgoing request via
`inFlightRef` in the Provider — a second concurrent caller receives
the same `Promise<void>` without firing a new fetch. AbortController is
managed centrally; component unmount or Provider teardown cancels the
in-flight request without `setState` on a dead component.

**Cross-call dedup (ADR-028).** The `inFlightRef` slot is shared with the
HEAVY `useAutoData.fetchAutoList` too, not just with other LIGHT
`updateUserData` callers. On the auto-list route both fire concurrently
(sidebar LIGHT `auto_list_limit: 0` + screen HEAVY full list); the legacy
backend ignores `auto_list_limit`, so both are equally expensive N+1.
`fetchAutoList` registers a marker into the slot via
`context.registerAutoListFetch(promise)` **synchronously at its top**
(web only), resolved in its `finally`. `updateUserData` defers to an
in-flight HEAVY: pre-await guard, then a one-microtask yield + re-check
after the token `await` — this makes the dedup **ordering-independent**
(works whether the sidebar or the screen effect fires first, since both
await `getItem` before the HEAVY can register). HEAVY never defers to
LIGHT (the screen needs the list). Result: one `/get-auto-list` per
page-load / company switch instead of a concurrent pair. The HEAVY
response is a superset and already drives `syncFromAutoList`, so the
deferring LIGHT loses nothing.

`useAutoData` is Context-aware:

- A reflection `useEffect` mirrors Context → local state so consumers
  reading `autoListHook.userData / .otherUserList / .autoListCount /
  .ourServicesList / .onboardingExpired` keep working unchanged.
- Every fetch path (`fetchAutoList`, cache-restore in `setFilterValue`
  / `clearFilters`) publishes the response into Context via
  `syncFromAutoList` so the sidebar mirrors the screen's state without
  an extra request.
- `decrementNotificationCount` routes through `context.setUserData`
  so the sidebar's badge decreases the moment the screen marks
  notifications viewed.
- `updateUserDataOnly` on web delegates to `context.updateUserData()`
  — legacy call sites via `autoListHook` do not produce duplicate
  requests.

On native there is no `UserDataProvider`; `useOptionalUserData()`
returns null and `useAutoData` falls back to local state bit-for-bit
as before. Existing `useAutoData` tests pass under this no-Provider
fallback unchanged.

### Optimistic swap on org switch

The backend serialises requests per session, so the sidebar's refresh
after `/set-current-inn` ends up queued behind `AutoListScreen`'s full
fetch — the footer would otherwise keep the previous org visible for
several seconds after the fleet already rendered.

Fix: as soon as `/set-current-inn` succeeds, `WebSidebar.switchOrg`
calls **`UserDataContext.optimisticOrgSwap(inn)`** (ADR-020) *before*
firing the refetch:

- The clicked org moves from `otherUserList` into `userData` (firm,
  inn, user_auto_count, notification_unviewed_count). The phone stays
  — it's bound to the session, not the org.
- The previously-current org takes the clicked org's slot in
  `otherUserList`, with `user_confirmed = phone_inn_confirmed = 1`
  (the current org is confirmed by definition).

The background `context.updateUserData()` still runs and reconciles any
drifted fields when the server eventually responds, but the user sees
the new org in the footer (sidebar) **and** the fleet on the screen
flip in lockstep the instant the switch is acknowledged — the Context's
reflection effect propagates the swap into `useAutoData`'s local state
without an extra request.

### Organization switcher parity (shared `OrgListItem`)

`src/components/sidebar/OrgListItem.tsx` is used by both web (`WebSidebar`) and mobile
(`LeftMenuModal`). Each row renders:

- Firm name (bold when fully confirmed, muted when not)
- `инн: <ИНН>`
- `количество авто: <N>` (`user_auto_count` from `/get-auto-list`)
- `инн ожидает подтверждения` (if `user_confirmed` is falsy)
- `телефон ожидает подтверждения` (if `phone_inn_confirmed` is falsy)
- Red badge with `notification_unviewed_count`

Tap fires `onPress(inn)` only if `user_confirmed && phone_inn_confirmed`; otherwise ignored
(matches legacy mobile behaviour). `compact` prop hides all text — used when web sidebar is collapsed.
Styled via NativeWind semantic tokens (`text-text-primary`, `text-text-secondary`, `bg-status-error`).

#### `user_auto_count` for the active org — backend asymmetry

`/get-auto-list` ships `user_auto_count` for **every** entry in
`other_user_list`, but **omits** it from `data.user_data` (the active
org's payload). The trustworthy source for the active org's count is
the top-level `data.auto_list_count` — same number `AutoListScreen`
prints as "Всего N авто".

Both sidebars compensate by reading `auto_list_count` separately and
substituting it into the active `OrgListItem`:

- **Web** (`WebSidebar.tsx`) — owns its own `/get-auto-list` fetch, so
  it stores `auto_list_count` in a sibling `useState<number>` next to
  `userData`. The optimistic-swap path on org switch also updates this
  value (target's `user_auto_count` becomes the new active count, and
  the de-promoted org takes the old `autoListCount` into its
  `other_user_list` entry — otherwise the de-promoted row would show
  `0` until the background reconcile lands).
- **Mobile** (`LeftMenuModal.tsx`) — dumb component, receives the value
  as `autoListCount` prop from `AutoListScreen.tsx`, which pulls it
  from `useAutoData.autoListCount`. Same shared `OrgListItem` is fed
  the value for the active row.

Counts arrive from backend as **strings** ("14"), so both call sites
coerce via `Number(x) || 0` to keep downstream comparisons numeric.

Verified empirically by `.claude/scripts/probe-org-counts.mjs` against
prod `transapp.ru`: `user_data.user_auto_count` is `undefined`,
`other_user_list[i].user_auto_count` is `"74"`/`"54"`,
`auto_list_count` is `"14"`. If backend ever starts shipping
`user_auto_count` on `user_data`, this fix becomes a no-op (we're not
overriding a present value, we're filling in for an absent one — but
the override is unconditional, so a future backend change should be
followed by removing the substitution to avoid two sources of truth).

## CI/CD Pipeline (Docker + Yandex Cloud)

Production deployment uses GitHub Actions → Docker → Yandex Cloud COI VM.
Architecture based on `tradesu-moderator` project pattern.

### Architecture

```
GitHub Actions (deploy-web.yml)
├── build-nginx   → cr.yandex/.../transapp-web:{sha}-nginx
│   (multi-stage: npx expo export --platform web → nginx:alpine)
├── build-payment → cr.yandex/.../transapp-web:{sha}-payment
│   (multi-stage: python:3.11-slim → gunicorn + uvicorn workers)
└── deploy → yc-coi-deploy (docker-compose.yc.yaml)

Yandex Cloud COI VM (2 core, 4GB, ru-central1-d)
├── nginx (443/SSL via Yandex Certificate Manager, 80→redirect)
│   ├── /              → Expo Web static files (SPA)
│   ├── /api/          → proxy → ivan.trans-konsalt.ru (main API)
│   └── /payment-api/  → proxy → payment-service:8000
├── payment-service (gunicorn, 2 workers, port 8000)
└── payment-db (PostgreSQL 15, persistent volume)
```

### Key Files

| File | Purpose |
|------|---------|
| `nginx/Dockerfile.prod` | Multi-stage: Node builds Expo Web → nginx serves static |
| `nginx/nginx.prod.conf` | **HTTP fallback only** — used when `YC_CERT_ID` is empty (never in prod). See § Nginx config sources |
| `nginx/docker/entrypoint.sh` | **Authoritative production nginx config** — fetches SSL cert from Yandex Certificate Manager AND renders the full HTTPS nginx config via heredoc at container startup. See § Nginx config sources |
| `payment-service/Dockerfile.prod` | Multi-stage: builds deps → slim runtime with gunicorn |
| `payment-service/docker/start.sh` | Gunicorn with uvicorn workers |
| `yandex-cloud/docker-compose.yc.yaml` | Production compose (nginx + payment-service + payment-db) |
| `yandex-cloud/user-data.yaml` | Cloud-init for VM user setup |
| `.github/workflows/deploy-web.yml` | GitHub Actions workflow |
| `.env.production.example` | Documents all required GitHub Secrets |

### Nginx config sources (ADR-026)

There are **two** files describing nginx routing in this repo, and
the relationship between them is not obvious from the filenames
alone. Pre-2026-05-25 we learned this the hard way: ADR-025's
`/api/` proxy fix was deployed into `nginx.prod.conf`, the deploy
succeeded, but the bug remained because `entrypoint.sh` was the
file actually used in production. ADR-026 codifies the rule.

| File | Active when | Role |
|------|-------------|------|
| `nginx/docker/entrypoint.sh` heredoc (`NGINX_CONF`) | `YC_CERT_ID` is set (production: always) | **Authoritative.** Overwrites `/etc/nginx/nginx.conf` at container startup with a complete HTTPS+HTTP config. This is what `docker exec <nginx> nginx -T` shows in prod. |
| `nginx/nginx.prod.conf` | `YC_CERT_ID` is empty (local HTTP-only experiments) | **Fallback.** Copied by `Dockerfile.prod` into the image, then overwritten by entrypoint in production. Never read in HTTPS mode. |

Mechanics:

1. `nginx/Dockerfile.prod:72` runs `COPY nginx/nginx.prod.conf
   /etc/nginx/nginx.conf` — this is what `nginx.prod.conf`
   ostensibly controls.
2. The container's `ENTRYPOINT` is `/docker-entrypoint-yc.sh`.
   When `YC_CERT_ID` is set, the script fetches the cert from
   Yandex Certificate Manager AND runs
   `cat > /etc/nginx/nginx.conf <<'NGINX_CONF' ... NGINX_CONF` —
   completely overwriting the file from step 1.
3. nginx is launched via `exec nginx -g "daemon off;"`. Whatever
   the heredoc wrote is what nginx loads.

Rule for editors:

- **Routing change (e.g. new `location`, change `proxy_pass`,
  tweak `upstream`)** — must be applied to **both** files. The
  authoritative one (`entrypoint.sh`) is what changes prod
  behaviour. The fallback (`nginx.prod.conf`) is kept in sync to
  avoid grep-discovery confusion and to make future audits
  consistent.
- **Header comments at the top of each file state this contract**:
  `*** AUTHORITATIVE PRODUCTION NGINX CONFIG ***` in
  `entrypoint.sh`, `*** HTTP FALLBACK ONLY ***` in
  `nginx.prod.conf`. Open either file → see the rule.
- **Verifying a deploy** — never trust source-file inspection
  alone. Run `ssh deploy@<vm> 'docker exec $(docker ps --filter
  name=nginx -q) nginx -T 2>/dev/null | grep <directive>'` to
  confirm the active config inside the container.

Tech debt (out of scope of ADR-026, recorded in `tasks.md`):
extract the heredoc into a standalone nginx-template file (e.g.
`nginx/nginx.https.conf.template`) that both server contexts can
include / envsubst, eliminating the dual-source surface entirely.
That refactor touches container lifecycle and production-traffic
routing; not bundled with the ADR-026 emergency fix.

### Trigger

Workflow triggers on **GitHub Release** or **manual dispatch** (`workflow_dispatch`).

### Required GitHub Secrets

See `.env.production.example` for the full list. Key secrets:
`YC_SA_JSON_CREDENTIALS`, `YC_REGISTRY_ID`, `YC_FOLDER_ID`, `YC_CERT_ID`,
`PG_USER`, `PG_PASSWORD`, `KAZNA_API_URL`, `KAZNA_SECRET_KEY`, `KAZNA_TOKEN`.

## Deployment Checklist

| # | Task | Status |
|---|------|--------|
| 1 | **SPA fallback** — nginx `try_files $uri /index.html` | ✅ Done (`nginx.prod.conf`) |
| 2 | **Build script** — `npx expo export --platform web` in Docker | ✅ Done (`nginx/Dockerfile.prod`) |
| 3 | **Payment API URL** — dynamic via `getPaymentApiUrl()` in `api.web.ts` | ✅ Done |
| 4 | **Same-domain deployment** — nginx proxies `/api/` to prod-apex `transapp.ru` | ✅ Done (`nginx/docker/entrypoint.sh` heredoc; ADR-025 → ADR-026) |
| 5 | **Test production build** — run `expo export --platform web`, serve `dist/` locally | Pending |
| 6 | **SSL certificate** — create cert in Yandex Certificate Manager, set `YC_CERT_ID` | Pending |
| 7 | **GitHub Secrets** — configure all secrets listed in `.env.production.example` | Pending |
| 8 | **DNS** — point domain to VM public IP | Pending |
| 9 | **First deploy** — trigger workflow, verify full auth flow via browser | Pending |

## Web `<head>` & static assets

Expo Router 6 ships with a default HTML template (charset, viewport, default
title only). For SEO, social previews and PWA we override it via
`app/+html.tsx` — the standard Expo Router extension point for the web root
HTML. The file renders once per route at build time when `web.output` is
`"static"` in `app.json`. Docs:
[expo router static rendering](https://docs.expo.dev/router/reference/static-rendering/#root-html).

`app/+html.tsx` defines:

- `lang="ru"` on `<html>`
- `<meta name="description">`, `<meta name="robots">` (the `<title>` is
  intentionally not in `+html.tsx`, see "Per-route titles" below)
- `<meta name="theme-color" content="#000000">` and the four
  `apple-mobile-web-app-*` meta tags for iOS standalone mode
- Open Graph (`og:type`, `og:locale`, `og:title`, `og:description`,
  `og:image`, `og:site_name`) — used by Telegram, WhatsApp, Slack previews
- Twitter Card (`twitter:card="summary"`, `twitter:title`, `twitter:image`)
- Five icon links: `favicon-16.png`, `favicon-32.png`, `favicon.ico`
  (legacy fallback), `apple-touch-icon.png` (180×180), `manifest.webmanifest`
- `<ScrollViewStyleReset/>` from `expo-router/html` — required to keep
  RNWeb scroll containers behaving correctly inside the static HTML.

### Per-route browser tab titles (`DynamicTitle`)

Expo Router's internal `react-helmet-async` always injects an empty
`<title data-rh="true">` as the **first** child of `<head>`. Per HTML5
spec, browsers use only the first `<title>` they see — so a static
`<title>` placed in `+html.tsx` would lose to the empty helmet tag and
the tab would fall back to displaying the URL ("`localhost:8081/auto-list`").

Solution: feed the title through helmet via `expo-router/head` instead.
`src/components/web/DynamicTitle.web.tsx` calls `usePathname()`, looks up
the current route in a `STATIC_TITLES` map (with a few `DYNAMIC_TITLES`
regex entries for things like `/auto/[id]`), and renders
`<Head><title>...</title></Head>`. Helmet swaps the empty placeholder for
this value — single, correct `<title>` tag.

Mounted in `app/_layout.tsx` **above** the splash early-return so static
SSG and the splash screen both carry a valid title.

**Platform split (`.web.tsx` + native stub).** `expo-router/head` on
native (iOS/Android) drives Apple Continuity / Handoff via
`NSUserActivity` and requires a canonical web origin baked into the
native binary at build time through the `expo-router` Config Plugin's
`origin` option. Without it the native runtime throws:

```
Expo Head: Add the handoff origin to the Expo Config (requires rebuild).
Add the Config Plugin { plugins: [["expo-router", { origin: "..." }]] }
```

Native screen titles are owned by the navigation bar, not by HTML
`<title>` — so the component is split:

| File | Platform | Behavior |
|------|----------|----------|
| `DynamicTitle.web.tsx` | web | Real impl: `usePathname()` → lookup → `<Head><title>` |
| `DynamicTitle.tsx` | iOS, Android | No-op stub: `() => null` |

Metro's platform-specific resolution picks up `.web.tsx` for web builds
and the bare `.tsx` for native. The import site in `app/_layout.tsx`
stays platform-agnostic: `import { DynamicTitle } from '@/src/components/web/DynamicTitle'`.

**Revisit trigger (Handoff/Continuity)**: when the `lk.transapp.ru`
cutover lands (see plan `2026-05-06-lk-transapp-cutover.md`, ADR-017)
and a stable canonical production origin is in place, add
`["expo-router", { origin: "https://<prod-host>" }]` to `app.json`
`plugins`, do `npx expo prebuild --clean` + EAS rebuild, and replace the
native stub body with the same implementation as the web file.

| Route | Title |
|-------|-------|
| `/` | `TransApp — управление автопарком и штрафами` (default fallback) |
| `/auto-list` | `Автопарк — TransApp` |
| `/charges` | `Штрафы — TransApp` |
| `/drivers` | `Водители — TransApp` |
| `/notifications` | `Уведомления — TransApp` |
| `/auto/[id]` | `Авто — TransApp` |
| ... | (full list in `STATIC_TITLES` lookup) |

Adding a new route means one line in the lookup table — no need to touch
any screen file.

**SSG caveat**: `usePathname()` inside `_layout.tsx` (above `<Stack>`) is
route-agnostic at build time, so every route's static HTML carries the
**default** title. After client hydration helmet re-evaluates with the
real `pathname` and the tab title flips to the per-route value within
milliseconds. SEO crawlers receive the default — still a valid,
non-empty title (much better than the empty fallback that used to
surface as the URL).

### Static files (`public/`)

Expo Router 6 copies everything from the project-root `public/` directory
verbatim into `dist/` at build time — **no plugin or config needed**, just
create files in `public/`. This is the canonical mechanism for non-bundled
assets (favicons, web manifest, robots.txt, future sitemap.xml). The
`Dockerfile.prod` web-builder stage explicitly `COPY public/ ./public/` so
the assets reach the build container.

Current static asset set (all in `public/`):

| File | Source | Purpose |
|------|--------|---------|
| `favicon-32.png`, `favicon-16.png` | `sips -Z` from `transappweb/public/img/favicon.png` | Browser tab icons |
| `favicon.ico` | copy of `favicon-32.png` | Legacy fallback for `/favicon.ico` |
| `apple-touch-icon.png` (180×180) | resized from same source | iOS Safari home-screen |
| `icon-192.png`, `icon-512.png` | resized from same source | PWA install icons + maskable |
| `manifest.webmanifest` | hand-written JSON | PWA manifest (name, theme_color, icons, start_url, display, scope) |
| `robots.txt` | hand-written | SEO crawl policy (currently `Allow: /`) |

If you need to regenerate icons from a new source PNG, run:

```bash
SRC=transappweb/public/img/favicon.png   # or any new source ≥ 512×512
sips -Z 32  "$SRC" --out public/favicon-32.png
sips -Z 16  "$SRC" --out public/favicon-16.png
sips -Z 180 "$SRC" --out public/apple-touch-icon.png
sips -Z 192 "$SRC" --out public/icon-192.png
sips -Z 512 "$SRC" --out public/icon-512.png
cp public/favicon-32.png public/favicon.ico
```

`sips` is built into macOS. ImageMagick (`convert`) works equivalently.

## Nginx security headers

`nginx/security-headers.partial.conf` holds the shared header set. It is
`include`-d by both nginx configs:

- `nginx/nginx.prod.conf` — HTTP fallback
- `nginx/docker/entrypoint.sh` — HTTPS config generated at boot when
  `YC_CERT_ID` is set (the heredoc that writes `/etc/nginx/nginx.conf`).

The Dockerfile copies the partial to `/etc/nginx/security-headers.partial.conf`,
which is the path both configs reference.

**Why a partial?** nginx does **not** inherit `add_header` across nested
blocks: as soon as a child `location` introduces even one `add_header`, all
parent headers are silently dropped. So the partial is `include`-d into
every location that owns `add_header` directives (favicon, manifest,
robots, /static/, /index.html, /health) plus the `server` block default.

### Header set

| Header | Value | Rationale |
|--------|-------|-----------|
| `Strict-Transport-Security` | `max-age=31536000` | HTTPS-only, in `entrypoint.sh` directly (not the partial) |
| `X-Frame-Options` | `SAMEORIGIN` | Clickjacking defense (legacy browsers) |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME-type sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Modern default — full URL same-origin, origin-only cross-origin |
| `Permissions-Policy` | `geolocation=(), microphone=(), camera=(), payment=(self)` | Disable unused powerful APIs; payment from self only |
| `Content-Security-Policy` | see partial | Layered defense — see below |

### CSP rationale

The CSP is **pragmatic, not strict**, because Expo Web bundles use eval-style
constructs (Function constructor in React reconciler, Metro bundle init) and
NativeWind / RNWeb inject inline styles in the DOM:

- `script-src 'self' 'unsafe-inline' 'unsafe-eval'` — required by Expo runtime
- `style-src 'self' 'unsafe-inline'` — required by RNWeb / NativeWind
- `img-src 'self' data: blob: https:` — wide because images come from many
  sources (avatars, Yandex map tiles, payment-service, third-party icons)
- `connect-src` — staging endpoints + Yandex Maps tiles + Kazna sandbox +
  websocket fallback (`wss:`)
- `frame-ancestors 'none'` — clickjacking defense (the strict equivalent of
  `X-Frame-Options`)
- `base-uri 'self'`, `form-action 'self'` — restrict tag injection abuse

#### Third-party SDK whitelist

Each third-party SDK we load on the web has its own block of allowed hosts in
the partial, deliberately **per-host**, not via a wildcard. Source-of-truth for
each list is the SDK's own CSP documentation:

| SDK / Use case | Hosts | Directives | Reference |
|---|---|---|---|
| FCM web push | `https://www.gstatic.com`, `https://*.googleapis.com` | `script-src`, `connect-src` | ADR-009, [Firebase docs](https://firebase.google.com/docs/web/setup) |
| Yandex Maps JS API v3 (`/pass-yamap`) | `https://api-maps.yandex.ru`, `https://*.api-maps.yandex.ru`, `https://yastatic.net`, `https://*.maps.yandex.net` | `script-src`, `style-src`, `connect-src`, `worker-src` (+ `data:` for v3 web workers) | ADR-011, [Yandex CSP guide](https://yandex.ru/dev/jsapi30/doc/ru/common/connection/csp.html) |
| Kazna payment sandbox | `https://demopay.oplatagosuslug.ru` | `connect-src` | ADR-008 |

If a CSP violation is observed in production console, ease the specific
directive in the partial (it is the single source of truth for both HTTP and
HTTPS). Tightening the policy further (nonce-based scripts, per-route hashes)
is a follow-up that requires moving Expo Web off `'unsafe-eval'`, which is
non-trivial.

> **CSP regression test.** `curl -sI` only validates that the header is
> present; it does **not** catch missing third-party hosts. After any change
> to the partial, run a smoke-pass on every page that loads a third-party SDK
> with **DevTools open** and grep the console for `Refused to load`. The 2026-05-04
> incident with Yandex Maps v3 happened because the smoke-test in this file
> covered headers but not actual SDK execution. See ADR-011 and `manual-qa-checklist.md`.

### Local smoke test

```bash
docker build -f nginx/Dockerfile.prod -t transapp-web-test .
# Run on the payment-service network so upstream resolves
docker run -d --rm -p 8088:80 --network payment-service_default \
  --name transapp-web-smoke transapp-web-test
curl -sI http://localhost:8088/                   # all 5 headers + CSP
curl -sI http://localhost:8088/manifest.webmanifest  # MIME + cache + CSP
curl -sI http://localhost:8088/favicon.ico        # year cache + CSP
docker stop transapp-web-smoke
```
