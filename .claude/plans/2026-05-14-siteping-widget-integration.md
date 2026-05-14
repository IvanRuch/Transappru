# SitePing widget integration (web feedback overlay)

## Status

**Approved (planning)** (2026-05-14). Все 7 open questions из исходной редакции
плана решены (см. секцию «Resolved decisions» ниже). Готов к Phase 1 как только
будут выполнены infra-prerequisites:

1. Yandex Object Storage bucket `transapp-feedback-screenshots` создан, IAM-ключи
   получены и положены в GitHub Secrets.
2. Создан **отдельный** GitHub-репозиторий `TransKonsalt/transapp-feedback` для
   issue-стора (см. Resolved decisions #2).
3. Fine-grained PAT для нового `transapp-feedback` репо (Issues: Read/Write) →
   `GH_ISSUES_TOKEN` в Secrets.
4. Webhook secret для bidirectional sync → `GH_WEBHOOK_SECRET` в Secrets.

После Phase 1 PR — ADR-018 в `decision-log.md`. Реализация на feature-ветках,
фазами через несколько PR (см. Phases ниже).

## Resolved decisions (2026-05-14)

Сводка решений по open questions из исходной редакции плана. Контекст-обсуждения
сохранены в комментариях PR #35.

| # | Вопрос | Решение | Последствия для плана |
|---|---|---|---|
| 1 | Кому показывать виджет | **Всем авторизованным** (не whitelist). Виджет — инструмент клиентов; менеджеры пользуются эпизодически для валидации жалоб. | **Phase 1 расширяется** anti-spam механизмами (rate-limit, dedup, message-size cap) — без них клиентский трафик зальёт GitHub Issues |
| 2 | Куда писать Issues | **Отдельный репо `TransKonsalt/transapp-feedback`**, не основной `TransApp` | Permissions PAT'а суженный; webhook не получает merge-spam; auto-label/auto-close rules можно ставить агрессивные без вреда основному dev-flow |
| 3 | Retention скриншотов | **90 дней после `status=resolved`** | В Phase 4 — `scripts/cleanup_old_feedback.py` cron-задача |
| 4 | PostgreSQL placement | **payment_db** на старте | Phase 1 — миграция в payment_db. **Future plan**: extraction в общий cross-project сервис (см. «Future: shared feedback service» ниже) |
| 5 | Mobile native gap | **Отложено**, не для MVP | Mobile native пользователи продолжают использовать `/data-issues/report` (ADR-012). Никаких изменений в native-коде |
| 6 | Координация с ADR-017 | **Параллельно** | Виджет встаёт в Expo Web стэк → автоматически работает на любом домене (staging, lk.transapp.ru после cutover'а). Coordination только в Phase 4 — проверить CSP в production-nginx для github.com / yandexcloud.net |
| 7 | Upstream sync workflow | **Отложено до Phase 4** | Pin к `file:vendor/siteping-widget-0.11.4.tgz`; observe drift; если patches от upstream'а станут существенными — скопируем `sync-upstream.yml` из tradesu-moderator |

## Цель

Дать пользователям TransApp (преимущественно клиентам — перевозчикам с автопарками;
менеджеры эпизодически) возможность оставлять
**визуальные аннотированные баг-репорты** прямо на любой web-странице
(`transapp-dev.ru`, после cutover'а и `lk.transapp.ru`): пользователь
нажимает FAB, обводит элемент DOM, прикрепляет комментарий — система
снимает скриншот (`html2canvas`), сохраняет в Yandex Object Storage,
создаёт GitHub Issue в выделенном репозитории `TransKonsalt/transapp-feedback`
(см. Resolved decisions #2) с embed'ом скриншота
и метаданными аннотации. Закрытие Issue в GitHub автоматически
синхронизирует статус feedback'а в БД.

Назначение шире, чем у уже существующего `/payment-api/data-issues/report`
(ADR-012) — тот канал собирает жалобы клиентов на **качество данных
провайдеров** (штрафы / ОСАГО / РНИС). SitePing — это канал
**внутренних UI/UX-баг-репортов** от менеджеров: «эта кнопка кривая»,
«здесь текст обрезался», «при клике на X не работает Y». Два канала
не пересекаются.

## Источник кода: tradesu-moderator fork

- Upstream: [NeosiaNexus/SitePing](https://github.com/NeosiaNexus/SitePing)
- Trade.su fork: [Trade-su/SitePing](https://github.com/Trade-su/SitePing) — текущая версия `@siteping/widget 0.11.4`
- Развёрнутая копия с интеграционным кодом: `/Volumes/HP_P800/grizodubov/IdeaProjects/tradesu-moderator`

**Ключевые файлы-доноры** (которые портируем / адаптируем):

| Файл в tradesu-moderator | Что это | Адаптация для TransApp |
|---|---|---|
| `frontend/vendor/siteping-widget-0.11.4.tgz` | Сам форк (compiled bundle) | Копируется как-есть в `vendor/` |
| `frontend/src/components/FeedbackWidget.tsx` | Виджет lifecycle + init | Адаптировать под Expo Web (RN-Web) — Platform.OS === 'web' gate |
| `frontend/src/feedback/sitepingStore.ts` | Custom store adapter, оборачивает API client | Переписать под наш `src/services/api.web.ts` |
| `frontend/src/feedback/pageScope.ts` | Route → PageScope mapper | Полностью переписать под expo-router pathnames TransApp |
| `frontend/src/components/OnboardingBubble.tsx` | Tooltip для первого визита | Копируется почти как-есть, ru-локализация уже есть |
| `backend/app/api/v1/feedback.py` | REST CRUD endpoints (FastAPI) | **Переписать на Litestar** controllers |
| `backend/app/models/feedback.py` | SQLAlchemy ORM модель | **Переписать на Tortoise** ORM |
| `backend/app/services/screenshot_storage.py` | S3 + disk абстракция | Портируется как-есть (aioboto3 — framework-agnostic) |
| `backend/app/services/github_issues.py` | Fire-and-forget Issue creation | Портируется как-есть (httpx — уже в deps payment-service) |
| `backend/app/services/github_webhook.py` | Bidirectional sync | Портируется как-есть |
| `backend/alembic/versions/*_feedback_*.py` | Schema migrations | **Переписать на aerich** (payment-service migration tool) |
| `Writerside/topics/api-feedback.md` | API reference (для документации) | Скопировать структуру, скорректировать пути |
| `Writerside/topics/infra-feedback-storage.md` | Ops guide (S3, presigning) | Скопировать структуру |

## Архитектурные различия с tradesu-moderator (важно при portировании)

| Аспект | tradesu-moderator | TransApp |
|---|---|---|
| Backend framework | **FastAPI** | **Litestar** |
| ORM | **SQLAlchemy** (sync sessions) | **Tortoise** (async) |
| Migrations | **Alembic** | **aerich** |
| Frontend framework | React 19 + Vite (pure web) | **Expo Web** (RN-Web) — другой scope |
| Auth | JWT в localStorage | Phone+SMS → token в AsyncStorage |
| Storage (prod) | Yandex Object Storage `moderator-feedback-screenshots` | **Новый bucket** `transapp-feedback-screenshots` |
| GitHub repo для Issues | `Trade-su/moderator` (тот же что и для dev-кода) | **`TransKonsalt/transapp-feedback`** — отдельный feedback-only repo (см. Resolved decisions #2) |
| Public domain | `moderator.website` | `transapp-dev.ru` (staging) → `lk.transapp.ru` (после ADR-017) |
| Containerization | nginx + frontend + backend + postgres + redis + minio + mailpit | payment-service + payment-bot + payment-db (+ vpn sidecar) — **никаких frontend/redis-контейнеров** |

## Scope

**В scope:**

- Web-only интеграция (Expo Web build, served from staging nginx).
- Backend endpoints в `payment-service` (`/payment-api/feedback/*`).
- Yandex Object Storage prod bucket для скриншотов (MinIO для local dev).
- GitHub Issues integration (создание + webhook на close/reopen) в выделенный
  репозиторий `TransKonsalt/transapp-feedback`.
- Russian локализация виджета (уже включена в fork v0.11.4).
- **Виджет доступен всем авторизованным пользователям** (по Resolved decisions #1).
  Server-side anti-spam — rate-limit, content dedup, size caps — встроен в
  Phase 1 (см. подраздел «Anti-spam» ниже).
- Page-scope filtering под expo-router routes TransApp.
- Документация: ADR-018 + api-feedback.md + infra-feedback-storage.md.

**Out of scope (отдельные итерации):**

- **iOS / Android native** — html2canvas требует DOM, не работает в RN native.
  Виджет на mobile нативе не показываем. Жалобы с mobile продолжают идти
  через ADR-012 (`/data-issues/report`) — это разные категории UX-фидбэка.
- **Embedded в legacy `transappweb/`** (React 19 + plain JS на сервере Ивана).
  Их планируется заменить на наш Expo Web стэк через cutover (ADR-017),
  параллельная интеграция SitePing в legacy — двойная работа.
- **Anonymous feedback** — авторизация обязательна (как и в tradesu-moderator).
- **Слияние с `/data-issues/report` каналом** — намеренно разные UX-патерны.
- **Public status page** (uptime monitoring) — SitePing не делает этого
  ни в upstream, ни в fork'е. Если когда-то понадобится — отдельный проект.
- **Embed виджета в сторонние сайты партнёров** — single-tenant, только наш фронт.

## Архитектура

```
Browser (Safari / Chrome / Yandex Browser на 16″ ноутбуке)
│
├── Expo Web bundle (transapp-dev.ru)
│   ├── app/_layout.tsx → <FeedbackWidget.web /> (Platform.OS === 'web' guard)
│   ├── React Shadow DOM viewport overlay (FAB + panel)
│   ├── На submit: html2canvas → JPEG → base64 → POST /payment-api/feedback
│   └── На fetch: GET /payment-api/feedback?project_name=transapp-web&page=...
│
└─── HTTPS ─── nginx ─── /payment-api/feedback/* ────┐
                                                       │
                                                       ▼
                              payment-service (Litestar)
                              ├── controllers/feedback.py — CRUD endpoints
                              ├── models/feedback.py — Tortoise model
                              ├── services/screenshot_storage.py
                              │       │
                              │       ├── dev: MinIO @ http://minio:9000
                              │       └── prod: Yandex Object Storage
                              │              @ https://storage.yandexcloud.net
                              │
                              ├── services/github_issues.py (httpx)
                              │       └── fire-and-forget asyncio.create_task
                              │              → POST https://api.github.com/repos/
                              │                       TransKonsalt/transapp-feedback/issues
                              │
                              └── payment_db (PostgreSQL)
                                  └── new table: feedbacks (JSONB annotations)


GitHub Issues webhook ─── POST /payment-api/feedback/github-webhook ─── HMAC validate
                                                                         │
                                                                         ▼
                                                                 update feedback.status
```

### Network

- Все запросы виджета идут на **тот же домен** (`transapp-dev.ru/payment-api/...`)
  — без CORS preflight, как и остальной payment-service API.
- Yandex Object Storage достижим из COI VM без VPN (RU-egress в RU-cloud OK,
  в отличие от VPN'а для `api.telegram.org` из ADR-015).
- GitHub API (`api.github.com`) — НЕ блокирован для RU egress, в отличие от
  Telegram. VPN-sidecar НЕ нужен.

### Container topology (без новых контейнеров)

`payment-service` уже работает; добавляем endpoints в него.
`payment-db` — добавляем таблицу через aerich-миграцию.
**Нет новых docker services** (в отличие от tradesu-moderator, где
SitePing деплоится с собственным MinIO; у нас MinIO нужен только в dev).

## Phases

Реализация дробится на 4 PR, каждый ставится отдельно, чтобы держать review-size
manageable и снижать риск.

### Phase 1: Backend foundations (PR ~1)

**Цель:** API endpoints отвечают, миграция применилась, скриншоты сохраняются.

- [ ] Yandex Object Storage bucket `transapp-feedback-screenshots` создан + IAM-ключи
      в GitHub Secrets (`S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET`,
      `S3_ENDPOINT_URL`).
- [ ] MinIO-сервис в `payment-service/docker-compose.yml` для local dev (опционально —
      можно сразу указывать prod-bucket).
- [ ] aerich-миграция `payment-service/app/migrations/models/*.py` — таблица `feedbacks`
      (поля по донорской SQLAlchemy-схеме: id, project_name, type, message, status, url,
      url_pattern, viewport, user_agent, client_id, author_*, annotations JSONB,
      screenshot_storage_key, github_issue_*).
- [ ] Tortoise модель `app/models/feedback.py` (port из SQLAlchemy).
- [ ] Litestar controllers `app/controllers/feedback.py` — 5 endpoints (POST, GET list,
      PATCH status, DELETE, GET screenshot).
- [ ] `app/services/screenshot_storage.py` — порт из donor'а; aioboto3 в pyproject.toml.
- [ ] `app/services/feedback_dedup.py` — anti-spam логика (см. подраздел ниже).
- [ ] pyproject.toml — новые deps: `aioboto3>=13.2`.
- [ ] `.env.example` — новые vars: `S3_ENDPOINT_URL`, `S3_BUCKET`,
      `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PRESIGN_TTL_SECONDS=900`,
      `FEEDBACK_RATE_LIMIT_HOURLY=5`, `FEEDBACK_RATE_LIMIT_DAILY=20`,
      `FEEDBACK_MAX_MESSAGE_LEN=2000`, `FEEDBACK_MAX_SCREENSHOT_BYTES=2097152`.
- [ ] Tests: `payment-service/tests/test_feedback_endpoints.py` — happy path + auth +
      404 + 401 + screenshot URL signing + rate-limit 429 + dedup 200-idempotent +
      message-size 413.
- [ ] Документация: `Writerside/topics/api-feedback.md` (новая страница).

**Definition of done:** `pytest` зелёный, `curl POST /payment-api/feedback` создаёт
запись в `payment_db.feedbacks` + загружает изображение в S3-bucket; `GET /screenshot`
отдаёт presigned URL; 6-й POST за час с того же `client_id` → 429; повторный POST с
тем же `(client_id, message[:200], url)` за 24 часа → 200 с тем же `feedback.id`
(idempotent), без второго Issue в GitHub.

#### Anti-spam подраздел (Phase 1)

Раз виджет показывается всем авторизованным (Resolved decisions #1), клиентский
трафик может за вечер залить GitHub Issues. Server-side ограничения:

| Механизм | Реализация | Возвращает при превышении |
|---|---|---|
| **Hourly rate-limit** | Per-`client_id` counter — `SELECT count(*) FROM feedbacks WHERE client_id = ? AND created_at > now() - interval '1 hour'`. Cheaper чем Redis, БД и так под нагрузкой; индекс `(client_id, created_at)` решает | `HTTP 429 Too Many Requests` + `Retry-After: 3600` |
| **Daily rate-limit** | Тот же запрос с интервалом `'1 day'` | `HTTP 429` + `Retry-After: 86400` |
| **Content dedup** | SHA256 от `(client_id || url || lower(message[:200]))`. Перед INSERT проверяем `SELECT id FROM feedbacks WHERE dedup_hash = ? AND created_at > now() - interval '24 hours'`. Если найден — возвращаем существующий ID (idempotent 200), GitHub Issue НЕ создаём повторно | `HTTP 200` + body существующей записи |
| **Message size** | Litestar Pydantic validation: `message: constr(max_length=2000)` | `HTTP 413 Payload Too Large` |
| **Screenshot size** | Перед `aioboto3.put_object` — `len(base64_decoded) <= 2 MB`. Клиент уже делает JPEG-compression (~500KB обычно), 2MB — generous safety margin | `HTTP 413` |
| **Annotation count** | `len(annotations) <= 50` per feedback. Защита от auto-bot, который мог бы упаковать 1000 аннотаций в один POST | `HTTP 413` |

Дополнительно в Tortoise модели:
- Колонка `dedup_hash CHAR(64) NULL` — хеш для проверки выше.
- Индекс `idx_feedback_dedup` на `(dedup_hash, created_at)` — для O(log n) lookup.
- Индекс `idx_feedback_client_window` на `(client_id, created_at DESC)` — для rate-limit lookup.

Tests (входят в Phase 1 `test_feedback_endpoints.py`):
- 6-й POST за час → 429; 7-й через 1 час → 200.
- Повторный POST с тем же контентом → 200 c прежним `feedback.id`, в GitHub не идёт.
- 21-й POST за сутки → 429 (после превышения hourly уже наперёд понятно, но проверяем
  отдельный counter).
- Message > 2000 chars → 413.
- Screenshot > 2 MB → 413.

### Phase 2: Frontend widget integration (PR ~2)

**Цель:** на staging виджет рендерится, можно создать feedback и увидеть его в списке.

- [ ] `vendor/siteping-widget-0.11.4.tgz` — копия из tradesu-moderator.
- [ ] `package.json` — `@siteping/widget: file:vendor/siteping-widget-0.11.4.tgz`.
- [ ] `src/services/feedback.ts` — axios-обёртки `createFeedback / listFeedbacks /
      updateFeedback / deleteFeedback`, использует `api` instance из `services/api.web.ts`.
- [ ] `src/feedback/sitepingStore.ts` — store-adapter, оборачивает `services/feedback.ts`,
      приводит response-shapes к `@siteping/core` типам.
- [ ] `src/feedback/pageScope.ts` — маппинг expo-router pathnames `/auto-list`,
      `/auto/[id]`, `/charges`, `/pass`, `/inn` etc. → `{ url, urlPattern }`.
- [ ] `src/components/web/FeedbackWidget.web.tsx` — React component, `useEffect` инициализирует
      `initSiteping`, deinit на unmount. `Platform.OS !== 'web'` guard. Lazy-load
      `@siteping/widget` (динамический `import()`) — не тянуть ~250KB на cold-start.
- [ ] `src/components/web/FeedbackWidget.tsx` — native stub `() => null` (по паттерну из
      ADR-DynamicTitle, см. предыдущую сессию).
- [ ] `app/_layout.tsx` — добавить `<FeedbackWidget />` в Auth-protected layout
      (после `<AppContent>`). Mount/unmount по auth-state. Без whitelist'а — виджет
      доступен всем авторизованным (Resolved decisions #1).
- [ ] Frontend handling 429 / 413 / 200-idempotent ответов от backend:
      - 429 → toast «Вы отправили слишком много жалоб. Подождите N минут.» (читаем
        `Retry-After` header), панель не открываем заново для retry.
      - 413 → toast с конкретной причиной («Сообщение слишком длинное» / «Скриншот
        слишком большой») + не сбрасывать draft в виджете.
      - 200 на повторный submit (dedup hit) → toast «Похожая жалоба уже создана,
        мы её получили» + закрыть форму.
- [ ] Tests: `src/feedback/__tests__/pageScope.test.ts` — route-matching кейсы.
- [ ] Документация: `Writerside/topics/dev-web.md` — новая секция «Feedback widget»
      (mount points, page-scope, lazy-loading rationale, anti-spam UX).

**Definition of done:** на `transapp-dev.ru` любой залогиненный пользователь видит
FAB в правом-нижнем углу. Клик → панель открывается. Создание feedback'а проходит, в
панели после refresh видно запись + миниатюру скриншота. 6-й submit подряд за час →
toast о rate-limit, форма не отправляется повторно.

### Phase 3: GitHub Issues integration (PR ~3)

**Цель:** feedback автоматически создаёт Issue в выделенном репозитории
`TransKonsalt/transapp-feedback` со ссылкой на скриншот; закрытие Issue в GitHub
синхронизирует статус.

- [ ] Создан репозиторий `TransKonsalt/transapp-feedback` (private или public —
      на усмотрение org-admin'а; рекомендую private изначально, до отладки).
- [ ] GitHub Fine-grained PAT для `TransKonsalt/transapp-feedback` (Issues:
      Read/Write — ТОЛЬКО на этот репо, не на основной `TransApp`) →
      `GH_ISSUES_TOKEN` в Secrets.
- [ ] `app/services/github_issues.py` — порт из donor'а. `asyncio.create_task` —
      fire-and-forget; не блокирует POST /feedback response.
- [ ] `app/services/github_webhook.py` — порт; HMAC-SHA256 validation через
      `GH_WEBHOOK_SECRET`.
- [ ] GitHub webhook конфигурируется в Settings → Webhooks: payload URL
      `https://transapp-dev.ru/payment-api/feedback/github-webhook`, события `Issues`.
- [ ] aerich-миграция: новые поля `github_issue_number INT NULL`, `github_issue_url TEXT NULL`.
- [ ] Frontend: панель виджета отображает «Issue #NN ↗» link (уже встроено в v0.11.4 fork).
- [ ] Tests: `test_github_issues.py` — mock httpx, проверить body Issue + retry на 5xx.
- [ ] `test_github_webhook.py` — HMAC ok / wrong signature 403 / unknown event silently 200.
- [ ] Документация: `Writerside/topics/infra-feedback-github-sync.md` (новая страница).

**Definition of done:** create feedback в staging → через 1-3 секунды Issue появляется
в GitHub с правильным title / body / labels / embed-картинкой. Закрыть Issue → через
≤30с в панели виджета `status` стал `resolved`.

### Phase 4: Production cutover + ops hygiene (PR ~4)

**Цель:** prod-secrets выставлены, миграция применилась на prod-БД, виджет работает на
production-домене (после ADR-017 cutover это будет `lk.transapp.ru`).

- [ ] Все GitHub Secrets выставлены в `TransKonsalt/TransApp` Settings → Secrets:
      `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET`, `S3_ENDPOINT_URL`,
      `GH_ISSUES_TOKEN`, `GH_WEBHOOK_SECRET`, плюс anti-spam knobs из Phase 1.
- [ ] `.github/workflows/deploy-web.yml` — env block с новыми переменными для
      payment-service.
- [ ] `yandex-cloud/docker-compose.yc.yaml` — `environment:` блок payment-service
      получает S3 + GH-переменные.
- [ ] Production CSP в `nginx/security-headers.partial.conf` проверен — `connect-src`
      разрешает `https://*.yandexcloud.net` для presigned URLs; `img-src` разрешает
      эти же домены. Если ADR-017 cutover уже завершён к этому моменту — то же самое
      на `lk.transapp.ru`-vhost'е. Это единственная coordination точка с ADR-017.
- [ ] Smoke-test через playwright: создать feedback на prod, проверить S3 upload,
      проверить Issue в GitHub.
- [ ] **Retention cron**: `payment-service/scripts/cleanup_old_feedback.py` —
      удалить S3-объекты и `feedback` rows старше **90 дней с момента `resolved_at`**
      (Resolved decisions #3). Запуск через `payment-bot` worker (раз в сутки в
      03:00 UTC), либо через GitHub Action scheduled run. Outcome логируется в
      payment-service logs (count deleted).
- [ ] **Решение об upstream sync** (Resolved decisions #7 — отложено до этой Phase):
      посмотреть, насколько fork drift'ует от upstream за время Phase 1-3; если
      существенно — скопировать `sync-upstream.yml` из tradesu-moderator. Если
      незначительно — оставить версию pin'утой, делать sync manual'но раз в квартал.
- [ ] ADR-018 в `Writerside/topics/decision-log.md` — обзор интеграции, alternatives,
      consequences, decision-trace для всех 7 resolved questions.

**Definition of done:** на production-домене (или `lk.transapp.ru` после ADR-017
cutover'а) любой авторизованный пользователь может оставить feedback; Issue в
`transapp-feedback` репозитории появляется в течение 5 секунд; retention cron
удаляет старые объекты в S3.

## Future: extraction into shared feedback service

Резолюция #4 принимает payment_db как стартовый storage; долгосрочно — выделить
SitePing-backend в **отдельный микросервис** (`feedback-service`), который сможет
обслуживать сразу несколько проектов TransKonsalt (TransApp, tradesu-moderator, и
будущие проекты).

Эта секция — не commitment, а ориентир для design-решений в Phase 1-3, чтобы не
зацементировать в коде допущения, которые потом дорого распутывать.

### Triggers для extraction'а

Делаем extraction когда:

- **Появится 3-й проект**, которому нужен widget. До этого — 2 интеграции
  (tradesu-moderator + TransApp) живут со своими копиями backend'а, что
  acceptable.
- **payment_db размером > N GB** где feedback таблица доминирует. Пока feedback
  пишет ~10 строк/день — это не проблема; при росте до тысяч в день и крупных
  скриншотах — стоит выделить.
- **Federated identity** между проектами потребуется. Пока каждый проект имеет
  свою auth-систему; если когда-то появится SSO между ними, общий feedback
  store естественно превращается в сервис.

### Architectural choices для облегчения extraction'а сейчас

В Phase 1 кодируем с учётом того, что код **потенциально переедет** в отдельный
сервис:

| Decision сейчас | Зачем |
|---|---|
| `feedback_*` таблицы НЕ имеют foreign keys на `payment_*` таблицы | Чистая граница; в extraction'е таблицы переезжают без FK fix-up |
| `app/controllers/feedback.py`, `app/models/feedback.py`, `app/services/screenshot_storage.py`, `app/services/feedback_dedup.py`, `app/services/github_*.py` — изолированный модуль с минимальными внешними зависимостями | При extraction'е — `git mv` всего модуля в новый репо, минимум переписывания |
| `project_name` — обязательное поле в каждой записи (не подразумеваем «всё что в этой БД — TransApp») | Multi-tenancy с первого дня — будущему сервису не нужно мигрировать данные |
| Auth — opaque token check (не лезем в payment-service `auth/`) | Service-level: дать feedback-service возможность валидировать токен через callback к owning проекту (без знания внутренней auth-логики) |
| Configuration — все feedback-specific через ENV (S3_*, GH_*, FEEDBACK_RATE_LIMIT_*) | При extraction'е — берётся `env` block as-is |

### Что НЕ предусматриваем сейчас

- gRPC API между проектами — overkill, REST + проектный токен достаточно.
- Multi-region storage — Yandex Object Storage в `ru-central1` для всех проектов.
- Schema versioning — feedback shape стабилен в upstream v0.11.x.

Когда дойдём до extraction'а — это будет отдельный план, отдельный ADR.

## Mobile native gap — future consideration

Mobile native пользователи TransApp (iOS / Android из EAS-build'а) **не видят
SitePing виджет** — html2canvas требует DOM, недоступного в RN native. По
Resolved decisions #5 это **намеренно** и не лечится в MVP.

Когда станет понятен трафик жалоб от mobile native (через ADR-012
`/data-issues/report` поток + поддержку), можно рассмотреть один из вариантов:

| Вариант | Pros | Cons |
|---|---|---|
| **Расширить ADR-012** на не-провайдерные категории (новый `category: 'ui-bug'`) | Минимум новой инфры; уже есть TG-алертинг + БД-схема | Без скриншотов; UX «выбери категорию из dropdown'а» хуже визуального выделения |
| **Native screenshot via react-native-view-shot** + own form UI | Скриншоты есть; UX знакомый | Новый flow, новый screen, новые тесты; пересекается с SitePing-backend'ом |
| **Webview-обёртка SitePing'а** в native app | Переиспользуем backend; web-UX as-is | Webview-perf плох, иконка-FAB в нативном UI неестественна |
| **Ничего не делать** (текущий MVP) | Никакой работы | Mobile-users остаются без channel для UI-багов |

Решение откладываем до данных по трафику; обновим этот раздел после Phase 4
deployment'а на production и месяц наблюдений.

## Risks

| Риск | Mitigation |
|---|---|
| **Bundle size** виджета (~250 KB бандл) тянет cold-start страницы | Lazy `import('@siteping/widget')` после первой interaction (FAB hover); виджет не на critical path |
| **html2canvas совместимость** с RN-Web layout (transform: matrix, position: absolute от RN-Web компиляции) | Smoke-тест в Phase 2 на нескольких страницах; fallback — submit без скриншота (backend поддерживает) |
| **Yandex Object Storage credentials leak** через access logs | Presigned URL имеет TTL 15 min; ключи в Secrets, никогда не в коде; `S3_BUCKET` — не secret, остальное — secret |
| **GitHub Issues spam** при all-users-visible виджете | Многоуровневый: (1) rate-limit per `client_id` — 5/час, 20/день, 429 при превышении; (2) content dedup — SHA256 от `(client_id, url, message[:200])` за 24 часа, idempotent 200; (3) message ≤ 2000 chars, screenshot ≤ 2 MB; (4) отдельный repo `transapp-feedback` изолирует шум от основного `TransApp` workflow. См. подраздел Anti-spam в Phase 1 |
| **Upstream fork breakage** (SitePing рефакторят upstream без warning'а) | Версию pin'аем (`file:vendor/siteping-widget-0.11.4.tgz`), не auto-update. Sync только осознанно через PR |
| **CORS / CSP** для inline скриншотов в GitHub Issue body (Camo proxy) | `screenshot_storage_url` отдаём presigned **S3-direct URL** (не наш домен), Camo prefetch без auth. Тест в Phase 3 |
| **Mobile native пользователи не видят виджет** | Документируем что это **по дизайну**, ADR-012 продолжает работать. Возможно — отдельный mobile feedback UI |
| **payment-service вес растёт** (5+ контроллеров уже), feedback-эндпоинты добавляют ещё | Acceptable trade-off: 1 микросервис на TransApp пока meets needs; разделять преждевременно. Если контроллеров станет 10+ — рассмотреть split |

## Acceptance criteria

После Phase 4 closed:

1. **Любой** авторизованный пользователь на `transapp-dev.ru` (или production-домене,
   когда cutover закончится) видит FAB-кнопку в правом-нижнем углу.
2. Клик → панель открывается, ru-локализация корректная, segment-control «Эта
   страница / Этот тип / Все» работает.
3. Создание feedback'а: написать текст + (опционально) выделить элемент DOM →
   submit → панель показывает запись в списке, миниатюра скриншота загружается.
4. GitHub Issue создаётся в репозитории целевого `*-feedback` (если такой выберем)
   в течение 5 секунд после submit'а. В body Issue: текст + page URL + автор +
   embed-картинка через Camo proxy.
5. Закрытие Issue в GitHub → через ≤60с в БД `feedback.status = 'resolved'`,
   виджет это отображает на refresh'е.
6. Скриншоты в Yandex Object Storage, presigned URL отвечает 200, expires 15 min.
7. Mobile native users в `Platform.OS !== 'web'` ветке — никакого виджета (нет
   ошибок в console, нет invisible-DOM элементов).
8. Полный pytest suite зелёный (`pytest payment-service/tests/`).
9. ADR-018 + 3 новых Writerside топика merged в master.

## Кросс-ссылки

- ADR-012 — Data quality reporting (`/data-issues/report`, mobile-приоритет). Тот канал
  остаётся для жалоб клиентов на качество данных от провайдеров — пересечений нет.
- ADR-005 — Shared UI sub-components. SitePing виджет не shared — это сугубо web.
  Native использует `FeedbackWidget.tsx → () => null` stub.
- ADR-017 / план `2026-05-06-lk-transapp-cutover.md` — после cutover'а виджет
  автоматически работает и на `lk.transapp.ru`.
- ADR-015 / план `2026-05-04-tg-vpn-sidecar.md` — VPN для Telegram. SitePing
  использует GitHub API (доступен напрямую) + Yandex Object Storage (RU-egress
  в RU-cloud). VPN-sidecar НЕ нужен.

## Notes / followups

- Anti-spam уже в Phase 1 (см. подраздел), так как виджет с первого дня показывается
  всем авторизованным (Resolved decisions #1). После production-deploy'я наблюдать
  за hourly/daily rate-limit hit'ами в логах payment-service — если порог 5/час
  окажется слишком низким для legitimate use case'ов (управляющий автопарком из 100+
  машин может реально иметь 10+ жалоб за час), поднять до 10/час; если слишком
  высоким — снизить.
- В далёком будущем — Mobile SDK SitePing (если когда-то появится в upstream'е).
  Сейчас upstream — web-only. Mobile gap см. в секции «Mobile native gap» выше.
- Возможная интеграция с notifications: при resolved Issue → push клиенту, который
  оставил feedback («Ваша заявка решена»). Не для MVP, рассмотреть после Phase 4.
- Возможная аналитика по feedback'ам: dashboard в самой админке tradesu-moderator
  показывает agg-метрики (открытых жалоб, среднее time-to-resolve, hot pages).
  Адаптировать под TransApp в Phase 5+.
