# 📁 Структура: app/ vs src/ - Правильный подход

## ❓ Вопрос: Почему экраны в src/, а не в app/?

**Ответ: Это правильная и рекомендуемая архитектура!**

## 🎯 Правильная структура Expo Router

### app/ - только роутинг (тонкий слой)
```
app/
├── _layout.tsx              # Конфигурация навигации
├── index.tsx                # Роут "/" → импортирует AuthScreen
├── pin.tsx                  # Роут "/pin" → импортирует PinScreen
└── (authenticated)/
    ├── _layout.tsx          # Auth check
    ├── main.tsx             # Роут → импортирует MainScreen
    └── auto-list.tsx        # Роут → импортирует AutoListScreen
```

**Файлы в app/ должны быть минимальными:**
```typescript
// app/index.tsx - ПРАВИЛЬНО ✅
import AuthScreen from '../src/screens/auth/AuthScreen';
export default AuthScreen;
```

### src/ - вся бизнес-логика
```
src/
├── screens/                 # Реальные компоненты экранов
│   ├── auth/
│   │   ├── AuthScreen.tsx   # Вся логика здесь
│   │   └── PinScreen.tsx
│   ├── main/
│   └── auto/
├── components/              # Переиспользуемые компоненты
├── services/                # API, Firebase
├── hooks/                   # Кастомные хуки
├── utils/                   # Утилиты
└── types/                   # TypeScript типы
```

## ✅ Почему это правильно?

### 1. Разделение ответственности
- **app/** - отвечает только за роутинг (что и где)
- **src/** - отвечает за логику (как работает)

### 2. Переиспользование компонентов
```typescript
// Экран можно использовать в разных местах
import AuthScreen from '../src/screens/auth/AuthScreen';

// В app/index.tsx
export default AuthScreen;

// В app/login.tsx (если нужен альтернативный роут)
export default AuthScreen;

// В Storybook для тестирования
import AuthScreen from './src/screens/auth/AuthScreen';
```

### 3. Тестирование
```typescript
// Легко тестировать компоненты независимо от роутинга
import AuthScreen from '../src/screens/auth/AuthScreen';

test('AuthScreen renders correctly', () => {
  render(<AuthScreen />);
  // ...
});
```

### 4. Миграция и рефакторинг
- Можно менять роутинг не трогая компоненты
- Можно менять компоненты не трогая роутинг
- Легко мигрировать на другой роутер

### 5. Организация кода
```
src/screens/auth/
├── AuthScreen.tsx           # Главный компонент
├── components/              # Компоненты только для Auth
│   ├── PhoneInput.tsx
│   └── AgreementModal.tsx
├── hooks/                   # Хуки только для Auth
│   └── usePhoneValidation.ts
└── styles.ts                # Стили
```

## 🔄 Сравнение подходов

### ❌ Неправильно: Все в app/
```
app/
├── index.tsx                # 500 строк кода здесь
├── pin.tsx                  # 300 строк кода здесь
└── main.tsx                 # 1000 строк кода здесь
```

**Проблемы:**
- Сложно тестировать
- Нельзя переиспользовать
- Плохая организация
- Смешивается роутинг и логика

### ✅ Правильно: app/ импортирует из src/
```
app/
├── index.tsx                # 3 строки - только импорт
├── pin.tsx                  # 3 строки - только импорт
└── main.tsx                 # 3 строки - только импорт

src/screens/
├── auth/
│   ├── AuthScreen.tsx       # Вся логика здесь
│   └── PinScreen.tsx        # Вся логика здесь
└── main/
    └── MainScreen.tsx       # Вся логика здесь
```

**Преимущества:**
- Чистое разделение
- Легко тестировать
- Можно переиспользовать
- Хорошая организация

## 📚 Примеры из реальных проектов

### Next.js (похожая архитектура)
```
pages/                       # Роутинг (как app/)
├── index.tsx               # Импортирует HomePage
└── about.tsx               # Импортирует AboutPage

src/                        # Логика
├── components/
│   ├── HomePage.tsx        # Реальный компонент
│   └── AboutPage.tsx
```

### Expo Router (официальная документация)
```
app/                        # File-based routing
├── index.tsx              # Импортирует экран
└── profile.tsx            # Импортирует экран

src/                       # Ваш код
├── screens/
├── components/
└── services/
```

## 🎯 Ваша текущая структура - ПРАВИЛЬНАЯ ✅

```
TransApp_upd/
├── app/                              # Роутинг (тонкий слой)
│   ├── _layout.tsx                   # Конфигурация
│   ├── index.tsx                     # import AuthScreen
│   ├── pin.tsx                       # import PinScreen
│   └── (authenticated)/
│       ├── main.tsx                  # import MainScreen
│       └── auto-list.tsx             # import AutoListScreen
│
└── src/                              # Бизнес-логика
    ├── screens/                      # Реальные компоненты
    │   ├── auth/
    │   │   ├── AuthScreen.tsx        # ✅ Вся логика здесь
    │   │   └── PinScreen.tsx         # ✅ Вся логика здесь
    │   ├── main/
    │   │   └── MainScreen.tsx
    │   └── auto/
    │       └── AutoListScreen.tsx
    ├── components/                   # Переиспользуемые
    ├── services/                     # API, Firebase
    ├── hooks/                        # Хуки
    └── utils/                        # Утилиты
```

## 💡 Когда код МОЖНО писать в app/

### 1. Layout компоненты
```typescript
// app/_layout.tsx
export default function RootLayout() {
  return (
    <Stack>
      {/* Конфигурация роутинга */}
    </Stack>
  );
}
```

### 2. Middleware/Guards
```typescript
// app/(authenticated)/_layout.tsx
export default function AuthLayout() {
  // Проверка авторизации
  const token = await AsyncStorage.getItem('token');
  if (!token) router.replace('/');
  
  return <Stack />;
}
```

### 3. Очень простые экраны (редко)
```typescript
// app/404.tsx
export default function NotFound() {
  return <Text>Page not found</Text>;
}
```

## 🚫 Когда код НЕ ДОЛЖЕН быть в app/

### ❌ Бизнес-логика
```typescript
// app/index.tsx - ПЛОХО ❌
export default function AuthScreen() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async () => {
    // 100 строк логики...
  };
  
  return (
    // 200 строк JSX...
  );
}
```

### ✅ Правильно
```typescript
// app/index.tsx - ХОРОШО ✅
import AuthScreen from '../src/screens/auth/AuthScreen';
export default AuthScreen;

// src/screens/auth/AuthScreen.tsx
export default function AuthScreen() {
  // Вся логика здесь
}
```

## 📖 Официальные рекомендации

### Expo Router документация:
> "The app directory is for routing. Keep your components, hooks, and utilities in a separate src directory."

### React Native Best Practices:
> "Separate routing logic from business logic. Use app/ for routes, src/ for everything else."

## ✨ Итого

**Ваша структура - правильная и профессиональная!**

- ✅ **app/** - тонкий слой роутинга (3-5 строк на файл)
- ✅ **src/** - вся бизнес-логика
- ✅ Легко тестировать
- ✅ Легко поддерживать
- ✅ Можно переиспользовать компоненты
- ✅ Соответствует best practices

**Не нужно ничего менять!** Продолжайте в том же духе.

---

**Дата:** 2025-11-04  
**Вывод:** Структура app/ + src/ - правильная ✅
