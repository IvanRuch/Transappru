# Web Version

## Current State (as of 2026-04-13)

Web version is **in active development** using Expo Web from the shared `/src/` codebase.
Auth flow, onboarding, INN registration, and main auto-list screens are working.

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
| Auto detail (`Auto.js`) | `screens/auto/AutoDetailScreen.tsx` | — | |
| Driver list (`DriverList.js`) | `screens/drivers/DriverListScreen.tsx` | — | |
| INN (`Inn.js`) | `screens/inn/InnScreen.tsx` | ✅ Done | `.web.tsx`: INN binding + RNIS check, latin→cyrillic |
| User (`User.js`) | — | — | Check if needed |
| Charges | `screens/charges/ChargesScreen.tsx` | — | Not in legacy web |
| Fine payment | `screens/fine-payment/*` | — | Not in legacy web |
| Onboarding | `screens/onboarding/OnBoardingScreen.tsx` | ✅ Done | `.web.tsx`: image left, text+nav right, skip button |
| Services | `screens/services/OurServicesScreen.tsx` | ✅ Works | No `.web.tsx` needed — renders well inside WebAppLayout |

## Debug Logging

Console logs are added for key auth flow events (visible in browser DevTools):

- **PinScreen** (`/confirm-token`): `phone_inn_bind`, `is_manager`, `onboarding_expired` with human-readable labels
- **useAutoData** (`/get-auto-list`): `onboarding_expired` flag value and interpretation
- **API interceptor**: all requests/responses logged with `⬆️`/`⬇️` prefixes

Note: `onboarding_expired` can come as string `"0"` or number `0` from API — both are handled.

## API Client

All `.web.tsx` screens use `import api from '../../services/api'` (the unified API client).
The old `utils/Api.ts` is no longer used in web screens.

## Sidebar (WebSidebar.tsx)

- "Как работать" link conditionally shown only when `onboarding_expired === 0`
- Organization list with switch support
- Services dropdown (expandable)
- Responsive: collapses below 900px viewport width
