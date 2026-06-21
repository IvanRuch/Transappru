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

**Update (2026-04-26) — factual correction:** the original wording "Payment
service was deployed as a standalone container via SSH" was aspirational, not
accurate. A direct audit on this date established that:

- `deploy.yml` triggered on push 3 times (2026-01-15, 2026-04-14, 2026-04-23)
  and **all 3 runs failed at the first step** because no GitHub Secrets exist
  in the repository (`gh api .../actions/secrets` → `total_count: 0`).
- `deploy-web.yml` (this ADR's pipeline) has **never been triggered** — no
  GitHub Releases were ever created.
- DNS for `payment.transapp.ru` does not resolve (NXDOMAIN). The hardcoded
  `PROD_PAYMENT_API_URL` in `src/services/api.ts:18` points at a host that has
  never existed.
- Therefore, the first run of `deploy-web.yml` will be the **first time
  payment-service has ever been exposed to the public internet** — this is a
  clean start, not a migration. See ADR-006 and `infra-deployment.md` for the
  current plan and inventory.

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

---

### ADR-006: First production deployment treated as a clean start (2026-04-26)

**Context:** ADR-002 (2026-04-14) committed to a Yandex Cloud COI VM deploy
pipeline modelled after `tradesu-moderator`. A factual audit on 2026-04-26
revealed that nothing from that pipeline has ever reached production:

- 0 secrets in repo / org / environments
- `deploy.yml` (legacy SSH path): 3 failed runs, never succeeded
- `deploy-web.yml` (COI VM path): never triggered
- DNS `payment.transapp.ru`: does not exist
- payment-service has only ever run on a developer laptop via the local
  `payment-service/docker-compose.yml`

**Decision:** Treat the upcoming first deploy as a greenfield setup, not a
migration. Provision Yandex Cloud resources from scratch, populate GitHub
Secrets, configure DNS, then trigger `deploy-web.yml` manually for a smoke
test before tagging the first GitHub Release.

**Rationale:**
- No live users on the new payment endpoint → no risk of data loss or
  customer impact during the first attempt
- No legacy server to keep alive → no blue/green orchestration needed
- Single-VM topology from `deploy-web.yml` is acceptable for unknown-low traffic
- Codifying infra in Terraform now would block on understanding YC ergonomics
  the project does not yet have — defer until after first manual provisioning,
  then `yc terraform import`

**Consequences:**
- Old `deploy.yml` is officially superseded; it currently auto-fails on every
  push to `payment-service/**` and floods the Actions tab with red badges. It
  will be removed (or downgraded to `workflow_dispatch`-only with a no-op job)
  during deploy preparation.
- Mobile prod build's hardcoded `https://payment.transapp.ru/api`
  (`src/services/api.ts:18`) will need to match whatever domain we issue the
  cert for. If we keep that domain, no code change is needed; otherwise an
  EAS rebuild is required.
- All adopt-from-tradesu improvements (Writerside in nginx, healthcheck step,
  read-only DB user) are tracked as backlog in `infra-deployment.md` rather
  than blocking the first deploy.
- Open questions and required GitHub secrets/YC resources are catalogued in
  `infra-deployment.md` as the single source of truth; this ADR records the
  approach, that doc records the live state.

**DNS / domain follow-up (2026-04-26):** clean-start staging will live on
`transapp-dev.ru`, registered the same day with NS delegated to Yandex Cloud
DNS (`ns1/ns2.yandexcloud.net`). Production cohabitation under `transapp.ru`
(planned subdomain `app.transapp.ru`) is a Phase-2 task that requires one
DNS-record addition by the colleague who controls the fastdns24 zone — the
same colleague who runs the legacy server `185.76.253.6` (mobile + web + main
API). Cutover from `lk.transapp.ru` to our stack is Phase 3, weeks after
Phase 2 stabilises. NS migration of `transapp.ru` itself is explicitly out of
scope — too much collateral risk to MX, SPF, UniSender, and the legacy site.
Full plan, status, and live checklist live in `infra-deployment.md` § "DNS
strategy and cohabitation plan".

---

### ADR-007: Database-per-service naming for payment Postgres (2026-04-28)

**Context:** Choosing `PG_NAME` for the payment-service Postgres at first
deploy. Forward-compatibility question raised: the legacy Perl backend at
`transapp.ru/api` may eventually be rewritten in Python and migrate onto our
infrastructure — should the database name be project-wide (`transapp`) to
accept future tenants, or service-specific (`transapp_payment`)?

**Decision:** Service-specific name `transapp_payment`. When/if a Python
backend migrates over, it gets **its own database** (`transapp_main` in the
same Postgres instance, or a managed Yandex Postgres cluster — to be decided
at that point), not a shared schema with payment.

**Rationale:**
- **Database-per-service** is the standard production pattern. Cohabiting
  two services in one database creates four kinds of coupling that all turn
  into problems eventually: schema (migration tools clash on the
  `migrations` table), permissions (SQL-injection in one service = read of
  the other's data), resources (heavy report query in main backend stalls
  payment transactions during checkout), recovery (`pg_restore` is per-db).
- **Financial-data isolation matters.** Payment service touches money;
  blast-radius for a compromise must be minimal.
- **Hypothetical future flexibility from a generic `transapp` name is
  illusory.** A real future migration of main-backend onto our infra will
  almost certainly choose either managed Postgres (no shared instance) or a
  separate `CREATE DATABASE` (no shared db). Neither path benefits from a
  pre-baked generic name today.
- **Prevents accidental dev↔staging cross-contamination.** Local dev uses
  `payment_db` (per `payment-service/docker-compose.yml`); staging uses
  `transapp_payment`. If staging credentials leak into a developer `.env`,
  connection fails fast (database doesn't exist) instead of writing test
  data into prod.

**Consequences:**
- `PG_NAME = transapp_payment` (and `PG_USER = transapp_payment`) in GitHub
  secrets. No further action needed for staging.
- When Python-backend migration becomes a project: provision a new database
  alongside payment, not a schema inside it. Managed Yandex Postgres is
  preferable for main-backend production workload; the in-VM Postgres in
  `docker-compose.yc.yaml` was sized for payment-service alone (4 GB RAM
  shared with nginx + payment-service).
- This decision documented to prevent the future maintainer from "merging"
  the two databases on a refactoring whim.

---

### ADR-008: Polling-based payment status until Phase 3 (2026-04-29)

**Context:** При проектировании потока «как Mobile/Web узнают финальный
статус платежа» возникает выбор: ждать push-уведомления `notify` от Kazna
(server-to-server webhook на наш `/api/notify`), либо периодически опрашивать
Kazna методом `paymentInfo/{paymentID}` через наш `GET /api/payment-status/{id}`.

Сегодня (2026-04-29) URL канала `notify` для нашего payment-service у Kazna
не зарегистрирован — есть только subscribeNotify URL у legacy backend
(`https://transapp.ru/api/kazna-api-update-fines`, рабочая гипотеза).
Чтобы получать `notify`, нужно отдельным письмом попросить менеджера Kazna
прописать наш URL — это часть Phase 3 cutover-а, не часть этой итерации.

**Decision:** До Phase 3 — **polling через `GET /api/payment-status/{id}`**.
Endpoint сам ходит в Kazna `paymentInfo/{paymentID}`, получает свежий статус,
обновляет нашу БД и отдаёт результат клиенту (см.
`payment-service/app/controllers/payment.py:114-143`). Push-канал `notify`
остаётся реализованным, но не используется до Phase 3.

**Rationale:**
- **Сама Kazna в PDF (раздел 3.4) рекомендует polling как fallback:**
  «Доставка информации о конечном статусе платежа по `notify` не является
  гарантированной, для получения статуса платежа необходимо использовать
  метод `paymentinfo`». То есть polling — не временный костыль, а
  официально валидный паттерн в этой экосистеме.
- **Минимизирует поверхность сегодняшней зависимости от Kazna-портала.**
  Если бы мы полагались на `notify`, любой обрыв push-канала на стороне
  Kazna (изменения IP-вайтлиста, миграция домена, baseURL drift)
  превращался бы в инцидент со скрытым проявлением (статусы перестают
  обновляться, пользователи видят «зависший» pending). Polling даёт
  предсказуемые латентности (сами выбираем интервал) и понятный failure
  mode (Kazna API возвращает 5xx → клиент видит «попробуйте позже»).
- **Не требует координации с менеджером Kazna для разработки/стейджа.**
  Можно ставить новые VM, менять домены, переезжать инфру — никаких
  whitelisted IP, никаких регистраций URL. Это особенно ценно в текущей
  фазе, когда staging ещё стабилизируется.
- **Идемпотентно по природе.** Каждый poll — независимый GET; повторение
  ничего не ломает, нет проблемы exactly-once delivery, которая бы
  возникла при push-обработке.

**Consequences:**
- `/api/notify` остаётся реализованным и покрывается unit-тестами
  (`payment-service/tests/test_notify_endpoint.py`) — чтобы Phase 3 cutover
  не упёрся в протухший «спящий» код.
- Клиент (Mobile/Web) реализует polling-цикл с разумным интервалом и
  верхней границей (например, 1× в 3-5 секунд до 2-3 минут после редиректа
  из WebView). Терминальные статусы (`auth`, `cancel`, `refunded`) —
  останов цикла. См. `payment-service/app/controllers/payment.py:120` —
  если статус уже терминальный, идём в БД, а не в Kazna.
- В `dev-payment-flow.md` нарисованы две диаграммы: «текущая, polling-based»
  и «Phase 3, push-based» — переход одной в другую и есть смысл Phase 3.

**Open question:** Тарификация Kazna `paymentInfo`. Подозрение
(2026-04-29): polling-запросы могут тарифицироваться per-call, и при росте
объёма платежей это станет невыгоднее push-канала. Уточнить у менеджера
Kazna стоимость и лимиты — это пригодится для оценки масштабируемости
polling-подхода и для триггера Phase 3.

**Reverses if:** при Phase 3 cutover-е менеджер Kazna зарегистрирует наш
URL для канала `notify`, и push-канал стабилизируется по latency и delivery
rate. Тогда polling переключается с «основного источника правды» на
«periodic reconciler» (раз в N минут, чтобы догнать пропущенный push).

### ADR-009: Web push restored via hybrid soft-prompt + GitHub Secrets config (2026-04-29)

**Context.** Mobile push (FCM via `@react-native-firebase/messaging`)
работает полностью. Web push в этом проекте — **намеренная no-op
заглушка** в `src/hooks/usePushNotifications.web.ts` (4 строки). В
legacy `transappweb/` web push был реализован: SW + foreground через
`firebase/messaging` modular SDK + token sync на тот же
`/set-fcmtoken`. При миграции на Expo Web этот кусок отрезали; коллега
обратил внимание что фича была.

**Decision.** Вернуть web push, **но не как 1:1 копию legacy**, а с
тремя архитектурными апдейтами:

1. **Hybrid soft-prompt UX**, а не immediate `Notification.requestPermission()`.
   Баннер на `/auto-list` через 10 с после входа (`Включить` / `Позже` / `✕`)
   + permanent toggle в `/notification-settings`. Native browser dialog
   срабатывает только после клика «Включить», т.е. в момент когда
   пользователь явно сигнализирует интерес.
2. **14-дневный snooze** на `Позже`. localStorage timestamp;
   `dismiss()` делает permanent (snooze 100 лет = effectively forever).
3. **Конфигурация через GitHub Secrets**, а не hardcoded как в legacy.
   6 значений (3 project-private: apiKey/appId/VAPID; 3 derivable из
   `google-services.json`) проходят через `--build-arg` в
   `nginx/Dockerfile.prod` → `EXPO_PUBLIC_*` ENV → Metro inlining →
   bundle. Тот же набор substitutes placeholder-ов в SW шаблоне
   (`firebase-messaging-sw.template.js` → `*.js` через `sed` в build step).

**Why not just port legacy.** (a) Legacy показывал native dialog сразу
при загрузке `Pin.js:104` — конверсия ~5-15% (web.dev / NN/g данные)
потому что пользователь жмёт Block в стрессе от логина; после Block
permission permanent, нельзя re-prompt. (b) Legacy hardcoded
firebaseConfig в JS файле — приемлемо для **public** apiKey/appId
(они и так видны в client bundle), но плохая привычка для
multi-tenant и multi-environment. GitHub Secrets дают единый pattern
для всех проектных credentials.

**Why frontend, not backend.** Backend `/set-fcmtoken` уже принимает
тот же payload что mobile — добавили лишь `device_info` с пометкой
веб-юзер-агента. Никакой работы на legacy backend `transapp.ru` не
нужно (он не в нашем repo).

**Why `Notification.permission` + custom state machine instead of just
the browser API.** Browser API только три состояния
(`default`/`granted`/`denied`) и не помнит «user said NOT NOW».
14-дневный snooze требует свой state. Pure function `deriveState` →
8 unit тестов, изоляция от React rendering.

**Browser support.** Chrome / Edge / Yandex Browser / Firefox (≥ 80%
российского web-трафика) ✅. Safari macOS — Web Push standard, не FCM
→ `isSupported()` returns false → банер скрыт. Safari iOS — только в
installed PWA (не в обычном табе) → банер скрыт. Это **правильное**
поведение, не bug.

**Graceful degradation.** Если 3 required GitHub Secrets не выставлены
(typical local dev / pre-secret deploy) — `isFirebaseWebConfigured()`
возвращает false, банер скрыт, `usePushNotifications.web.ts` exits
early, нет ошибок в консоли. PR можно мержить и деплоить до того как
коллега сгенерирует Web App + VAPID в Firebase Console — фича просто
ждёт активации.

**Reverses if:** браузеры стандартизуют push в обход Firebase (W3C
Push API + own Push Service per-vendor consolidation), либо backend
переходит на single per-user channel — тогда FCM dependency можно
снять и заменить на нативный Web Push (но затраты миграции скорее всего
не оправдают выигрыш). Также reverses при значительной просадке
delivery rate FCM web — мониторить через analytics после выкатки.

---

### ADR-010: patch-package + JVM system property для node-PATH в Gradle (2026-04-30)

**Context.** При открытии проекта в Android Studio из Dock/Finder
Gradle sync падал на плагине `expo-autolinking-settings` с ошибкой
вида `Cannot run program "node": error=2, No such file or directory`.
Из терминала (`./gradlew ...`) сборка работала — проблема проявлялась
только при GUI-запуске Studio.

Корневая причина — двухуровневая:

1. **macOS GUI launch не наследует shell PATH.** Приложения,
   запускаемые через launchd (Finder, Dock, Spotlight), получают
   минимальный системный PATH (`/usr/bin:/bin:/usr/sbin:/sbin`) и
   **не видят** `~/.zprofile` / `~/.zshrc` / `nvm`-shim'ов, где
   обычно живёт node. Из терминала PATH собирается shell-ом, поэтому
   `which node` работает, а Studio-из-Dock — нет.
2. **Gradle `settings.providers.exec {}` — изолированный value
   source.** Даже когда основной Gradle daemon видит корректный
   PATH, value sources (используются `expo-modules-autolinking`
   settings-плагином и серией android-build-плагинов в `node_modules`)
   создают свой `ProcessBuilder` без наследования environment, и
   lookup `"node"` падает.

В нашем сетапе обе проблемы накладываются: проект живёт на внешнем
HFS-диске (`/Volumes/HP_P800/...`), `HOME` стандартный, node стоит
через системный пакет (`/usr/local/bin/node`).

**Decision.** Заменили хардкод `"node"` на JVM system property
`expo.node.path` с fallback на `"node"` в 8 пакетах внутри
`node_modules`, через `patch-package`. Каждый разработчик один раз
выставляет абсолютный путь у себя в `~/.gradle/gradle.properties`
(user-level, не в репо):

```properties
systemProp.expo.node.path=/usr/local/bin/node
```

После этого `ProcessBuilder` получает абсолютный путь и запускает
node в обход PATH lookup — работает и из терминала, и из GUI Studio.

Затронутые пакеты (10 пакетов, 19 точек замены):

| Пакет | Файлов | Замен |
|---|---|---|
| `expo` | 1 | 1 |
| `expo-constants` | 1 | 2 |
| `expo-modules-autolinking` | 3 | 3 |
| `expo-modules-core` | 1 | 1 |
| `@react-native/gradle-plugin` | 3 | 3 |
| `@react-native-community/netinfo` | 1 | 1 |
| `react-native-gesture-handler` | 1 | 1 |
| `react-native-reanimated` | 1 | 4 |
| `react-native-screens` | 1 | 1 |
| `react-native-worklets` | 1 | 2 |

Самый важный — `@react-native/gradle-plugin`: его convention для
`nodeExecutableAndArgs` (`ReactExtension.kt`, `PrivateReactExtension.kt`)
наследуется **всеми** RN-библиотеками для codegen-задач
(`generateCodegenSchemaFromJavaScript`). Без патча этого плагина
codegen падает у `react-native-screens`, `react-native-worklets`,
`react-native-reanimated`, `react-native-gesture-handler`,
`react-native-async-storage`, `react-native-community/datetimepicker`,
`react-native-webview`, `react-native-yamap-plus`,
`react-native-safe-area-context` — даже несмотря на пропатченный
`resolveReactNativeDirectory` в их собственных `build.gradle`
(codegen — отдельный код-путь, живёт в центральном плагине, и
библиотеке достаточно лишь использовать convention). `PathUtils.kt:84`
отдельно пропатчен из-за `Runtime.getRuntime().exec()`, который
полностью обходит env. `expo-constants` имеет два сайта (`commandLine`
+ `nodeExecutableAndArgs`) в одном `.gradle` — оба нужны для
`createExpoConfig`. `@react-native-community/netinfo` пропатчен
defensively: в текущей раскладке `node_modules` он попадает в
fallback-ветку до `node`-вызова, но при monorepo-layout или
non-standard hoisting этот вызов проснётся.

---

### ADR-011: CSP whitelist расширен для Yandex Maps JS API v3 (2026-05-04)

**Context.** Во время первой публичной презентации web-версии (`transapp-dev.ru`)
страница `/pass-yamap` не отрисовала карту: в DevTools console было
`Refused to load https://api-maps.yandex.ru/v3/?apikey=... because it does
not appear in the script-src directive of the Content Security Policy`.
Корневая причина — несоответствие между `connect-src` (где `api-maps.yandex.ru`
был whitelist'нут ещё в ADR-004) и `script-src`, в котором его не было:
`<script src="https://api-maps.yandex.ru/v3/...">` управляется именно
`script-src`, а не `connect-src`. Исходный CSP подразумевал, что Yandex
Maps грузится только как XHR/fetch, что неверно для v3 (где основной
бандл подключается тегом `<script>` + динамические `ymaps3.import()`).

Дополнительный риск: даже после фикса `script-src` Yandex Maps v3
создаёт Web Workers из `data:` URL для рендеринга векторных тайлов —
текущий `worker-src 'self'` это запрещает, что стало бы следующей
ошибкой после первой починки.

**Decision.** Расширили CSP в `nginx/security-headers.partial.conf`
по официальному списку хостов от Яндекс
([yandex.ru/dev/jsapi30/.../csp](https://yandex.ru/dev/jsapi30/doc/ru/common/connection/csp.html)):

| Директива | Добавлено |
|---|---|
| `script-src` | `https://api-maps.yandex.ru https://*.api-maps.yandex.ru https://yastatic.net` |
| `style-src` | `https://api-maps.yandex.ru https://*.api-maps.yandex.ru https://yastatic.net` |
| `connect-src` | `https://*.api-maps.yandex.ru https://yastatic.net` (+ оба уже были) |
| `worker-src` | `data: https://api-maps.yandex.ru https://*.api-maps.yandex.ru https://yastatic.net` |
| `img-src` | без изменений (`https:` wildcard покрывает тайлы) |

**Что сознательно НЕ добавили:** `suggest-maps.yandex.ru`,
`search-maps.yandex.ru`, `api.routing.yandex.net`. Реверс-геокодинг и
поиск адреса делаются нашим backend-эндпоинтом `/get-address-map`
(прокси на `ivan.trans-konsalt.ru`), не напрямую с браузера. Если
это изменится — добавлять только нужный из трёх.

**Post-mortem (что упустили).** ADR-004 описал интеграцию Yandex Maps v3
для web в апреле, но вместе с ADR-002 (Docker + nginx) CSP-настройка
была сделана позже и проверена только на главной странице приложения,
а не на `/pass-yamap`. Smoke-test в `dev-web.md:651-661` тестирует
только заголовки на корневых маршрутах, без браузерной проверки
страниц с тяжёлыми CDN-зависимостями.

**Меры предотвращения:**

1. В `manual-qa-checklist.md` добавлен пункт про DevTools console на
   `/pass-yamap` (CSP violations, network 4xx/5xx из Yandex CDN).
2. CSP теперь конфигурируется по **полному официальному списку**
   директив каждого third-party SDK, а не только по тем хостам, что
   видны в коде на момент интеграции (могут добавиться при ленивой
   подгрузке).
3. Перед мажорной демонстрацией — обязательный smoke-pass по всем
   ключевым screen'ам web-версии с открытым DevTools, не только курлом
   заголовков.

**Trade-off.** `'unsafe-eval'` в `script-src` уже был — добавление
yastatic.net и api-maps.yandex.ru не ослабляет policy качественно
(хосты доверенные, операторы Яндекса). Дальнейшее ужесточение CSP
(переход на nonce-based, отказ от `'unsafe-eval'`) требует миграции
Expo Web bundle с eval-style инициализации Metro — это отдельная
задача, не связанная с этим инцидентом.

`patch-package` подключён через `"postinstall": "patch-package"` в
`package.json` — патчи реаплаются автоматически после каждого
`npm install` / EAS prebuild.

**Rationale (alternatives considered).**

1. **`launchctl setenv PATH ...` + перезапуск Dock.** Стандартный
   рецепт для GUI-приложений. Не сработал: Dock кэширует environment
   запущенных приложений; `launchctl setenv` помог только для новых
   процессов после `killall Dock`, и даже тогда `providers.exec` в
   value source создаёт свой ProcessBuilder без наследования.
2. **`init.gradle` с reflection в Settings phase.** Попытка
   подменить PATH в самом Gradle через init-скрипт. Не сработал:
   value sources вычисляются раньше init-фазы, и reflection-доступ
   к их internal `ProcessBuilder` не разрешён в Gradle 8.x
   (`InaccessibleObjectException`).
3. **`~/.zprofile` / `~/.bash_profile` экспорт PATH.** Помогает
   терминалу, не помогает GUI-launchd. Уже было настроено и не
   решало проблему.
4. **LaunchAgent plist с `EnvironmentVariables`.** Решает GUI-PATH
   глобально, но требует от каждого разработчика systemwide setup
   (создать `~/Library/LaunchAgents/*.plist`, перелогиниться). Плюс
   value-source-проблема всё равно остаётся.
5. **Симлинк `/usr/local/bin/node` → актуальный node.** Помогает
   только если node физически лежит в системном PATH; для проектов
   с `nvm` / Volta / fnm не работает.

`patch-package` + system property — **единственный** вариант,
который работает одинаково на любом dev-сетапе (системный node,
nvm, Volta), для любого launch-mode (терминал, Dock, Spotlight,
JetBrains Toolbox), на любом host-OS (macOS / Linux), и не требует
от разработчика менять глобальный environment вне Gradle.

**Consequences.**

- Каждый новый разработчик должен один раз добавить
  `systemProp.expo.node.path=<absolute_path>` в
  `~/.gradle/gradle.properties` — инструкция в `dev-mobile.md`,
  раздел «Android Studio setup для разработчиков».
- Из терминала Gradle-сборки работают как раньше — system property
  отсутствует → fallback `"node"` → PATH lookup срабатывает.
- При апгрейде версий пакетов из таблицы выше patch-package скажет
  `Failed to apply patch...` если структура файла изменилась —
  тогда нужно сгенерировать патч заново через
  `npx patch-package <package>` после ручного фикса в `node_modules`.
- На CI (EAS Build, GitHub Actions) патчи применяются автоматически
  через `postinstall`. Для CI отдельно `expo.node.path` не нужно —
  там PATH собирается из base image без launchd-проблемы.
- Папка `android/` остаётся managed (`prebuild` regenerates) —
  ничего не патчим в ней.

**Reverses if.** Upstream-пакеты переедут на собственный механизм
указания node-binary (Expo CLI обсуждали `EXPO_NODE_BINARY` env
var) — тогда патчи можно будет снять и переключиться на штатный
механизм. Также reverses при переходе монорепо на корпоративный
container-based dev environment (devcontainer / Codespaces), где
PATH детерминирован.

---

### ADR-012: Data quality reporting + system-notice banner (2026-05-04)

**Context.** Phase 1 баннера состояния провайдера (PR #18, ADR
неявный, реализация — `src/utils/providerHealth.ts`) ловит только
**observable failures** запросов к нашему backend (HTTP 5xx, timeout,
явные `error: ...` в payload). Реальная боль клиентов — *silent data
quality issues*: провайдер `Avtocod` получает данные от госструктур
через СМЭВ (ГИБДД, ФССП и др.), СМЭВ часто отдаёт частичные или
устаревшие данные, провайдер этого не сообщает. В endpoint всё
выглядит ОК — клиент видит «нет штрафов», доверяет, потом ловит
ФССП-передачу. Частота — ~1 раз/мес, но критично: финансовые риски
клиента → отток.

Endpoint-observation эту проблему не закрывает в принципе. Нужен
канал «снизу вверх» — клиент сигналит о расхождении с реальностью.

**Decision.** Реализовать loop **жалоба → админ → ручное / авто
включение баннера → recovery push** как core-функциональность
data-quality-monitoring, поверх существующего `payment-service`,
с отдельным sidecar-контейнером `payment-bot` для Telegram-диспетчера.

Архитектура (см. `.claude/plans/2026-05-04-data-issues-reporting.md`):

```
client ──POST /data-issues/report──▶ payment-service ──aiogram-send──▶ admin TG
                                          │
                                          ▼  threshold check (≥3 distinct
                                              users / 6h)
                                       ┌──────────────────┐
                                       │  payment_db      │
                                       │  data_issues     │
                                       │  system_notice   │
                                       │  push_log        │
                                       └────▲───────▲─────┘
                                            │       │
                                  payment-bot       client
                                  (aiogram polling) ──GET /system-notice──▶
                                  ─/banner_on, /banner_off, callbacks
                                  ─FCM admin push (firebase-admin)
```

**Rationale (alternatives considered).**

1. **TG-бот в lifespan payment-service vs отдельный контейнер.** Polling
   нескольких uvicorn-воркеров против одного `bot.getUpdates`-токена даёт
   `Conflict: terminated by other getUpdates`. Single-worker payment-service
   ограничивал бы рост. → Sidecar `payment-bot` тем же image, разный
   `command:`. payment-service остаётся scalable.
2. **Webhook vs polling для бота.** Webhook избегает multi-worker
   проблемы естественно, но требует публичный URL и certificate. Учитывая
   объём ~1 жалоба/мес — polling простой и достаточный, не блокирует
   эволюцию на webhook когда понадобится.
3. **Проверка `user_id` через legacy DB.** Отвергнуто — legacy MySQL
   нам недоступен. Trust + partial UNIQUE rate-limit в БД достаточно
   для v1: повторная open-жалоба того же `(user, auto, category)` →
   HTTP 409. Spam от внешнего злоумышленника возможен с разными
   `user_id`, принимаем как acceptable risk; при росте abuse — добавим
   shared secret.
4. **FCM tokens из legacy `session.fcmtoken`.** Отвергнуто — legacy DB
   недоступна. Решение: **клиент сам шлёт `fcm_token` в `/report`**.
   Жалобщик обычно на устройстве с уже-granted push permission, токен
   у него на руках. Implicit consent (он сам инициировал диалог),
   минимум шума, никакого cross-tenant leak. Web-юзер без push permission
   не получит recovery push — accepted, баннер всё равно исчезнет
   при следующем poll.
5. **Auto-banner threshold race.** Партиционная UNIQUE INDEX
   `system_notice (category) WHERE deactivated_at IS NULL` + `INSERT
   ON CONFLICT DO NOTHING` (Postgres) защищают от двух одновременных
   threshold-crossing'ов при пиковом потоке жалоб. App-level early-out
   запросом активного notice — для единичных случаев, чтобы не плодить
   IntegrityError-исключения.
6. **TTL баннера.** Отвергнут (по запросу заказчика). Баннер живёт до
   явного `/banner_off` — data-quality инцидент не лечится сам собой,
   и забывание выключить — менее опасный фейл, чем ложное "восстановлено".
7. **Push targeting.** Только жалобщикам (FCM tokens из `data_issues`
   для этой категории), не всем юзерам с авто. По запросу заказчика:
   «никого кроме жалобщика не стоит беспокоить — остальные могут
   вовсе не заметить что проблема была». Минимум шума в push-канале.

**Implementation surface.**

| Layer | Files |
|---|---|
| Migration | `payment-service/migrations/002_data_issues_and_notice.sql` |
| Models | `app/models.py` — `DataIssue`, `SystemNotice`, `SystemNoticePushLog` |
| Pydantic | `app/schemas/data_issues.py` |
| Settings | `app/config/settings.py` — `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ADMIN_CHAT_ID`, `FIREBASE_CREDENTIALS_PATH`, `AUTO_BANNER_*` |
| Services | `app/services/{firebase_push,data_issues,system_notice}.py` |
| Controllers | `app/controllers/data_issues.py` — `POST /api/data-issues/report`, `GET /api/system-notice` |
| Bot | `app/bot/{notify,handlers,bot_worker}.py` |
| Local compose | `payment-service/docker-compose.yml` — новый сервис `payment-bot` |
| Prod compose | `yandex-cloud/docker-compose.yc.yaml` — `payment-bot` рядом с `payment-service`, оба читают TG/Firebase env-переменные |
| Deploy CI | `.github/workflows/deploy-web.yml` — `TELEGRAM_BOT_TOKEN`/`TELEGRAM_ADMIN_CHAT_ID` идут через `env:`-блок (как `KAZNA_*`); `FIREBASE_SERVER_ACCOUNT_JSON` идёт через `--build-arg` в `build-payment` step (по аналогии с `FIREBASE_WEB_*` в `build-nginx`, ADR-009) — Dockerfile.prod записывает JSON в `/run/secrets/firebase-server-account.json` под appuser |
| Tests | `tests/{test_data_issues_endpoint,test_system_notice_endpoint,test_system_notice_service,test_firebase_push}.py` (29 кейсов) |
| Required GitHub Secrets | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ADMIN_CHAT_ID`, `FIREBASE_SERVER_ACCOUNT_JSON` (полное содержимое сервис-аккаунта JSON в одной строке) |

**Consequences.**

- payment-service зависит от Firebase service account (`/run/secrets/firebase-server-account.json`) — graceful degrade при отсутствии: баннеры включаются/выключаются, recovery push молча скипается.
- payment-service зависит от Telegram Bot API при INSERT в `data_issues` — best-effort, ошибки логируются и не пробрасываются в HTTP-ответ.
- Legacy-DB остаётся не тронутой — собственный журнал `data_issues` /
  `system_notice` / `system_notice_push_log` живёт в `payment_db`.
- При миграции legacy → наш backend `user_id` поле остаётся валидным
  (id-пространство сохраняется), переключений не требуется.
- Phase 1 frontend (`DataProviderStatusBanner`, `useDataProviderHealth`,
  `providerHealth.ts`) deprecated в PR-2 (frontend); сам баннер-компонент
  переиспользуется как presenter, источник переключается на
  `useSystemNotice` / `GET /system-notice`.

**Reverses if.** Backend получает прямой контракт от Avtocod о
качестве данных (явный `data_freshness_warning` flag в response), либо
мы переезжаем на cross-user anomaly detection после миграции legacy →
наш backend (Track 2 в плане). В обоих случаях user-feedback loop
остаётся как fallback-канал — отказывать от него не будем.

---

### ADR-013: Documentation single source of truth (2026-05-04)

**Context.** До 2026-05-04 в проекте сосуществовали три источника
документации:

1. **`/docs/`** — 60 markdown-файлов миграционной эпохи (Nov 2025 –
   Apr 2026): completion-логи (`MIGRATION_COMPLETE.md`, `FINAL_SUMMARY.md`,
   `DONE.md`), fix-логи (`FIREBASE_FIXED.md`, `WATCHMAN_FIX_MACOS.md`),
   setup-гайды (`SETUP_MAC_M2.md`, `ANDROID_*`, `NATIVEWIND_*`), плюс
   ценные vendor-артефакты (`KaznaAPI.md` 5966 строк + KaznaAPI PDF +
   контракт).
2. **`Writerside/topics/`** — 22 топика (4473 строки), действующая
   живая документация, обновляется по mandate из `CLAUDE.md` после
   каждого изменения кода.
3. **Корневые `.md`** — `README.md` (172 строки), `ARCHITECTURE.md`
   (82 строки), `QUICK_START.md` (102 строки), `TODO.md` (34 строки).
   Все четыре устарели: README показывал SDK 52 / «миграция не
   завершена», ссылался на 6 файлов в `/docs/` (включая `MIGRATION_STATUS.md`),
   ARCHITECTURE — SDK 52, TODO — почти всё чекнуто.

Проблемы такого состояния:

- **Misleading entry-point.** Новый contributor (или GitHub UI)
  видит `README.md` первым; он описывает реальность, которой нет
  больше года. Нет ни одного указателя на Writerside.
- **Двойной источник правды.** `Writerside/topics/api-payment.md:5,146`
  и `dev-payment-flow.md:7` ссылались на `docs/KaznaAPI.md` — живая
  Writerside-документация *зависит* от файла внутри «архива». Семь
  топиков Writerside содержали HTML-комментарии вида
  `<!-- Content to be migrated from /docs/X.md -->`, формализующие
  незавершённую миграцию. `project-dashboard.md → Documentation` row
  висел как 🔄 Migration to Writerside.
- **Ложный мусор в build/dev pipeline.** `tsconfig.json` имел
  `docs/**/*` в `exclude` (страховка от попадания в TS-pipeline);
  `scripts/setup-mac-m2.sh:233` echo'ил инструкцию к
  `docs/SETUP_MAC_M2.md`; `.claude/skills/writerside-docs.md` имел
  миграционную таблицу `/docs/ → Writerside`.

**Decision.** Зафиксировать `Writerside/topics/` как **единственный**
источник правды для проектной документации. Остальное:

| Категория | Куда |
|-----------|------|
| Vendor docs (Kazna API spec PDF + markdown + контракт) | `payment-service/docs/vendor/kazna/` (рядом с сервисом-потребителем) |
| Исторические migration-логи | `legacy/docs/` через `git mv` (history preserved, явный сигнал «не редактировать») |
| Корневой README | Slim index: что за проект, актуальный стек, quickstart-команды, ссылки в Writerside |
| `ARCHITECTURE.md`, `QUICK_START.md`, `TODO.md` | Удалены — контент в `project-overview.md`, новом `README.md`, и `project-dashboard.md → Next Tasks` соответственно |

Заодно:

- 5 stub-топиков Writerside (`project-overview.md`, `dev-expo-router.md`,
  `setup-android.md`, `infra-firebase.md`, плюс TODO-комментарий в
  `dev-payment-flow.md`) **переписаны заново** на основе текущего
  состояния кода — не копи-паст из `/docs/`.
- TODO-комментарии `<!-- migrate from /docs/X.md -->` удалены из всех
  7 топиков (включая `dev-mobile.md`, `setup-mac-m2.md`).
- Inline-ссылки на `docs/KaznaAPI.md` обновлены на
  `payment-service/docs/vendor/kazna/KaznaAPI.md`.
- `tsconfig.json` exclude `docs/**/*` снят (папки нет; добавлен
  `legacy` в exclude для гигиены).
- `scripts/setup-mac-m2.sh:233` ссылается теперь на
  `Writerside/topics/setup-mac-m2.md`.
- `.claude/skills/writerside-docs.md` — секция «Migration from /docs/»
  заменена на короткую справку «documentation locations».

**Alternatives considered.**

1. *Переезд на GitBook / Docusaurus / MkDocs.* Стоимость миграции
   Writerside → новая платформа выше выигрыша. Writerside уже настроен
   (`writerside.cfg`, `ta.tree`, IDE integration в JetBrains-стеке),
   рендерится локально, не требует hosting'а, бесплатен.
2. *Удалить `/docs/` без архива.* Потеряли бы git-археологию для
   исторического контекста миграции (Nov 2025 – Apr 2026). `git mv`
   в `legacy/docs/` — нулевая стоимость, history preserved через
   `git log --follow`, `legacy/README.md` явно сигнализирует
   «не редактировать».
3. *Оставить корневые `ARCHITECTURE.md` / `QUICK_START.md` / `TODO.md`
   как «зеркала» Writerside.* Два источника правды → drift; дублирование
   Documentation Update Rule из `CLAUDE.md` (что обновлять при изменении
   кода). Один тонкий `README.md` как entry-point достаточен.
4. *Не выделять Kazna в `payment-service/docs/vendor/kazna/`,
   оставить inline-ссылки на `docs/KaznaAPI.md` или скопировать в
   Writerside как attachment.* Vendor-артефакты живут с потребителем —
   зависимость становится явной (сервис, который их потребляет, держит
   их рядом). Writerside не имеет attachments-механизма для PDF, только
   `Writerside/images/`. Inline-ссылка из Writerside на путь внутри
   `payment-service/` — нормальный pattern (это всё одна репа).

**Consequences.**

- Single read path: новый contributor открывает `README.md` →
  `Writerside/topics/landing.md` → topic. AI-агенты (Claude Code) идут
  через `CLAUDE.md` → Documentation Update Rule → конкретный topic.
- `project-dashboard.md → Documentation` row: 🔄 → ✅.
- `Next Tasks` пункт «Migrate key /docs/ content to Writerside topics»
  закрыт (удалён).
- Все будущие документационные правки идут в `Writerside/topics/`.
  `legacy/docs/` остаётся read-only — если что-то оттуда ещё нужно,
  переносить в Writerside, не в место.
- Один логически связанный коммит фиксирует всё закрытие:
  `docs: close documentation debt — Writerside as single source of truth (ADR-013)`.

**Reverses if.** Появится требование на multi-version docs hosting
(публичная developer-portal с историей версий) — тогда переезд на
Docusaurus/Mintlify/etc может стать оправданным. Текущая аудитория
документации — внутренняя команда + AI-агенты, для которой
Writerside-в-репе достаточен.

---

### ADR-014: Interim client-side guardrails для прямого push в master (2026-05-04)

> **Note on numbering.** ADR-012 (data-issues) и ADR-013 (docs single source of truth)
> ещё не смержены в master на момент создания этого ADR (живут в `feat/data-issues-backend`).
> Чтобы не конфликтовать с уже зафиксированными там номерами, эта запись = ADR-014.
> После мерджа feat-ветки в master итоговый порядок будет 011 → 012 → 013 → 014.

**Context.** GitHub Free tier для **приватных репо в организациях** (TransKonsalt
сейчас на Free) не enforces ни Branch Protection Rules, ни Rulesets. UI создавать
правила позволяет, но в `Settings → Branches` появляется красный
«Not enforced» — реальная защита `master` от force-push, удаления и прямых
коммитов **отсутствует**. Для приватных репо обе системы залочены за GitHub
Team ($4/user/month) или Enterprise.

Риск усиливается solo-dev workflow: легко набрать `git push --force` для
feature-ветки, но ошибиться в имени и снести историю master. Также любой
participant с push-доступом может закоммитить прямо в master минуя PR-флоу,
обход ревью и CI.

**Decision.** Ввести **временные client-side guardrails** до апгрейда org на
GitHub Team. Два слоя:

1. **`.githooks/pre-push`** — локальный git-хук на машине разработчика.
   Реджектит:
   - force-push к `master` / `main` (детектит non-fast-forward через
     `git merge-base --is-ancestor`);
   - удаление `master` / `main` (`local_sha == 0000...`).

   Хук активируется автоматически: `npm install` postinstall запускает
   `scripts/setup-git-hooks.js`, который выставляет
   `git config core.hooksPath .githooks` (per-clone setting). Команда
   tolerant — silently skips если запустить вне git-контекста (npm-pack
   tarball, sandboxed CI).

   **Bypass** (emergency только): `git push --no-verify`. Логирует
   причину блокировки и инструкцию по восстановлению.

2. **`.github/workflows/master-push-guard.yml`** — server-side red-flag
   workflow. Триггерится на `push: branches: [master]`. Для каждого
   commit в диапазоне `BEFORE..AFTER` запрашивает
   `GET /repos/:repo/commits/:sha/pulls` и проверяет, есть ли
   связанный merged PR. Если нет — `::error::` + exit 1 → красный ❌
   на коммите в master, видный в UI / email / browser tab favicon.

   Не **блокирует** push (paywall mechanism делает это невозможным
   на Free tier), но создаёт audit-trail и заметный сигнал.

**Why both слоя.** Pre-push hook ловит распространённый кейс (свой ноутбук,
typo в команде force-push) — до контакта с GitHub. Workflow ловит то, что
hook не видит: push с другой машины, с `--no-verify`, прямой web-edit
файла на master через GitHub UI. Каждый слой страхует слабости другого.

**Alternatives considered.**

1. **Заплатить $4/мес за GitHub Team.** Рекомендованный долгосрочный
   путь — server-side enforcement в правильном слое. Решение отложено по
   запросу пользователя; guardrails — stopgap, не замена.
2. **Перенести репо в personal account.** Personal Free tier включает
   Branch Protection на private repos (с 2022). Отклонено: теряется
   org-структура для будущих collaborators, перенос требует gh-action
   secret reconfig.
3. **Полагаться только на дисциплину.** Отклонено: solo-dev typing
   errors — главная attack surface; guardrails защищают от себя.
4. **husky + lint-staged.** Тяжелее одного хука. Отклонено — нативный
   `core.hooksPath` достаточен для одного pre-push скрипта.
5. **Pre-receive hook on remote.** GitHub-hosted репо — нет доступа к
   remote-side hooks (это feature только GitHub Enterprise Server
   self-hosted). Не вариант.

**Consequences.**

- Каждый разработчик после `npm install` автоматически opt-in
   (postinstall выставляет `core.hooksPath`). Persistent per-clone.
- `git push --no-verify origin master` всё ещё обходит локальный hook —
   intentional emergency exit. Workflow ловит итоговый коммит на server-side.
- Workflow требует scope `pull-requests: read` — granted через
   `GITHUB_TOKEN`, не нужен PAT.
- Postinstall удлиняется на ~50ms (`git config` call). Незаметно.
- Когда TransKonsalt апгрейдится до GitHub Team — нативная Branch
   Protection берёт верх. Guardrails становятся избыточными, но
   harmless. Удаление = single PR (`rm .githooks/pre-push`,
   `rm .github/workflows/master-push-guard.yml`, refactor postinstall
   обратно на `patch-package`).

**Reverses if.** Org апгрейдится до Team или Enterprise → включаем
нативную Branch Protection (no force-push, no deletion, required PR,
required status checks). Удаляем оба guardrail-механизма как
unnecessary noise.

#### Update 2026-05-05: squash-merge false-positives — fix

**Symptom.** Все 5 последних merged-via-PR коммитов в master
(`#24…#28`) триггерили красный ❌ от `master-push-guard.yml`:

```
::error::Commit fe9f7902ed9f057d72e0730a5a01494ff9e2da22 was pushed
to master without an associated merged PR.
   fe9f790  fix(bot): unbreak /help + escape user comments + … (#28)
```

При этом каждый коммит был легитимно squash-merge'нут через GitHub UI.

**Корневая причина.** Workflow использовал
`GET /repos/:repo/commits/:sha/pulls`, который возвращает PR'ы
**содержащие** этот commit в своей branch'е. При squash-merge GitHub
создаёт **новый** master-side commit, отсутствующий в исходной
branch'е PR'а, поэтому endpoint возвращает пустой список. Это
известное ограничение API на squash-стратегии (rebase-merge
работает корректно, потому что rebase сохраняет provenance).

**Fix.** Добавлен **Layer 2** lookup через `merge_commit_sha`. При
squash-merge GitHub устанавливает у PR'а поле
`merge_commit_sha = <SHA нового commit'а на master>` — это и есть
надёжный link. Алгоритм:

1. **Layer 1** (existing) — `commits/{sha}/pulls`, ловит regular-merge
   и rebase-merge (provenance preserved).
2. **Layer 2** (new) — fetch последние 100 closed PR'ов через
   `pulls?state=closed&per_page=100`, построить sha→PR map по полю
   `merge_commit_sha`, искать наш commit в этой map'е. Ловит
   squash-merge (и rebase-merge как safety-net).

100 most-recent merged PR'ов покрывает любое реалистичное push window
(обычно последние пара дней деплоев). Если когда-нибудь push'ится
commit, чей PR был merge'нут раньше 100-го самого недавнего —
guardrail (правомерно) флагнет его как подозрительный, что
соответствует policy «push'ить старые ветки в master не комильфо».

**Verification.** До фикса 5 подряд squash-merge'ев фейлили
guardrail. После фикса один и тот же squash-merge будет
проходить через Layer 2 с output:

```
✅ <sha> — merged via PR #29 (squash, matched on merge_commit_sha)
```

**Out of scope.** Empty commit'ы напрямую в master (типа `d01289a`
из сегодняшнего fixup-цикла) **продолжают** правомерно фейлить —
у них нет ассоциированного PR. Это intended behavior.



**Context.** После мерджа PR-1 + PR-2 + индекс-фикса (#21, #23, #24)
+ деплой-фикса (#25) backend для data-issues работает на staging:
`POST /payment-api/data-issues/report` возвращает 201, INSERT в
`data_issues` происходит, partial UNIQUE indexes защищают
race-conditions. **Но**: первый smoke-тест показал что админ-алерт в
TG не приходит. Корневая причина — `api.telegram.org` заблокирован
для исходящих с RU IP-диапазонов, наша staging VM на Yandex Cloud
RU. Стандартный `aiogram.Bot.send_message` с такой VM попадает в
timeout / connection refused.

Соседний проект `krasilnikov-bitrix-teleg-bot` (`/Volumes/.../IdeaProjects/krasilnikov-bitrix-teleg-bot/DEPLOY.md`)
сталкивался с тем же блоком и решил его через **StrongSwan IKEv2 +
EAP-MSCHAPv2 split-tunneling** к US-серверу `31.44.2.124`: только
Telegram-подсети (`149.154.160.0/20`, `91.108.4.0/22`) идут через
тоннель, всё остальное напрямую. У них VM Ubuntu, strongSwan
устанавливается через apt + systemd. У нас COI VM от Yandex,
без apt и без managed-systemd-strongswan — нужна адаптация
архитектуры под Docker-only окружение.

Дополнительно: payment-service **не должен** ходить через VPN —
его outbound включает Kazna API (`demopay.oplatagosuslug.ru`, RU);
прохождение этого трафика через US-тоннель ломает интеграцию
(latency, возможный block по foreign IP). Поэтому VPN нужен только
payment-bot, у которого outbound — исключительно api.telegram.org.

**Decision.** StrongSwan IPsec клиент как **отдельный Docker-сайдкар**
рядом с payment-bot. payment-bot шеймит его network namespace через
`network_mode: "service:vpn"`, наследует split-tunnel routing.
payment-service остаётся на default network — ходит к Kazna напрямую.

Архитектурное последствие: **админ-алерт должен переехать с
payment-service на payment-bot.** Раньше `controllers/data_issues.py:report`
синхронно дёргал `bot.notify.send_admin_alert` — это путь сейчас
мёртв (RU egress). Замена: payment-bot опрашивает `data_issues`
каждые 5 секунд (poll_alerts.py), на новых строках формирует
admin alert и отправляет через свой aiogram.Bot.

```
                         ┌──────────────────────┐
                         │ Yandex Cloud COI VM  │
client → nginx → payment-service     │
                              │      │
                              │ INSERT data_issues
                              ▼      │
                         payment-db  │
                              ▲      │
                              │ poll every 5s
                         payment-bot ◀── network_mode: service:vpn
                              │      │
                              ▼      │
                          eth0 (vpn) │
                              │      │
                              ▼      │ split-tunnel
                       IPsec tunnel  │ rightsubnet=149.154.160.0/20
                              │      │           ,91.108.4.0/22
                              ▼      │
                       31.44.2.124 (US) ──▶ api.telegram.org
                         └──────────────────────┘
```

**Rationale (alternatives considered).**

1. **Установить strongSwan на COI host через cloud-init.** Не работает:
   COI это immutable image, без apt; есть `containerd` и docker-compose,
   `runc`-движок без traditional package manager. Сложные хаки через
   chroot не масштабируются.
2. **Поменять COI → Ubuntu в `yc-coi-deploy@v2`.** Major change для
   всего deploy pipeline: переписать docker-compose как systemd unit,
   управлять lifecycle вручную. Большой регресс рабочей инфраструктуры
   ради одного TG-фичефикса.
3. **HTTP/SOCKS proxy через krasilnikov VM.** krasilnikov VM уже за
   VPN, можно поставить там squid/nginx, наши сервисы выставляют
   `HTTPS_PROXY=krasilnikov:8080` для TG-выхода. Минусы: cross-project
   coupling, krasilnikov падает → наш TG ломается, два проекта
   деплоятся независимо.
4. **Telegram MTProto через прокси-список.** Платно / нестабильно /
   третья сторона.
5. **Отдельная Ubuntu VM рядом** для payment-bot (строго по гайду
   krasilnikov, без Docker). +1 VM в инфре, +1 deploy pipeline,
   разделение compose между двумя машинами.

**Принятое решение (Docker-сайдкар) — самое маленькое инфра-
изменение, всё в одном `docker-compose.yc.yaml`, 30-строчный
кастомный Dockerfile на alpine + strongswan.** Auditable, pinned
к нашему use case. CA cert — public, баки в image; EAP creds —
через GitHub Secrets → env block в `docker-compose.yc.yaml`.

**Implementation surface.**

| Layer | Files |
|---|---|
| VPN sidecar | `infra/strongswan/{Dockerfile,entrypoint.sh,ipsec.conf.template,ca.pem}` |
| Bot poll-loop | `payment-service/app/bot/poll_alerts.py` (new) |
| Bot lifecycle | `payment-service/app/bot/bot_worker.py` — `asyncio.gather(dispatcher_polling, poll_for_new_alerts)` |
| Notify formatter | `payment-service/app/bot/notify.py` — refactored на pure `format_admin_alert(...)` |
| Controller cleanup | `payment-service/app/controllers/data_issues.py` — удалён вызов `send_admin_alert` (мёртвый путь) |
| Production compose | `yandex-cloud/docker-compose.yc.yaml` — новый сервис `vpn`, `payment-bot` через `network_mode: "service:vpn"` |
| Deploy CI | `.github/workflows/deploy-web.yml` — новый job `build-vpn` + env vars `STRONGSWAN_EAP_USERNAME` / `STRONGSWAN_EAP_PASSWORD` (через `env:` block, по lesson learned из ADR-012/PR #25) |
| Tests | `payment-service/tests/test_poll_alerts.py` — 8 кейсов (high-water mark, send happy path, TelegramAPIError tolerance, cold-start replay protection, retry-on-failure) |
| Required GitHub Secrets | `STRONGSWAN_EAP_USERNAME`, `STRONGSWAN_EAP_PASSWORD` |

**Polling cadence: 5 seconds.** При ~1 инциденте в месяц
sub-минутная latency не нужна. 5s даёт snappy чувство при
QA/manual-test'ах без флуда DB. Можно поднять до 30s/60s в
production без замечаний пользователя.

**Cold-start replay protection.** На старте payment-bot читает
`MAX(id) FROM data_issues` и сохраняет как `last_seen_id`.
Все pre-existing rows игнорятся (иначе при первом старте бот
вылил бы в TG все жалобы за всю историю). Только новые `id >
last_seen_id` после старта триггерят alert.

**Send-failure tolerance.** Если TG send падает (TelegramAPIError,
network blip), `last_seen_id` НЕ продвигается — следующий poll
повторит. Гарантирует что transient blip не теряет жалобу.
Permanent-failure case (e.g. message всегда too long) — известный
edge case (deferred в плане).

**Consequences.**

- **+1 контейнер** на staging VM — vpn (alpine + strongswan, ~25 MB
  image). Resource overhead минимален (idle 5MB RAM, активный 20MB).
- **payment-bot теряет independent network** — все его outbound
  идёт через vpn namespace. Если vpn падает, payment-bot тоже
  теряет связность (включая payment-db). `depends_on: vpn:
  condition: service_started` гарантирует правильный startup order;
  при vpn restart Docker автоматически перезапустит payment-bot.
- **Latency admin-alert ~5s** (poll cadence) вместо ~100ms (inline
  send). Acceptable для admin-канала.
- **При отвале VPN-сервера** (`31.44.2.124`) admin-alert копится в
  DB и будет дослан на следующем успешном поднятии. Никаких потерь
  жалоб (DB — single source of truth для alert pipeline).
- **Firebase recovery push** не зависит от VPN — FCM endpoints не
  RU-blocked, идут через default route. Recovery push работает
  независимо от состояния StrongSwan.

**Reverses if.** Telegram разблокируется в РФ (маловероятно), либо
production переезжает на non-RU инфраструктуру (планируется в долгом
горизонте при выходе на CIS/EU рынок), либо находится дешёвый
managed Telegram-egress прокси-сервис который мы можем доверить
production-нагрузке. В любом из этих случаев VPN-сайдкар удаляется,
admin-alert возвращается на inline-путь в payment-service.

### ADR-016: GitHub Secret hygiene + COI metadata-diff buster (2026-05-05)

**Context.** Сегодняшний инцидент с `UNAUTHENTICATED` ошибкой Firebase
Recovery Push выявил **две независимые подводные мины** инфраструктуры,
каждая из которых маскировала другую и в сумме давала ~5-часовое
расследование. Документируем обе, чтобы не повторить.

#### Подводная мина A — порча `FIREBASE_SERVER_ACCOUNT_JSON` через chat-client autolink

**Симптом.** OAuth refresh для service account возвращает валидный
access_token (token len 976), но любой Google API call (FCM v1,
Cloud Resource Manager `testIamPermissions`) отвергает его с 401
`UNAUTHENTICATED`. Локальный файл `.secrets/firebase-server-account.json`
проходит все sanity-checks (`grep -c '\['` = 0, `jq` парсит без ошибок,
project_id/client_email/private_key_id совпадают с production'ом
коллеги).

**Корневая причина.** В контейнере `/run/secrets/firebase-server-account.json`
поля `client_email` и `token_uri` хранили **markdown-autolinked версии**
самих себя:
```json
"client_email": "[firebase-adminsdk-zd85u@…iam.gserviceaccount.com](mailto:firebase-adminsdk-zd85u@…iam.gserviceaccount.com)"
"token_uri":    "[https://oauth2.googleapis.com/token](https://oauth2.googleapis.com/token)"
```
Длины: `client_email` 135 вместо 62, `token_uri` 74 вместо 35. Google
JWT-валидация на token endpoint при таких значениях **проходит**
успешно (это удивило, но видимо `iss` он ищет fuzzy/lookup-by-key_id),
а вот валидация Bearer-токена на FCM endpoint — нет.

**Откуда взялась порча.** JSON был передан через мессенджер при пасте
в форму GitHub Secrets (Settings → Secrets → New repository secret).
Браузерный clipboard или промежуточный посредник auto-линкуют URL'ы и
email-адреса при копировании. На локальном диске JSON оставался
чистый, но в GitHub Secret уехала autolinked-версия — и оттуда в
`/run/secrets/...` через `--build-arg` в `payment-service/Dockerfile.prod`.

**Trap внутри trap'а:** даже корректный Python `print('client_email :', d['client_email'])`
вывод **снова** автолинкуется чат-клиентом при пасте сюда, поэтому
визуальная проверка через скопировать-вставить терминальный вывод
не работает. Доказательство порчи требует булевых тестов, которые
auto-link не подделывает: `len(client_email) == 62`,
`'](' in client_email`, `client_email.startswith('[')`, плюс
`hashlib.sha256(...).hexdigest()` с эталоном из локального файла.

**Defensive practice.**
- При обновлении многострочных / structured Secrets **никогда** не
  использовать GitHub web-форму с пастом из чата/мессенджера.
- Использовать `gh secret set NAME --body "$(jq -c . <file>)"` —
  GitHub API принимает значение как opaque bytes, никаких посредников.
- Для проверки — sha256-сравнение содержимого Secret'а с локальным
  файлом из контейнера: чистый файл должен дать тот же хеш, что и
  ожидаемый эталон, **независимо** от того, как в чате выводится сам
  email или URL.

#### Подводная мина B — yc-container-daemon metadata-diff reconciliation

**Симптом.** После исправления Secret'а через `gh secret set` (sha
поменялся, локальные проверки чисты) и нового `workflow_dispatch`
запуска `deploy-web.yml`, контейнер `transapp_payment_bot` на VM
**не пересоздаётся** — остаётся с старым (битым) baked-in JSON.
`docker ps` показывает CreatedAt от прошлого деплоя, тег образа
тот же.

**Корневая причина.** Yandex Cloud Container Optimized Image (COI)
управляется демоном `yc-container-daemon.service`, который сравнивает
**rendered docker-compose.yaml в VM-метаданных**, а **не digest
образа в Container Registry**. Если git SHA не менялся → image tag
тот же `:<SHA>-payment` → compose-файл байт-в-байт идентичный →
демон считает «текущая конфигурация = желаемая» и пропускает
reconciliation, даже если build-job только что перезалил тот же тег
с обновлённым содержимым (rotated build-arg, fresh base image, и т.п.).

**Documentation.** Это явно описано в Yandex Cloud docs для COI:
«container updates are driven by VM metadata changes, not by Docker's
native pull policy». Стандартный compose `pull_policy: always` COI
не уважает.

**Decision.** Добавляем уникальный per-run `BUILD_ID` в
`docker-compose.yc.yaml` через mustache-substitution из workflow env:

```yaml
# .github/workflows/deploy-web.yml
env:
  BUILD_ID: "${{ github.run_id }}-${{ github.run_attempt }}"

# yandex-cloud/docker-compose.yc.yaml
services:
  payment-bot:
    environment:
      BUILD_ID: "{{ env.BUILD_ID }}"
```

`BUILD_ID` приложением **не читается** — единственная его задача
сделать compose-файл уникальным каждый workflow-run, чтобы COI
metadata-diff всегда обнаруживал изменения и принудительно re-pull'ил
все образы в compose.

**Достаточно одной env var на одном сервисе.** Демон сравнивает
весь rendered compose целиком; одна изменившаяся строка триггерит
полное reconciliation всех 5 контейнеров. Минимально-инвазивно.

**Rationale (alternatives considered).**

1. **Empty commit при каждом manual deploy.** Разовый workaround
   (применили сегодня для unblock'а), но грязнит git history
   служебными `chore: bump` коммитами. Не масштабируется на
   reproducible-deploys через workflow_dispatch.
2. **Уникальный image tag с timestamp/run_id вместо git SHA.** Самый
   правильный долгосрочно (Yandex own actions так и делают), но
   ломает связь «коммит → образ» для traceability и требует
   пересмотра retention policy в Container Registry (мы держим
   образы по SHA, чтоб legko rollback'аться). Откладываем.
3. **Manual `docker rm -f` + надежда на reconciliation.** Хрупко
   и не работает через CI — нужен SSH к VM в каждом deploy.
4. **`docker compose pull` + `up -d --force-recreate` через SSH-step
   в workflow.** Дублирует работу yc-coi-deploy, требует SSH key
   distribution и обходит штатный механизм COI. Лишний код, лишние
   риски.

**Принятое решение (BUILD_ID-buster) — единственное изменение из
одной env-переменной + одной строки в compose, которое полностью
устраняет ловушку, не меняя ни image-tagging strategy, ни deploy
pipeline.**

**Implementation surface.**

| Layer | Files |
|---|---|
| Workflow env | `.github/workflows/deploy-web.yml` — `BUILD_ID: "${{ github.run_id }}-${{ github.run_attempt }}"` |
| Compose template | `yandex-cloud/docker-compose.yc.yaml` — `BUILD_ID: "{{ env.BUILD_ID }}"` в `payment-bot.environment` |
| Documentation | этот ADR + ссылки в commit-комментариях обоих файлов |

**Consequences.**

- Каждый `workflow_dispatch` запуск, даже на том же git SHA,
  гарантированно пересоздаёт все контейнеры и тянет свежие
  образы из registry. Это стоит ~30-60 секунд лишнего downtime
  на пересоздание (нормальный rolling-restart-цикл COI).
- Для типичного push-to-master deploy ничего не меняется (там и так
  git SHA уникальный, BUILD_ID просто добавляет ещё один источник
  diff'а).
- Исчезает класс ошибок «задеплоил, всё зелёное в Actions, но
  контейнер старый» — самая коварная категория, потому что
  отсутствие визуального сигнала о проблеме.

**Reverses if.** Yandex Cloud меняет архитектуру COI и начинает
сравнивать image digest вместо metadata-diff (не анонсировано),
либо мы переходим на уникальные image tag'и per run и `BUILD_ID`
становится избыточным.

---

### ADR-017: Direct DNS cutover для веб-стека `lk.transapp.ru` (2026-05-14)

**Status.** Implemented 2026-05-14.

**Context.** Веб-стек TransApp (Expo Web RN 0.81 / SDK 54 / TypeScript) с
2026-04-28 жил на staging-домене `transapp-dev.ru` (YC VM `81.26.191.68`,
`fv42gattub1fh05eaip5`). Production-домен `lk.transapp.ru` обслуживался
legacy React 19 веб-стеком на коллежем сервере `185.76.253.6` (зона
`transapp.ru` управляется через FastVPS panel, DNS-backend fastdns24).
Изначальный план (`.claude/plans/2026-05-06-lk-transapp-cutover.md`,
Draft 2026-05-06) предполагал soft cohabitation: legacy nginx делает 301
redirect на `transapp-dev.ru` (наш стек) для всех запросов без cookie
`ta_use_legacy=1`; на новом стеке появляется header-кнопка «Вернуться в
старый интерфейс», ставящая cookie через `/use-legacy` endpoint на
legacy; параллельно расширяется механизм `data-issues` категорией
`interface_feedback` для сбора жалоб через payment-bot в TG;
после стабилизации (несколько дней без жалоб) делается финальный DNS
swap.

**Decision.** Сделать **direct DNS swap** `lk.transapp.ru → 81.26.191.68`
без soft cohabitation. SAN cert (`transapp-dev.ru` + `lk.transapp.ru`),
A-record поменяли мы сами через FastVPS-кабинет (после переговоров с
Иваном получили доступ напрямую).

**Reasoning for deviation from original plan.**

1. **Иван согласился сразу отдать управление**. Изначальное допущение
   плана — что Иван будет осторожно админить legacy nginx с
   cookie-bypass'ом и потом гасить VM «по своему усмотрению». В реальности
   он сразу сказал «давайте я просто дам вам логин от FastVPS-кабинета».
   Это полностью убрало необходимость в:
   - тикете на cookie-based redirect на legacy nginx (D1 в плане);
   - тикете на DNS A-record swap (D2);
   - координационных окнах работ с Иваном.
2. **Без выделенной QA-команды soft cohabitation не оправдан**. Роль QA у
   нас — менеджеры с клиентами в реальной работе. Soft rollout даёт
   преимущество только если мы планируем активно ловить ранние жалобы и
   гибко переключать пользователей. Без выделенных тестировщиков и без
   feedback-pipeline'а инвестиция в header-кнопку + `interface_feedback`
   категорию + cookie-bypass не имеет смысла — мы всё равно ничего не
   стали бы с feedback'ом делать в реальном времени.
3. **Аудитория узкая**. `lk.transapp.ru` — внутренние коллеги +
   менеджеры с клиентами. TTL=3600s на `lk` — приемлемое rollback-окно
   (1 час). Нет миллионов анонимных пользователей, которым нужен
   плавный переход.
4. **Новый стек уже фактически тестировался**. С 2026-04-28 на
   `transapp-dev.ru` шла регулярная dogfood-работа (deploy'ев было
   несколько десятков, payment-service integration с Kazna, FCM push,
   sort-modes UX-итерации). Это уже был «soft rollout» — просто на
   другом домене. Cutover свёлся к смене URL'а, не к выводу нового
   функционала.

**Implementation steps (executed 2026-05-14, ~75 minutes total).**

1. **SAN cert в YC Certificate Manager** — новый cert
   `fpqhlo3n4968ul5jnosr` (Let's Encrypt R12, действует до 2026-08-12,
   SAN: `transapp-dev.ru` + `lk.transapp.ru`).
   - Перед заказом удалили старый CNAME `_acme-challenge.transapp-dev.ru`
     (от cert'а `fpqj50bofmtu8012f0k0`) — иначе YC не мог добавить новый
     validation CNAME (DNS не позволяет два CNAME на один лейбл).
   - Validation CNAME для `transapp-dev.ru` YC добавил автоматически в
     нашу YC DNS-зону.
   - Validation CNAME для `lk.transapp.ru` (`_acme-challenge.lk →
     fpqhlo3n4968ul5jnosr.cm.yandexcloud.net.`) добавлен вручную в зону
     `transapp.ru` через FastVPS UI.
2. **GitHub secret `YC_CERT_ID`** обновлён на новый ID; `deploy-web.yml`
   запущен через `workflow_dispatch` — nginx entrypoint при старте
   подтянул SAN-cert. **Изменений в коде не потребовалось** (`server_name
   _;` — catch-all; entrypoint.sh фетчит cert через YC API по
   `YC_CERT_ID`).
3. **Pre-swap smoke** через `curl --resolve lk.transapp.ru:443:81.26.191.68`:
   HTTPS 200, `subjectAltName: DNS:lk.transapp.ru, DNS:transapp-dev.ru`,
   payment-api `/calculate-commission` отвечает 201 с корректным JSON.
4. **Swap A-record** `lk.transapp.ru: 185.76.253.6 → 81.26.191.68` через
   FastVPS UI. Все 4 публичных resolver'а (dns.fastdns24.com / 8.8.8.8 /
   1.1.1.1 / 77.88.8.8) подхватили новый IP за <5 минут.

**Consequences.**

- Прямой контроль над DNS-записями `lk.transapp.ru` и
  `_acme-challenge.lk` — нет зависимости от Ивана для future cert
  renewal'ов и любых будущих изменений `lk.*`.
- Зависимость от FastVPS-кабинета (но не от Ивана как POC). Креды хранятся
  в нашем менеджере паролей.
- Legacy VM `185.76.253.6` продолжает работать (apex `transapp.ru` + `www`
  + `transapp.ru/api` backend всё ещё там) — Иван гасит её на своё
  усмотрение в будущем, не блокирует нас.
- **Никакого header-button'а и `interface_feedback` category** — этот код
  не написан и не нужен; план в части PR-A/PR-B закрыт без реализации.

**Observations / lessons.**

- **YC SAN cert validation** с external-DNS CNAME занял ~40 минут — а не
  «несколько минут», как обычно обещают доки. Это baseline для будущих
  cert-issuance операций (планировать с запасом).
- **Provider naming**: наш DNS-control-panel — **FastVPS** (`my.fastvps.ru`),
  не FastDNS24. FastDNS24 — DNS-backend под капотом FastVPS (whitelabel /
  reseller). До 2026-05-14 наши docs корректно отражали NS-серверы, но
  путали control-panel с provider'ом. Поправлено в `infra-deployment.md`.
- **No code changes**: вся cutover-операция свелась к secret update +
  workflow_dispatch + DNS-edit, без единого PR. Архитектурная заслуга
  существующей системы (`server_name _;` catch-all + entrypoint cert
  fetch by ID) — позволяет менять домены без redeploy'а кода.

**Reverses if.**

Критический баг обнаружится в первые часы после cutover'а → меняем
A-record `lk.transapp.ru → 185.76.253.6` обратно через FastVPS UI;
rollback-окно ограничено TTL=3600s. После 24 часов в production без
жалоб — rollback не предполагается, дальше fix-forward.

---

### ADR-018: Auto list sort modes — UI toggle + server-side sort migration (2026-05-14)

**Context.** ADR-? (not formal, PR #12 commit `cb4b97d` from 2026-04-29)
introduced client-side sorting of the vehicle list by the numeric
segment of the licence plate. The implementation re-sorts the merged
list every time a new page is appended via `loadMore()`. Backend
(legacy `/get-auto-list` on `ivan.trans-konsalt.ru`) paginates
lexicographically, so each new page makes the merged set re-shuffle
client-side — vehicles already visible can move position. This was
documented as a known limitation, deferred as «invisible at fleet
sizes < 100». Current data: max fleet is 150 vehicles (3 customers
>100, 12 in the 40–100 range), so the problem is at the boundary of
visibility for the largest customers. New domain `lk.transapp.ru`
(ADR-017) hasn't shipped yet — no real users have used the
plate-digit sort, regression-free window for fixing the behaviour.

**Decision.** Two-phase migration:

Phase 1 (frontend-only, this PR): introduce a user-facing segmented
control with the leading label «Сортировка по» and two genitive
options «алфавиту» / «номеру» in `AutoCountToolbar` (visible above
the list, not hidden behind a modal). Single shared component
`SortToggle.tsx` for both platforms — react-native-web maps the
Pressable segments to focusable `<div>`s with the right
`accessibilityRole="radio"` semantics. Two sort modes:

- `lexicographic` («алфавиту», **default**) — standard pagination
  (`limit=10`, `onEndReached`), server's lex order preserved, no
  client-side sort. Stable order because no client-side re-sort
  happens during pagination. Same behaviour the app had before the
  plate-digit experiment, so the first-paint cost is unchanged from
  the legacy baseline.
- `plate_digits` («номеру», opt-in) — fetch the entire fleet in one
  request (`auto_list_limit = 2000`, `auto_list_from = 0`),
  client-side sort by `compareByPlateNumber`, `loadMore` is a no-op.
  Stable order at any scroll position. Triggers the load-all info
  banner.

The selected mode persists in `AsyncStorage` (key `ta_sort_mode`),
globally per user (not per organisation). A dismissible info banner
explains the load-all behaviour and previews the upcoming server-side
sort improvement.

Phase 2 (when backend ships): add `sort_by: 'plate_digits' |
'lexicographic'` parameter to `/get-auto-list`, both modes revert to
standard pagination, the load-all branch and the info banner are
removed, client-side sort becomes a no-op safeguard (or is removed).

**Rationale.**

- Server-side sort is the architecturally correct long-term answer —
  it eliminates the conflict between pagination and ordering. But
  the legacy backend is a different team / different repo, release
  cadence is not on our schedule. Phase 1 must work without their
  cooperation.
- Load-all in `plate_digits` mode is the simplest strategy that
  fully solves the shuffle problem on the frontend. With current
  data (max 150 vehicles, ~80–200 KB response, ~1–2s on average
  networks) the cost is acceptable.
- A toggle (rather than silent default switch) gives users an
  escape hatch: anyone affected by the loading time of large
  fleets in `plate_digits` mode can switch to `lexicographic` and
  get instant paginated browsing. It also surfaces the existence of
  the sort modes — managers can validate the requested behaviour
  themselves.
- Default `lexicographic` (alphabet) so first-paint cost matches the
  legacy app — managers' requested «по номеру» sort is one tap away.
  Reasoning: making everyone pay the load-all cost (a ~150-vehicle
  payload on the largest current customer) on every cold start is
  not justified when only some users actively benefit from numeric
  ordering. The dismissible info banner also fires only when the
  user opts in, not at first login, so the experience is quieter by
  default.
- Considered alternatives:
  - Pure Variant A (just add `sort_by` to backend) — depends on
    other team, no Phase 1 frontend-only fix.
  - Pure Variant B (load all unconditionally) — same risk if fleets
    grow, and no escape hatch for users who prefer pagination.
  - Variant C (toggle without changing load strategy) — keeps the
    shuffle bug in `plate_digits` mode, just makes it «opt-in».
  - Variant D (cursor-based pagination) — much larger API redesign,
    not justified for current scale.

**Consequences.**

- Frontend now owns sort state and persistence. New `SortToggle`
  and `SortBanner` components, expanded `useAutoData` (sortMode +
  load-all branch + native AsyncStorage hydrate), expanded
  `AutoCountToolbar` (sort toggle props, responsive wrap).
- `plate_digits` first-paint is heavier than before (one big
  request instead of one 10-row request). Mitigation: limit `2000`
  is well above current max fleet size; if/when a customer exceeds
  ~1000 vehicles, Phase 2 must ship.
- The info banner adds visual noise in `plate_digits` mode for
  users who care to read it; the dismissal mechanism (persisted ✕)
  removes it from regular use. The banner is removed entirely in
  Phase 2.
- Coordination with backend team is a separate, non-blocking
  workstream. Phase 2 PR is mechanical once `sort_by` ships.
- Plan and full implementation map:
  `.claude/plans/2026-05-14-auto-list-sort-toggle.md`.
- Tests: 7 new cases in `src/hooks/__tests__/useAutoData.test.tsx`
  cover default mode, lexicographic mode behaviour, persistence,
  hydration, load-more no-op in `plate_digits`, lexicographic
  pagination, banner dismissal.

**Reverses if.** Backend's `sort_by` ships and is stable on
production data — at that point Phase 2 supersedes the load-all
branch (toggle UI and persisted choice stay). Reversal happens
through deletion of code, not rollback. If backend never ships
`sort_by` and customers exceed ~1000 vehicles, we need to add
background batch loading to `plate_digits` mode (Variant B2 in the
plan) — that's a refinement of Phase 1, not a full reversal.

---

### ADR-019: Trust server `auto_list_count` for filtered lists (2026-05-14)

**Context.** From the very first commit of `useAutoData.ts` (`73b82c8`,
February 2026) the count-update block carried a defensive special case:

```ts
const hasActiveFilters = Object.values(requestFilters).some(v => !!v);
if (hasActiveFilters && requestOffset === 0 && newItems.length < serverCount) {
  setAutoListCount(newItems.length);    // <-- overwrites server's filtered total
} else {
  setAutoListCount(serverCount);
}
```

No commit message or surrounding comment explained the rationale. The
ADR-018 follow-up section flagged the block as suspicious. A research
pass during that follow-up confirmed there is a real bug attached:

- User applies a filter (e.g. plate search `autoStr=А1`).
- Server returns the first 8 of 12 matching cars on page one
  (`auto_list_count = 12`, `newItems.length = 8`).
- `hasActiveFilters && requestOffset === 0 && 8 < 12` ⇒ the block
  overwrites `autoListCount` from `12` to `8`.
- `loadMore` then short-circuits on its `autoListLength >= autoListCount`
  guard (`8 >= 8`) — the remaining four matches are unreachable.

After ADR-018 Phase 1 the same block also became logically inconsistent
in `plate_digits` mode: it checks `requestOffset` instead of the
post-Phase-1 `effectiveOffset`. The bug is not user-visible there
because `loadMore` is already a no-op for that mode, but it is a code
smell that gets harder to reason about as the hook grows.

The legacy `/get-auto-list` backend on `ivan.trans-konsalt.ru` already
returns `auto_list_count` accounting for active filters (confirmed via
existing PR #16 probe + ADR-018 testing under MSW).

**Decision.** Drop the special case entirely. Always write
`setAutoListCount(data.auto_list_count || 0)`. Add a regression test
in `useAutoData.test.tsx` that mimics the partial-first-page scenario
and asserts `loadMore` reaches the full filtered total.

**Rationale.**

- The defensive branch was protecting against a backend bug that does
  not exist in the current contract. Removing it eliminates the real,
  reproducible loadMore-block bug (ADR-018 follow-up #1).
- Single source of truth for count: the server. If backend ever ships
  a wrong count, the right fix is in backend, not in frontend
  compensation that silently truncates user-visible data.
- Removes a code path that would need separate Phase 2 review
  (`requestOffset` vs `effectiveOffset` mismatch). After the deletion
  the count update is invariant to sort mode.
- Considered alternatives:
  - Keep the branch but switch `requestOffset` to `effectiveOffset` —
    addresses the Phase 1 inconsistency but leaves the original
    loadMore-block bug untouched.
  - Run a live probe against `/get-auto-list` before deciding —
    overkill; the regression test under MSW is enough, and any
    backend regression would surface during manual QA on staging.

**Consequences.**

- `useAutoData.ts` loses three lines of conditional logic and gains a
  short comment explaining the new invariant.
- One new MSW-backed test case (`filter with partial result on first
  page does not block loadMore`). useAutoData suite goes from 14 to
  15 tests, full project from 113 to 114.
- ADR-018 follow-up #1 closed; the plan file is updated to point at
  this ADR.
- No user-facing UI change in the happy path (counts looked correct
  whenever the bug didn't fire). The bug-affected scenario now
  shows the full filtered count and scrolls all the way through.

**Reverses if.** Backend regresses and stops accounting for filters in
`auto_list_count`. In that case, fix backend; if hard-blocked, restore
the defensive branch as a temporary mitigation and re-evaluate.

---

### ADR-020: Shared UserDataContext for web (2026-05-14)

**Context.** `/get-auto-list` was being fired twice in parallel on every
authenticated route open on web:

- `WebSidebar.loadData()` on mount / `pathname` change /
  `document.visibilitychange` / post-`switchOrg`.
- `useAutoData.updateUserDataOnly()` invoked from
  `AutoListScreen.web.useFocusEffect` on every route focus.

Both calls used `auto_list_limit: 0` and consumed the same shared
fields (`user_data`, `other_user_list`, `our_services_list`,
`auto_list_count`, `onboarding_expired`). Each component kept its own
`useState` copies, so even with both requests resolving, the two
surfaces could end up looking at slightly different snapshots. The
gap was already proven harmful by PR #16 (`user_auto_count` asymmetry
fix) — a fairly minor data-asymmetry bug that nonetheless reached
production because there was no single source of truth on web.

`AbortController` per-component mitigates *successive* triggers (a
later mount overrides an in-flight earlier mount) but never the *first*
parallel pair, where both components legitimately want fresh data at
the same time.

`dev-web.md:462-466` had already flagged the duplication explicitly:
"if it becomes a problem, lift `user_data` + `other_user_list` into a
React Context and have both components subscribe". This ADR follows
that recommendation.

**Decision.** Introduce `UserDataContext` (mounted by
`app/(authenticated)/_layout.web.tsx`, web-only) as the single source
of truth on web for the five shared fields. The Context owns:

- The snapshot state (`userData`, `otherUserList`, `autoListCount`,
  `ourServicesList`, `onboardingExpired`).
- `updateUserData()`: in-flight-deduplicated fetch of
  `/get-auto-list?auto_list_limit=0`. Concurrent callers (sidebar
  mount + screen focus, sidebar visibility-change while screen still
  loading, etc.) share one `Promise` and one HTTP request.
- `syncFromAutoList(data)`: lets `useAutoData` push a freshly-fetched
  full response into the shared snapshot without a second request.
- `optimisticOrgSwap(targetInn)`: encapsulates the `switchOrg`
  swap/demote logic that used to live inline in `WebSidebar`.
- `setUserData(updater)`: functional update so consumers (e.g.
  notification-badge decrement) can patch a single field without a
  re-fetch.

`WebSidebar` reads exclusively from Context and no longer owns
fetching / state for shared fields (its own `loadData()` + state +
`AbortController` are removed). `AutoListScreen.web` adds a
`useUserData()` call and routes its `useFocusEffect` refresh through
`context.updateUserData()`.

`useAutoData` is Context-aware via `useOptionalUserData()`:

- A reflection `useEffect` mirrors Context → local state for the five
  shared fields so existing consumers reading `autoListHook.userData`
  / `.otherUserList` / `.autoListCount` keep working unchanged.
- On every fetch path (`fetchAutoList`, `clearFilters` cache-restore,
  `setFilterValue` cache-restore) it also publishes the response into
  Context via `syncFromAutoList(...)` — both surfaces see the same
  snapshot.
- `updateUserDataOnly()` on web delegates to `context.updateUserData()`
  so older call sites that still invoke it (via `autoListHook`) do not
  produce a duplicate request.
- `decrementNotificationCount()` routes through `context.setUserData`
  so the sidebar's badge decreases the moment the screen marks
  notifications as viewed.

On native (no `UserDataProvider`), `useOptionalUserData()` returns
`null` and every branch falls back to its original local-state
behaviour. **Existing useAutoData tests pass unchanged** because
`renderHook(() => useAutoData())` under `jest-rn-stub` runs the
native path.

**Rationale.**

- Single source of truth on web — drift between sidebar and screen is
  constructively impossible: every write originates either from the
  Provider's own fetch or from a single response object pushed through
  `syncFromAutoList`.
- Dedup is centralised; we don't need each component to invent its
  own AbortController dance.
- Provider-only-on-web preserves native behaviour bit-for-bit. The
  same hook (`useAutoData`) works on both platforms — no parallel
  implementations.
- Reflection mirror keeps the public `autoListHook.*` surface stable
  so `AutoListScreen.web` (and any future web consumer of
  `useAutoList`) doesn't need to learn about the Context to read user
  data. The Context is the truth, the mirror is read-only.
- Considered alternatives (variant labels from research):
  - **Variant A (full Context over useAutoData)**: rejected — would
    globalise screen-local state (`autoList`, `filters`, `sortMode`)
    and risk regressing native behaviour.
  - **Variant C (request-level dedup without Context)**: rejected —
    fixes duplicate requests but leaves the two components with
    independent state copies, the drift surface that caused PR #16.
  - **Variant D (React Query / SWR)**: rejected — new dependency,
    learning curve, large refactor of `useAutoData`. Unjustified for
    this single deduplication need.

**Consequences.**

- One in-flight `/get-auto-list` with `auto_list_limit: 0` at any
  given moment on web. `WebSidebar` and `AutoListScreen.web` see the
  same `userData / otherUserList / autoListCount /
  ourServicesList / onboardingExpired` at any moment.
- `autoListCount` is now normalised to `number` (backend ships as
  string `"14"`) at one point — `UserDataContext.syncFromAutoList`
  on web and at the assignment site on native. Eliminates ad-hoc
  `Number(...)` coercion at every read site. `useAutoData` tests
  updated (`'3'` → `3`, `'12'` → `12`) to match.
- `UserData` type in `src/types/auto.ts` gains
  `tech_support_data?: ManagerData` (was only on WebSidebar's local
  interface, now lifted to the global type so Context can carry it).
- WebSidebar loses ~110 LOC (local state, `loadData`, abort ref, three
  triggers' effects, inline optimistic swap), gains ~25 LOC for the
  Context wiring and the refresh trigger.
- New tests: `src/contexts/__tests__/UserDataContext.test.tsx`
  (11 cases) covering initial state, fetch + dedup, partial sync,
  optimistic swap, throw outside Provider, value inside Provider,
  number coercion.
- Plan file: `.claude/plans/2026-05-14-user-data-context.md`.
- ADR-018 follow-up #2 (`/get-auto-list` duplication between sidebar
  and screen) is closed by this ADR.

**Reverses if.** A future requirement makes the shared snapshot
contention-prone (e.g. cross-tab broadcast invalidation, large frequent
updates) and React Context's re-render granularity becomes a
bottleneck. At that point migrating to a per-field subscription
mechanism (`use-context-selector` or React Query) is the natural next
step. Full revert is possible by reintroducing local state in
`WebSidebar` and the `loadData()` it owned — `useAutoData` on web
would silently fall back to its own state because the reflection
effect is a no-op when `userDataCtx` is null.

### ADR-021: Keep `.idea/TransApp_upd.iml` tracked in git (revert ADR-less #41) (2026-05-15)

**Context.** Commit `4323c2d` (chore PR #41, 2026-05-14) added
`.idea/*.iml` to `.gitignore` and `git rm`-ed `.idea/TransApp_upd.iml`
to silence the per-open working-tree diff that IntelliJ/RubyMine
produces (absolute paths, JDK markers, version stamps rewrite the
file every time the project opens). The PR description assumed
"Developers retain the file locally; git just stops noticing it" —
which is true only for the machine that authored the commit.

On the next pull on a different workstation `.idea/TransApp_upd.iml`
disappeared from the working tree (or was never created — fresh clones
hit the same problem). `.idea/modules.xml` still references the file:

```xml
<module fileurl="file://$PROJECT_DIR$/.idea/TransApp_upd.iml"
        filepath="$PROJECT_DIR$/.idea/TransApp_upd.iml" />
```

When IntelliJ resolved the module pointer to a non-existent file it
loaded **zero modules**. The Project tool window therefore showed only
global nodes (`External Libraries`, `Scratches and Consoles`) and the
content root tree disappeared completely — the IDE was effectively
unusable for navigation.

**Decision.** Revert `4323c2d` in full (`git revert 4323c2d`). The
`.iml` returns to git tracking; `.idea/*.iml` is removed from
`.gitignore`. `.idea/modules.xml` keeps its existing pointer — no
rewrite needed.

**Rationale.**

- A broken Project view on every fresh clone / new dev workstation is
  a much higher cost than the cosmetic per-open diff PR #41 was trying
  to silence.
- The `.iml` baseline we now ship is intentionally minimal (`<module
  type="JAVA_MODULE">` with a single `content url="file://$MODULE_DIR$"`
  and `inheritedJdk`). IntelliJ rewrites it on first open with the
  developer's local JDK / module type, but the rewritten variants are
  functionally equivalent and IntelliJ does not re-prompt for a
  module on next open — the project structure survives.
- `modules.xml` is already tracked, so any "module structure" changes
  worth sharing across the team go there, not into `.iml`. Tracking
  `.iml` is the price of having `modules.xml` work at all on a fresh
  checkout.
- Considered alternatives:
  - **Variant A (keep `.iml` ignored, add a setup step that creates
    a stub on clone)**: rejected — every new dev would have to read
    setup docs before opening the project; first-open experience is
    "broken Project view" until they do.
  - **Variant B (drop the JetBrains module entirely, rely on
    "directory project" mode without `.iml`)**: rejected — requires
    deleting `modules.xml` and `misc.xml` references too, and loses
    excludeFolder/JDK config that IntelliJ honours.
  - **Variant C (keep PR #41, mitigate per-machine noise via `git
    update-index --skip-worktree .idea/TransApp_upd.iml`)**: this is
    available **on top of** ADR-021 for any developer who wants it —
    purely local, no repo change. Documented as the recommended
    individual workflow in `setup-mac-m2.md`.

**Consequences.**

- Fresh clones / new workstations get a working Project view out of
  the box. IntelliJ loads the module from `modules.xml` → `.iml`
  successfully on first open.
- The per-open diff on `.iml` returns. Developers who find it
  distracting can run locally:

  ```sh
  git update-index --skip-worktree .idea/TransApp_upd.iml
  ```

  which makes git ignore changes to the file in their checkout
  without affecting the repo. (`--no-skip-worktree` reverses it if
  needed for an intentional update.)
- This ADR explicitly documents the trade-off so the next person
  thinking "the `.iml` diff is annoying, let me ignore it" finds the
  history first and understands why the obvious fix was reverted.

**Reverses if.** A future IntelliJ/RubyMine version stops rewriting
`.iml` on open (the per-machine drift goes away naturally), or the
project migrates to a non-JetBrains-aware build setup that no longer
needs `.iml`. At that point the `.gitignore` line can be reintroduced
safely **and** `modules.xml` updated/removed in the same commit — the
two files are coupled and must move together.

---

### ADR-022: Centralize RNIS check-response interpretation in `src/utils/rnisStatus.ts` (2026-05-18)

**Context.** `/get-auto-check-rnis` returns `registrationOk`,
`telematicsOk`, `telematics_date` as **strings** (`'1'`, `'0'`,
`'2026-05-16 15:52:39'`). Two frontend surfaces displayed this data:
`src/screens/auto/web/RnisTab.tsx` (web detail tab) and the inline
RNIS block in `src/screens/auto/AutoDetailScreen.tsx` (mobile).

Both were ported from the legacy web (`transappweb/src/Auto.js`) but
accumulated two independent regressions:

1. **Strict equality against numbers** — `!== 1`, `=== 0` — which
   never holds when backend returns strings. The web tab always showed
   «Данные о регистрации в РНИС не найдены» for registered vehicles
   and «Телематика передается» for stale transmissions.
2. **Lost three-way telematics branch** — legacy distinguished
   `telematicsOk='0' + date!='0'` (stale, >24 h) from
   `telematicsOk='0' + date='0'` (never transmitted) and rendered the
   phrase «последняя передача телематики более суток назад». Both
   ported screens collapsed this to a binary «не поступали / передаётся».

**Decision.** Extract a pure function `getRnisStatus(data)` →
`RnisStatus | null` in `src/utils/rnisStatus.ts`. It normalizes
backend field types via `String()` coercion (handles both `'1'` and
`1`) and implements the three-way telematics logic from legacy.
Both `RnisTab.tsx` and `AutoDetailScreen.tsx` call this helper; JSX
rendering stays local to each screen.

Telematics block is rendered **only when `registered === true`**,
matching legacy behaviour.

**Consequences.**

- Single source of truth for RNIS field interpretation; future screens
  (or type drift on backend) need only update `rnisStatus.ts`.
- 13 unit tests cover all input variants including number/string
  coercion edge cases (`src/utils/__tests__/rnisStatus.test.ts`).
- Web detail tab: registration and telematics now match the list-card
  phrasing assembled by the backend.
- Mobile detail tab: gains the «более суток назад» stale-telematics
  branch previously missing.
- ESLint `eqeqeq` warnings in `rnisStatus.ts`: none — all comparisons
  use `String()` coercion before strict equality.

**Does not affect.** `src/components/inn/RnisResultCard.tsx` (uses
`/check-rnis` response with a different field shape: `rnis_status`,
`rnis_owner`, etc.).


### ADR-023: Resilient bootstrap for `/get-auto-list` — decoupled chrome, classified loadError, per-request 60 s timeout, persisted userData (2026-05-20)

**Context.** A live customer reported: «Список авто пуст» on the
main screen while the database held five vehicles. The filter button
in the header and the left-menu (hamburger → `LeftMenuModal`) were
**also missing**. Pull-to-refresh, app reinstall, phone reboot did
not help. On web DevTools the failing call was
`POST /get-auto-list` with `AxiosError: timeout of 30000ms exceeded`;
`UserDataContext.updateUserData` timed out symmetrically. After one
request eventually "broke through" on the backend, the screen
recovered simultaneously on mobile and web — the classic
cold/heavy-query symptom on the upstream service (which is owned by
an external developer and not directly diagnosable from this
repository).

The backend problem is one half of the story. The other half was on
the client: a short outage on a hot endpoint left users in an
unrecoverable state because the screen design assumed the endpoint
would always return usable data. Four coupled failures made the
incident unbreakable:

1. `src/screens/auto/AutoListScreen.tsx:71` and `:216` rendered the
   entire chrome (drawer toggle, filter button, notifications, debt
   indicator, bottom menu) under one gate
   `!!(userData && userData.firm)`. Any failure of `/get-auto-list`
   left `userData.firm === ''` (initial state from
   `src/hooks/useAutoData.ts:96`) and the chrome disappeared.
2. `useAutoData.ts:383-396` silently swallowed every non-401 error.
   The screen showed «Список авто пуст» with no signal that anything
   failed and no retry control. Logout (only reachable through the
   drawer, which had just disappeared) was inaccessible.
3. Global axios `timeout: 30000` is too short for the heavy cold
   call on accounts with non-trivial joins.
4. `userData` is not persisted — every cold start depends on a
   fresh response.

The brief was: do what is possible on the client, as professionally
as possible, without scope creep and without auto-retry.

**Decision.** Five surgical client-side changes:

1. **Decouple chrome from data.** Remove the `userData.firm` gate
   from header and bottom menu in `AutoListScreen.tsx`. Chrome is
   rendered while the user is authenticated; data-dependent inner
   elements stay condition-rendered on their own fields and degrade
   to empty when not yet populated. Web parity preserved — its
   chrome lives in `WebAppLayout`/`WebSidebar` and was never gated
   on `firm`.

2. **`loadError` state + classification helper.** New
   `src/utils/loadError.ts` exports `LoadErrorKind` (`'timeout' |
   'network' | 'server' | 'unknown'`) and `classifyLoadError(error)`.
   `useAutoData` and `UserDataContext` both expose a `loadError`
   field; catch blocks set it, success paths clear it, the
   `refreshData` retry path clears it synchronously before the new
   fetch fires (responsive retry). 401 is intentionally not
   classified here — the axios interceptor handles it.

3. **`AutoListLoadError` component.** Sibling to
   `AutoListEmptyState`. Russian subtitle keyed by `kind`,
   "Попробовать ещё раз" button. Plumbed into the
   `ListEmptyComponent` slot of both `AutoListScreen.tsx` and
   `AutoListScreen.web.tsx` with the resolution order: in-flight →
   spinner; loadError → AutoListLoadError; otherwise the genuine
   empty state.

4. **Per-request `timeout: 60000` for `/get-auto-list`.** Applied at
   the three call sites — `useAutoData.fetchAutoList`,
   `useAutoData.updateUserDataOnly`, `UserDataContext.updateUserData`
   — via `api.post(..., { signal, timeout: 60000 })`. Global 30 s
   stays in place for other endpoints. No automatic retry is
   layered on: the upstream service is already the bottleneck, and
   an auto-retry storm would make it worse. The manual retry button
   on `AutoListLoadError` is the right primitive.

5. **Persisted `userData` snapshot.** New `src/utils/userDataCache.ts`
   reads/writes/clears `ta_user_data_cache_v1` against AsyncStorage
   (which transparently uses localStorage on web). One owner per
   platform avoids double writes: native — `useAutoData` writes on
   success and restores on mount when no Context is present; web —
   `UserDataContext.syncFromAutoList` writes and the Provider
   restores on mount. Restore is guarded by
   `setUserData(prev => prev.firm ? prev : cached)` so a fresh
   response that races ahead of storage read is never overwritten.
   Logout (`useUserProfile.logout` and `deleteProfile`) calls
   `clearCachedUserData()`.

**Alternatives considered.**

- *Auto-retry with exponential backoff on the failed call.* Rejected.
  The upstream service is the bottleneck on these incidents — a
  client-driven retry storm worsens the actual cause. A manual retry
  button restores agency to the user without amplifying server load.
- *Move `UserDataContext` to mobile (full ADR-020 generalization).*
  Out of scope for a hotfix; the local-state path in `useAutoData`
  already works on native, and the persistence layer is the smaller
  delta that achieves the cold-start chrome goal.
- *Show last list from a separate cache when fetch fails.* Rejected:
  stale list items can mislead about pass / fine / OSAGO state. The
  chrome (drawer, filter, count) is safe to surface from cache; the
  list itself stays under freshness guarantee — when the call fails
  the user sees an explicit error UI, not silently-stale rows.
- *Bump the global axios timeout to 60 s.* Rejected — other endpoints
  do not need that latitude and a longer global timeout makes
  unrelated calls feel worse on legitimate failures. A per-request
  override is the right granularity.

**Consequences.**

- The screen survives a slow or failed `/get-auto-list`: the user
  has working navigation, can read previously-cached company info,
  can retry, and can logout via the drawer.
- The retry button hits the same `refreshData` codepath as
  pull-to-refresh — no new retry channel to keep in sync.
- An extra AsyncStorage read on hook mount (web Provider, native
  `useAutoData`). One async call, no UI thread block.
- A new persistence key (`ta_user_data_cache_v1`) to keep in mind for
  schema changes. Versioned suffix makes future invalidation easy.
- 10 new tests (6 in `useAutoData.test.tsx`, 4 in
  `UserDataContext.test.tsx`) cover error classification, recovery,
  restore, persist, and the responsive-retry guarantee.
- The backend root cause is *not* addressed. A separate task to
  request the upstream owner to diagnose the heavy query for the
  affected account remains open. Further client-side improvements
  beyond this are bounded.

**Files.** `src/utils/loadError.ts`,
`src/utils/userDataCache.ts`,
`src/components/auto/AutoListLoadError.tsx`,
`src/hooks/useAutoData.ts`,
`src/contexts/UserDataContext.tsx`,
`src/hooks/useUserProfile.ts`,
`src/screens/auto/AutoListScreen.tsx`,
`src/screens/auto/AutoListScreen.web.tsx`,
`src/hooks/__tests__/useAutoData.test.tsx`,
`src/contexts/__tests__/UserDataContext.test.tsx`.

**Plan reference.**
`.claude/plans/2026-05-20-auto-list-resilient-bootstrap.md`.


### ADR-024: Eliminate double `/get-auto-list` on mount; native parity for timeout classification; per-request timeout 90s; debug logs under `__DEV__` (2026-05-20)

**Context.** Follow-up to ADR-023 driven by evidence from real
device logs (`adb logcat`) captured after debug interceptor
instrumentation was added. Four concrete client-side defects
showed up that were amplifying the underlying backend slowness on
cold `/get-auto-list`:

1. **Double parallel `/get-auto-list` on every AutoListScreen mount.**
   `useFocusEffect` → `autoListHook.updateUserData()` →
   `useAutoData.updateUserDataOnly()` issues one
   `POST /get-auto-list` (`limit=0`, abort controller A). In parallel
   `useEffect([])` → `autoListHook.loadData()` →
   `useAutoData.fetchAutoList()` issues a second
   `POST /get-auto-list` (`limit=10`, abort controller B). Both
   abort controllers are independent — neither aborts the other —
   so two heavy queries land on the backend for the same user_id
   simultaneously and contend for the same DB lock. The symptom is
   symmetric on web (`AutoListScreen.web` + `userDataCtx.updateUserData`
   + `loadData`); ADR-020 only deduplicated the WebSidebar ↔ screen
   `updateUserData` path, not the loadData path.
2. **Native axios reports timeouts as `ERR_NETWORK`**, not
   `ECONNABORTED`. Web emits `ECONNABORTED` with a `'timeout of
   …ms exceeded'` message that the ADR-023 `classifyLoadError`
   pattern-matches; native emits the same shape as offline / DNS
   failure. Real timeouts on native were therefore misclassified
   as `network`, and AutoListLoadError showed «Проверьте подключение
   к интернету» despite working connectivity.
3. **60-second per-request timeout was too tight.** A real prod
   cold-call observed in the logs took 21,056 ms; subsequent calls
   dropped to ~3 s. The 60 s ceiling (ADR-023) was occasionally
   cutting off responses that the backend was about to deliver.
4. **Debug interceptor logs (`⬆️ ⬇️ ✗`)** were added globally
   without a `__DEV__` guard. Useful in dev/staging, but they
   would spam production logs in a release build.

**Decision.** Five surgical client-side fixes; no backend changes.

1. **First-focus skip in AutoListScreen** (both native and web).
   `firstFocusRef = useRef(true)` flips to `false` on the very
   first focus pass. While `true`, `updateUserData()` is **not**
   called from `useFocusEffect` — `loadData()` from `useEffect([])`
   already covers the userData refresh via the success path of
   `fetchAutoList`. On subsequent focuses (user returned from
   another screen) `loadData` doesn't re-run, so we want the
   lightweight `updateUserData()` (`limit=0`) for refreshing
   profile/notifications/onboarding — that path stays.

2. **Module-level in-flight Promise dedup for `updateUserDataOnly`
   on native.** `let _inFlightUpdateUserData: Promise<void> | null
   = null` at module scope in `useAutoData.ts`. When a concurrent
   caller arrives while the request is in flight, it gets the
   existing Promise instead of starting a parallel
   `POST /get-auto-list`. Mirrors web `UserDataContext.inFlightRef`
   (ADR-020). Module scope (not `useRef`) because hook
   unmount/remount must not lose the guard — same lifecycle rule
   as the neighbouring `_onboardingRedirectDone` and
   `_announceShown` flags.

3. **`GET_AUTO_LIST_TIMEOUT_MS` 60000 → 90000** at both call sites
   (`useAutoData.ts`, `UserDataContext.tsx`). Per-request override;
   global axios timeout for everything else remains 30 s. 90 s is
   chosen to comfortably cover the observed 21 s cold-call plus
   mobile-network jitter, without enabling auto-retry pressure on
   the backend.

4. **`classifyLoadError` accepts `{ durationMs, timeoutMs }`** and
   reclassifies an `ERR_NETWORK` whose duration reached ≥ 90 % of
   the configured timeout as `'timeout'`. Also handles `ETIMEDOUT`
   explicitly. Call sites read `error.config?.metadata?.t0`
   (stamped by the axios request interceptor) to compute
   `durationMs`. Without this hint the result falls back to
   `'network'` (the safe default for unknown duration).

5. **Debug interceptor logs gated to `__DEV__`** in both
   `src/services/api.ts` and `src/services/api.web.ts`. The
   `metadata.t0` stamp itself is still applied unconditionally —
   `classifyLoadError` depends on it. Only the `console.log`
   lines are gated. In release builds the strings disappear at
   the bundler level; in dev/staging the rich timing trace
   remains for future incidents.

**Alternatives considered.**

- *Cross-call dedup between `fetchAutoList` and `updateUserDataOnly`*
  (when the heavy request is in flight, the lightweight one waits
  for its result and pulls `user_data` from it). Architecturally
  preferable and would shave another request in the «route focus +
  filter change» scenario, but requires careful AbortController
  coordination and state-update ordering. Risk of subtle
  regressions outweighs the marginal benefit on the path to the
  upcoming backend rewrite. Kept as a follow-up task in
  `.claude/tasks.md`.
- *Drop `updateUserDataOnly` entirely and always refresh via
  `fetchAutoList`.* Rejected — would replace a small `limit=0`
  call with a large `limit=10` (or 2000) call on every focus,
  more bandwidth and more backend work for no UX gain.
- *Lift `GET_AUTO_LIST_TIMEOUT_MS` further (120 s, 180 s).*
  Rejected — 90 s already gives a 4× safety margin over the
  observed cold-call. Going higher just delays the manual retry
  prompt without changing the win/lose balance.
- *Keep debug logs unconditional.* Rejected — production noise
  is a real concern when SDKs or Sentry start ingesting them.
  `__DEV__` is a free, zero-cost gate.

**Consequences.**

- One `POST /get-auto-list` per AutoListScreen mount instead of
  two. Backend lock contention for the same user_id is halved on
  the cold path.
- AutoListLoadError on native now correctly says «Сервер отвечает
  дольше обычного» instead of «Проверьте подключение к
  интернету» when the backend is the cause.
- Cold-call wins (≤ 90 s) now succeed instead of being cut off
  at 60 s.
- 12 new unit tests in `src/utils/__tests__/loadError.test.ts`
  cover the new classification matrix; one new test in
  `useAutoData.test.tsx` mirrors the existing
  `UserDataContext.test.tsx:85-108` dedup test for the native
  path.
- The backend root cause (~21 s cold aggregate query for
  authenticated `/get-auto-list`) is **still not addressed** on
  the client — it can't be. A follow-up task to the backend
  owner remains; full rewrite from perl to a modern stack is
  expected eventually.

**Files.** `src/hooks/useAutoData.ts`,
`src/contexts/UserDataContext.tsx`,
`src/utils/loadError.ts`,
`src/screens/auto/AutoListScreen.tsx`,
`src/screens/auto/AutoListScreen.web.tsx`,
`src/services/api.ts`,
`src/services/api.web.ts`,
`src/utils/__tests__/loadError.test.ts` (new),
`src/hooks/__tests__/useAutoData.test.tsx`.

**Plan reference.**
`.claude/plans/2026-05-20-auto-list-native-parity.md`.


### ADR-025: nginx `/api/` proxy targets prod-apex (`transapp.ru`), not staging (`ivan.trans-konsalt.ru`) (2026-05-20)

**Context.** ADR-017 cutover (2026-05-14) moved `lk.transapp.ru` from
Ivan's legacy VM (185.76.253.6) onto our Yandex Cloud VM
(81.26.191.68). Web frontend now lives on our box; `/api/*` is
proxied to Ivan's perl backend via nginx.

After ADR-023/024 client-side hardening, monitor probes
(`~/transapp-monitor/probe.sh` — 15 s interval, three entry points,
valid token, 60+ data points) and on-demand `curl` comparisons
revealed:

- `transapp.ru` direct (185.76.253.6, mobile target) — mean 4.62 s,
  max 6.07 s, one mild spike out of 46 probes.
- `lk.transapp.ru` via our nginx — mean 5.46 s, max 19.75 s,
  multiple spikes.
- `ivan.trans-konsalt.ru` direct (185.76.253.4, web-dev target) —
  mean 5.90 s, max 25.51 s.

Three signals pinpointed the root cause:

1. **Response-size delta.** `transapp.ru` returns 36 662 bytes;
   `lk.transapp.ru` and `ivan.trans-konsalt.ru` both return 36 646
   bytes. A stable 16-byte delta = different vhost on Ivan's side
   (URLs / env strings baked into the response differ between
   prod-apex and staging).
2. **Forced-IP test.** With `--resolve transapp.ru:443:185.76.253.4`
   the staging machine still returns the **36 662-byte** payload.
   Routing on Ivan's side is by `Host` header, not by physical IP.
3. **`nginx.prod.conf`** explicitly set `proxy_pass
   https://ivan.trans-konsalt.ru/api/;` and `proxy_set_header Host
   ivan.trans-konsalt.ru;` (pre-fix). Every prod web user since
   2026-05-14 has been hitting the **staging vhost** of Ivan's
   backend — smaller cache, longer cold-call, larger spikes. Mobile
   was unaffected because it connects to `transapp.ru` direct.

The original `proxy_pass` target was almost certainly a leftover
from the dev configuration (`src/services/api.web.ts:9-13` uses
`https://ivan.trans-konsalt.ru/api/` for `localhost` web-dev),
copied into the prod nginx config during cutover without
substituting the prod hostname.

**Decision.** Re-target the `/api/` proxy at the production apex
vhost and, while we're in this block, enable upstream keepalive to
remove a redundant TLS handshake on every request:

```nginx
upstream main_api {
    server transapp.ru:443;
    keepalive 16;
}

location /api/ {
    proxy_pass https://main_api/api/;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_ssl_server_name on;
    proxy_ssl_name transapp.ru;
    proxy_set_header Host transapp.ru;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 120s;
    proxy_connect_timeout 10s;
}
```

Three behaviour-affecting fields:
- `proxy_pass` and `proxy_set_header Host` now name the prod-apex
  vhost — web-prod traffic finally lands on the same backend the
  mobile app uses.
- `proxy_http_version 1.1` + empty `Connection` header activate the
  `keepalive 16` pool. Without these two lines the upstream block
  is just a name-binding — nginx would still fall back to one TLS
  handshake per request.
- `proxy_ssl_name transapp.ru` ensures the SNI sent during the
  upstream TLS handshake matches the prod vhost certificate.

**Alternatives considered.**

- *Hard-coded IP in `proxy_pass`* (`https://185.76.253.6/api/`).
  Rejected — Ivan's apex IP can rotate (rare, but possible); a
  hostname plus SNI keeps the dependency declarative.
- *Keep `proxy_pass ivan.trans-konsalt.ru` and just change `Host`
  to `transapp.ru`*. Would also work — Ivan's routing is by Host
  header — but leaves a confusingly-named upstream and uses the
  staging IP for the network path. Worse for clarity, no
  performance benefit.
- *Disable proxy entirely; serve the API from our payment-service*.
  Out of scope — the perl backend is still the source of truth
  until the rewrite. Documented as a future task.

**Consequences.**

- Web-prod users (and the monitor's `lk.transapp.ru` probe) now hit
  the same prod-apex backend as mobile. Expected effect on probe:
  `lk.transapp.ru` `size_download` aligns with `transapp.ru`
  (36 662 bytes), mean TTFB drops to ~4.5–5 s, p95 stops being
  dominated by staging-only spikes.
- Upstream TLS handshake is amortised across requests via the
  keepalive pool — additional ~300–500 ms saved per request under
  load.
- Mobile traffic is not affected (still direct to `transapp.ru`).
- No backend change, no Ivan involvement required.
- Standing tasks for the backend rewrite
  (`#waiting/external-dependency`) remain — this ADR does not
  address Ivan's perl handler cold-call itself.

**Verification.**

- nginx config syntax sanity-checked manually (Docker daemon was
  not running during the patch). Run `docker run --rm -v
  ./nginx/nginx.prod.conf:/etc/nginx/nginx.conf:ro -v
  ./nginx/security-headers.partial.conf:/etc/nginx/security-headers.partial.conf:ro
  nginx:alpine nginx -t` before merge if Docker is available.
- Post-deploy:
  ```bash
  curl -s -o /dev/null -w 'size=%{size_download} ip=%{remote_ip}\n' \
    -X POST https://lk.transapp.ru/api/get-auto-list \
    -H 'Content-Type: application/x-www-form-urlencoded' \
    --data-urlencode 'token=<VALID_TOKEN>' \
    --data 'auto_list_limit=0'
  ```
  Expect `size=36662` (prod-apex), not `size=36646` (staging).
- Monitor (`~/transapp-monitor/probe.sh`) — let the post-deploy
  rollup accumulate ≥ 30 minutes, then run
  `~/transapp-monitor/summary.sh --since 1h`. `lk.transapp.ru`
  spike count and mean TTFB should drop noticeably.

**Deploy notes.** Production deploy runs via
`.github/workflows/deploy-web.yml` (workflow_dispatch). Trigger
manually after PR merge. `BUILD_ID` busts the YC COI metadata
cache so the new nginx container is actually picked up by
`yc-container-daemon`.

**Files.** `nginx/nginx.prod.conf`.

> **Post-implementation note (2026-05-25, see ADR-026).** The patch
> above was applied to `nginx/nginx.prod.conf`, but that file is the
> **HTTP fallback** only — production runs the heredoc-rendered config
> from `nginx/docker/entrypoint.sh`, which still pointed at
> `ivan.trans-konsalt.ru`. ADR-025's behavioural goal was therefore
> **not** achieved at the 2026-05-20 deploy; verified by `docker exec
> <nginx> nginx -T`. The fix is moved to the correct location in
> ADR-026.

### ADR-026: Move ADR-025 fix into `entrypoint.sh` (the real production nginx config); sync `nginx.prod.conf` as anti-drift; mark both authoritative/fallback (2026-05-25)

**Context.** ADR-025 was deployed on 2026-05-25 via
`.github/workflows/deploy-web.yml` (workflow_dispatch). The deploy
itself succeeded — image SHA in the running `transapp_nginx`
container matched master HEAD `c7f2c05`, and the COI metadata-diff
buster (`BUILD_ID`, ADR-016) forced container recreation
(`docker ps --format ... → 26 minutes`). Despite this, post-deploy
verification showed the fix had **no effect**:

- `curl https://lk.transapp.ru/api/get-auto-list → size=130887`
- `curl https://transapp.ru/api/get-auto-list   → size=130931`
- The 44-byte delta is not noise: `diff <(jq . lk.json) <(jq . direct.json)`
  showed 22 occurrences of `check_diagnostic_card_date_to_left`
  serialised as **integer** through `lk` and as **string** through
  `transapp.ru` direct (`166` vs `"166"`). Same key, same row,
  different type → two **different backend instances**.
- `ssh deploy@81.26.191.68 'docker exec <nginx> nginx -T | grep -A3
  "location /api/"'` returned `proxy_pass
  https://ivan.trans-konsalt.ru/api/;` — i.e. the staging vhost was
  still active, ADR-025's `upstream main_api` block was not even
  loaded.

Root cause: `nginx/docker/entrypoint.sh` at startup, whenever
`YC_CERT_ID` is set (always-true in production), runs a
`cat > /etc/nginx/nginx.conf <<'NGINX_CONF' ... NGINX_CONF`
heredoc that **overwrites** whatever the Dockerfile copied. The
`location /api/` block inside that heredoc was the dev-config
leftover; `nginx/nginx.prod.conf` (the file ADR-025 patched) is only
used as an HTTP fallback when `YC_CERT_ID` is empty — which never
happens in production. `Dockerfile.prod:71` comments this explicitly
(*«Copy nginx config (HTTP fallback, overwritten by entrypoint for
HTTPS)»*), and ADR-017 + the cutover plan
(`.claude/plans/2026-05-06-lk-transapp-cutover.md`) both reference
the entrypoint as the cert-fetching and config-rendering point. The
gap was at review time: ADR-025 looked at the obvious file and
missed the runtime override.

The diagnosis path also exposed a structural risk: **two files
describe the same nginx routing**, and there is no enforcement
keeping them aligned. Any future routing change is one careless
patch away from repeating this incident.

**Decision.** Three coordinated edits.

1. **Move the ADR-025 fix into `nginx/docker/entrypoint.sh`** — inside
   the heredoc, add `upstream main_api { server transapp.ru:443;
   keepalive 16; }` to the `http {}` block, and replace the
   `location /api/` body with the same `proxy_pass
   https://main_api/api/` / `proxy_http_version 1.1` / empty
   `Connection` / `proxy_ssl_name transapp.ru` / `Host transapp.ru`
   set that ADR-025 specified. This is the *only* edit that changes
   production behaviour.

2. **Sync `nginx/nginx.prod.conf`** with the entrypoint heredoc.
   Content was already correct after ADR-025; not touching the body.
   This file stays as the documented HTTP fallback and as a literal
   "second-copy" reference for grep-discovery — keeping it in sync
   reduces the surface area where a future editor might patch one
   place and miss the other.

3. **Mark each file with a header comment** stating its role:
   - `entrypoint.sh` — `*** AUTHORITATIVE PRODUCTION NGINX CONFIG
     ***`, explaining that the heredoc wins in HTTPS mode.
   - `nginx.prod.conf` — `*** HTTP FALLBACK ONLY ***`, pointing back
     to the entrypoint as the production source and demanding both
     stay in sync.

   These two markers are the lightweight, in-file equivalent of an
   ADR — anyone opening either file sees the architectural caveat
   immediately, without needing to read the Dockerfile or the
   decision log.

**Alternatives considered.**

- *Patch only `entrypoint.sh`; leave `nginx.prod.conf` alone.*
  Rejected — `nginx.prod.conf` would silently keep the
  ADR-025-correct routing while `entrypoint.sh` carried the truth,
  inviting confusion. Cheaper now to keep them aligned than to
  unwind a future ambiguity.
- *Refactor: extract the heredoc into an external file (e.g.
  `nginx/nginx.https.conf.template`) and have entrypoint do
  envsubst-style fill-in.* Architecturally cleaner — single source,
  no heredoc-in-shell-script edit pain, easier diffs, lintable. Out
  of scope for this ADR because the change touches container
  lifecycle, requires reasoning about template variables (cert
  paths are fixed but everything else is currently in scope), and
  carries non-trivial regression risk on a production-traffic
  critical path. Recorded as tech debt for a separate plan after
  this incident is fully closed.
- *Add `resolver` + periodic DNS re-resolution* (so the upstream
  keepalive pool isn't pinned to whichever A-record `transapp.ru`
  returned at container start). Useful, but not the root cause
  here — only relevant if post-deploy verification still shows
  staging-vhost responses (indicating Ivan's apex is itself a
  load-balancer between vhosts). Deferred until verification
  reveals the need.

**Consequences.**

- After the next `workflow_dispatch`, `nginx -T` inside the
  container will show `upstream main_api` and `proxy_pass
  https://main_api/api/`. The `check_diagnostic_card_date_to_left`
  type drift will collapse, response sizes through `lk.transapp.ru`
  and direct `transapp.ru` will match.
- Two-file redundancy is now *intentional*. The header comments are
  the contract; any future routing change must edit both. Until the
  tech-debt refactor lands, this is the cost of having a
  shell-rendered config.
- ADR-025 remains as the historical record of *what* needed to
  change; ADR-026 records *where* the change has to live. They are
  not mutually exclusive — ADR-025 stays "Implemented (corrected by
  ADR-026)".

**Verification.**

- After fix-deploy, on the VM:
  ```bash
  ssh deploy@81.26.191.68 \
    'docker exec $(docker ps --filter name=nginx -q) \
      nginx -T 2>/dev/null | grep -A4 -E "upstream main_api|location /api/"'
  ```
  Expect `upstream main_api { server transapp.ru:443; keepalive
  16; }` and `proxy_pass https://main_api/api/` with `proxy_ssl_name
  transapp.ru` and `Host transapp.ru`.

- Payload-size symmetry:
  ```bash
  TOKEN=$(cat ~/transapp-monitor/token.txt)
  for u in lk.transapp.ru transapp.ru; do
    curl -s -o /tmp/"$u".json -w "$u size=%{size_download}\n" \
      -X POST "https://$u/api/get-auto-list" \
      -H 'Content-Type: application/x-www-form-urlencoded' \
      --data-urlencode "token=$TOKEN" --data 'auto_list_limit=0'
  done
  diff <(python3 -m json.tool /tmp/lk.transapp.ru.json) \
       <(python3 -m json.tool /tmp/transapp.ru.json)
  ```
  Expect identical sizes and an empty diff.

- Restart `~/transapp-monitor/probe.sh`, let it run ≥ 30 min, then
  `~/transapp-monitor/summary.sh --since 1h` — `lk.transapp.ru`
  should match `transapp.ru` on mean TTFB and `size_dl`, and the
  staging-only spike pattern should disappear.

- If verification still fails: investigate DNS resolution inside
  the nginx container (`getent hosts transapp.ru` plus `nslookup`
  through the host) — the apex may itself be load-balancing
  between vhosts, in which case the deferred `resolver` directive
  becomes the next step.

**Lessons learned.**

- When the routing target is a hostname resolved by an external
  party (Ivan's apex), response size alone is not enough to verify
  a proxy change — confirm the **active config** in the running
  container (`docker exec ... nginx -T`) and compare full JSON
  payloads, not just sizes.
- Multi-source configuration (Dockerfile `COPY` + entrypoint
  heredoc) is a quiet trap. Whenever a heredoc renders a config at
  startup, the source file in the repo is only a hint — header
  comments in both files are the cheapest defence until a real
  template extraction lands.
- The COI metadata buster (`BUILD_ID`, ADR-016) was working as
  designed and is not at fault: it correctly recreated the
  container, but the container's entrypoint kept reapplying the
  same stale heredoc.

**Deploy notes.** Same as ADR-025 — `workflow_dispatch` on
`.github/workflows/deploy-web.yml`. `BUILD_ID` triggers
`yc-container-daemon` to pick up the new image. Manual trigger
only, per project rule.

**Files.** `nginx/docker/entrypoint.sh`, `nginx/nginx.prod.conf`,
`Writerside/topics/decision-log.md` (this entry),
`Writerside/topics/project-dashboard.md`,
`Writerside/topics/dev-web.md`, `.claude/tasks.md`,
`.claude/session-state.md`,
`.claude/plans/2026-05-25-adr-026-entrypoint-config-correction.md`.

### ADR-027: `/get-auto-list` latency — pre-existing N+1 in legacy perl handler as the amplifier; regression trigger is the environment (shared-MySQL contention / data growth), not cron lock-wait; fix via migration (2026-06-20)

**Context.** Recurrent incident: `/get-auto-list` times out (client 90 s
ceiling, ADR-024) on mobile + web; switching company shows endless load +
«Список авто пуст». Direct SSH access to Ivan's backend was obtained during
this incident, enabling first-hand diagnosis instead of black-box guessing.

**Backend topology (confirmed).** Front nginx `185.76.253.6` (`transapp.ru`)
routes `location /api` → internal upstream **`base13`** (`base13.trade.su`,
`185.76.253.253`, ssh `7023`, Debian 7 / OpenSSH 6.6 — EOL), `location /` →
docker SPA (`192.168.0.33:23001`). `base13` runs Apache (prefork,
`MaxClients 500`) + mod_fcgid/mod_perl serving perl app `/www/tplnew/`
(under SVN). Handler: `/www/tplnew/htdocs/api/TPLApiController.pm`
(`sub get_auto_list`, line 442). MySQL is **remote** on `192.168.0.121`
(schema `trans_konsal`, descriptor user `rosexport`), a shared instance
hosting dozens of trade.su databases (`max_connections=4048`; observed 363
live threads and a sibling 766 s query). See
`.claude/plans/2026-06-18-legacy-backend-takeover.md` for full inventory.

**Mechanism (evidence-based).**
1. `tplnew-access.log` (`%T` seconds) shows `/api/get-auto-list` genuinely
   running 129 s, 144 s, up to **1444 s**; warm repeat = 0 s.
2. Only `get-auto-list` appears in the top-30 slowest requests — not a
   generic Apache worker shortage, and not the scraping endpoints
   (`get-auto-check-*`, which carry `sleep(10)` retry loops).
3. `get_auto_list` is a textbook **N+1**: one list query
   (`user_auto WHERE user_id=?`) then, per auto, three sub-queries
   (`user_auto_pass`, `COUNT/SUM user_auto_fine`, `user_auto_diagnostic_card`)
   plus `time_left` per pass.
4. All those queries are **indexed** (`KEY user_auto`, `KEY user_id` —
   `legacy/SHOW CREATE TABLE.txt`), individually fast; `ex_SQL_ar` reuses a
   persistent handle; no external HTTP, no `sleep` in this handler.

**Amplifier, not trigger.** The handler code is **unchanged since end-2025**
and worked fine then; firms with large fleets are rare (test account: 6 / 14
/ 74 / 50 autos). So the N+1 is not the regression trigger — it is an
*amplifier* that makes `get-auto-list` the endpoint most sensitive to DB
latency (it issues the most round-trips), hence the canary while other
endpoints survive. Even 74 autos (~370 round-trips) reach 130–1444 s once
per-round-trip latency inflates.

**Regression trigger — intermittent shared-MySQL contention (measured 2026-06-20).**
Baseline measurements from base13 in a normal window: 500× `SELECT 1` on a
persistent connection = **0.136 s** (~0.27 ms/round-trip); `COUNT/SUM` over
the whole `user_auto_fine` (487k rows) = **83 ms**. So the DB and network are
fast at baseline; for 74 autos (~370 round-trips) `get_auto_list` is sub-second
in a normal window (= the «warm = 0 s» observation). Therefore 130–1444 s occur
**only during intermittent contention episodes** on the shared instance from
*other* trade.su tenants (observed sibling 766 s query, 363 live threads —
unrelated to any TransApp change). The **data-growth** hypothesis is
**disproven by measurement** (487k aggregates in 83 ms; indexes present).
Our-side contribution: the web client fires `get-auto-list` in concurrent
pairs (slow log entries come in same-second pairs: 418+1444, 246+334, 129+144),
so two heavy N+1 requests contend with each other during a contention window —
addressable by the cross-call dedup (`tasks.md`) without touching legacy.
Empty `SHOW PROCESSLIST` during a hang is consistent with the contention model
(time lost while neighbours saturate the shared instance, not inside our fast
queries). Aggravator: leftover debug in the handler
(`open >/tmp/dump_15_09_001` + ~8 `Data::Dumper->Dump` writes per auto).

**Disproven.** Earlier hypothesis (cron `check_avtodor`/`check_rnis`
lock-wait) — incident occurs outside cron windows, processlist clean,
queries indexed.

**Decision.** Do **not** patch Ivan's legacy perl (third-party, EOL OS,
risk). The correct fix (set-based aggregation replacing the N+1) lands in
our own Litestar backend during the takeover/migration (Phases 1–4 of the
plan). Client side is already maxed (ADR-023/024/026). Until migration the
degradation is a documented known issue.

**Consequences.** Incident triage closed; the latency item moves from the
`resilience` epic (where it was framed as «ask Ivan to fix cron») into the
`backend-takeover` epic as a migration driver. Legacy backend source mirror
kept locally git-ignored at `legacy/ivan-backend/` for migration work.

**Files.** `Writerside/topics/decision-log.md` (this entry),
`Writerside/topics/infra-deployment.md` (base13 topology),
`.claude/plans/2026-06-18-legacy-backend-takeover.md`, `.claude/tasks.md`.

> **Correction (2026-06-21, see ADR-029).** Direct measurement with a live
> session token showed the shared MySQL is fast *during* the user-facing
> slowness, and the legacy `get_auto_list` handler is intrinsically ~7–18 s
> even **isolated** (single request, 14-auto account). The "intermittent
> shared-MySQL contention / noisy neighbour" framing above is **superseded**:
> the dominant factor is the legacy handler's per-request overhead, amplified
> by concurrency — not DB contention. Policy hardened: **never patch Ivan's
> production legacy**; the only fix is the migration. See ADR-029.
>
> **Second correction (2026-06-21, see ADR-030).** The handler analysed in
> this ADR — `htdocs/api/TPLApiController.pm:442` — is **not the production
> one**. It returns only `{ token, auto_list }` with three strings per auto
> and no `LIMIT`; the app could not run on it. The live handler matching the
> frontend contract is `htdocs/digitrans/api/TPLApiController.pm:739`, which
> honours `LIMIT ?, ?` but with an `|| 1000` fallback (`"0" || 1000 = 1000`)
> and runs ~8–11 sub-queries **per auto** plus an external OSAGO-parser HTTP
> call for autos without a policy. The "three sub-queries, no external HTTP"
> description above is wrong for production. See ADR-030.

### ADR-028: Web cross-call dedup of `/get-auto-list` — LIGHT `updateUserData` defers to an in-flight HEAVY `fetchAutoList` via a shared in-flight slot (2026-06-20)

**Context.** First our-side mitigation lever from the ADR-027 RCA. On web, two
callers POST `/get-auto-list` and fire concurrently on auto-list load and on
company switch: the HEAVY `useAutoData.fetchAutoList` (full list) and the LIGHT
`UserDataContext.updateUserData` (`auto_list_limit: 0`). Backend logs show them
as same-second pairs that each take 130–1444 s in a shared-MySQL contention
window (two parallel N+1 that contend with each other and with sibling
trade.su load). The legacy handler ignores `auto_list_limit`, so the "light"
call is equally heavy on the backend — collapsing the pair to one request
roughly halves backend load per page-load. ADR-024 already removed the
*screen's* own duplicate via `firstFocusRef`; the remaining pair is
sidebar-LIGHT vs screen-HEAVY, which had no cross-call dedup (each had only
its own in-flight guard).

**Decision.** Share ONE in-flight slot (`inFlightRef`) in `UserDataContext`
between both callers:
- New `registerAutoListFetch(promise)` stores a normalized (rejection-swallowed)
  marker into `inFlightRef`, cleared on settle via an identity guard.
- `useAutoData.fetchAutoList` registers a marker **synchronously at its top**
  (before any await) on web (`userDataCtx` present), resolved in `finally`.
- `updateUserData` defers to an in-flight HEAVY: pre-await guard, then a
  one-microtask yield + re-check after the token `await`. The yield makes the
  dedup **ordering-independent** — when both the screen's `loadData` and the
  sidebar's `updateUserData` await `getItem` in the same commit, the HEAVY
  registers its marker right after its own `getItem` resolves, and the LIGHT
  re-check catches it regardless of which effect fired first. HEAVY never
  defers to LIGHT (the screen needs the full list).

The HEAVY response is a superset of the LIGHT's needs and already drives
`syncFromAutoList`, so the deferring LIGHT loses nothing. Native is unchanged
(`userDataCtx === null`): the module-level `_inFlightUpdateUserData` dedup
(ADR-024) stands.

**Why the existing concurrent-dedup test stays green.** The prior
`updateUserData` dedup relied on the latest-wins AbortController (the second
caller aborted the first). With the post-await re-check the second caller now
*defers* to the first's `inFlightRef` instead — still exactly one request
(`callCount === 1`). Verified: `npx jest` → 21 suites / 167 tests green;
`tsc --noEmit` clean.

**Edge cases.** HEAVY aborted (latest-wins) before `syncFromAutoList` → its
`finally` still resolves the marker; a superseding HEAVY re-registers and
syncs, so the deferred LIGHT gets fresh data via the reflection effect — no
fallback needed. HEAVY throws → marker resolves (rejection swallowed), LIGHT
doesn't set `loadError` (it never fired); HEAVY sets it.

**Consequences.** ~2× fewer `/get-auto-list` per web page-load / company
switch under contention; closes the deferred cross-call-dedup task. Does not
fix the root cause (shared-MySQL contention) — that remains the migration
(ADR-027 / backend-takeover). The new `inFlightRef`-sharing contract is the
single coordination point; any future caller must go through
`updateUserData` or `registerAutoListFetch`.

**Files.** `src/contexts/UserDataContext.tsx`, `src/hooks/useAutoData.ts`,
`src/contexts/__tests__/UserDataContext.test.tsx`,
`src/hooks/__tests__/useAutoData.test.tsx`,
`Writerside/topics/decision-log.md` (this entry),
`Writerside/topics/dev-web.md`, `Writerside/topics/project-dashboard.md`,
`.claude/tasks.md`.

### ADR-029: Correction of ADR-027 — `/get-auto-list` slowness is the legacy handler's intrinsic per-request cost (~7–18 s isolated for 14 autos), amplified by concurrency, NOT shared-MySQL contention; policy: never patch Ivan's prod, fix only via migration (2026-06-21)

**Context.** ADR-027 attributed the 130–1444 s `/get-auto-list` latency to
*intermittent shared-MySQL contention* (a 766 s sibling query from another
trade.su DB was observed). A 2026-06-21 incident window with a valid session
token let us measure the request path directly, end-to-end, and the contention
model did not hold.

**Measurements (2026-06-21, during user-facing slowness).**
- **DB is fast**: 500× `SELECT 1` on a persistent connection = **0.111 s**
  (~0.22 ms/round-trip); `Threads_running = 7`; base13 `load 0.71`. The only
  >5 s query on the instance was a 17 s sibling on `semc_kru_new` — not enough
  to explain 100+ s, and not on `trans_konsalt`.
- **Isolated handler is intrinsically slow**: a single `get_auto_list` for a
  14-auto account, hit directly at `https://transapp.ru/api/get-auto-list`
  (bypassing the browser and our nginx) returned HTTP 200 (~46 KB) in
  **6.9 s / 7.5 s / 17.7 s** ttfb across three samples. The pure indexed SQL
  for this is ≈15 ms, so **>99 % of the time is NOT SQL execution**.
- **It scales with the account, and bootstrap is NOT the cause**: a mobile
  (iOS) session log shows every other endpoint fast through the SAME perl
  bootstrap — `/get-session-data` 299 ms, `/confirm-token` 292 ms,
  `/auth-by-phone` 289 ms, `/system-notice` 21–34 ms — while only
  `/get-auto-list` hit the client's 90 s timeout (`ECONNABORTED` at 90013 ms).
  Combined with the isolated 14-auto sample (7.5 s), the cost clearly **scales
  with the account's data** (small account ≈ 7 s, this account ≥ 90 s).
- **Concurrency amplifies it further**: under real load (browser reloads +
  retries + mobile), the endpoint shows **124–279 s** in `tplnew-access.log`.

**Revised conclusion.** The DB instance is **not** the bottleneck and neither
is the request **bootstrap** (the mobile log proves auth/session endpoints are
sub-second through the same perl app). The dominant cost is **inside the
`get_auto_list` body — the N+1 that scales with the account's data**: per auto
it runs `_get_check_passes_string` / `_get_check_fines_string`
(`COUNT/SUM user_auto_fine`) / `_get_check_diagnostic_card_string` plus
`time_left` per pass, so the total grows with `autos × per-auto rows`
(fines/passes). Each point query is ms, but the aggregate over a heavy account
crosses the 90 s client ceiling. (Earlier "DB contention" — ADR-027 — and the
secondary "intrinsic bootstrap overhead" guess are both demoted; exact
per-auto unit cost is unprovable without root/strace, but the scaling is
clear.) Aggravators: per-request `` `date` `` shell-fork and `Data::Dumper`
debug writes to a single `/tmp/dump_15_09_001`. This is precisely what a
**set-based rewrite** (one `GROUP BY` per metric over all autos) eliminates.

**What from ADR-027 still stands.** Cron-lock-wait disproven; data-growth
disproven (487k aggregate in 83 ms); client side maxed (ADR-023/024); the
N+1 pattern is real and is part of the intrinsic cost. **What changes:** the
contention/noisy-neighbour framing is demoted from "trigger" to a minor,
non-dominant factor.

**Decision / policy.** **Never patch Ivan's production legacy** (explicit user
decision, 2026-06-21) — not the perl, not the cron, not the DB. The only fix
is the **migration** (rewrite `get_auto_list` in our Litestar backend: one
pooled connection, set-based aggregation, no per-request shell-forks/debug
writes). The deployed cross-call dedup (ADR-028) remains the correct interim
lever — it removes the *amplifier* (concurrency), not the baseline. Immediate
operational relief during a bad window: **don't hammer** the endpoint
(reloads/retries) so the pile-up drains and it settles to its ~10 s baseline.

**Consequences.** RCA re-pinned; `backend-takeover` migration becomes the sole
real fix path. No legacy change will be made regardless of incident pressure.

**Files.** `Writerside/topics/decision-log.md` (this entry + ADR-027
correction note), `.claude/plans/2026-06-18-legacy-backend-takeover.md`,
`.claude/tasks.md`.

> **Correction (2026-06-21, see ADR-030).** This ADR still measured and cited
> the wrong handler file (`htdocs/api/TPLApiController.pm:442`). Assembling the
> full response contract for the migration showed production is
> `htdocs/digitrans/api/TPLApiController.pm:739`. The "intrinsic per-request
> overhead" is real but is now **explained**: ~8–11 sub-queries per auto +
> an external OSAGO-parser call, multiplied by the fleet size — and the fleet
> size is driven by the client, because the handler expands `auto_list_limit:0`
> to `1000` (`"0" || 1000`). The dominant trigger is our `updateUserData`
> "light" call sending `auto_list_limit:0`, not an account-specific data size.
> See ADR-030.

### ADR-030: Production `get_auto_list` is `digitrans/api/TPLApiController.pm:739` (not `api/442`); the latency trigger is the client sending `auto_list_limit:0`, which the handler expands to a full-fleet (≤1000) scan of ~8–11 sub-queries per auto + an external OSAGO-parser call; corrects the handler attribution and per-request cost of ADR-027/029 (2026-06-21)

**Context.** While assembling the full `/get-auto-list` response contract as a
prerequisite for the migration (Phase 3 of the takeover plan), the producer
side stopped matching the consumer side. The handler cited by ADR-027/029,
`htdocs/api/TPLApiController.pm:442`, encodes only
`{ token, auto_list }` and, per auto, just three strings
(`check_passes_string`, `check_fines_string`, `check_diagnostic_card_string`)
with **no `LIMIT`** clause. The frontend, however, reads `user_data`,
`auto_list_count`, `other_user_list`, `our_services_list`, `onboarding_*`,
`manager_data`, and ~60 per-auto fields across six tabs (passes / fines /
diagnostic-card / osago / avtodor / rnis / status). The app cannot run on the
`api/442` payload — so that is not the production handler.

**Evidence (the real handler is `digitrans/api/TPLApiController.pm:739`).**
1. Its top-level assembly (`:1020-1032`) emits exactly the consumed contract:
   `token`, `auto_list`, `auto_list_count`, `user_data`, `our_services_list`,
   `other_user_list`, `onboarding_viewed`, `onboarding_expired`,
   `announce_our_services_viewed`, `manager_data`. The top-level identity
   fields come from `session_data` (an auth/session middleware), **not** from
   `get_auto_list` itself.
2. It **honours** pagination — `SELECT SQL_CALC_FOUND_ROWS ... LIMIT ?, ?`
   (`:786-823`), `auto_list_count` via `FOUND_ROWS()` (`:826`) — but with
   `my $auto_list_limit = $params->{POSTHASH}->{auto_list_limit} || 1000`
   (`:778`). In Perl, `"0" || 1000 == 1000`, so **`auto_list_limit:0` becomes
   a full-fleet scan (capped at 1000)**.
3. Per auto inside the loop it runs ~8–11 queries: in-work status on
   `rosexport.tpl_card` (`:836`), `debt_sum` on `rosexport` (`:869`), then six
   helpers (`:903-1008`) — `_get_check_passes_data` (`user_auto_pass`),
   `_get_check_fines_data` (`COUNT/SUM user_auto_fine`, **+2** ФССП/Платон
   counts when there is debt), `_get_check_diagnostic_card_data`,
   `_get_check_osago_data`, `_get_check_avtodor_data`, `_get_check_rnis_data`.
4. `_get_check_osago_data` (`:5431`) makes an **external HTTP call**
   `TPLApiUtils::get_parser_api_osago` (`:5468`) for every auto **without** a
   current OSAGO row — synchronous, inside the request loop. (The "no external
   HTTP in this handler" claim of ADR-027 was about the wrong file.)

So one request costs `~8–11 SQL × autos` + up to `autos` external OSAGO calls.
For `auto_list_limit:0 → 1000` autos that is ~8000–11000 queries plus up to
1000 external calls — directly explaining the 90 s+ ceiling hits and the
124–279 s access-log entries under load.

**Corrected root cause.** Neither DB contention (ADR-027) nor a vague
"intrinsic overhead on a 3-sub-query N+1" (ADR-029, based on `api/442`). The
dominant, reproducible trigger is **client-side**: `UserDataContext.updateUserData`
(web sidebar) and `useAutoData.updateUserDataOnly` (native) send
`auto_list_limit:0` as a deliberately "lightweight, profile-only" refresh —
but the handler turns that into the **heaviest possible** call (full-fleet
× ~8–11 sub-queries + external OSAGO). It fires on every page-load and every
company switch. The legacy frontends (`Transappru/`, `transappweb/`) always
sent `auto_list_limit:10` (one bounded page) and **never** `0`, so they never
triggered a full-fleet scan — which matches the field observation that the
slowdown is independent of the account (any account's full fleet is scanned)
and reproduces on arbitrary company switching, while legacy was fine.

**What from ADR-027/029 still stands.** Cron-lock-wait disproven; DB fast at
baseline (RT ~0.22 ms; 487k aggregate in 83 ms); concurrency amplifies; client
side otherwise maxed (ADR-023/024/026/028); **never patch Ivan's production
legacy**; the migration is the only real fix. **What changes:** the production
handler is `digitrans/739`, the per-auto cost is ~8–11 queries + an external
OSAGO call (not three queries), and the prime trigger is now pinned to the
client `auto_list_limit:0 → 1000` expansion.

**New our-side lever (not implemented here).** The "light" profile-refresh
call should send `auto_list_limit:1` (any truthy small value) instead of `0`.
`user_data` comes from `session_data` and `auto_list_count` from `FOUND_ROWS()`
regardless of `LIMIT`, so the sidebar gets identical profile/notification/count
data at ~1000× less backend cost. This is stronger than the ADR-028 dedup,
which only removes the concurrent duplicate — the surviving call (on company
switch, and on native) is still `limit:0 → full-fleet`. Needs a check that no
consumer relies on a full `auto_list` from the light call (it should not — the
HEAVY `fetchAutoList` drives the list). Recorded in `.claude/tasks.md`.

**Migration implications (Phase 3).** Our Litestar `/get-auto-list` must
(a) honour `limit`/`offset` literally (no `|| 1000`); (b) replace the per-auto
N+1 with set-based aggregation — one `GROUP BY` per metric over the page of
autos (`user_auto_fine`, `user_auto_avtodor`, `user_auto_pass`,
`user_auto_diagnostic_card`, `user_auto_osago`, `user_auto_rnis`); (c) move the
OSAGO parser out of the request path (async refresh / cache, never inline);
(d) reproduce the `session_data`-assembled top-level fields. The full
field-by-field contract (top-level provenance, per-auto fields per tab, helper
value/colour semantics) is captured in
`.claude/plans/2026-06-18-legacy-backend-takeover.md`.

**Open verification (Phase 1).** The mirror ships both `htdocs/api/` and
`htdocs/digitrans/api/` controllers. The contract match is decisive that
production serves the `digitrans` one for `/api/get-auto-list`, but confirm
on `base13` which `TPLApiController` Apache actually loads for `location /api`
(vhost / `PerlRequire` / `@INC`).

**Files.** `Writerside/topics/decision-log.md` (this entry + ADR-027/029
correction notes), `.claude/plans/2026-06-18-legacy-backend-takeover.md`
(Phase 0 RCA correction + Phase 3 response contract), `.claude/tasks.md`,
`Writerside/topics/project-dashboard.md`.
