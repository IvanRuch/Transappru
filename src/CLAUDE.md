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

## Styling

- NativeWind (Tailwind CSS utility classes) via `className` prop
- Theme customization: `tailwind.config.js`
- Dark mode: `userInterfaceStyle: "automatic"` in app.json

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
