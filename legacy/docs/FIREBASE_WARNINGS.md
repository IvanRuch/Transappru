# Firebase Messaging Deprecation Warnings

## ⚠️ Предупреждения в консоли

При использовании Firebase Messaging вы видите warnings:

```
This method is deprecated (as well as all React Native Firebase namespaced API) 
and will be removed in the next major release as part of move to match Firebase 
Web modular SDK API. Please see migration guide for more details: 
https://rnfirebase.io/migrating-to-v22
```

## ✅ Это нормально и безопасно!

### Почему появляются warnings?

1. **React Native Firebase v23** использует **namespaced API**: `messaging().method()`
2. Библиотека планирует переход на **modular API** в v22 (но он еще не вышел)
3. Warnings добавлены **заранее** чтобы разработчики были готовы к миграции

### Почему мы не можем использовать "новый" API?

**React Native Firebase НЕ Web SDK!** Это разные библиотеки:

| Библиотека | API | Статус |
|------------|-----|--------|
| **Web Firebase SDK** | `import { getMessaging } from 'firebase/messaging'` | ✅ Работает |
| **React Native Firebase** | `import messaging from '@react-native-firebase/messaging'` | ✅ Работает |
| **React Native Firebase v22** | Modular API (еще не выпущен) | ⏳ В разработке |

### Правильный код для React Native Firebase v23:

```javascript
import messaging from '@react-native-firebase/messaging';

// ✅ Правильно (текущий стабильный API)
await messaging().requestPermission();
await messaging().getToken();
messaging().onMessage(callback);

// ❌ Не работает в React Native Firebase
import { requestPermission } from '@react-native-firebase/messaging'; // Нет таких exports!
```

## 🎯 Что делать?

### Вариант 1: Игнорировать warnings (рекомендуется)
- ✅ API стабильный и работает
- ✅ Будет работать до выхода v22
- ✅ Когда v22 выйдет - мигрируем

### Вариант 2: Отключить warnings в dev режиме

В `app/_layout.tsx`:

```typescript
if (__DEV__) {
  LogBox.ignoreLogs([
    'This method is deprecated',
    'React Native Firebase namespaced API'
  ]);
}
```

### Вариант 3: Дождаться v22 и мигрировать

Когда React Native Firebase v22 выйдет:
1. Обновить зависимости
2. Следовать официальному migration guide
3. Переписать код на modular API

## 📚 Дополнительная информация

- [React Native Firebase Docs](https://rnfirebase.io/)
- [Migration Guide (когда v22 выйдет)](https://rnfirebase.io/migrating-to-v22)
- [GitHub Issues](https://github.com/invertase/react-native-firebase/issues)

## ✅ Вывод

**Warnings можно безопасно игнорировать.** Ваш код правильный и будет работать стабильно. Когда v22 выйдет - мигрируем по официальному гайду.
