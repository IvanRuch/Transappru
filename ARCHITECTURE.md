# Архитектура проекта TransApp

Этот документ описывает архитектуру мобильного приложения и связанного с ним микросервиса оплаты. Используется для контекста AI-ассистентов.

## 1. Мобильное приложение (Frontend)

### Стек технологий
- **Framework**: React Native (Expo SDK 52).
- **Language**: TypeScript.
- **Navigation**: Expo Router (файловая маршрутизация).
- **Styling**: NativeWind (Tailwind CSS).
- **HTTP Client**: Axios (обертка в `src/services/api.ts`).
- **State Management**: React Context + Hooks (`useCharges`, `useAuth` и др.).

### Структура проекта (`src/`)
- `app/` - Маршруты Expo Router (экраны).
- `components/` - Переиспользуемые UI компоненты.
- `services/` - Сервисы для работы с API (`api.ts`, `payment.ts`).
- `types/` - TypeScript интерфейсы (`payment.ts`, `charges.ts`).
- `hooks/` - Кастомные хуки для бизнес-логики.
- `screens/` - Логика экранов (постепенно мигрирует в `app/` или используется как view-компоненты).

### Ключевые модули
- **Оплата штрафов**: `src/screens/fine-payment/`. Реализован выбор штрафов, подтверждение и WebView для оплаты.
- **Начисления**: `src/screens/charges/`. Отображение списка штрафов ГИБДД/Платон.

---

## 2. Микросервис оплаты (Payment Service)

Проект находится в папке `payment-service`. Создан на основе архитектуры `club-events`, но упрощен до REST API.

### Стек технологий
- **Framework**: Litestar (Python 3.9+).
- **API Type**: REST (JSON).
- **ORM**: Tortoise ORM (Async).
- **Database**: PostgreSQL.
- **Migrations**: Aerich.

### Структура сервиса (`payment-service/app/`)
- `main.py` - Точка входа, инициализация Litestar.
- `models.py` - Модели данных (`PaymentTransaction`).
- `controllers/` - Обработчики запросов (`PaymentController`).
- `services/` - Бизнес-логика (`KaznaService`, `CommissionService`).
- `config/` - Конфигурация (`db.py`, `settings.py`).

---

## 3. Интеграция: Оплата штрафов (Kazna API)

### Схема взаимодействия
1. **Mobile**: Пользователь выбирает штраф(ы) и нажимает "Оплатить".
2. **Mobile -> Payment Service**: POST запрос на инициацию платежа (`/api/init-payment`).
3. **Payment Service**:
   - Рассчитывает комиссию (Комиссия Казны + 0.1% TransApp).
   - Создает запись в БД (`PaymentTransaction`) со статусом `created`.
   - Формирует подпись (`sign`) для Kazna API.
   - Отправляет запрос в Kazna API (метод `pay`) с параметрами `amount` (чистый штраф) и `totalSum` (с комиссией).
4. **Kazna API -> Payment Service**: Возвращает `redirectUrl` и `paymentID`.
5. **Payment Service**: Обновляет транзакцию и возвращает данные в Mobile.
6. **Mobile**: Открывает WebView.
7. **Kazna API -> Payment Service**: Webhook на `/api/notify` об успешной оплате.

### Важные бизнес-правила
- **Безопасность**: Секретные ключи Kazna API хранятся ТОЛЬКО в `payment-service` в `.env`.
- **Комиссия**: Итоговая сумма для пользователя = `Сумма штрафа + Комиссия Казны + 0.1% (собственная комиссия TransApp)`.
- **Валидация**: Сумма переводится в копейки на стороне сервиса.

---

## 4. Планы по разработке (Roadmap)

1. [x] **Mobile**: UI экранов оплаты и подтверждения.
2. [x] **Mobile**: Сервис `PaymentService`.
3. [x] **Payment Service**: Базовая структура (Litestar, Tortoise).
4. [x] **Payment Service**: Модель `PaymentTransaction`.
5. [x] **Payment Service**: Сервис `KaznaService` (подпись, запросы).
6. [x] **Payment Service**: Контроллер `PaymentController` (init, notify).
7. [x] **Payment Service**: Настройка Live Reload для разработки.
8. [ ] **Payment Service**: Реализация `CommissionService` (расчет 0.1% + комиссия Казны).
9. [ ] **Payment Service**: Настройка окружения и запуск миграций.
10. [ ] **Mobile**: Интеграция с реальным сервисом (проверка URL).
