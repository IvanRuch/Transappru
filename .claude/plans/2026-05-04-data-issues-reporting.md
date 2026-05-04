# Data Issues Reporting + System Notice Banner

## Status

**Draft** (2026-05-04). Готов к старту после approval.

## Context

Phase 1 (`DataProviderStatusBanner`, merged PR #18 → master `f85c16b`)
ловит только **observable failures** провайдера данных (HTTP 5xx,
timeouts, явные `error: ...` в payload). По описанию заказчика это
редкий и не самый болезненный кейс.

Реальная боль — **silent data quality issues**: провайдер `Avtocod`
получает данные от госструктур через СМЭВ (ГИБДД, ФССП, и т.д.); СМЭВ
часто молча отдаёт **частичные** или **устаревшие** данные. Avtocod
редко уведомляет нас о таких проблемах. Узнаём обычно от клиентов,
которые теряют деньги (неоплаченные штрафы → ФССП, просрочка ОСАГО →
штраф ГИБДД, и т.д.). Частота — ~1 раз в месяц, но критично для
удержания клиентов.

Эта функциональность создаёт **петлю обратной связи**: клиент → жалоба
→ админ (Telegram) → активация баннера → остальные клиенты
предупреждены → проблема решена → жалобщикам приходит recovery push.

Phase 1 frontend-инфраструктура (баннер UI, dismiss-логика, a11y,
монтирование в root) **переиспользуется** — меняется только источник
сигнала (с frontend observation на backend `/system-notice`). Логика
state machine + rolling window удаляется как отвечающая на не ту
проблему.

## Decisions (закреплены через AskUserQuestion)

| # | Решение | Обоснование |
|---|---|---|
| 1 | TG-бот в отдельном Docker-контейнере `payment-bot` | избегаем конфликта polling между uvicorn-воркерами payment-service; payment-service остаётся scalable |
| 2 | Trust `user_id` из body + rate-limit через partial UNIQUE index | legacy DB недоступен, cross-validation невозможна; защита от 50 кликов через БД-уровневый rejection повторных открытых жалоб |
| 3 | aiogram v3 + polling | low traffic (~1/мес), polling не требует публичного URL для бота |
| 4 | firebase-admin Python SDK для recovery push | стандарт для server-side FCM; service account уже есть в `.secrets/firebase-server-account.json` |
| 5 | Таргет recovery push — только жалобщики (`fcm_token` из `data_issues`) | implicit consent, минимум шума; покрывает кейс «пользователь сам поднял проблему» |
| 6 | Авто-баннер при ≥3 distinct users / 6h, через `INSERT … ON CONFLICT DO NOTHING` на partial unique index | пользователь явно хочет threshold; race condition закрывается атомарностью БД |
| 7 | Banner живёт до явного `/banner_off` (нет TTL) | пользователь явно отверг auto-deactivation |
| 8 | Confirm-step при `/banner_off`: бот спрашивает «отправить push N жалобщикам?» | защита от случайной массовой рассылки |
| 9 | Иконка кнопки — `MaterialCommunityIcons name="account-alert"` из `@expo/vector-icons` | vector, MIT, точно матчит описание заказчика |
| 10 | 2 PR: backend (полностью), потом frontend (полностью + cleanup Phase 1) | минимум контейнеров для координации; staging-валидация между |

## Architecture

```
┌──────────────────────┐                    ┌────────────────────────┐
│  Mobile / Web app    │                    │   Admin Telegram chat  │
│  (clients)           │                    │   (chat_id 221356598)  │
└──┬───────────────┬───┘                    └────────────┬───────────┘
   │ POST /report  │ GET /system-notice                  │
   │   ▼           │   ▲ poll 60s                        │ aiogram polling
   │  ┌────────────┴───┴────────────┐  ┌─────────────────▼───────────┐
   │  │   payment-service           │  │   payment-bot (sidecar)     │
   │  │   (Litestar HTTP)           │  │   ─ aiogram dispatcher       │
   │  │   ─ /data-issues/report     │  │   ─ /banner_on, /banner_off │
   │  │   ─ /system-notice          │  │   ─ inline buttons          │
   │  │   ─ FCM admin (init)        │  │   ─ writes to system_notice │
   │  │   ─ threshold check inline  │  │   ─ triggers FCM push       │
   │  └────────────┬────────────────┘  └─────────────────┬───────────┘
   │               │ shared models, shared firebase init │
   │               ▼                                     ▼
   │        ┌─────────────────────────────────────────┐
   │        │  payment_db (Postgres, Tortoise)        │
   │        │  ─ data_issues                          │
   │        │  ─ system_notice                        │
   │        │  ─ system_notice_push_log               │
   │        └─────────────────────────────────────────┘
   │
   │ Recovery push (firebase-admin → tokens из data_issues)
   ▼
   Mobile/web devices (only complainants of that notice)
```

### Why two containers

- Same image (`pyproject.toml` deps включают и aiogram, и litestar);
- `payment-service`: `command: uvicorn app.main:app …` — REST + DB writes;
- `payment-bot`: `command: python -m app.bot_worker` — TG dispatcher + FCM.
- Оба читают/пишут в один payment_db, импортируют те же Tortoise модели и
  FCM service module из `app/`.
- Оба читают `firebase-server-account.json` (mounted volume).

## Database (Tortoise + Aerich)

Новая миграция `payment-service/migrations/002_data_issues_and_notice.sql`:

```sql
CREATE TABLE system_notice (
  id            BIGSERIAL PRIMARY KEY,
  category      VARCHAR(32) NOT NULL CHECK (category IN
                ('passes','diagnostic_card','fines','osago','rnis','avtodor')),
  message       TEXT NOT NULL,
  source        VARCHAR(16) NOT NULL CHECK (source IN ('admin','auto')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deactivated_at TIMESTAMPTZ,
  push_sent_at   TIMESTAMPTZ,
  push_recipient_count INTEGER,
  push_message   TEXT
);
-- защита от двух одновременно активных notice одной категории
CREATE UNIQUE INDEX system_notice_active_unique
  ON system_notice (category) WHERE deactivated_at IS NULL;

CREATE TABLE data_issues (
  id          BIGSERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL,
  auto_id     INTEGER NOT NULL,
  category    VARCHAR(32) NOT NULL CHECK (category IN
              ('passes','diagnostic_card','fines','osago','rnis','avtodor')),
  comment     TEXT,
  fcm_token   VARCHAR(512),
  platform    VARCHAR(16),         -- 'mobile_ios'|'mobile_android'|'web'
  source_ip   INET,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  notice_id   BIGINT REFERENCES system_notice(id) ON DELETE SET NULL
);
-- rate-limit: один открытый report per user/auto/category
CREATE UNIQUE INDEX data_issues_open_unique
  ON data_issues (user_id, auto_id, category) WHERE resolved_at IS NULL;
CREATE INDEX data_issues_category_created
  ON data_issues (category, created_at DESC);

CREATE TABLE system_notice_push_log (
  id           BIGSERIAL PRIMARY KEY,
  notice_id    BIGINT NOT NULL REFERENCES system_notice(id) ON DELETE CASCADE,
  fcm_token    VARCHAR(512) NOT NULL,
  status       VARCHAR(16) NOT NULL,
  error_code   VARCHAR(64),
  sent_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX system_notice_push_log_notice ON system_notice_push_log (notice_id);
```

Tortoise модели в `payment-service/app/models.py` (append к существующим):
`DataIssue`, `SystemNotice`, `SystemNoticePushLog` через CharEnumField для
типобезопасности `category` / `source`.

## Backend (`payment-service/`) — изменения по файлам

### Новые

- `app/services/data_issues.py` — INSERT в `data_issues`, threshold check,
  атомарное создание notice (`INSERT ... ON CONFLICT DO NOTHING`).
- `app/services/system_notice.py` — get-active, deactivate, send-recovery-push.
- `app/services/firebase_push.py` — singleton init firebase-admin,
  `send_recovery_push(notice_id, custom_message=None)`, graceful degrade.
- `app/controllers/data_issues.py` — Litestar handler `POST /data-issues/report`.
- `app/controllers/system_notice.py` — Litestar handler `GET /system-notice`.
- `app/bot/__init__.py`, `app/bot/bot_worker.py` — entrypoint
  `python -m app.bot_worker`, aiogram Dispatcher + Bot + start_polling().
- `app/bot/handlers.py` — handlers команд + callback queries (inline buttons).
- `app/bot/notify.py` — отправка нового data_issue в TG (вызывается из
  `data_issues.py` сервиса; для cross-process — через polling БД или просто
  shared aiogram-call если payment-bot и payment-service делят deps).
- `app/config/firebase.py` — singleton init с graceful degrade.
- `app/schemas/data_issues.py` — Pydantic схемы request/response.
- `migrations/002_data_issues_and_notice.sql` — DDL выше.

### Изменённые

- `app/main.py` — регистрация новых controllers; init `firebase_push` в lifespan.
- `app/config/settings.py` — добавить:
  - `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ADMIN_CHAT_ID`
  - `FIREBASE_CREDENTIALS_PATH` (по умолчанию `/run/secrets/firebase-server-account.json`)
  - `AUTO_BANNER_ENABLED` (default True)
  - `AUTO_BANNER_THRESHOLD` (default 3)
  - `AUTO_BANNER_WINDOW_HOURS` (default 6)
- `pyproject.toml` — `aiogram>=3.4,<4.0`, `firebase-admin>=6.4,<7.0`.
- `docker-compose.yml` (root) — новый сервис:
  ```yaml
  payment-bot:
    image: <same as payment-service>
    command: python -m app.bot_worker
    env_file: ./payment-service/.env
    volumes:
      - ./.secrets/firebase-server-account.json:/run/secrets/firebase-server-account.json:ro
    depends_on:
      - payment-db
    restart: unless-stopped
  ```
- `.env.example` — placeholder для новых переменных.

### Cross-process notification (data_issue created → TG)

Поскольку `payment-service` и `payment-bot` — разные процессы, нужен механизм
передачи нового `data_issue` от endpoint к боту. Варианты:

1. **Postgres LISTEN/NOTIFY** (рекомендую) — payment-service после INSERT
   делает `NOTIFY data_issue_created`, payment-bot слушает через asyncpg.
   Без сторонних брокеров, native Postgres.
2. **Polling** — payment-bot раз в N секунд опрашивает новые `data_issues`.
   Простее, но overhead и latency.

Иду с (1) LISTEN/NOTIFY.

### Tests (pytest, в `payment-service/tests/`)

- `test_data_issues_endpoint.py` (5 cases): happy path POST, повторная жалоба
  → 409, threshold-reached → auto-notice, 4-я жалоба не плодит второй notice,
  невалидная категория → 400.
- `test_system_notice_endpoint.py` (2 cases): GET active only, после deactivate
  не возвращается.
- `test_data_issues_service.py` (2 cases): rate-limit на race БД, threshold
  логика.
- `test_firebase_push.py` (3 cases): mock firebase-admin, multicast tokens
  правильные, graceful degrade без credentials.
- `test_bot_handlers.py` (4 cases): `/banner_on`, `/banner_off` confirm flow,
  inline button callback, `/issues` форматирование.

## Frontend — изменения по файлам

### Новые

- `src/components/DataIssueReportButton.tsx` — иконка-кнопка
  (`MaterialCommunityIcons name="account-alert"` 22px amber #FFC107) +
  modal с textarea (optional comment) + submit. Props:
  `category: ProviderId`, `auto_id: number`. `user_id` — из текущей session,
  `fcm_token` — через хелперы из `usePushNotifications` (mobile) или
  `firebaseWeb.getFCMToken()` (web).
- `src/hooks/useSystemNotice.ts` — `useSyncExternalStore`-стиль:
  module-level store, ОДИН setInterval(60_000) на всё app независимо от
  количества subscribers, POST через `Api.payment`. Аналогичен паттерну
  `useDataProviderHealth.ts:68`.
- `src/services/dataIssues.ts` — `reportDataIssue(input)` →
  `Api.payment.post('/data-issues/report', ...)`.
- `src/constants/providerLabels.ts` — `PROVIDER_LABELS` map переезжает
  из `providerHealth.ts` (импортируется и баннером, и кнопкой).
- `src/utils/__tests__/useSystemNotice.test.ts` — Jest + MSW.
- `src/test-utils/handlers.ts` (extend) — добавить mock handlers для
  `GET /system-notice`, `POST /data-issues/report`.

### Изменённые

- `src/components/DataProviderStatusBanner.tsx` — `useDataProviderHealth()`
  → `useSystemNotice()`. Rendering без изменений (амбер #FFC107, dismiss,
  a11y).
- `src/screens/auto/AutoDetailScreen.web.tsx` (lines 66–167) — на каждой
  из 6 категорий внутри `renderTabContent` добавить
  `<DataIssueReportButton category={tab} auto_id={d.auto_id} />` в header
  tab content.
- `src/screens/auto/AutoDetailScreen.tsx` — аналогично для native.
- `tailwind.config.js` — использовать существующий `warning` token (lines
  48–53) или добавить `amber: { 500: '#FFC107' }`.
- `app/_layout.tsx` — без изменений (баннер уже смонтирован).

### Удалённые (cleanup Phase 1, в том же PR-2)

- `src/utils/providerHealth.ts`
- `src/hooks/useDataProviderHealth.ts`
- `src/utils/__tests__/providerHealth.test.ts`

И **удалённые вызовы** `reportProviderResult(...)` в `src/hooks/useAutoData.ts`
(4 места: loadPasses / loadDiagnosticCard / loadFines / loadOsago).

## Critical files to modify

- `payment-service/app/main.py` — controllers + lifespan
- `payment-service/app/models.py` — Tortoise модели
- `payment-service/app/bot/bot_worker.py` (new entry point)
- `payment-service/migrations/002_data_issues_and_notice.sql`
- `payment-service/pyproject.toml`
- `docker-compose.yml`
- `src/components/DataProviderStatusBanner.tsx`
- `src/components/DataIssueReportButton.tsx` (new)
- `src/hooks/useSystemNotice.ts` (new)
- `src/screens/auto/AutoDetailScreen.web.tsx`, `.tsx`
- `src/services/api.ts`, `src/services/dataIssues.ts` (new)

## Sequence (PR plan)

### PR-1 — `feat/data-issues-backend`

1. Aerich миграция 002 + Tortoise модели + Pydantic schemas
2. Endpoints `/data-issues/report`, `/system-notice`
3. Сервисы: `data_issues`, `system_notice`, `firebase_push`
4. TG bot worker (отдельный сервис в docker-compose), все handlers,
   FCM recovery integration, LISTEN/NOTIFY bridge
5. Settings + .env.example
6. Pytest (16+ cases)
7. Docs: `Writerside/topics/api-payment.md` (новые endpoints) +
   `Writerside/topics/decision-log.md` (ADR-011 о data issues reporting)
8. Deploy на staging, валидация:
   - `curl POST /data-issues/report` → запись в БД
   - TG admin получает уведомление от бота
   - `/banner_on штрафы "test"` → SELECT в system_notice показывает active
   - `/banner_off штрафы` → confirm flow + push на тест-токен (можно skip)

### PR-2 — `feat/data-issues-frontend`

1. `useSystemNotice` hook + `dataIssues` service + `DataIssueReportButton`
2. Switch `DataProviderStatusBanner` источник на `useSystemNotice`
3. Кнопка в `AutoDetailScreen.web.tsx` × 6 категорий
4. Кнопка в `AutoDetailScreen.tsx` (native) × 6
5. **Удалить** `providerHealth.ts`, `useDataProviderHealth.ts`, тесты
6. **Удалить** `reportProviderResult()` calls из `useAutoData.ts`
7. MSW handlers extend
8. Jest + MSW тесты (`useSystemNotice`, `DataIssueReportButton`)
9. Docs: `dev-mobile.md`, `dev-web.md`, `project-dashboard.md`
10. Manual QA на staging end-to-end:
    - кнопка → POST → запись в БД
    - админ активирует баннер → клиент через 60s видит баннер
    - админ выключает баннер → recovery push приходит → банер исчезает

## Verification

### Backend (PR-1)

- `cd payment-service && pytest` — все existing + новые тесты зелёные
- `docker compose up payment-service payment-bot payment-db` — оба контейнера
  запускаются
- TG: `/start` → бот отвечает; `/banner_on штрафы "test"` → INSERT в БД
- `curl -X POST http://localhost:8001/api/data-issues/report -H 'content-type:
  application/json' -d '{"user_id":1,"auto_id":1,"category":"fines"}'` → 201
  + TG уведомление + INSERT
- Threshold: 3 разных user_id → проверить INSERT в system_notice через psql
- `/banner_off штрафы` → confirm-flow → если send-push, в
  `system_notice_push_log` записи

### Frontend (PR-2)

- `npm test` — useSystemNotice + DataIssueReportButton зелёные, providerHealth
  тесты УДАЛЕНЫ
- `npx tsc --noEmit` — 0 errors
- `npm run web:start` → открыть `/auto/123` → во всех 6 tabs видна иконка
  report; клик → modal → submit → success state
- `DataProviderStatusBanner` отображается когда `system_notice` active в БД

## Open / deferred

- **Track 2 (cross-user anomaly)** — отложен до миграции legacy → наш backend
- **Track 3 (staleness badge)** — частично доступен (3 категории из 6 имеют
  `iou_dt` в legacy), отложен до access к legacy DB или миграции
- **Investigation `avtocod_bad_response` table** — выяснить что туда пишется
- **Multi-admin support** — сейчас hardcoded chat_id; при росте → таблица
  `admin_chats`
- **Move `PAYMENT_API_URL` в `EXPO_PUBLIC_*` env var** — preexisting tech debt
- **Telegram inline kbd payload limit (64 байта)** — `notice_id+category`
  укладываются, мониторим при усложнении

## Risks accepted

- **Spam-защита `/report` ограничивается БД-уровнем** — повторная open-жалоба
  → 409. Внешний злоумышленник может слать с разными `user_id` и плодить
  уведомления админу. Приемлемо для v1; при росте abuse — добавим shared
  secret.
- **`fcm_token` хранится в открытом виде** — не PII, но логи не индексируем,
  маскируем при output.
- **`auto_id` без FK** — orphan если авто удалено, статистика искажена.
  Не критично.
- **При выключении бота во время инцидента** — жалобы копятся в БД,
  threshold всё равно сработает; админ при возвращении пользуется `/issues`.

## Logging requirements

- `data_issue.created` (id, user_id, category, source_ip, has_fcm_token)
- `system_notice.activated` / `deactivated` (id, category, source, actor)
- `fcm.push.sent` (notice_id, recipient_count, success_count, failure_count)
- `tg.command` (chat_id, command, args)
- `auto_threshold.fired` (category, complaints_count, window_start)
- `firebase_push.init.failure` (path, error) на старте — ERROR-уровень
