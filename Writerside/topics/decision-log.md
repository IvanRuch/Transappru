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
