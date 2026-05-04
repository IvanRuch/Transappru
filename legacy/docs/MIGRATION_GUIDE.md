# Руководство по миграции TransApp

## ✅ Что уже сделано

### 1. Структура проекта
- ✅ Создана папка `src/` с подпапками
- ✅ Скопированы `utils/`, `styles/`, `images/`
- ✅ Созданы сервисы: `firebase.ts`, `api.ts`
- ✅ Создана навигация: `AppNavigator.tsx`

### 2. Экраны аутентификации
- ✅ `AuthScreen.tsx` - конвертирован в TypeScript
- ✅ `PinScreen.tsx` - конвертирован в TypeScript
- ✅ Обновлены импорты для Expo
- ✅ Заменены `Api` на `api` сервис
- ✅ Заменены пути к изображениям

### 3. Типы
- ✅ Созданы TypeScript типы для навигации

## 📋 Следующие шаги

### Шаг 1: Скопируйте недостающие изображения

Убедитесь что эти файлы есть в `assets/images/`:
```bash
# Проверьте наличие:
- contact_phone_2.png
- checkbox_checked_512x512.png
- checkbox_unchecked_512x512.png
```

Если их нет, скопируйте из старого проекта:
```bash
cp /Volumes/HP_P800/grizodubov/IdeaProjects/Transappru/images/* \
   /Volumes/HP_P800/grizodubov/IdeaProjects/TransApp_upd/assets/images/
```

### Шаг 2: Обновите API сервис

Откройте `src/services/api.ts` и:

1. **Замените BASE_URL** на ваш реальный API:
```typescript
const BASE_URL = 'https://your-actual-api-url.com';
```

2. **Добавьте методы из старого проекта**:
   - Откройте старый `src/utils/Api.js`
   - Скопируйте все методы в новый `api.ts`
   - Добавьте типы для параметров и ответов

### Шаг 3: Настройте навигацию

Обновите `src/navigation/AppNavigator.tsx`:

```typescript
import AuthScreen from '../screens/auth/AuthScreen';
import PinScreen from '../screens/auth/PinScreen';
// TODO: Добавить остальные экраны

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Auth" component={AuthScreen} />
        <Stack.Screen name="Pin" component={PinScreen} />
        {/* TODO: Добавить остальные экраны */}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

### Шаг 4: Обновите App.tsx

Замените содержимое на:

```typescript
import React, { useEffect } from 'react';
import AppNavigator from './src/navigation/AppNavigator';
import { FirebaseService } from './src/services/firebase';

export default function App() {
  useEffect(() => {
    // Инициализация Firebase
    FirebaseService.requestPermission();
    FirebaseService.setupNotificationListeners();
  }, []);

  return <AppNavigator />;
}
```

### Шаг 5: Мигрируйте остальные экраны

**Приоритет 1 (критичные):**
1. `Main.js` → `src/screens/main/MainScreen.tsx`
2. `AutoList.js` → `src/screens/auto/AutoListScreen.tsx`
3. `User.js` → `src/screens/profile/UserScreen.tsx`

**Для каждого экрана:**

1. **Скопируйте файл**:
```bash
cp src/OldScreen.js src/screens/category/NewScreen.tsx
```

2. **Обновите импорты**:
```typescript
// Старый
import Api from "./utils/Api";
import { getFCMToken } from './utils/PushNotificationHelper';

// Новый
import api from '../../services/api';
import { FirebaseService } from '../../services/firebase';
```

3. **Конвертируйте в TypeScript**:
   - Добавьте типы для props и state
   - Замените `==` на `===`
   - Замените `.then()` на `async/await`
   - Добавьте типы для функций

4. **Обновите пути к изображениям**:
```typescript
// Старый
require('../images/icon.png')

// Новый
require('../../../assets/images/icon.png')
```

## 🔧 Частые проблемы и решения

### Проблема: Ошибка импорта изображений

**Решение:**
```typescript
// Создайте файл src/types/images.d.ts
declare module '*.png' {
  const value: any;
  export default value;
}
```

### Проблема: API возвращает ошибку 401

**Решение:**
Проверьте что токен сохраняется и отправляется:
```typescript
// В api.ts уже настроен interceptor для автоматического добавления токена
```

### Проблема: Firebase не инициализируется

**Решение:**
1. Убедитесь что `GoogleService-Info.plist` и `google-services.json` скопированы
2. Запустите `npx expo prebuild` заново
3. Пересоберите приложение

## 📝 Чеклист миграции экранов

- [x] AuthScreen
- [x] PinScreen
- [ ] MainScreen
- [ ] OnBoardingScreen
- [ ] AutoListScreen (большой файл - разбить на компоненты)
- [ ] AutoScreen
- [ ] AutoDriverScreen
- [ ] AutoFineScreen
- [ ] PassScreen
- [ ] PassYaMapScreen (требует Yandex Maps)
- [ ] UserScreen
- [ ] OurServicesScreen
- [ ] InnScreen
- [ ] DriverListScreen
- [ ] NotificationListScreen
- [ ] InviteUserScreen
- [ ] DelUserScreen

## 🚀 Запуск проекта

```bash
# Установка зависимостей
npm install

# iOS
npx expo run:ios

# Android
npx expo run:android
```

## 📚 Полезные ссылки

- [Expo Documentation](https://docs.expo.dev/)
- [React Navigation](https://reactnavigation.org/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Native Firebase](https://rnfirebase.io/)
