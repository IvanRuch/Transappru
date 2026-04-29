# Payment API path cleanup — `/payment-api/api/...` → `/payment-api/...`

**Status:** ready (awaiting approval)
**Rollout decision:** single PR — никакой координации с Kazna не требуется (см. «Webhook reality» ниже)
**Mobile URL decision:** не трогаем `api.ts:18` в этой итерации — переключим в Phase 2 cohabitation
**Owner:** —
**Created:** 2026-04-29
**Related:**
- Tech-debt note in `Writerside/topics/infra-deployment.md:672` ("Payment endpoint path conventions")
- Dashboard 2026-04-28 entry in `Writerside/topics/project-dashboard.md:22`
- **Kazna API spec (single source of truth по контракту):** [https://tprs.ru/KaznaAPI.pdf](https://tprs.ru/KaznaAPI.pdf), а также её локально извлечённая markdown-версия `docs/KaznaAPI.md` (5966 строк, удобно искать). Зафиксировано в `Writerside/topics/api-payment.md` и `dev-payment-flow.md`.

## Problem

Сегодня единственный реально работающий публичный путь к платёжному сервису — `https://transapp-dev.ru/payment-api/api/<endpoint>` (двойной `/api`). Это:

1. **Косметически уродливо** — двойной префикс, который виден во всех URL и логах.
2. **Симптом скрытого web-prod бага.** Web-prod клиент (`src/services/api.web.ts:23`) использует `baseURL = https://${hostname}/payment-api` (**без** `/api`), а вызовы (`src/services/payment.ts:42-133`) идут как `/calculate-commission`. Итоговый запрос — `https://host/payment-api/calculate-commission` — после nginx-strip приходит на upstream как `/calculate-commission` и не матчится Litestar контроллером (`PaymentController.path = "/api"`). Это вернёт 404 у первого же реального пользователя, который попробует оплатить через web. Подтверждённый стейджевый smoke (`curl …/payment-api/api/calculate-commission`) использовал «правильный» двойной префикс, поэтому баг до сих пор не сработал.
3. **Источник трёх несогласованных конфигураций клиентов:**
   - `api.ts:18` (mobile prod) — `https://payment.transapp.ru/api` (с `/api`)
   - `api.ts:13-15` (mobile dev) — `http://10.0.2.2:8001/api` / `http://localhost:8001/api` (с `/api`)
   - `api.web.ts:21` (web localhost) — `http://localhost:8001/api` (с `/api`)
   - `api.web.ts:23` (web prod) — `https://${hostname}/payment-api` (**без** `/api`) ← рассогласовано

## Goal

Один консистентный публичный URL-шейп для платёжного сервиса:

```
Local (mobile + web):  http://localhost:8001/api/<endpoint>
Staging  (web):        https://transapp-dev.ru/payment-api/<endpoint>
Staging  (mobile):     то же, после Phase 2 cohabitation (app.transapp.ru/payment-api/...)
Production (web):      https://<prod-host>/payment-api/<endpoint>
```

Внутренние Litestar роуты остаются под `/api/` (namespace для будущих `/health`, `/docs`, `/admin`, etc.).

## Webhook reality (важный контекст — заменяет прошлые «блокеры»)

Ранее в этом плане я предполагал, что Kazna зарегистрировала наш `/api/notify` URL и смена nginx-префикса сломает входящие webhook-и. Это **неверно**. Реальность подтверждена прямой работой с `docs/KaznaAPI.md` (локальная markdown-версия Kazna PDF):

1. **У Kazna два независимых push-канала**, конфигурируемых раздельно через персонального менеджера:
   - **`notify`** (раздел 3.4 PDF) — push о финальном статусе **платежа транзакции** (auth/cancel) после нашего метода `pay`.
     > «Уведомление отправляется на url с авторизационным токеном, **которые должны быть предоставлены Партнером** для отправки Сервисом уведомлений».
   - **`subscribeNotify`** — push о новом/изменённом/оплаченном/аннулированном **начислении** (штрафе) по подписке `subscribe`.
     > «Для активации подписки **Партнеру необходимо предоставить менеджеру список типов уведомлений… и url для отправки Сервисом уведомлений**».
2. **Сегодня у Kazna зарегистрирован только subscribeNotify URL — на legacy backend** `https://transapp.ru/api/kazna-api-update-fines` (подтверждено колегой 2026-04-29; реальный sample batch-payload-а зафиксирован в `api-payment.md`). Это и обеспечивает поток «штраф появился» к пользователю через legacy.
3. **Канал `notify` для нашего payment-service у Kazna, по всей видимости, не настроен** ни под legacy, ни под наш стейдж. Прямое свидетельство — ровно тот же PDF: «Доставка по `notify` не является гарантированной, для получения статуса платежа необходимо использовать метод `paymentinfo`». Наш payment-service сегодня и делает именно это: `GET /api/payment-status/{id}` polling-ом ходит в `kazna_service.get_payment_info()` (`payment-service/app/controllers/payment.py:127-136`). Это и есть рекомендованный самим Kazna паттерн. См. ADR-008 в decision-log.

**Следствие для этого PR:** менять nginx-префикс на нашей стороне можно свободно. Kazna про `transapp-dev.ru` сегодня не знает, ничего туда не шлёт. Координация с менеджером Kazna откладывается до Phase 3 cutover-а (когда мы реально перенесём боевые платежи на нашу инфру и попросим зарегистрировать `notify` URL).

## Approach — nginx-side fix (Option A)

Сравнение вариантов и обоснование выбора см. в чате 2026-04-29.

**Суть:** nginx будет проксировать `/payment-api/` → upstream-путь `/api/` (вместо `/`). Litestar никаких изменений не получает — поэтому риск регрессии сводится к одной директиве `proxy_pass` (изменённой синхронно в двух файлах).

### Diff (псевдо)

```diff
# nginx/nginx.prod.conf  (HTTP-only fallback)
  location /payment-api/ {
-     proxy_pass http://payment-service:8000/;
+     proxy_pass http://payment-service:8000/api/;
      ...
  }

# nginx/docker/entrypoint.sh  (HTTPS heredoc, prod-путь)
  location /payment-api/ {
-     proxy_pass http://payment-service:8000/;
+     proxy_pass http://payment-service:8000/api/;
      ...
  }
```

### Web-клиент

`src/services/api.web.ts:18-24` **не меняется** — он уже зовёт правильный публичный шейп (`/payment-api/<endpoint>` без `/api`). Web-prod баг чинится автоматически благодаря смене nginx-конфига.

### Mobile-клиент

`src/services/api.ts:18` хардкодит `https://payment.transapp.ru/api` для prod-сборок. Этот URL сегодня не резолвится (см. dashboard 2026-04-26). Менять его в текущем PR не нужно — он будет переделан в Phase 2 cohabitation на `https://app.transapp.ru/payment-api`. В этом плане только зафиксировать в комментарии TODO (можно прямо в `api.ts:18`): «при Phase 2 переключить на `/payment-api/`, без `/api`».

## Files to change

| Файл | Изменение |
|------|-----------|
| `nginx/nginx.prod.conf` | `proxy_pass http://payment-service:8000/;` → `.../api/;` |
| `nginx/docker/entrypoint.sh` | то же в heredoc HTTPS-конфиге |
| `payment-service/tests/test_notify_endpoint.py` | **новый файл** — pytest-кейсы на `/api/notify` (см. ниже) |
| `Writerside/topics/infra-deployment.md` | строка-tech-debt снимается; запись в changelog с датой |
| `Writerside/topics/api-payment.md` | примеры `curl` без двойного `/api`; уже добавлены References на PDF; пометить `/api/notify` как «reserved до Phase 3 cutover» |
| `Writerside/topics/dev-payment-flow.md` | пояснение текущего состояния webhook-маршрутизации (см. отдельный апдейт) |
| `Writerside/topics/decision-log.md` | новый ADR-008: «Polling-based payment status (rationale из Kazna PDF)» |
| `Writerside/topics/project-dashboard.md` | запись «Recent Changes» 2026-04-29 |
| `Writerside/topics/dev-web.md` | если упоминается полный URL платёжки |
| `payment-service/CLAUDE.md` | пометить `/api/notify` как currently reserved |

Не меняем:
- `payment-service/app/controllers/payment.py` (controller path остаётся `/api`)
- `payment-service/docker-compose.yml`
- `src/services/api.web.ts` (web prod URL уже правильный)
- `src/services/payment.ts` (call-site пути уже правильные)
- `src/services/api.ts` (mobile prod URL менять только под Phase 2 cohabitation)

## /api/notify unit test (новое требование)

Эндпоинт сегодня внешний трафик не получает (см. Webhook reality), но реализован и должен быть готов к Phase 3 cutover. Покрываем тестом, чтобы протухание не прошло незамеченным.

**Файл:** `payment-service/tests/test_notify_endpoint.py`

**Что тестируем:**
1. **Невалидная подпись** → endpoint возвращает 200 + `{"status":"error","message":"Invalid signature"}` (поведение из `payment.py:419-428` — мы намеренно не возвращаем 4xx, чтобы Kazna не думала о доставке как о неуспешной и не ретраила).
2. **Несуществующий orderID при валидной подписи** → 200 + `{"status":"ok"}` (графrace-fail в `payment.py:430-433`).
3. **Валидная подпись + существующая транзакция → status `paid`** → транзакция получает `kazna_status='paid'`, все её `PaymentTransactionItem` помечаются `status='paid'` + `paid_at`.
4. **Валидная подпись + статус `cancelled`** → транзакция и items помечаются `cancelled`.
5. **Подпись формируется по правилу из `kazna.py:133-136`**: `md5(token + paymentID + status.name)`. Тест явно сэмплит этот алгоритм — единственный способ обнаружить, если кто-то невзначай его поменяет.

**Тестовый раннер:** `/test-backend` slash-команда (Docker-based). Если pytest infra ещё не настроена в payment-service (`payment-service/tests/` сейчас не существует — проверено через `find`), это часть этого же PR: создать `tests/__init__.py`, `tests/conftest.py` с фикстурами для in-memory Tortoise + httpx test-client. Если объём пугает — выделим в отдельный мини-PR перед основным.

## Test plan

### Pre-merge (локально)

1. Поднять полный staging-стек локально (через `payment-service/docker-compose.yml` + `nginx/Dockerfile.prod`, либо `docker compose -f docker-compose.yc.yaml`).
2. Сборка с patched nginx-конфигом.
3. Smoke `curl`:
   ```
   curl -X POST -H 'Content-Type: application/json' \
     -d '{"amount":500}' \
     http://localhost/payment-api/calculate-commission
   ```
   Ожидаем: 200 + JSON с `kazna_commission`, `transapp_commission`, `total_amount` (как в успешном smoke на стейдже 2026-04-28, только без `/api`).
4. Регресс — старый «двойной» путь должен **перестать** работать (вернуть 404):
   ```
   curl -i http://localhost/payment-api/api/calculate-commission
   # ожидаем: HTTP/1.1 404 Not Found
   ```
   Это явная страховка от того, что мы где-то забыли стрипнуть префикс.
5. `/api/notify` через nginx (smoke поверх pytest):
   ```
   curl -X POST -H 'Content-Type: application/json' \
     -d '{"paymentID":1,"orderID":"x","status":{"code":0,"name":"created"},"sign":"x"}' \
     http://localhost/payment-api/notify
   # ожидаем: 200 + {"status":"error","message":"Invalid signature"}
   ```
6. `/payment-status/{id}`:
   ```
   curl http://localhost/payment-api/payment-status/00000000-0000-0000-0000-000000000000
   # ожидаем: 404 Payment not found (доказывает что роут найден, до бизнес-логики)
   ```
7. Запустить pytest payment-service, в т.ч. новые тесты `/api/notify`: `/test-backend` slash-команда (Docker-based runner).

### Post-merge (стейдж после деплоя)

1. Триггернуть `deploy-web.yml`.
2. Смок-`curl` на стейдже (те же 4 запроса из «Pre-merge», но против `https://transapp-dev.ru`).
3. Web e2e (Playwright или вручную через `/design-review` skill) — пройти flow «начисления → подтверждение оплаты → калькуляция комиссии». Это и подтверждает фикс латентного web-prod бага из раздела «Problem» п.2.

## Rollout strategy — single PR

1. Сделать ветку `fix/payment-api-path-cleanup`, реализовать nginx-патч (2 файла) + `/api/notify` тесты + Writerside-апдейты.
2. Локальный smoke + pytest (см. «Test plan»).
3. PR в draft → review → merge → `deploy-web.yml` (workflow_dispatch или автотриггер на push в master) → стейджевый smoke + web e2e.
4. Если post-merge smoke не зелёный — rollback (revert nginx-патча).

Никакой координации с Kazna в момент мерджа **не требуется** (см. Webhook reality).

## Rollback

Тривиальный: revert nginx-патча в обоих файлах. Нет миграций БД. Нет смены контракта Litestar. Тесты `/api/notify` остаются — они проверяют реализацию контроллера, а не nginx.

## Out of scope (не делаем здесь)

- **Phase 2 cohabitation:** перенос mobile prod URL на `app.transapp.ru/payment-api/...` + EAS rebuild.
- **Phase 3 cutover:** регистрация у Kazna наших URL для каналов `notify` (на наш `/api/notify`) и `subscribeNotify` (на ещё-не-реализованный наш endpoint), отказ от legacy `transapp.ru/api/kazna-api-update-fines`. Включает: (а) реализацию `subscribeNotify` контроллера; (б) согласование IP-вайтлиста Kazna; (в) согласованное переключение URL у менеджера Kazna; (г) перенос таблицы подписок и идентификаторов пользователей с legacy на нашу БД.
- **Реализация `subscribeNotify` контроллера** — не нужен сегодня, нужен в Phase 3.
- **Добавление `/health` в Litestar** (Docker `HEALTHCHECK` сейчас бьёт `/health`, а Litestar отдаёт только `/api/...`). Мини-таск, отдельный PR.
- **Унификация API-обвязки между web и mobile** (`api.ts` vs `api.web.ts`) — отдельный рефакторинг.
- **OpenAPI auto-docs в Litestar** — отдельная задача.
- **Уточнение тарификации Kazna `paymentInfo`** (подозрение от 2026-04-29: polling-запросы могут тарифицироваться, и при росте объёма надо будет переключиться на push-`notify`). Зафиксировано как пункт Phase 3.

## Branch / commit / PR

- Branch: `fix/payment-api-path-cleanup`
- Commit (Conventional): `fix(infra): collapse double /api in payment URL via nginx`
- PR title: `fix(infra): collapse /payment-api/api/... → /payment-api/...`
- PR body — обязательные секции:
  - **Context** (ссылка на этот план)
  - **Pre-merge checklist** (smoke локально + pytest backend)
  - **Post-merge checklist** (стейджевый smoke + web e2e)
  - **Rollback steps**

## Open questions (non-blocking)

1. ~~**Подтвердить рабочую гипотезу про subscribeNotify URL у legacy.**~~ **Закрыто 2026-04-29.** Колега подтвердил: `transapp.ru/api/kazna-api-update-fines` — это subscribeNotify канал. Передан реальный sample batch-payload-а (`Authorization: token ...`, `{"status":"complete","charges":[...]}` с `msgType: 4` = «оплачено»). Зафиксировано в `Writerside/topics/api-payment.md` → раздел `/api/subscribeNotify` для будущего Phase 3 имплементера. Канал `notify` (статусы платежа) у Kazna отдельно не регистрировался — наш `/api/notify` остаётся reserved.
2. **Production target host для Phase 2/3.** После cohabitation платёжный сервис будет жить под `app.transapp.ru/payment-api/...`, mobile-prod URL переключится синхронно. Зафиксировать в `infra-deployment.md` как чек-лист Phase 2.
3. **Тарификация `paymentInfo` polling-а.** Уточнить у менеджера Kazna стоимость per-call и лимиты — пригодится для оценки масштабируемости polling-подхода до Phase 3.
4. **Симметрия с `/api/` локацией.** Главный API в nginx тоже проксирует с `/api/` на upstream `/api/`. После нашего фикса `/payment-api/` будет иметь ту же симметрию — упрощает ментальную модель. *(не блокирует, просто отметка)*
