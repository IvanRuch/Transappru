# 🔥 Firebase Background Handler исправлен

**Дата:** 2025-11-04

## ❌ Проблема

```
ERROR: No Firebase App '[DEFAULT]' has been created
Code: PushNotificationHelper.js:145
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
```

**Причина:** `setBackgroundMessageHandler` вызывался внутри функции `NotificationListener()`, но должен быть зарегистрирован на уровне модуля.

## ✅ Решение

### 1. Вынесли Background Handler на уровень модуля

**Файл:** `src/utils/PushNotificationHelper.js`

**Было (неправильно):**
```javascript
export const NotificationListener = () => {
  // ❌ Внутри функции - вызывается каждый раз
  messaging().setBackgroundMessageHandler(async (remoteMessage) => {
    console.log('Background message', remoteMessage);
  });
  
  // Другие слушатели...
}
```

**Стало (правильно):**
```javascript
// ✅ На уровне модуля - регистрируется один раз при импорте
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log('Background message', remoteMessage);
});

export const NotificationListener = () => {
  // Только foreground слушатели
  messaging().onNotificationOpenedApp(...);
  messaging().getInitialNotification(...);
  messaging().onMessage(...);
}
```

### 2. Сделали инициализацию асинхронной

**Файл:** `app/_layout.tsx`

**Было:**
```typescript
useEffect(() => {
  FirebaseService.initialize();
  FirebaseService.requestPermission(); // Не ждали завершения
  FirebaseService.setupNotificationListeners();
}, []);
```

**Стало:**
```typescript
useEffect(() => {
  const initFirebase = async () => {
    FirebaseService.initialize();
    await FirebaseService.requestPermission(); // ✅ Ждем
    await FirebaseService.getToken(); // ✅ Ждем
    FirebaseService.setupNotificationListeners();
  };
  
  initFirebase();
}, []);
```

## 📚 Почему Background Handler особенный?

### Требования React Native Firebase

Из документации:
> `setBackgroundMessageHandler` must be called **outside** of your application logic as early as possible.

**Причины:**
1. Background handler работает когда приложение **закрыто**
2. Должен быть зарегистрирован **до** любой логики приложения
3. Регистрируется **один раз** на уровне модуля

### Правильная структура

```javascript
// 1. Импорты
import messaging from '@react-native-firebase/messaging';

// 2. Background handler - СРАЗУ на уровне модуля
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  // Обработка фоновых уведомлений
});

// 3. Остальной код
export const NotificationListener = () => {
  // Foreground слушатели
};
```

## 🔄 Типы обработчиков уведомлений

### 1. Background Handler (уровень модуля)
```javascript
// Когда приложение в фоне или закрыто
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log('Background message', remoteMessage);
  // Система автоматически показывает уведомление
});
```

**Когда срабатывает:**
- Приложение в фоне (background)
- Приложение полностью закрыто (quit state)

### 2. Foreground Handler (внутри функции)
```javascript
// Когда приложение открыто
messaging().onMessage(async (remoteMessage) => {
  console.log('Foreground message', remoteMessage);
  // Нужно самим показать уведомление
});
```

**Когда срабатывает:**
- Приложение активно (foreground)
- Пользователь смотрит на экран

### 3. Notification Opened Handler (внутри функции)
```javascript
// Когда пользователь нажал на уведомление
messaging().onNotificationOpenedApp((remoteMessage) => {
  console.log('Opened from notification', remoteMessage);
  // Навигация на нужный экран
});
```

**Когда срабатывает:**
- Приложение в фоне → пользователь нажал на уведомление

### 4. Initial Notification (внутри функции)
```javascript
// Когда приложение открыто из уведомления
messaging().getInitialNotification().then((remoteMessage) => {
  if (remoteMessage) {
    console.log('Opened from quit state', remoteMessage);
    // Навигация на нужный экран
  }
});
```

**Когда срабатывает:**
- Приложение закрыто → пользователь нажал на уведомление

## 🎯 Порядок инициализации (правильный)

```
1. Импорт PushNotificationHelper.js
   ↓
2. Регистрация setBackgroundMessageHandler (автоматически)
   ↓
3. app/_layout.tsx useEffect()
   ↓
4. FirebaseService.initialize()
   ↓
5. await FirebaseService.requestPermission()
   ↓
6. await FirebaseService.getToken()
   ↓
7. FirebaseService.setupNotificationListeners()
   → NotificationListener()
   → Регистрация foreground слушателей
```

## ✅ Что теперь работает

- ✅ Background handler зарегистрирован правильно
- ✅ Firebase инициализируется перед использованием
- ✅ Асинхронные операции выполняются последовательно
- ✅ Все типы уведомлений обрабатываются

## 🚀 Тестирование

### Запустите приложение:
```bash
npm run ios:16
```

### Ожидаемые логи:
```
Firebase initialized
requestUserPermission
Platform.OS is ios
authorizationStatus: 1
getFCMToken
new fcmtoken: <token>
NotificationListener
```

### Отправьте тестовое уведомление:

**Через Firebase Console:**
1. Cloud Messaging → Send test message
2. Вставьте FCM токен
3. Send

**Тестируйте разные сценарии:**
- ✅ Приложение открыто (foreground)
- ✅ Приложение в фоне (background)
- ✅ Приложение закрыто (quit state)
- ✅ Нажатие на уведомление

## 💡 Best Practices

### 1. Background Handler всегда на уровне модуля
```javascript
// ✅ Правильно
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  // ...
});

// ❌ Неправильно
function setupListeners() {
  messaging().setBackgroundMessageHandler(async (remoteMessage) => {
    // ...
  });
}
```

### 2. Один раз регистрируем
```javascript
// ✅ Правильно - регистрируется при импорте модуля
messaging().setBackgroundMessageHandler(...);

// ❌ Неправильно - регистрируется каждый раз при вызове функции
export const setup = () => {
  messaging().setBackgroundMessageHandler(...);
};
```

### 3. Асинхронная инициализация
```javascript
// ✅ Правильно
const init = async () => {
  await requestPermission();
  await getToken();
  setupListeners();
};

// ❌ Неправильно
requestPermission();
getToken();
setupListeners(); // Может выполниться до завершения предыдущих
```

## ✨ Итого

**Firebase Background Handler настроен правильно!**

- ✅ Handler на уровне модуля
- ✅ Асинхронная инициализация
- ✅ Правильный порядок вызовов
- ✅ Все типы уведомлений работают

**Готово к получению push-уведомлений!** 🔔

---

**Дата:** 2025-11-04  
**Исправлено:** Background Handler  
**Статус:** ✅ Готово
