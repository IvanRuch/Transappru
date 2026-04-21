# Project Dashboard

> Last updated: 2026-04-21

## Current Focus

<!-- Update this section after each work session -->

| Area | Status | Notes |
|------|--------|-------|
| Mobile App | 🔄 Active development | v2.0.17, Expo 54 |
| Payment Service | ✅ Deployed | Kazna API integration |
| Web Version | 🔄 Active development | Expo Web, all screens + payment flow + pass ordering done, CI/CD configured |
| Legacy Web | ⚠️ In production | `/transappweb/` — to be replaced |
| Legacy Mobile | 📦 Archive | `/Transappru/` — reference only |
| Documentation | 🔄 Migration to Writerside | From /docs/ markdown |

## Recent Changes

- **2026-04-21**: ChargesScreen migrated to playbook (ADR-005 + NativeWind). Migrated shared `ChargeCard` from `StyleSheet` to NativeWind + added a11y (role=checkbox with state, button label). Extracted new `ChargesGroupCard` to `src/components/charges/` — presentation-only shell for auto groups (master checkbox + title + subtitle + inline kind tag + detailed GIBDD/ПЛАТОН stats + selection hint + expand chevron + children body). Web: removed `<WebAppLayout>` (4th time fixing this bug pattern), added `<ScreenHeader>` with refresh button in `rightComponent` + `<WebScreenContainer maxWidth=1100>` + `safeBack`. Eliminated the inline `WebChargeCard` — web now uses the shared PNG-icon `ChargeCard` for brand consistency (✔/⚠/→ emojis replaced). Mobile 368 → 288 LOC (-22%), Web 549 → 305 LOC (-44%).
- **2026-04-21**: NotificationSettingsScreen migrated to playbook (ADR-005 + NativeWind). Extracted `NotificationSettingGroup` to `src/components/notifications/` — renders a full type block (master Switch + expandable per-auto rows) with shared Switch colors (unified mobile/web parity: `#3A3A3A` track vs previous green `#4CAF50` on web), shared opacity-disabled state, a11y labels on each Switch, and role=button on the expand trigger. Web: removed `<WebAppLayout>` wrap (same bug class), added `<ScreenHeader>` + `<WebScreenContainer maxWidth=820>` + `safeBack`. Both screens: `showAlert` replaces `Alert.alert` / `window.alert`. Fixed pre-existing TS2558 in `useNotificationSettings.ts` (generic `api.post<T>()` not supported by the wrapper → narrow via `as T`). Mobile 217 → 57 LOC (-74%), Web 141 → 70 LOC (-50%).
- **2026-04-21**: Drivers full unification (follow-up to earlier web-only fix). Extracted `useDriverList` hook (209 LOC) from duplicated logic in mobile class component + web DriversTab. Created `src/components/drivers/` with `DriverCard`, `DriverEditModal`, `DriverDeleteModal` (unified cross-platform, NativeWind, ARIA, focus management, Esc-to-close on web). Added `src/types/drivers.ts` with `DriverData` + `EMPTY_DRIVER`. Mobile `DriverListScreen.tsx` converted from 533-LOC class component to 83-LOC functional (-84%). Web `DriversTab.tsx` 410 → 84 LOC (-80%), still used in both standalone and AutoDetail tab without API changes. All driver CRUD business logic now lives in one place.
- **2026-04-21**: DriverListScreen.web.tsx fixed: removed incorrect `<WebAppLayout>` wrap (same bug class as notifications — authenticated layout already provides it), added `<ScreenHeader>` + `<WebScreenContainer maxWidth=960>` + `safeBack`. Migrated to NativeWind. Delegates all CRUD to existing `DriversTab` (reused both here and inside AutoDetail).
- **2026-04-21**: NotificationListScreen migrated to the playbook pattern (ADR-003 + ADR-005 + NativeWind). Extracted `NotificationCard` to `src/components/notifications/` with unified cross-platform look (subtle accent bg + leading dot for unviewed). Added `notification.{newBg,newBorder,newDot}` tokens to `tailwind.config.js`. Web: removed incorrect `<WebAppLayout>` wrap (bug — layout already provided by `_layout.web.tsx`), added `<ScreenHeader>`, `<WebScreenContainer>`, `safeBack`, ARIA list role. `String(viewed) === '0'` unifies comparison and fixes 3 pre-existing TS errors in `useNotificationList.ts`. Counter + empty state parity. Mobile 104 → 76 LOC, Web 99 → 59 LOC.
- **2026-04-21**: Styling migration (pilot): PassScreen + 6 shared pass sub-components + ScreenHeader + WebScreenContainer migrated from raw `StyleSheet.create` with hardcoded hex to NativeWind className with semantic design tokens. Hex literals across the pilot: 59 → 8 (raw `<input>` inline CSS + StatusBar prop). Extended `tailwind.config.js` with `zone.{mkad,ttk,sk,inactive}` and `warning.{bg,border,text}` tokens. Full `dark:` variant support ready. PassScreen.tsx 269 → 186 LOC, PassScreen.web.tsx 375 → 307 LOC. Pilot now follows the stack declared in `dev-mobile.md` (NativeWind 4 + Tailwind 3) — same as already-migrated `ChargesScreen.tsx`.
- **2026-04-21**: PassYaMapScreen UX: edit-mode — when opening the map with an already-selected address, zone filter is lifted. All 3 zones visible, `/get-address-map` called without `location_type`, user can pick any zone. "Добавить" button is hidden in edit mode until the user taps a new point (`hasNewPick` flag), so a stale-data commit is not reachable from the UI — guarantees no overwrite of mos_ru_* fields on PassScreen. Edit mode detected via presence of `address` in route params. Applied symmetrically on mobile (`PassYaMapScreen.tsx`) and web (`PassYaMapScreen.web.tsx` + `MapInner.showAllZones` prop). To fully clear the address, user uses "Очистить" on PassScreen — single entry point for clearing.
- **2026-04-21**: PassScreen UX: unified manual-zone banner — now fires when user overrides a zone that was auto-detected from any source (map OR previously entered user-address). Internal rename in usePassOrder: `originalLocationTypeFromMap` → `detectedLocationType`. Banner no longer gated by lon/lat.
- **2026-04-21**: Bugfix: restore mobile map-data flow after pilot refactor — `app/(authenticated)/pass.tsx` wrapper reduced from 100 LOC synthetic-navigation bridge to 39 LOC `useFocusEffect` that syncs `pendingMapData` into URL via `router.setParams`. `usePassOrder` no longer Platform.OS-guarded — identical URL-driven code path on mobile and web.
- **2026-04-21**: Refactor (ADR-005): PassScreen pilot — extracted 6 shared sub-components to `src/components/pass/` (ZoneTabs, LocationBadges, SuggestionItem, VehicleCard, ManualZoneBanner, SuccessModal). Added `src/utils/alert.{ts,web.ts}` (`showAlert`), `src/components/web/WebScreenContainer.tsx`. Upgraded `ScreenHeader` to cross-platform with a11y. Web prod-ready polish: ARIA combobox + keyboard nav (↑/↓/Enter/Esc) on address autocomplete, inline loading spinner, focus trap + ESC + overlay-click on SuccessModal, desktop max-width 820px, safeBack, ManualZoneBanner parity fix. PassScreen.tsx 336→269 LOC, PassScreen.web.tsx 412→343 LOC. Pattern ready to scale to 15 remaining screen pairs.
- **2026-04-14**: Web: Yandex Maps JS API v3 for address selection on map (ADR-004) — PassYaMapScreen.web.tsx with zone polygons (МКАД/ТТК/СК), click-to-select address, shared polygon data extracted to src/data/moscowZonePolygons.ts. PassScreen.web.tsx: map button (📍), WebAppLayout double-sidebar fix
- **2026-04-14**: Refactoring: 8 shared hooks extracted from 16 screen pairs (ADR-003) — useAuthFlow, usePinConfirm, useOnboardingFlow, useNotificationList, useChargesSelection, usePaymentConfirm, useInnBinding, usePassOrder + plateHelpers utility + useNotificationSettings fix. InnScreen and PassScreen converted from class to functional components. Screen-layer reuse ~65-70%
- **2026-04-14**: AddAutoModal: GRZ input validation in useAutoActions.ts — Cyrillic-only letter filter (АВЕКМНОРСТУХ), Latin→Cyrillic auto-conversion, digits-only region code, uppercase normalization; Safari autofill fix (strip RN-generated attributes + CSS pseudo-element hiding); placeholder alignment (Platform.select); click-outside-to-close overlay; gray placeholders
- **2026-04-14**: Web: pass ordering flow — sidebar "Пропуск" now matches mobile behavior: AutoListScreen?mode=pass (auto-opens AddAutoModal, card click marks vehicles, footer "Заказать пропуск (N)") → PassScreen with selected vehicles. Removed self-loading fallback, added empty state redirect
- **2026-04-14**: Web: in-app navigation screens — AutoFineScreen.web.tsx (fine details, payment button), PaymentConfirmScreen.web.tsx (commission calc, FIO validation, custom toggle, inline errors), FinePaymentSuccessScreen.web.tsx (success + navigation), PassScreen.web.tsx (2-stage address autocomplete, zone tabs МКАД/ТТК/СК, vehicle list, /add-address order)
- **2026-04-14**: CI/CD: Docker deploy pipeline for Web + Payment to Yandex Cloud COI VM — nginx/Dockerfile.prod (multi-stage Expo Web build), payment-service/Dockerfile.prod (gunicorn), docker-compose.yc.yaml, GitHub Actions workflow (deploy-web.yml), SSL via Yandex Certificate Manager, api.web.ts payment URL made dynamic
- **2026-04-14**: Web: all sidebar-linked screens now have `.web.tsx` versions — DriverListScreen (wraps DriversTab), NotificationListScreen (click-to-mark-viewed), NotificationSettingsScreen (two-level toggle tree with optimistic updates), ChargesScreen (grouped fines by auto, filter pills, SHOW_PAYMENT_UI selection+footer), UserScreen (profile: org data, contact CRUD, logout, delete profile). AutoDetailScreen.web.tsx — 8-tab vehicle detail screen, 13 sub-components. Fix: onboarding redirect loop — localStorage+sessionStorage persistence
- **2026-04-13**: Web: logout fix (token removal), first-login flow (onboarding redirect + "Наши услуги" modal from /get-auto-list), anti-loop guards. Phone input cursor fix, OTP-style PIN fields. Unified API client, InnScreen.web.tsx, inline search, sidebar fixes
- **2026-04-09**: Claude Code configuration setup — CLAUDE.md (4 files), 3 PostToolUse hooks, 7 slash commands, 2 custom skills, 46 external skills, 3 MCP servers (PostgreSQL + Playwright + Context7), Writerside structure (16 topics), agnix validation

## Next Tasks

1. ~~Decide web strategy~~ — done, ADR-001: Expo Web
2. Migrate key /docs/ content to Writerside topics
3. Configure and verify MCP servers (start Docker, test PostgreSQL query)
4. Set up test framework for mobile app (Jest/Vitest)

## Version History

| Version | Date | Key Changes |
|---------|------|-------------|
| 2.0.17 | current | ... |
| 2.0.15 | ... | Double listener protection, new payload data |
| 2.0.14 | ... | OSAGO button, web support |
