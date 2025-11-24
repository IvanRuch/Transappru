# 🔔 Push-уведомления в TransApp

## 📱 Как это работает

### Foreground (приложение активно)
Когда приложение открыто, уведомления отображаются через **красивый banner сверху экрана**:

```
╔═══════════════════════════════════╗
║ [📱]  TransApp        сейчас     ║
║                                   ║
║ Новый штраф                       ║
║ У вас новый штраф 1000 руб        ║
╚═══════════════════════════════════╝
```

**Особенности:**
- ✅ Иконка приложения слева
- ✅ Название приложения и время
- ✅ Заголовок и текст уведомления
- ✅ Плавная анимация появления/исчезновения
- ✅ Тактильная обратная связь (вибрация)
- ✅ Автоматически исчезает через 5 секунд
- ✅ Можно закрыть тапом
- ✅ Не блокирует работу приложения

---

### Background (приложение в фоне)
Уведомления отображаются через **системный banner** iOS/Android.

---

## 🎨 Дизайн

### Цвета
- Фон: `#FFFFFF` (белый)
- Заголовок: `#000000` (чёрный)
- Текст: `#3C3C43` (серый)
- Название приложения: `#656565`
- Время: `#999999`
- Иконка фон: `#F5F5F5`

### Размеры
- Иконка: 40x40 px
- Заголовок: 15 px, weight 600
- Текст: 14 px, line height 18
- Отступы: 14 px
- Радиус: 16 px

### Анимация
- Появление: Spring animation (tension: 65, friction: 8)
- Исчезновение: Timing animation (250ms)
- Opacity: 0 → 1 (300ms)

---

## 🔧 Техническая реализация

### Компоненты

1. **InAppNotification.tsx** - UI компонент banner-уведомления
2. **NotificationContext.tsx** - Context для управления состоянием
3. **PushNotificationHelper.js** - Firebase Messaging обработчики
4. **_layout.tsx** - Интеграция в приложение

### Поток данных

```
Firebase Cloud Messaging
         ↓
PushNotificationHelper.js (onMessage)
         ↓
global.showInAppNotification()
         ↓
NotificationContext (showNotification)
         ↓
InAppNotification (render)
```

---

## 📝 Логирование

### FCM токен
```
========================================
🔔 getFCMToken - Starting...
========================================
📱 Cached FCM token: NOT FOUND
⚠️ No cached token, requesting new one from Firebase...
========================================
✅ NEW FCM TOKEN RECEIVED:
<ВАШ_FCM_ТОКЕН>
========================================
```

### Отправка на сервер
```
📤 setFCMToken - Sending token to server...
🔑 Auth token: EXISTS
📱 Device info: Version: 1.0.35, Device Id: ...
🔔 FCM token to send: <токен>
✅ FCM token sent successfully to server
```

### Получение уведомления
```
========================================
📲 NOTIFICATION RECEIVED (Foreground)
Title: Новый штраф
Body: У вас новый штраф 1000 руб
Data: {}
========================================
```

---

## 🧪 Тестирование

### Отправка тестового уведомления

#### Через Firebase Console:
1. Откройте Firebase Console → Cloud Messaging
2. Нажмите "Send your first message"
3. Введите заголовок и текст
4. Target: Single device
5. Вставьте FCM токен из логов
6. Send

#### Через API:
```bash
curl -X POST https://fcm.googleapis.com/fcm/send \
  -H "Authorization: key=YOUR_SERVER_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "FCM_TOKEN",
    "notification": {
      "title": "Тестовое уведомление",
      "body": "Это тестовое сообщение"
    }
  }'
```

---

## 🐛 Troubleshooting

### Уведомления не приходят

**Проверьте:**
1. ✅ FCM токен получен и отправлен на сервер
2. ✅ Firebase правильно настроен (google-services.json / GoogleService-Info.plist)
3. ✅ Разрешения на уведомления даны
4. ✅ Приложение не в фоновом режиме (для foreground уведомлений)

**Логи:**
```bash
# iOS
npx react-native log-ios | grep -E "FCM|NOTIFICATION"

# Android
adb logcat | grep -E "FCM|NOTIFICATION"
```

### Уведомления не отображаются в foreground

**Проверьте:**
1. ✅ `NotificationProvider` обернут вокруг `Stack` в `_layout.tsx`
2. ✅ `global.showInAppNotification` зарегистрирован в `NotificationOverlay`
3. ✅ `InAppNotification` компонент импортирован

### Иконка не отображается

**Проверьте:**
1. ✅ Файл `assets/images/icon.png` существует
2. ✅ Путь к иконке правильный: `require('../../assets/images/icon.png')`

---

## 📚 Документация Firebase

- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [React Native Firebase Messaging](https://rnfirebase.io/messaging/usage)
- [iOS Setup](https://rnfirebase.io/messaging/usage#ios---requesting-permissions)
- [Android Setup](https://rnfirebase.io/messaging/usage#android---requesting-permissions)

---

**Создано:** 2025-11-24  
**Проект:** TransApp  
**Версия:** 1.0.35
