# TransApp Payment Service

Микросервис для интеграции с Kazna API.

## Стек технологий
- Litestar
- Tortoise ORM
- PostgreSQL
- Kazna API

## Запуск для разработки
```sh
docker-compose up --build
```

## API
- `POST /api/init-payment` - Инициация оплаты одного штрафа
- `POST /api/init-multi-payment` - Инициация оплаты нескольких штрафов
- `POST /api/notify` - Webhook для уведомлений от Kazna API
