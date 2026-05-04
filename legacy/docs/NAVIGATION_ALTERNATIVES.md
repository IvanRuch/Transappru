# 🧭 Альтернативы withRouter

## Проблема

HOC `withRouter.tsx` - это "костыль" для совместимости со старым кодом. Он конвертирует Expo Router API в React Navigation API.

**Минусы:**
- ❌ Дополнительный слой абстракции
- ❌ Маппинг роутов нужно поддерживать вручную
- ❌ Не использует возможности Expo Router напрямую
- ❌ Может быть источником багов

## ✅ Альтернативные подходы

### Вариант 1: Прямое использование Expo Router (рекомендуется)

**Идея:** Обновить экраны для использования Expo Router напрямую.

#### Было (с React Navigation):
```typescript
// AuthScreen.tsx
class AuthScreen extends Component<AuthScreenProps, AuthScreenState> {
  constructor(props: AuthScreenProps) {
    super(props);
  }

  handleSubmit = async () => {
    // ...
    this.props.navigation.navigate('Pin');
  }
}
```

#### Стало (с Expo Router):
```typescript
// AuthScreen.tsx
import { useRouter } from 'expo-router';

// Функциональный компонент
export default function AuthScreen() {
  const router = useRouter();
  
  const handleSubmit = async () => {
    // ...
    router.push('/pin');
  }

  return (
    // JSX
  );
}
```

**Или с классом через хук:**
```typescript
// AuthScreen.tsx
import { useRouter } from 'expo-router';

function AuthScreenContent({ router }: { router: any }) {
  // Ваш класс или логика
}

export default function AuthScreen() {
  const router = useRouter();
  return <AuthScreenContent router={router} />;
}
```

#### ✅ Плюсы:
- Чистое решение без костылей
- Прямое использование Expo Router API
- Типобезопасность из коробки
- Современный подход

#### ❌ Минусы:
- Нужно обновить все экраны
- Больше работы на начальном этапе

---

### Вариант 2: Конвертация классов в функциональные компоненты

**Идея:** Заодно модернизировать код, используя хуки.

#### Было:
```typescript
class AuthScreen extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      phone: '',
      disabled: true,
    };
  }

  componentDidMount() {
    this.loadData();
  }

  loadData = async () => {
    // ...
  }

  render() {
    return <View>...</View>;
  }
}
```

#### Стало:
```typescript
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function AuthScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [disabled, setDisabled] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    // ...
  }

  return <View>...</View>;
}
```

#### ✅ Плюсы:
- Современный React код
- Проще тестировать
- Меньше boilerplate
- Лучше производительность

#### ❌ Минусы:
- Нужно переписать все классы
- Требует понимания хуков
- Больше всего работы

---

### Вариант 3: Минимальный wrapper (компромисс)

**Идея:** Создать простой wrapper только для навигации, без маппинга.

```typescript
// src/hooks/useNavigation.ts
import { useRouter } from 'expo-router';

export function useNavigation() {
  const router = useRouter();
  
  return {
    push: (path: string, params?: any) => {
      router.push({ pathname: path as any, params });
    },
    replace: (path: string, params?: any) => {
      router.replace({ pathname: path as any, params });
    },
    back: () => router.back(),
  };
}
```

**Использование:**
```typescript
// В функциональном компоненте
const navigation = useNavigation();
navigation.push('/pin');

// В классе через wrapper
function AuthScreen() {
  const navigation = useNavigation();
  return <AuthScreenClass navigation={navigation} />;
}
```

#### ✅ Плюсы:
- Проще чем withRouter
- Нет маппинга роутов
- Используются прямые пути

#### ❌ Минусы:
- Все еще wrapper
- Нужно обновлять пути в коде

---

### Вариант 4: Постепенная миграция

**Идея:** Мигрировать экраны по одному, используя разные подходы.

**Этап 1:** Оставить withRouter для старых экранов
```typescript
// app/index.tsx
import AuthScreen from '../src/screens/auth/AuthScreen';
import { withRouter } from '../src/components/withRouter';

export default withRouter(AuthScreen); // Старый экран
```

**Этап 2:** Новые экраны писать с Expo Router
```typescript
// app/new-screen.tsx
import { useRouter } from 'expo-router';

export default function NewScreen() {
  const router = useRouter();
  // Современный код
}
```

**Этап 3:** Постепенно обновлять старые экраны

#### ✅ Плюсы:
- Можно начать работать сразу
- Постепенная модернизация
- Меньше рисков

#### ❌ Минусы:
- Два подхода в одном проекте
- Нужно поддерживать withRouter
- Дольше до полной миграции

---

## 🎯 Рекомендация для вашего проекта

### Оптимальный подход: Вариант 1 + Вариант 4

**Стратегия:**

1. **Сейчас (быстрый старт):**
   - Оставьте withRouter для существующих экранов
   - Это позволит запустить проект быстро

2. **Ближайшее будущее (по мере доработки):**
   - При доработке каждого экрана обновляйте его на Expo Router
   - Начните с простых экранов (Auth, Pin)

3. **Долгосрочно:**
   - Все экраны используют Expo Router напрямую
   - Удалите withRouter.tsx

### Пример миграции AuthScreen

#### Шаг 1: Создать функциональную версию

```typescript
// src/screens/auth/AuthScreen.tsx (новая версия)
import { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../services/api';
import { FirebaseService } from '../../services/firebase';

export default function AuthScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [disabled, setDisabled] = useState(true);
  const [checked, setChecked] = useState(false);

  const handleSubmit = async () => {
    try {
      const res = await api.post('/auth-by-phone', { 
        phone: phone.replace(/\+/, '') 
      });
      
      await AsyncStorage.setItem('token', res.data.token);
      await FirebaseService.getToken();
      
      router.push('/pin'); // ✅ Прямое использование Expo Router
    } catch (error) {
      console.log('error', error);
    }
  };

  return (
    <View>
      <TextInput
        value={phone}
        onChangeText={setPhone}
        // ...
      />
      <TouchableOpacity onPress={handleSubmit}>
        <Text>Войти</Text>
      </TouchableOpacity>
    </View>
  );
}
```

#### Шаг 2: Обновить app/index.tsx

```typescript
// app/index.tsx
import AuthScreen from '../src/screens/auth/AuthScreen';

export default AuthScreen; // ✅ Без withRouter!
```

---

## 📊 Сравнение подходов

| Подход | Работы | Чистота кода | Скорость | Рекомендация |
|--------|--------|--------------|----------|--------------|
| withRouter (текущий) | Минимум | ⭐⭐ | ⭐⭐⭐⭐⭐ | Для быстрого старта |
| Прямой Expo Router | Средне | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | **Лучший выбор** |
| Функциональные компоненты | Много | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | Для новых экранов |
| Постепенная миграция | Средне | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | **Оптимально** |

---

## 🚀 План действий

### Немедленно (сейчас):
- ✅ Оставьте withRouter как есть
- ✅ Запустите проект
- ✅ Протестируйте навигацию

### Ближайшие недели:
1. **Обновите AuthScreen** на прямой Expo Router (1-2 часа)
2. **Обновите PinScreen** на прямой Expo Router (1 час)
3. **Протестируйте** что все работает

### Долгосрочно:
- По мере доработки экранов обновляйте их на Expo Router
- Когда все экраны обновлены - удалите withRouter.tsx

---

## 💡 Итого

**Ответ на ваш вопрос:** Да, можно обойтись без withRouter!

**Рекомендую:**
1. **Сейчас:** Оставьте withRouter для быстрого старта
2. **Потом:** Постепенно обновляйте экраны на прямой Expo Router
3. **Результат:** Чистый код без костылей

**Начните с AuthScreen** - это самый простой экран для миграции. Я могу помочь его переписать прямо сейчас, если хотите!

---

**Дата:** 2025-11-04  
**Рекомендация:** Постепенная миграция на прямой Expo Router ✅
