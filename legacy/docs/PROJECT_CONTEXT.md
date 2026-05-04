# 🧠 PROJECT_CONTEXT — Контекст для AI-ассистента

**Цель файла:** Быстрое восстановление контекста проекта для AI-ассистента в новых сессиях.  
**Обновлено:** 2025-12-15

---

## 📌 Что это за проект

**TransApp** — мобильное приложение для управления транспортом (React Native + Expo).  
Мигрировано со старого проекта `Transappru` на современный стек с TypeScript и Expo Router.

**Основные функции:**
- Авторизация по телефону + PIN
- Список автомобилей пользователя (AutoList)
- Управление пропусками (Pass) с интеграцией Yandex Maps
- Push-уведомления через Firebase
- Профиль пользователя, услуги, водители

---

## 🛠️ Технологический стек

| Категория | Технология |
|-----------|------------|
| **Фреймворк** | React Native 0.81.5 |
| **Платформа** | Expo SDK 54 |
| **Роутинг** | Expo Router 6 (file-based) |
| **Язык** | TypeScript 5.9 |
| **Навигация** | @react-navigation/native 7.x |
| **HTTP** | Axios |
| **Push** | @react-native-firebase/messaging 23.x |
| **Хранилище** | AsyncStorage |
| **Карты** | react-native-yamap-plus |
| **UI** | react-native-modal, expo-image |

---

## 📁 Структура проекта

```
TransApp_upd/
├── app/                          # Expo Router (file-based routing)
│   ├── _layout.tsx               # Root layout + Firebase init
│   ├── index.tsx                 # / → AuthScreen
│   ├── pin.tsx                   # /pin → PinScreen
│   ├── user.tsx                  # /user → UserScreen
│   ├── onboarding.tsx            # /onboarding
│   ├── invite-user.tsx           # /invite-user
│   ├── deleted.tsx               # /deleted
│   └── (authenticated)/          # Защищённые роуты (требуют токен)
│       ├── _layout.tsx           # Auth check
│       ├── main.tsx              # Main screen
│       ├── auto-list.tsx         # Список авто
│       ├── auto/[id].tsx         # Детали авто (динамический)
│       ├── auto-fine.tsx         # Штрафы
│       ├── pass.tsx              # Пропуска
│       ├── pass-yamap.tsx        # Карта пропусков
│       ├── profile.tsx           # Профиль
│       ├── services.tsx          # Услуги
│       ├── drivers.tsx           # Водители
│       ├── inn.tsx               # ИНН
│       └── notifications.tsx     # Уведомления
│
├── src/
│   ├── screens/                  # Реальные компоненты экранов
│   │   ├── auth/                 # AuthScreen, PinScreen, DeletedScreen
│   │   ├── main/                 # MainScreen
│   │   ├── auto/                 # AutoListScreen, AutoDetailScreen, AutoFineScreen
│   │   ├── pass/                 # PassScreen, PassYaMapScreen
│   │   ├── profile/              # UserScreen
│   │   ├── services/             # OurServicesScreen
│   │   ├── drivers/              # DriverListScreen
│   │   ├── notifications/        # NotificationListScreen
│   │   ├── inn/                  # InnScreen
│   │   ├── onboarding/           # OnBoardingScreen
│   │   └── user/                 # InviteUserScreen
│   │
│   ├── components/               # Переиспользуемые компоненты
│   │   ├── auto/                 # AutoListMenu, AutoListItem, модальные окна
│   │   └── withRouter.tsx        # HOC для совместимости с React Navigation API
│   │
│   ├── services/
│   │   ├── api.ts                # HTTP клиент (BASE_URL: https://transapp.ru/api/)
│   │   └── firebase.ts           # Firebase service
│   │
│   ├── hooks/                    # Кастомные хуки
│   │   ├── useAutoList.ts        # Логика списка авто
│   │   └── useAutoActions.ts     # Действия с авто
│   │
│   ├── types/
│   │   ├── navigation.ts         # RootStackParamList
│   │   └── auto.ts               # Типы для авто
│   │
│   └── utils/
│       └── PushNotificationHelper.js  # FCM токен, слушатели уведомлений
│
├── assets/images/                # Изображения
├── plugins/                      # Expo config plugins
└── docs/                         # Документация (40+ файлов .md)
```

---

## 🔐 Аутентификация

1. Пользователь вводит телефон → `AuthScreen`
2. Получает SMS с PIN → `PinScreen`
3. Токен сохраняется в `AsyncStorage` (ключ: `'token'`)
4. Токен автоматически добавляется ко всем API запросам через interceptor в `api.ts`
5. Защищённые роуты в `(authenticated)/` проверяют наличие токена

---

## 🔔 Push-уведомления

- **Firebase Messaging** через `@react-native-firebase/messaging`
- Логика в `src/utils/PushNotificationHelper.js`:
  - `requestUserPermission()` — запрос разрешений
  - `getFCMToken()` — получение и отправка токена на сервер
  - `NotificationListener()` — слушатели foreground/background/opened
- FCM токен отправляется на `/set-fcmtoken` с device_info

---

## 🧭 Навигация (Expo Router)

**Архитектура:** `app/` — тонкий слой роутинга, `src/screens/` — вся логика.

**HOC withRouter** (`src/components/withRouter.tsx`):
- Конвертирует Expo Router API → React Navigation API
- Позволяет использовать `this.props.navigation.navigate('Main')` как раньше
- Маппинг старых имён экранов на новые роуты

**Маппинг роутов:**
| Старое имя | Новый роут |
|------------|------------|
| `Auth` | `/` |
| `Pin` | `/pin` |
| `Main` | `/(authenticated)/main` |
| `AutoList` | `/(authenticated)/auto-list` |
| `Pass` | `/(authenticated)/pass` |
| `User` / `Profile` | `/(authenticated)/profile` |

---

## 📊 Статус миграции экранов

### ✅ Полностью готовы
- AuthScreen, PinScreen, PassScreen, PassYaMapScreen

### 🔄 Работают, но могут требовать доработки
- MainScreen, AutoListScreen, UserScreen, OurServicesScreen, OnBoardingScreen

### ⏳ Ожидают миграции / доработки
- AutoScreen, AutoDriverScreen, AutoFineScreen
- InnScreen, DriverListScreen, NotificationListScreen
- InviteUserScreen, DelUserScreen

---

## 🚀 Команды запуска

```bash
# Установка зависимостей
npm install

# Запуск Expo
npx expo start

# iOS на симуляторе iPhone 16 Plus
npm run ios:16

# Android на устройстве
npm run android:device

# Проверка TypeScript
npx tsc --noEmit

# Очистка кэша
npx expo start -c
```

---

## 📝 Важные ограничения и правила

1. **Firebase конфиги** (`google-services.json`, `GoogleService-Info.plist`) — НЕ коммитить в Git
2. **Структура app/ vs src/** — в `app/` только импорты, вся логика в `src/screens/`
3. **API** — все запросы через `src/services/api.ts`, BASE_URL: `https://transapp.ru/api/`
4. **Токен** — хранится в AsyncStorage под ключом `'token'`
5. **Старый проект** — `/Volumes/HP_P800/grizodubov/IdeaProjects/Transappru` (для справки)

---

## 📚 Ключевые файлы документации

| Файл | Назначение |
|------|------------|
| `docs/START_HERE.md` | Точка входа для новичков |
| `docs/FINAL_SUMMARY.md` | Полная сводка проделанной работы |
| `docs/EXPO_ROUTER_GUIDE.md` | Руководство по навигации |
| `docs/CONVERSION_CHEATSHEET.md` | Шпаргалка по конвертации JS → TS |
| `docs/MIGRATION_STATUS.md` | Статус миграции экранов |
| `docs/TODO.md` | Текущие задачи с приоритетами |
| `docs/FIREBASE_SETUP.md` | Настройка Firebase |
| `docs/PUSH_NOTIFICATIONS_INTEGRATED.md` | Интеграция push-уведомлений |
| `docs/AUTOLISTSCREEN_REFACTOR.md` | Рефакторинг AutoListScreen |
| `TODO.md` (корень) | Актуальные TODO |

---

## 🎯 Текущие приоритеты (из TODO.md)

1. **Настройки типов уведомлений** — экран выбора типов push (штрафы, пропуска, ОСАГО и т.д.)
2. **AutoDriver** — назначение водителей на авто (незавершённый функционал)
3. **Background handler для push** — дополнительная оптимизация

### ✅ Недавно выполнено
- Firebase Messaging v23 интеграция
- dSYM для production (crash reporting)
- Иконка Android уведомлений
- Улучшен Splash Screen
- Node path для Android Studio (NVM fix)
- Gradle JVM настройка
- Document Picker → expo-document-picker
- FlatList onEndReached fix

---

## 💡 Как использовать этот файл

В начале новой сессии скажи ассистенту:
```
Прочитай docs/PROJECT_CONTEXT.md для восстановления контекста проекта.
```

Или скопируй краткую версию:
```
Проект: TransApp — React Native + Expo 54 + TypeScript.
Роутинг: Expo Router (file-based), app/ → src/screens/.
API: https://transapp.ru/api/, токен в AsyncStorage.
Push: Firebase Messaging.
Карты: Yandex Maps.
Документация: docs/*.md
```

---

**Версия контекста:** 1.0  
**Дата создания:** 2025-12-15
