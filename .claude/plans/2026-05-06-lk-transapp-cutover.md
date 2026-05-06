# Cutover legacy `lk.transapp.ru` → новый Expo Web (cohabitation strategy)

## Status

**Draft** (2026-05-06). Ready for approval. Implementation gated on
coordination with Иван (legacy server admin) и заказа SSL-cert на
`lk.transapp.ru` в Yandex Cloud Certificate Manager.

После approval — оформляется как **ADR-017** в `decision-log.md`, основной
operational artifact = этот файл.

## Цель

Перевести веб-пользователей TransApp (внутренние коллеги +
менеджеры с клиентами) с legacy веб-стека (`transappweb/`, React 19 + plain
JS, на сервере коллеги Ивана `185.76.253.6`) на новый Expo Web стек
(RN 0.81 + Expo SDK 54 + TypeScript, развёрнутый на YC COI VM
`81.26.191.68`), фактически работающий сейчас на staging-домене
`transapp-dev.ru`.

## Стратегия: soft cohabitation через legacy-редирект + cookie bypass

В отличие от hard DNS swap'а:

1. **Legacy nginx начинает 301-редирект** всех запросов с `lk.transapp.ru`
   на `transapp-dev.ru` (наш новый стек) — кроме запросов с cookie
   `ta_use_legacy=1`.
2. **На новом стеке появляется кнопка** "Вернуться в старый интерфейс" в
   шапке. Клик → переход на `https://lk.transapp.ru/use-legacy` → legacy
   nginx ставит cookie `ta_use_legacy=1` и отдаёт legacy index. Пока
   cookie живёт — legacy не редиректит этого юзера.
3. **Сбор обратной связи** через существующий механизм `data-issues` (PR
   #21 + #23): добавляем 7-ую категорию `interface_feedback`, расширяем
   экран "Обратная связь" соответствующим разделом. Жалобы и пожелания
   уходят в TG админу через `payment-bot`.
4. **Когда feedback стабилизируется** (subjective trigger: большинство
   не пользуется bypass'ом, критичных багов нет несколько дней) —
   делаем **DNS swap** `lk.transapp.ru → 81.26.191.68`. Наш nginx уже
   обслуживает оба домена через SAN-cert.
5. **Post-swap**: `transapp-dev.ru` отключается (наша сторона); legacy
   VM гасит Иван на своё усмотрение, нас это не касается.

Преимущество подхода: пользователи мигрируют **естественно**, без
объявлений и баннеров; те, кому новый стек не подходит, имеют
односторонний (через cookie) escape-hatch на legacy; cutover становится
формальным DNS swap'ом после фактической миграции.

## Ground truth (verified 2026-05-06)

| Аспект | Факт | Источник |
|--------|------|----------|
| Backend | Один общий у Ивана, обслуживает и `transapp.ru/api/`, и `lk.transapp.ru/api/`, и `ivan.trans-konsalt.ru/api/` | `nginx/nginx.prod.conf:37, 102`; подтверждено пользователем |
| Firebase project | Один: `transapp-d3b24` для legacy web, нового веб, Android, iOS | `transappweb/public/firebase-messaging-sw.js:7`, `google-services.json`, `GoogleService-Info.plist`, `src/config/firebaseWebConfig.ts` (через env) |
| Push pipeline | Полностью функционален на новом стеке: token регистрируется через `/set-fcmtoken`, тестовый push из Firebase Console доходит | Console-логи пользователя 2026-05-06 + личное подтверждение |
| Mobile | Опубликован в App Store (iOS bundle `org.reactjs.native.example.Transappru`) и Google Play (Android `com.transappru`); сборки локальные на Mac разработчика; ходит на `https://transapp.ru/api/` напрямую, **не зависит от веб-домена** | `app.json:19,34`, `android/app/build.gradle:91-93`, `ios/TransApp.xcodeproj/project.pbxproj:409,451`, `src/services/api.ts:6` |
| `payment.transapp.ru` | Placeholder в `src/services/api.ts:18` ("Пример URL для продакшена"), не существует в DNS, никогда не использовался | `src/services/api.ts:18` |
| Authorized domains в Firebase | Не нужны — мы Firebase Authentication не используем | Подтверждено: push на `transapp-dev.ru` работает |
| `transapp-dev.ru` | Staging-домен с production-mode build; deploy из master через `.github/workflows/deploy-web.yml`; smoke-tests захардкожены на этот домен | `.github/workflows/deploy-web.yml:217+` |
| Payment-service + StrongSwan VPN sidecar | В production-mode на VM, TG-egress работает через VPN (ADR-015) | PR #26 + #27 + #29 |
| MAIN_API URL | Mobile: `https://transapp.ru/api/` напрямую. Web (через наш nginx): `https://{hostname}/api/` → proxy_pass на `ivan.trans-konsalt.ru` | `src/services/api.ts:6`, `src/services/api.web.ts:7-12`, `nginx/nginx.prod.conf:37, 102` |

## Что НЕ нужно делать (явные не-цели)

- **Не нужно** менять nginx upstream — он уже корректно проксирует на
  единственный backend Ивана.
- **Не нужно** добавлять `lk.transapp.ru` в Firebase Authorized domains —
  мы Firebase Auth не используем.
- **Не нужно** трогать mobile — приложение независимо от веб-домена.
- **Не нужно** баннеров/email/TG-уведомлений пользователей перед
  cutover'ом — решено пользователем (минималистичный подход).
- **Не нужно** создавать `payment.transapp.ru` — это placeholder, не
  актуальная цель.
- **Не нужно** заводить промежуточный `app.transapp.ru` — без
  тестировщиков (в роли QA выступают сами менеджеры с клиентами) этот
  домен не имеет ценности.

## External dependencies (на коллегу Ивана)

Coordination через helpdesk-тикет. Нужны три действия от Ивана:

### D1 — Cookie-based redirect на legacy nginx (185.76.253.6)

Запрашиваемая конфигурация (примерно — точный синтаксис под используемую
у Ивана версию nginx):

```nginx
server {
    server_name lk.transapp.ru;

    # Endpoint для возврата в legacy: ставит cookie + отдаёт index
    location = /use-legacy {
        add_header Set-Cookie "ta_use_legacy=1; Path=/; Max-Age=2592000; SameSite=Lax";
        return 200 '<html><meta http-equiv="refresh" content="0;url=/"></html>';
        # Альтернативно: вернуть index.html legacy веба напрямую
    }

    # Если у пользователя cookie — отдаём legacy без редиректа
    if ($cookie_ta_use_legacy = "1") {
        # break — то есть продолжаем нормальный flow
    }

    # Иначе — 301 на новый стек
    if ($cookie_ta_use_legacy != "1") {
        return 301 https://transapp-dev.ru$request_uri;
    }

    # ... existing legacy config (root, location /, etc.) ...
}
```

**Альтернативы** на случай если Иван не готов работать с cookie в nginx
(перечислены по предпочтительности — первый вариант приоритетный):

- **Path-based bypass**: `https://lk.transapp.ru/legacy/` не редиректится,
  отдаёт legacy. Кнопка на новом стеке ведёт на этот путь. Минус: legacy
  должна уметь работать из под `/legacy/*` префикса (либо internal
  rewrite в nginx).
- **Query-based bypass**: `https://lk.transapp.ru/?legacy=1` не
  редиректится. Минус: query теряется при первой навигации внутри
  legacy, юзер заново попадает на редирект → нужен Set-Cookie от
  legacy при первом ответе с этим query.

В любом из трёх вариантов важно: **редирект включается одновременно
с merge'ом нашего PR с кнопкой** (см. Phase 1 ниже), иначе кнопка ведёт в
никуда или сразу зацикливается.

### D2 — DNS A-record swap

Когда мы дадим сигнал (после стабилизации feedback): сменить A-record
`lk.transapp.ru` с `185.76.253.6` (legacy VM) на `81.26.191.68` (наш YC
VM). Текущий TTL — не наша забота, оставляем как есть (rollback-окно
определяется этим TTL, принимаем риск).

### D3 — Гасит legacy VM по своему усмотрению

После DNS swap'а трафик с `lk.transapp.ru` идёт на нашу VM. Legacy VM
больше не получает запросов (за исключением вкладок, которые висят с
cookie у юзеров — но они уже не редиректятся, и постепенно
естественно закроются). Когда Ивану удобно — выключает.

## Pre-flight checklist (наша сторона, code changes)

Sequenced по порядку реализации. Каждый пункт = отдельный PR.

### PR-A: Header-кнопка "Вернуться в старый интерфейс"

**Files**:
- `src/blocks/Header.tsx` (или эквивалент `src/components/Header.tsx`) —
  добавить кнопку рядом с существующими элементами шапки. Видна только
  когда `Platform.OS === 'web'`.
- При клике: `window.location.href = 'https://lk.transapp.ru/use-legacy'`
  (для cookie-based) или `https://lk.transapp.ru/legacy/` (path-based)
  или `https://lk.transapp.ru/?legacy=1` (query-based) — финальный URL
  определяется ответом D1 от Ивана.
- Конкретный URL вынести в env-var `EXPO_PUBLIC_LEGACY_BYPASS_URL`,
  default — cookie-based вариант. Это позволяет переключиться на
  fallback без code-redeploy, только rebuild.

**Test**:
- Unit-тест на показ кнопки в web Platform.
- Manual: на `transapp-dev.ru` после deploy — клик → попадаешь на legacy.

### PR-B: Категория `interface_feedback` в data-issues

**Files**:
- `payment-service/migrations/003_interface_feedback_category.sql` —
  ALTER на ENUM `data_issue_category` (если ENUM) или просто новое
  значение в string-поле (зависит от текущей схемы; см.
  `payment-service/migrations/002_data_issues_and_notice.sql`).
- `payment-service/app/models/data_issues.py` — добавить enum-value
  `INTERFACE_FEEDBACK`.
- `payment-service/app/controllers/data_issues.py` — обновить валидацию
  category (если whitelist).
- `payment-service/app/services/payment_bot.py` — TG-карточка для новой
  категории (другой emoji + текст для админа).
- `src/components/DataIssueReportButton.tsx` — добавить 7-ую категорию
  в dropdown.
- `src/services/dataIssues.ts` — type-update.
- `src/screens/FeedbackScreen.tsx` (или эквивалент экрана "Обратная
  связь") — добавить раздел "Обратная связь по новому интерфейсу" с
  preset'ом категории `interface_feedback`.

**Tests**:
- `payment-service/tests/test_data_issues_interface_feedback.py` — POST
  с category=interface_feedback, проверка persistence + что
  payment-bot получает уведомление.
- Frontend: extend MSW handlers + smoke-тест компонента.

**Documentation**:
- `Writerside/topics/api-payment.md` — добавить новую категорию в
  endpoint docs.
- `Writerside/topics/dev-mobile.md` — описать раздел экрана.

### PR-C: SAN SSL cert + nginx server_name для cohabitation

**Pre-requisite**: Заказ SAN-cert в Yandex Certificate Manager на
`transapp-dev.ru` + `lk.transapp.ru` (один cert на оба домена). Текущий
cert `fpqj50bofmtu8012f0k0` только на `transapp-dev.ru`, нужен новый.

**Files**:
- `nginx/nginx.prod.conf:47` — `server_name transapp-dev.ru lk.transapp.ru;`
  (сейчас `_`, что ловит любой хост — но семантически правильно
  перечислить явно).
- `yandex-cloud/docker-compose.yc.yaml` — обновить cert volume на новый
  cert ID.
- `.github/workflows/deploy-web.yml` — secret `YC_CERT_ID` обновить.
- `.github/workflows/deploy-web.yml:217+` — обновить smoke-тесты:
  добавить такие же проверки для `https://lk.transapp.ru/` и
  `/payment-api/calculate-commission`. Параметризовать домен
  переменной `SMOKE_DOMAIN` если нужно держать оба.

**Tests**:
- Smoke-тесты после deploy сами себя валидируют.

**Documentation**:
- `Writerside/topics/infra-deployment.md` — обновить DNS strategy
  section (Phase 2/3 → реальный план); добавить упоминание cookie-bypass
  механизма.

**Важно**: PR-C можно мерджить **до** PR-A/PR-B, потому что server_name
шире текущего `_` ничего не ломает (трафика на `lk.transapp.ru` ещё нет
до Phase 3 ниже). Но cert должен быть готов **до** Phase 4 (DNS swap).

## Cutover phases (sequenced)

### Phase 0 — Approval + helpdesk ticket (T-N)

- Approval этого плана (через PR в master).
- Helpdesk-тикет Ивану с тремя задачами D1/D2/D3 + ссылкой на этот
  файл в master.
- Параллельно: запрос SAN-cert в YC Certificate Manager.

### Phase 1 — Подготовить наш стек (T-M)

- Реализовать PR-A (header button) и PR-B (interface_feedback category).
- Замерджить и задеплоить на `transapp-dev.ru`.
- Проверить: кнопка "Вернуться в старый интерфейс" видна, экран
  обратной связи имеет нужный раздел, POST на `/data-issues/report`
  с `category=interface_feedback` доходит до TG.
- Кнопка пока ведёт на URL, который ещё не работает (legacy редирект
  не включён) — это ОК, ссылка просто не сработает корректно.

### Phase 2 — SAN cert + nginx cohabitation (T-K, parallel to Phase 1)

- Получить SAN cert от YC.
- PR-C: nginx server_name + cert + smoke-тесты.
- Deploy. Validate: `https://transapp-dev.ru/` всё ещё работает; smoke
  тесты проходят. `https://lk.transapp.ru/` пока недостижим (DNS ещё
  на legacy IP), но наш nginx готов его обслужить.

### Phase 3 — Soft launch: Иван включает редирект на legacy (T-day)

- Иван применяет конфиг D1.
- Подтверждаем: открытие `https://lk.transapp.ru/` в свежем браузере
  (без cookie) → 301 → `https://transapp-dev.ru/` → новый стек.
- Подтверждаем: кнопка "Вернуться в старый интерфейс" → ставит cookie
  → `https://lk.transapp.ru/` теперь отдаёт legacy.
- Подтверждаем: повторное открытие любой страницы `lk.transapp.ru/*` с
  cookie — отдаёт legacy.
- Очистка cookie в DevTools → следующий заход редиректит снова на
  новый стек.

### Phase 4 — Период наблюдения и сбора feedback (T+1 .. T+N days)

- Мониторим:
  - Долю запросов с/без cookie на legacy nginx (если Иван даст логи
    или метрики).
  - Поток `interface_feedback` в TG через payment-bot.
  - Critical errors в payment-service / нашем nginx.
  - 5xx в browser DevTools (через Telegram-feedback от первых
    юзеров).
- Закрываем критичные баги по мере поступления (через обычный
  feature-PR flow).
- **Триггер для Phase 5**: subjective — несколько дней без новых
  жалоб, доля cookie-bypass'a минимальна (если есть данные), confidence
  что новый стек справляется с prod-нагрузкой.

### Phase 5 — DNS swap (T+N day)

- Координация с Иваном: меняет A-record `lk.transapp.ru →
  81.26.191.68` (D2).
- Ждём propagation (зависит от TTL у Ивана; не наша забота, принимаем
  как есть).
- Smoke-тесты CI на `https://lk.transapp.ru/` (если уже параметризовали
  в Phase 2 — автоматически).
- Manual smoke: открытие `https://lk.transapp.ru/` в свежем браузере →
  попадаем сразу на новый стек (без redirect через `transapp-dev.ru`).
- Cookie `ta_use_legacy=1` у юзеров перестаёт работать (наш nginx её
  не знает), все попадают на новый стек. Это финальный шаг
  миграции — выхода в legacy больше нет.

### Phase 6 — Cleanup (T+N+grace)

- Иван гасит legacy VM на своё усмотрение (D3, не наш контроль).
- На нашей стороне:
  - PR-D: убрать кнопку "Вернуться в старый интерфейс" из шапки (legacy
    больше нет, кнопка ни к чему).
  - PR-E: отключить `transapp-dev.ru` — снять A-record (если у нас, или
    просим того, кто его держит); не продлевать его cert; обновить
    `.github/workflows/deploy-web.yml` smoke-тесты (использовать только
    `lk.transapp.ru`); обновить nginx server_name (только
    `lk.transapp.ru`).
  - Update `Writerside/topics/project-dashboard.md` Current Focus —
    убрать staging row, отметить cutover как Done.
  - Update `Writerside/topics/infra-deployment.md` — финальный state.
  - Закрыть ADR-017 как Implemented.

## Rollback procedures

### Rollback из Phase 3 (soft-launch не работает)

- Просим Ивана **снять редирект** в legacy nginx. Возвращаем legacy
  как primary. Наш стек остаётся на `transapp-dev.ru`.
- Мы не ломали ничего у себя — никаких deploy'ев откатывать не нужно.
- Re-attempt после фикса проблемы.

### Rollback из Phase 5 (после DNS swap критический баг)

- Иван возвращает A-record `lk.transapp.ru → 185.76.253.6` (если
  legacy VM ещё жива и legacy nginx ещё умеет редиректить).
- Окно rollback'а определяется TTL DNS-записи (если 3600s — час;
  если 300s — 5 минут). TTL не наша забота, принимаем как есть.
- Если legacy VM уже погашена (D3 уже выполнен) — rollback невозможен,
  fix-forward единственный путь.

### Cookie-cleanup для тестирования

- В DevTools: Application → Cookies → `lk.transapp.ru` → удалить
  `ta_use_legacy`.
- Cookie's Max-Age = 30 дней (`Max-Age=2592000` в D1) — у юзера, который
  активно пользуется legacy, cookie перевыставляется при каждом visit'е.

## Risk register

| # | Риск | Severity | Mitigation |
|---|------|----------|------------|
| R1 | Cookie-bypass не работает на стороне legacy nginx (Иван не настроит правильно) | Medium | Fallback на path-based или query-based bypass; URL вынесен в env-var, переключаемся без code-deploy |
| R2 | После DNS swap пользователи логаутятся (origin-scoped storage `lk.transapp.ru` ≠ `transapp-dev.ru`) | Medium | Естественный re-login, не сообщаем заранее; решено пользователем что баннер не нужен |
| R3 | Старый Service Worker от legacy остаётся зарегистрирован у юзеров, может влиять на push delivery | Low | Один Firebase project, push приходит независимо от того, какой SW активен; постепенно вытесняется новым SW |
| R4 | Cookie экспирируется через 30 дней → юзер автоматически попадает на новый стек, может растеряться | Low | 30 дней — достаточно для решения "новый интерфейс не подходит"; cookie перевыставляется при каждом визите |
| R5 | Нагрузка на нашу VM (2 vCPU / 4GB) при добавлении prod-трафика | Medium | Мониторить; при необходимости — upgrade VM в YC (одна ручка в Console) |
| R6 | Backend Ивана меняет своё поведение под нагрузкой нового стека (он раньше получал запросы только от legacy веб) | Low | Запросы идентичные — `Api.web.ts` шлёт те же endpoint'ы что legacy; payload-формат сохранён |
| R7 | DNS rollback окно слишком большое из-за высокого TTL | Accepted | Не наша забота (по решению пользователя); fix-forward как primary стратегия |

## Open items / TBD

Эти пункты не блокируют approval плана, но должны быть закрыты до
соответствующих phase'ов:

- **TBD-1**: Точный URL для bypass'a — определяется ответом Ивана на D1.
  По дефолту (cookie): `https://lk.transapp.ru/use-legacy`. Зашиваем в
  `EXPO_PUBLIC_LEGACY_BYPASS_URL`.
- **TBD-2**: Cookie TTL — предлагается 30 дней (`Max-Age=2592000`). Может
  быть скорректировано по UX-соображениям после Phase 3.
- **TBD-3**: Триггер Phase 5 (DNS swap) — subjective, "большинство не
  пользуется bypass'ом, нет critical bugs". Конкретные метрики
  определим на ранних днях Phase 4.
- **TBD-4**: Конкретный порядок merge'a PR-A/PR-B/PR-C — все
  независимы, можно параллельно. Главное чтобы PR-C (cert + nginx) был
  готов до Phase 5.

## ADR

После approval — создать **ADR-017** в `Writerside/topics/decision-log.md`:

> **ADR-017**: Soft cohabitation cutover для веб-стека `lk.transapp.ru`
>
> **Decision**: Перевод пользователей с legacy на новый Expo Web стек
> через soft redirect + cookie bypass + DNS swap по факту миграции,
> вместо hard DNS swap.
>
> **Rationale**:
> - Без тестировщиков (роль QA — менеджеры с клиентами в реальной
>   работе) hard cutover слишком рискован.
> - Cookie bypass даёт пользователям односторонний escape-hatch без
>   нашей координации.
> - DNS swap откладывается до фактической стабилизации, превращаясь в
>   формальный финальный шаг.
>
> **Consequences**:
> - Зависимость на координацию с Иваном (legacy server admin) на двух
>   шагах: D1 (включить редирект) и D2 (DNS swap).
> - Период cohabitation создаёт временную инфра-сложность (два домена,
>   SAN-cert, мониторинг двух эндпойнтов).
> - Минимальная коммуникация с пользователями (по их же решению — без
>   баннеров и уведомлений).
>
> **Implementation**: см. `.claude/plans/2026-05-06-lk-transapp-cutover.md`.
