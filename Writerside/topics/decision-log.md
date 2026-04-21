# Decision Log (ADR)

Architecture Decision Records for TransApp.

## Format

```
### ADR-NNN: Title (YYYY-MM-DD)

**Context:** Why this decision was needed.
**Decision:** What we chose.
**Rationale:** Why this approach over alternatives.
**Consequences:** What changed, trade-offs.
```

---

### ADR-001: Web version via Expo Web, shared codebase (2026-04-13)

**Context:** The legacy web app (`transappweb/`, currently in production) is severely outdated
and no longer acceptable. A new web version is needed now, while the mobile app (`/src/`)
is still in active development.

**Decision:** Build the web version using Expo Web (`npx expo start --web`) from the same
`/src/` codebase as the mobile app. No separate React project.

**Rationale:**
- Single codebase — one set of components, hooks, API layer, types
- `.web.tsx` platform overrides already exist for key screens (AuthScreen, AutoListScreen)
- Expo Router supports web navigation out of the box
- Avoids maintaining two parallel UI codebases
- Alternative (separate React app) rejected: too much duplication, harder to keep parity

**Consequences:**
- Some RN libraries may need web-compatible alternatives or `.web.tsx` shims
- Must verify all used libraries work on web (maps, push notifications, camera, etc.)
- `Platform.select` / `.web.tsx` files needed where native and web UX diverge
- Mobile development is NOT blocked — web-incompatible features can be platform-gated
- Legacy `transappweb/` stays as read-only reference until new web is deployed

---

### ADR-002: Docker + Yandex Cloud COI deployment for Web + Payment (2026-04-14)

**Context:** The Expo Web version is feature-complete (all sidebar screens ported). Need a
production deployment pipeline. Payment service was deployed as a standalone container via SSH.

**Decision:** Deploy Web + Payment together on a single Yandex Cloud COI VM using Docker Compose,
with GitHub Actions CI/CD. Architecture modeled after `tradesu-moderator` project.

**Rationale:**
- COI VM (Container Optimized Image) provides Docker Compose natively — no manual Docker install
- `yc-coi-deploy` GitHub Action handles VM provisioning + container deployment in one step
- Single VM for web + payment is cost-effective and simplifies networking (nginx proxies both)
- SSL via Yandex Certificate Manager — auto-injected at container startup, no certbot needed
- Multi-stage Docker builds keep images small (Expo build in Node → static files in nginx:alpine)
- Pattern proven in production on `tradesu-moderator`

**Consequences:**
- Main API (`trans-konsalt.ru`) stays external — nginx reverse-proxies `/api/` to it
- Payment API accessed via same-origin `/payment-api/` path (no CORS issues)
- Domain TBD — `server_name _` used for now, will be configured when DNS is set up
- Old `deploy.yml` (payment-only SSH deploy) kept for backward compatibility
- GitHub Secrets must be configured before first deploy

---

### ADR-003: Extract shared hooks to eliminate mobile/web screen duplication (2026-04-14)

**Context:** 16 screens had parallel `.web.tsx` files with 60-70% duplicated business logic
(API calls, state management, validation, navigation). Hooks (90%) and components (87%)
were already well-shared, but screen-layer code was largely copy-pasted.

**Decision:** Extract shared business logic from each screen pair into dedicated hooks
(`src/hooks/use*.ts`). Screens become thin platform-specific UI wrappers. Hooks return
error strings/states; mobile uses `Alert.alert`, web uses `window.alert` or inline UI.
Platform-specific behavior passed via callbacks.

**Rationale:**
- Reference pattern already existed: `useAutoDetail.ts` (383 lines) for AutoDetailScreen.web.tsx
- Each new feature should only require changes in one place (the hook)
- Class components (InnScreen 585 LOC, PassScreen 861 LOC) converted to functional for hook usage
- Shared utility `plateHelpers.ts` eliminated duplicated GRZ normalization code

**New hooks (8):** useAuthFlow, usePinConfirm, useOnboardingFlow, useNotificationList,
useChargesSelection, usePaymentConfirm, useInnBinding, usePassOrder.

**Fixed:** useNotificationSettings — `Api` → `api` import, `Alert.alert` → error state.

**Consequences:**
- ~1,035 lines of new shared code, ~1,320 lines of duplication removed (~285 net reduction)
- Screen-layer reuse increased from ~30-35% to ~65-70%
- 8 screen pairs simplified (16 files touched)
- InnScreen and PassScreen mobile converted from class to functional components
- Map-related state in usePassOrder is inert on web (lon/lat always empty)

---

### ADR-004: Yandex Maps JS API v3 for web map screen (2026-04-14)

**Context:** Mobile PassYaMapScreen uses `react-native-yamap-plus` (native YandexMapKit SDK) for
address selection on a map with zone polygons (МКАД/ТТК/СК). The web version had a stub
("Карта недоступна в веб-версии"). Address selection via map is needed for web parity.

**Decision:** Use Yandex Maps JS API v3 loaded dynamically from CDN, with `@yandex/ymaps3-reactify`
for React component wrappers. Extract shared polygon coordinates to `src/data/moscowZonePolygons.ts`.

**Rationale:**
- Yandex Maps v3 is the current recommended version (v2 is legacy)
- Dynamic script loading avoids bundling 500KB+ of map code — loaded only when map screen is opened
- `@yandex/ymaps3-reactify` provides declarative React components (`YMap`, `YMapFeature`, `YMapMarker`, `YMapListener`)
- Shared polygon file eliminates duplication (~190KB of coordinates used by both mobile and web)
- Alternative (Leaflet/MapLibre) rejected: project already uses Yandex geocoding API (`/get-address-map`), staying in Yandex ecosystem is simpler
- Alternative (embed via iframe) rejected: no polygon rendering, no custom click handling

**Consequences:**
- `PassYaMapScreen.web.tsx` replaces stub with full-featured map (~560 lines)
- `moscowZonePolygons.ts` provides both native `{lon,lat}[]` and web `[lon,lat][]` formats
- Mobile `PassYaMapScreen.tsx` imports polygons from shared file (removes ~150KB of inline data)
- Separate API key for web (`e2f7a3f4-...`) vs mobile (`9247644d-...`)
- `usePassOrder.ts` enhanced with `address_map_data` URL param handling for web return flow
- `PassScreen.web.tsx` gets map button (📍) matching mobile's map icon
- All `.web.tsx` screens must NOT wrap in `WebAppLayout` (provided by `_layout.web.tsx`)

---

### ADR-005: Extract shared UI sub-components from screen pairs (2026-04-21)

**Context:** After ADR-003 extracted business logic into shared hooks, the **UI layer** still
duplicated ~70% of markup between mobile (`.tsx`) and web (`.web.tsx`) screen pairs. Zone tabs,
badges, suggestion cards, vehicle cards, success modals, and manual-zone banners were reimplemented
inline in each file, even though they are structurally identical. This caused visual drift
(mobile and web diverged on copy, missing banners, empty-states), and made it impossible for
web screens to match production-grade quality (no a11y, no desktop max-width, no loading states).

**Decision:** For every `/src/screens/<feature>/<Name>Screen.*` pair, extract shared sub-components
into `src/components/<feature>/` (one file per component + barrel `index.ts`). Screens become
thin orchestrators that compose shared components with platform-specific layout. Platform-specific
polish (focus trap, ARIA, keyboard navigation, responsive max-width) lives in the sub-components
themselves (guarded by `Platform.OS === 'web'`) or in web-only wrappers like `WebScreenContainer`.

Add two cross-cutting utilities:
- `src/utils/alert.{ts,web.ts}` — `showAlert(title, message)` wrapper (mobile `Alert.alert` / web `window.alert`).
- `src/components/web/WebScreenContainer.tsx` — max-width + centering wrapper for desktop.

`ScreenHeader` (`src/components/common/`) upgraded to cross-platform (added `accessibilityRole`,
`cursor:pointer` on web, replaced `TouchableHighlight` with `Pressable`).

**Rationale:**
- Shared UI in one place ensures pixel parity between platforms — no more copy/empty-state/banner drift
- Each component can be prod-hardened once (focus trap, ARIA combobox, keyboard nav, loading indicator)
- Future new screens start from shared primitives — faster development, consistent UX
- Pattern scales: same structure applies to `charges/`, `notifications/`, `payment/`, `inn/`, `user/`, `auto-detail/`, `auth/`

**Pilot (PassScreen):**
- New: `src/components/pass/` with `ZoneTabs`, `LocationBadges`, `SuggestionItem`, `VehicleCard`, `ManualZoneBanner`, `SuccessModal` + `index.ts`
- New: `src/components/web/WebScreenContainer.tsx`, `src/utils/alert.{ts,web.ts}`
- Updated: `src/components/common/ScreenHeader.tsx` (a11y + Pressable)
- Migrated: `src/screens/pass/PassScreen.tsx` (336 → 269 LOC) and `PassScreen.web.tsx` (412 → 343 LOC)
- Prod-ready web features added: ARIA combobox over address autocomplete, keyboard navigation
  (ArrowUp/Down/Enter/Escape), inline loading spinner during search, focus trap + ESC + overlay
  click on SuccessModal, desktop max-width (820px), `safeBack` (router.canGoBack fallback to /main),
  missing `ManualZoneBanner` parity restored on web.

**Consequences:**
- Any visual/behaviour change to pass-screens is now a single-file edit in `src/components/pass/`
- `ScreenHeader` can now be used uniformly; each web screen should drop its inline header
- `WebScreenContainer` and `showAlert()` are available for all 15 remaining screen pairs
- Migration path for other screens: (1) extract sub-components into `src/components/<feature>/`,
  (2) replace inline markup in both screens, (3) wrap web in `WebScreenContainer`, (4) add a11y polish
- Emojis (🚛/📍) removed from web in favor of existing PNG assets — consistent look across platforms
- Next screens in queue: `NotificationListScreen` → `DriverListScreen` → `NotificationSettingsScreen`
  → `ChargesScreen` → `UserScreen` → `PaymentConfirmScreen` → `InnScreen` → `AutoListScreen`
  → `AuthScreen`/`PinScreen` (special 2-col layout) → `PassYaMapScreen` (special: map)
