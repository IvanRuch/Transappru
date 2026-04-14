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
