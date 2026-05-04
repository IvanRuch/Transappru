# Payment Flow

## References

- **Kazna API PDF (актуальная версия):** [https://tprs.ru/KaznaAPI.pdf](https://tprs.ru/KaznaAPI.pdf). Локальная markdown-версия: `payment-service/docs/vendor/kazna/KaznaAPI.md` (5966 строк, удобно искать). При расхождении — прав PDF.
- См. также `Writerside/topics/api-payment.md` (наши endpoint-ы и базовые URL) и `Writerside/topics/decision-log.md` (ADR-008 про polling-based status).

## Two Kazna push channels (важно для понимания, кто и куда шлёт)

У Kazna **два независимых канала push-уведомлений**, конфигурируемых раздельно через персонального менеджера (PDF разделы 3.4 и subscribeNotify):

| Канал | Что присылает | Где сейчас живёт URL |
|-------|----------------|----------------------|
| **`notify`** | Финальный статус **платежа транзакции** (auth/cancel/refunded и т.п.) после нашего метода `pay`. Доставка не гарантированная (по словам самой Kazna в PDF). | **Не зарегистрирован** ни у legacy, ни у нас (рабочая гипотеза, требует подтверждения у колеги). Статус оплаты сейчас узнаём через polling — см. ниже. |
| **`subscribeNotify`** | Push о новом/изменённом/оплаченном/аннулированном **начислении** (штрафе) для пользователя, на которого оформлена подписка через метод `subscribe`. | **Legacy backend** `https://transapp.ru/api/kazna-api-update-fines` (подтверждено колегой 2026-04-29 — есть реальный пример batch-payload-а в `api-payment.md` → раздел `/api/subscribeNotify`). Этот канал и обеспечивает «штраф появился» пуши для пользователя. |

Соответственно, наш `/api/notify` сегодня **внешний трафик не получает** — это «спящий» endpoint, готовый к Phase 3 cutover-у. Наш `/api/subscribeNotify` ещё не реализован вообще; он появится в том же Phase 3.

## Overview (текущее состояние)

Mobile/Web selects fines → Payment Service initiates Kazna `pay` → user pays through WebView → **Mobile/Web polls our `GET /api/payment-status/{id}`, который сам ходит в Kazna `paymentInfo`** и отдаёт свежий статус. Push-канал `notify` от Kazna в этом потоке сегодня не используется (по архитектурной рекомендации самой Kazna PDF — см. ADR-008).

## Flow Diagram (текущее, polling-based)

```
Mobile/Web           Payment Service          Kazna API
    │                     │                     │
    │  init-payment       │                     │
    │────────────────────▶│                     │
    │                     │  pay (create order)  │
    │                     │────────────────────▶│
    │                     │  payment URL         │
    │  ◀────────────────── │◀────────────────────│
    │                     │                     │
    │  WebView payment    │                     │
    │  ──────────────────────────────────────── │
    │                     │                     │
    │  GET /payment-status/{id}                 │
    │────────────────────▶│                     │
    │                     │  paymentInfo/{id}    │
    │                     │────────────────────▶│
    │                     │  status              │
    │  ◀────────────────── │◀────────────────────│
    │  (polling 1× в N сек, до терминального статуса)
```

## Flow Diagram (Phase 3, push-based — будущее)

```
Mobile/Web           Payment Service          Kazna API           Legacy
    │                     │                     │                     │
    │  init-payment       │                     │                     │
    │────────────────────▶│  pay                 │                     │
    │                     │────────────────────▶│                     │
    │  ◀────────────────── │◀──────────────────── │                     │
    │  WebView payment    │                     │                     │
    │  ──────────────────────────────────────── │                     │
    │                     │  POST /api/notify    │                     │
    │                     │◀────────────────────│                     │
    │  status update      │                     │                     │
    │◀────────────────────│                     │                     │
    │                     │                     │  subscribeNotify     │
    │                     │  ◀────────────────── │────────────────────▶│ (legacy сегодня)
    │                     │  POST /api/subscribeNotify  ← Phase 3 цель: к нам
    │                     │◀────────────────────│
```

## Phase 3 cutover (out of scope сегодня)

Когда-то нам понадобится перенести оба push-канала Kazna с legacy на наш payment-service. Это потребует:

1. **Реализовать в Litestar `POST /api/subscribeNotify`** (сегодня его нет вообще — Kazna шлёт subscribeNotify только legacy). Реальный формат payload-а уже зафиксирован в `api-payment.md` → раздел `/api/subscribeNotify` — это batch-объект `{"status":"complete","charges":[...]}`, не одиночный payload на одно начисление. Контроллер итерирует `charges[]`, делает UPSERT по `(subscribe, supplierBillID)`, диспатчит по `msgType` (1=new, 2=change, 3=cancel, 4=paid).
2. **Сгенерировать и согласовать с менеджером Kazna новый incoming-auth-токен.** Kazna в каждый push-запрос кладёт `Authorization: token <X>`, где `<X>` — то значение, которое мы дадим менеджеру при регистрации URL. Это **отдельный секрет** от `KAZNA_TOKEN` (наш outgoing). Хранить как `KAZNA_INCOMING_TOKEN` рядом с другими `KAZNA_*` env-переменными. Контроллер `subscribeNotify` (и `notify`) валидирует header при каждом вызове — несовпадение → 401.
3. **Согласовать с менеджером Kazna IP-вайтлист** (см. PDF: «партнёру необходимо запросить у менеджера список IP адресов, с которых осуществляется отправка уведомлений»). Реализовать на стороне nginx или Litestar middleware (предпочтительно nginx — раньше отсекаем).
4. **Передать менеджеру Kazna два новых URL:** `https://<prod-host>/payment-api/notify` (для канала notify) и `https://<prod-host>/payment-api/subscribeNotify` (для канала subscribeNotify).
5. **Перенести таблицу подписок и идентификаторов пользователей** из legacy в нашу БД. Дизайн: новая таблица `subscriptions(subscribe_id, user_id, payer_doc_code, payer_doc_value, created_at)` и `subscription_charges(supplierBillID, subscribe_id, msg_type, payload_json, received_at, processed_at)` — последний хранит сырой JSON-payload для аудита (Kazna ретраит — нужна история для дебага).
6. **Опционально (после стабилизации push-канала):** перейти со scheduled polling `paymentInfo` на push-driven обновления статусов через `notify`. Это снизит нагрузку и, вероятно, биллинг — см. ADR-008 п. «Open question: тарификация». Polling остаётся как periodic reconciler (раз в N минут) для ловли пропущенных push-ей.
