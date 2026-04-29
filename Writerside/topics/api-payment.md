# Payment API

## References

- **Официальная документация Kazna API:** [https://tprs.ru/KaznaAPI.pdf](https://tprs.ru/KaznaAPI.pdf) — single source of truth по всем upstream-эндпоинтам, форматам подписи и набору статусов платежа. Локальная markdown-версия (~6k строк, удобно искать): `docs/KaznaAPI.md`. При любом расхождении между нашим кодом и PDF — прав PDF.
- Sandbox endpoint: `https://demopay.oplatagosuslug.ru/api/kazna/2.2` (захардкожен в `payment-service/docker-compose.yml`).
- См. также `Writerside/topics/dev-payment-flow.md` (схема потоков «текущее» vs «Phase 3») и `decision-log.md` ADR-008 про polling-based status.

## Base URL

| Окружение | URL |
|-----------|-----|
| Local (mobile + web localhost) | `http://localhost:8001/api/<endpoint>` |
| Staging (web) | `https://transapp-dev.ru/payment-api/<endpoint>` (после fix `/payment-api/api/...` → `/payment-api/...`, см. `.claude/plans/2026-04-29-payment-api-path-cleanup.md`) |
| Staging (mobile) | то же, после Phase 2 cohabitation (`app.transapp.ru/payment-api/<endpoint>`) |
| Production | TBD (Phase 3 cutover) |

> **Важно:** наш Litestar контроллер внутри держит routes под префиксом `/api/...` (см. `payment-service/app/controllers/payment.py:112`). Префикс `/payment-api/` добавляется и снимается **на стороне nginx** при проксировании. Локально (без nginx) используется голый `/api/...`.

## Endpoints

### POST /api/init-payment

Initialize single fine payment.

**Request:**
```json
{
  "uin": "string",
  "amount": 500.00
}
```

### POST /api/init-multi-payment

Initialize multi-UIN payment.

**Request:**
```json
{
  "items": [
    { "uin": "string", "amount": 250.00 },
    { "uin": "string", "amount": 250.00 }
  ]
}
```

### POST /api/calculate-commission

Calculate commission for a payment.

### POST /api/calculate-multi-commission

Calculate commission for multi-payment.

### GET /api/payment-status/{id}

Check payment status by transaction UUID. **Это основной способ узнать статус платежа** — endpoint сам ходит в Kazna `paymentInfo` и отдаёт свежий результат (см. ADR-008).

### GET /health *(liveness probe)*

Returns `{"status": "ok"}` immediately, without DB or any external dependency. Used by Docker `HEALTHCHECK` (`payment-service/Dockerfile.prod:46`), Kubernetes liveness probes, Yandex Cloud Monitoring uptime checks. **Liveness must NOT touch the DB** — see rationale in `app/controllers/health.py`. Mounted at root (not под `/api/`), чтобы не пересекаться с application API surface.

### GET /health/ready *(readiness probe)*

Returns `{"status":"ok"}` (200) только если `SELECT 1` против Postgres-коннекта успешен; иначе HTTP 503 с `{"detail":"db_unavailable: ..."}`. Используется в load-balancer probes, чтобы дрейнить под при потере DB-коннекта без убийства процесса.

### POST /api/notify *(reserved до Phase 3 cutover)*

Kazna webhook callback (server-to-server). **Сегодня внешний трафик не получает** — Kazna его не вызывает, потому что URL канала `notify` у Kazna для нашего payment-service не зарегистрирован (см. `dev-payment-flow.md` → раздел про два push-канала Kazna). Реализация (`payment-service/app/controllers/payment.py:419-458`) полностью рабочая, покрыта unit-тестами в `payment-service/tests/test_notify_endpoint.py` и активируется в Phase 3 — когда мы попросим менеджера Kazna зарегистрировать наш URL.

### POST /api/subscribeNotify *(не реализован)*

Будет добавлен в Phase 3 как наш приёмник `subscribeNotify` push-уведомлений (новые/изменённые/оплаченные/аннулированные начисления по подписке). Сегодня этот канал обслуживается legacy backend на `https://transapp.ru/api/kazna-api-update-fines` (подтверждено колегой 2026-04-29).

#### Реальный формат запроса от Kazna (sample, captured 2026-04-29)

> Источник: реальный пример, переданный с legacy backend. Токен в `Authorization` ниже редактирован.
>
> **Важно:** этот формат отличается от того, что описано в PDF постранично — Kazna посылает **batch-объект** `{"status": "complete", "charges": [...]}` с массивом начислений в одном POST, а не один payload на одно начисление.

```http
POST /api/subscribeNotify HTTP/1.1
Authorization: token 78l1t6*********
Content-Type: application/json; charset=utf-8
Accept: application/json

{
  "status": "complete",
  "charges": [
    {
      "subscribe": "2400000000009941097606643",
      "payerDoc": {
        "code": "200",
        "value": "7717623548771701001"
      },
      "depType": "gibdd",
      "supplierBillID": "18810577250455141636",
      "billDate": "2025-04-24T00:00:00+03:00",
      "PayerIdentifier": "2007717623548771701001",
      "AdditionalPayerIdentifier": "2400000000009941097606643",
      "amountToPay": 0,
      "purpose": "Оплата штрафа по постановлению 18810577250455141636 от 24.04.2025",
      "PayeeInn": "7707089101",
      "PayeeKpp": "770731005",
      "PayeeAccount": "03100643000000017300",
      "PayeeBik": "004525988",
      "PayeeCorrAccount": "40102810545370000003",
      "PayeeBankName": "ГУ Банка России по цфо // уфк по г. Москве",
      "payeeName": "УФК по г. Москве (Управление гибдд гу мвд России по г. Москве)",
      "kbk": "18811601121010001140",
      "OKTMO": "45382000",
      "amount": 75000,
      "payerName": "-",
      "additionalDataDiscountSize": "25",
      "additionalDataDiscountDate": "2025-05-26",
      "departmentName": "ЦАФАП одд Госавтоинспекции гу мвд России по г. Москве",
      "legalAct": "12.09.2 - Превышение скорости движения тс от 20 до 40 км/ч",
      "offenseDate": "2025-04-22T11:18:38",
      "offensePlace": "МИРА просп., д.188, ростокино (СВАО) Р-Н, москва Г.",
      "msgType": 4
    }
  ]
}
```

#### Ключевые наблюдения для Phase 3 имплементации

| Аспект | Что важно |
|--------|-----------|
| **Auth header format** | `Authorization: token <X>` (НЕ `Bearer`). `<X>` — токен, который **мы** передаём Kazna при регистрации URL у менеджера. Это отдельный секрет от `KAZNA_TOKEN` (который у нас идёт outgoing → Kazna). При реализации сгенерировать новый long-random токен и согласовать его с менеджером Kazna одновременно с регистрацией URL. |
| **Batch wrapper** | `{"status": "complete", "charges": [...]}` — массив. Контроллер должен итерировать `charges[]` и обрабатывать каждое начисление независимо. Возвращать 200 OK после обработки всего batch-а; ретраи по PDF — exponential backoff с шагами 30c → 1м → 5м → 20м → 60м, поэтому транзиентные DB-ошибки лучше оставлять как-есть (не ловить) — Kazna сама ретраит. |
| **`msgType` mapping** | `1` — новое начисление, `2` — изменение, `3` — аннулирование, `4` — оплачено (см. `docs/KaznaAPI.md:5140`). В нашем sample `msgType: 4` — это уведомление об оплате уже известного начисления. |
| **Поля поверх PDF** | `PayeeBik`, `PayeeCorrAccount`, `PayeeBankName`, `OKTMO`, `departmentName`, `legalAct`, `offenseDate`, `offensePlace` — не все есть в PDF, но Kazna реально шлёт. Pydantic-схема приёмника должна быть `extra='allow'` либо явно перечислить эти поля как Optional. |
| **`amount` в копейках** | `amount: 75000` = 750.00 ₽. Совпадает с PDF («указывается в копейках»). |
| **Идемпотентность по `supplierBillID`** | Kazna может повторно прислать одно и то же начисление (после ретрая или edit-ом с `msgType=2`). Хранить по UPSERT-ключу `(subscribe, supplierBillID)`. |
| **Идентификация пользователя** | `payerDoc.code = "200"` + `payerDoc.value` = ИНН (по справочнику типов документов в PDF). Хранится у нас в legacy под полем `inn`. |
