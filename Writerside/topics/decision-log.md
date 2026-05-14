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
