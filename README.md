# TransApp - Мобильное приложение для управления транспортом

Современная версия приложения TransApp, мигрированная на **Expo** с **TypeScript** и лучшими практиками разработки.

## 📊 Статус миграции

✅ **Базовая инфраструктура готова** (API, Firebase, навигация)  
✅ **4 экрана полностью готовы** (Auth, Pin, Pass, PassYaMap)  
🔄 **7 экранов частично готовы** (требуют доработки)  
❌ **8 экранов ожидают миграции**

**Подробнее:** см. `MIGRATION_STATUS.md`

## 🚀 Быстрый старт

### Для Mac M2 (Apple Silicon)

**⚠️ ВАЖНО:** Если у вас Mac M2 и возникают проблемы с запуском Android, используйте:

```bash
# Автоматическая настройка для Mac M2
bash scripts/setup-mac-m2.sh
```

**Подробная инструкция:** `SETUP_INSTRUCTIONS.md`

---

### Стандартная установка

### 1. Установить зависимости
```bash
npm install
```

### 2. Настроить Firebase (обязательно!)
```bash
# Скопируйте примеры конфигов
cp google-services.json.example google-services.json
cp GoogleService-Info.plist.example GoogleService-Info.plist

# Замените содержимое на боевые конфиги из Firebase Console
# Подробнее: см. FIREBASE_SETUP.md
```

### 3. Запустить приложение
```bash
# Запустить приложение
npx expo start

# Для iOS
npx expo run:ios

# Для Android
npx expo run:android
```

## 📁 Структура проекта

```
TransApp_upd/
├── app/                    # Entry point (Expo Router)
│   └── index.tsx          # Главный файл приложения
├── src/
│   ├── screens/           # Экраны приложения
│   │   ├── auth/         # Авторизация (Auth, Pin)
│   │   ├── main/         # Главный экран
│   │   ├── auto/         # Автомобили
│   │   ├── profile/      # Профиль пользователя
│   │   └── ...
│   ├── navigation/        # Настройка навигации
│   ├── services/          # API и Firebase сервисы
│   ├── types/            # TypeScript типы
│   ├── utils/            # Утилиты
│   └── styles/           # Стили
├── assets/               # Изображения и ресурсы
└── ...
```

## 📚 Документация

**Начните с:** `START_HERE.md`

**Важные файлы:**
- `SETUP_INSTRUCTIONS.md` - **Настройка для Mac M2** 🍎
- `FIREBASE_SETUP.md` - **Настройка Firebase и push-уведомлений** 🔥
- `START_HERE.md` - Введение в проект

**Вся документация в папке `docs/`:**
- `docs/SETUP_MAC_M2.md` - Подробная инструкция для Mac M2
- `docs/FINE_PAYMENT_INTEGRATION.md` - Интеграция оплаты штрафов
- `docs/FINAL_SUMMARY.md` - Полная сводка работы
- `docs/EXPO_ROUTER_GUIDE.md` - Руководство по Expo Router
- `docs/TODO.md` - Задачи с приоритетами
- `docs/CONVERSION_CHEATSHEET.md` - Шпаргалка по TypeScript
- `docs/MIGRATION_STATUS.md` - Статус миграции экранов
- И другие...

## 🛠️ Технологии

- **React Native** - фреймворк для мобильной разработки
- **Expo** - инструменты для разработки и деплоя
- **Expo Router** - file-based routing (как Next.js)
- **TypeScript** - типобезопасность
- **Axios** - HTTP клиент
- **Firebase** - push-уведомления
- **AsyncStorage** - локальное хранилище
- **Yandex Maps** - интеграция карт для Pass экранов

## 🎯 Следующие шаги

1. **Доработать MainScreen** - главный экран после авторизации
2. **Доработать AutoListScreen** - список автомобилей
3. **Мигрировать остальные экраны** по мере необходимости

См. `docs/TODO.md` для детальных инструкций.

## 🔧 Полезные команды

```bash
# Проверить TypeScript ошибки
npx tsc --noEmit

# Очистить кэш и перезапустить
npx expo start -c

# Собрать для production
npx expo build:ios
npx expo build:android
```

## 📝 Миграция из старого проекта

Старый проект: `/Volumes/HP_P800/grizodubov/IdeaProjects/Transappru`

Используйте `docs/CONVERSION_CHEATSHEET.md` для конвертации экранов из старого проекта.

## 🐛 Известные проблемы

- Некоторые экраны требуют доработки (см. `docs/MIGRATION_STATUS.md`)
- Большие файлы нужно разбить на компоненты (например, AutoListScreen)

## 📞 API

**Base URL:** `https://transapp.ru/api/`

API сервис настроен в `src/services/api.ts` с автоматическим добавлением токена.

## 🔐 Аутентификация

Приложение использует токен-based аутентификацию:
1. Пользователь вводит телефон (AuthScreen)
2. Получает PIN-код
3. Вводит PIN (PinScreen)
4. Токен сохраняется в AsyncStorage
5. Автоматически добавляется ко всем API запросам

---

**Версия:** 2.0 (Migrated to Expo + TypeScript)  
**Дата обновления:** 2025-11-17  
**Последние изменения:** Добавлены экраны Pass с интеграцией Yandex Maps
