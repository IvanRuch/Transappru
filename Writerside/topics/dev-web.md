# Web Version

## Current State (as of 2026-04-14)

Web version is **in active development** using Expo Web from the shared `/src/` codebase.
Auth flow, onboarding, INN registration, auto-list, auto detail (8 tabs), and driver management are working.

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
| Driver list (`DriverList.js`) | `screens/drivers/DriverListScreen.tsx` | — | |
| INN (`Inn.js`) | `screens/inn/InnScreen.tsx` | ✅ Done | `.web.tsx`: INN binding + RNIS check, latin→cyrillic |
| User (`User.js`) | — | — | Check if needed |
| Charges | `screens/charges/ChargesScreen.tsx` | — | Not in legacy web |
| Fine payment | `screens/fine-payment/*` | — | Not in legacy web |
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

## Sidebar (WebSidebar.tsx)

- "Как работать" link conditionally shown only when `onboarding_expired === 0`
- Organization list with switch support
- Services dropdown (expandable)
- Responsive: collapses below 900px viewport width

## Deployment Checklist (TODO)

Before deploying web to production:

| # | Task | Status |
|---|------|--------|
| 1 | **SPA fallback** — configure nginx `try_files $uri /index.html` (or use Vercel/Netlify which handle it automatically) | Pending |
| 2 | **Build script** — add `"build:web": "expo export --platform web"` to package.json | Pending |
| 3 | **Payment API URL** — hardcoded `https://payment.transapp.ru/api` in `api.web.ts`, make dynamic or env-based | Pending |
| 4 | **Same-domain deployment** — `api.web.ts` builds URL as `https://{hostname}/api/`; web must be on same domain as API, otherwise add CORS headers on server | Pending |
| 5 | **Test production build** — run `expo export --platform web`, serve `dist/` locally, verify full auth flow | Pending |
