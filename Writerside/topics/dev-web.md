# Web Version

## Current State (as of 2026-04-21)

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
| Auto list (`AutoList.js`) | `screens/auto/AutoListScreen.tsx` | ✅ Done | `.web.tsx`: responsive grid, inline search bar |
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
| `src/components/notifications/` | TBD | ⏳ Next |
| `src/components/inn/`, `user/`, `payment/`, `auth/` | TBD | ⏳ Planned |

**Cross-cutting helpers:**

| File | Purpose |
|------|---------|
| `src/utils/alert.ts` + `.web.ts` | `showAlert(title, message?)` — `Alert.alert` on mobile, `window.alert` on web |
| `src/components/web/WebScreenContainer.tsx` | Desktop max-width + centering wrapper (default 820px), used inside authenticated web screens |
| `src/components/common/ScreenHeader.tsx` | Cross-platform header (Pressable + accessibilityRole + cursor:pointer on web). Replaces inline web headers |

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
| `web/RnisTab.tsx` | RNIS registry check |
| `web/FilesTab.tsx` | File management |
| `web/FileEditModal.tsx` | Upload/edit files (HTML `<input type="file">`) |
| `web/FileDeleteModal.tsx` | Delete confirmation |
| `web/PaginatedList.tsx` | "Show more" for long lists |

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

## Sidebar (WebSidebar.tsx)

- "Как работать" link conditionally shown only when `onboarding_expired === 0`
- Organization list with switch support
- Services dropdown (expandable)
- Responsive: collapses below 900px viewport width

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
| `nginx/nginx.prod.conf` | HTTP fallback nginx config |
| `nginx/docker/entrypoint.sh` | Fetches SSL cert from Yandex Certificate Manager at startup |
| `payment-service/Dockerfile.prod` | Multi-stage: builds deps → slim runtime with gunicorn |
| `payment-service/docker/start.sh` | Gunicorn with uvicorn workers |
| `yandex-cloud/docker-compose.yc.yaml` | Production compose (nginx + payment-service + payment-db) |
| `yandex-cloud/user-data.yaml` | Cloud-init for VM user setup |
| `.github/workflows/deploy-web.yml` | GitHub Actions workflow |
| `.env.production.example` | Documents all required GitHub Secrets |

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
| 4 | **Same-domain deployment** — nginx proxies `/api/` to trans-konsalt.ru | ✅ Done (`nginx.prod.conf`) |
| 5 | **Test production build** — run `expo export --platform web`, serve `dist/` locally | Pending |
| 6 | **SSL certificate** — create cert in Yandex Certificate Manager, set `YC_CERT_ID` | Pending |
| 7 | **GitHub Secrets** — configure all secrets listed in `.env.production.example` | Pending |
| 8 | **DNS** — point domain to VM public IP | Pending |
| 9 | **First deploy** — trigger workflow, verify full auth flow via browser | Pending |
