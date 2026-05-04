# Kazna API — Vendor Documentation

Vendor-specific документация платёжного провайдера Kazna. Лежит рядом с
`payment-service/`, потому что именно этот сервис её потребляет.

## Files

| File | Что это |
|------|---------|
| `KaznaAPI.pdf` | Официальная PDF-спецификация API от Kazna. **Источник истины при расхождениях.** |
| `KaznaAPI.md` | Markdown-конверсия PDF (~6k строк), удобна для поиска grep'ом и для inline-ссылок из Writerside. |
| `KaznaAPI-Dogovor-ITO-TransApp.pdf` | Юридический договор ИТО (информационно-технологического обслуживания) между TransApp и Kazna. Read-only артефакт. |

## Online version

Актуальная PDF-версия публикуется по адресу
[https://tprs.ru/KaznaAPI.pdf](https://tprs.ru/KaznaAPI.pdf). При расхождении
между локальной копией и онлайн-PDF — прав онлайн-PDF; локальную копию
обновить через персонального менеджера Kazna.

## Consumers

- `Writerside/topics/api-payment.md` — наши endpoint'ы и их связь с Kazna методами.
- `Writerside/topics/dev-payment-flow.md` — общий payment flow + Two Push Channels (`notify` / `subscribeNotify`).
- `payment-service/app/` — реальная реализация (контракты в `app/services/kazna/` или эквиваленте).

## Update policy

- **Не редактировать** `KaznaAPI.md` руками. Если получили обновлённый PDF —
  заменить оба файла (`KaznaAPI.pdf` + перегенерировать `KaznaAPI.md`),
  diff просмотреть, вписать релевантные изменения в Writerside topics,
  отметить дату обновления в этом README.
- **Не редактировать** контракт PDF.

## Last received

`KaznaAPI.pdf` / `KaznaAPI.md` — 2026-04 (исходно положены в `/docs/` в эпоху
миграции, перенесены сюда 2026-05-04 при закрытии документационного долга, см.
ADR-013 в `Writerside/topics/decision-log.md`).
