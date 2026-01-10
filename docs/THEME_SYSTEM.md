# Система тем в TransApp

## 📋 Обзор

TransApp поддерживает три режима темы:
- **Светлая тема** (по умолчанию) - основной стиль приложения
- **Темная тема** - для использования в темное время суток
- **Авто** - автоматическое переключение в зависимости от системной темы телефона

## 🎨 Архитектура

### ThemeContext

Контекст темы находится в `src/contexts/ThemeContext.tsx` и предоставляет:

```typescript
interface ThemeContextType {
  theme: 'light' | 'dark' | 'auto';      // Выбранная пользователем тема
  effectiveTheme: 'light' | 'dark';      // Реальная тема (учитывая 'auto')
  setTheme: (theme: Theme) => void;      // Функция смены темы
}
```

**Особенности:**
- Сохраняет выбор пользователя в AsyncStorage (ключ: `app_theme`)
- Автоматически определяет системную тему через `useColorScheme()`
- Загружает сохраненную тему при запуске приложения

### Интеграция

Контекст подключен в `app/_layout.tsx`:

```tsx
<ThemeProvider>
  <NotificationProvider>
    <Stack>...</Stack>
  </NotificationProvider>
</ThemeProvider>
```

## 🎨 Цветовая палитра (Tailwind)

### Семантические цвета (для автоматического переключения)

В `tailwind.config.js` определены семантические цвета, которые **автоматически адаптируются** к теме:

```javascript
colors: {
  bg: {
    primary: '#ffffff',      // Основной фон
    secondary: '#EEEEEE',    // Вторичный фон
    elevated: '#D7D7D7',     // Поднятые элементы
  },
  border: {
    primary: '#B8B8B8',      // Основная граница
    secondary: '#E0E0E0',    // Вторичная граница
  },
  text: {
    primary: '#313131',      // Основной текст
    secondary: '#656565',    // Вторичный текст
    muted: '#8C8C8C',        // Приглушенный текст
  },
  accent: {
    primary: '#C9A86B',      // Золотой акцент (одинаков в обеих темах)
    secondary: '#3A3A3A',    // Темный акцент
  },
  status: {
    success: '#40882C',      // Зеленый (успех)
    error: '#EE505A',        // Красный (ошибка)
    warning: '#FFA500',      // Оранжевый (предупреждение)
    platon: '#EE505A',       // Цвет для ПЛАТОН
  },
}
```

### Тема-специфичные цвета (для ручного использования)

Если нужно явно указать цвет для конкретной темы:

```javascript
light: {
  bg: '#ffffff',
  surface: '#EEEEEE',
  elevated: '#D7D7D7',
  border: '#B8B8B8',
  text: '#313131',
  textSecondary: '#656565',
},
dark: {
  bg: '#2c2c2c',
  surface: '#3A3A3A',
  elevated: '#454545',
  border: '#3A3A3A',
  text: '#E8E8E8',
  textSecondary: '#909090',
}
```

## 💡 Использование в компонентах

### С NativeWind dark: модификатор (рекомендуется)

Используйте `dark:` префикс для автоматического переключения стилей:

```tsx
function MyScreen() {
  return (
    <View className="flex-1 bg-light-bg dark:bg-dark-bg">
      <Text className="text-lg text-light-text dark:text-dark-text">
        Привет, мир!
      </Text>
      <View className="bg-light-surface dark:bg-dark-surface p-4 rounded-lg">
        <Text className="text-light-textSecondary dark:text-dark-textSecondary">
          Вторичный контент
        </Text>
      </View>
    </View>
  );
}
```

**Преимущества:**
- ✅ Чистый и читаемый код
- ✅ Нет условной логики в компонентах
- ✅ Автоматическое переключение через NativeWind
- ✅ Стандартный подход Tailwind CSS

### С StyleSheet (для существующих компонентов)

```tsx
function LegacyComponent() {
  const { effectiveTheme } = useTheme();
  
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: effectiveTheme === 'dark' ? '#2c2c2c' : '#ffffff',
    },
    text: {
      color: effectiveTheme === 'dark' ? '#E8E8E8' : '#313131',
    },
  });
  
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Текст</Text>
    </View>
  );
}
```

## 🔄 Переключение темы

### В экране профиля (UserScreen)

Пользователь может переключать тему через экран профиля:
1. Открыть левое меню (гамбургер)
2. Нажать "Профиль"
3. Найти секцию "Тема приложения" (между ИНН и Контактами)
4. Нажать на поле темы
5. Тема циклически переключается: Авто → Светлая → Темная → Авто

```tsx
// В UserScreen.tsx (через HOC withTheme)
<TouchableOpacity
  onPress={() => {
    const { theme, setTheme } = this.props.themeContext;
    const themes: Array<'light' | 'dark' | 'auto'> = ['auto', 'light', 'dark'];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  }}
>
  <Text>{theme === 'dark' ? '🌙' : theme === 'light' ? '☀️' : '🔄'}</Text>
  <Text>{theme === 'light' ? 'Светлая' : theme === 'dark' ? 'Темная' : 'Авто'}</Text>
</TouchableOpacity>
```

### Программно

```tsx
import { useTheme } from '@/src/contexts/ThemeContext';

function MyComponent() {
  const { setTheme } = useTheme();
  
  return (
    <Button onPress={() => setTheme('dark')}>
      Включить темную тему
    </Button>
  );
}
```

## 📝 Миграция существующих экранов

### Шаг 1: Определить текущие цвета

Найдите все хардкод цвета в StyleSheet:
```tsx
// Было
backgroundColor: '#ffffff'  // → bg-light-bg (светлая) / bg-dark-bg (темная)
backgroundColor: '#EEEEEE'  // → bg-light-surface / bg-dark-surface
color: '#313131'            // → text-light-text / text-dark-text
borderColor: '#B8B8B8'      // → border-light-border / border-dark-border
```

### Шаг 2: Заменить на NativeWind с dark: модификатором

```tsx
// Было
<View style={styles.container}>
  <Text style={styles.title}>Заголовок</Text>
</View>

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#313131',
  },
});

// Стало
<View className="flex-1 bg-light-bg dark:bg-dark-bg p-5">
  <Text className="text-lg font-bold text-light-text dark:text-dark-text">
    Заголовок
  </Text>
</View>
```

### Шаг 3: Удалить StyleSheet

После миграции всех стилей на NativeWind, удалите блок `StyleSheet.create()`.

### Шаг 4: Удалить useTheme (если использовался)

Если компонент использовал `useTheme` для условных стилей, его можно удалить:

```tsx
// Было
import { useTheme } from '@/src/contexts/ThemeContext';
const { effectiveTheme } = useTheme();
const isDark = effectiveTheme === 'dark';

// Стало - не нужно!
// dark: модификатор работает автоматически
```

## 🎯 Примеры экранов

### ChargesScreen (мигрирован)

`src/screens/charges/ChargesScreen.tsx` - полностью мигрирован на NativeWind с `dark:` модификатором.

**Ключевые моменты:**
- Использует `dark:` модификатор для автоматического переключения
- Не требует `useTheme` или условной логики
- Автоматически адаптируется к выбранной теме
- Сокращен с 539 до 287 строк кода

**Пример кода:**
```tsx
<SafeAreaView className="flex-1 bg-light-bg dark:bg-dark-bg">
  <View className="bg-light-surface dark:bg-dark-surface px-5 py-2.5">
    <Text className="text-lg font-bold text-light-text dark:text-dark-text">
      По автомобилям
    </Text>
  </View>
</SafeAreaView>
```

## 🚀 Будущие улучшения

1. **Автоматическая миграция остальных экранов**
   - AutoListScreen
   - AutoDetailScreen
   - PassScreen
   - и другие

2. **Анимация переключения темы**
   - Плавный переход между темами
   - Анимация изменения цветов

3. **Дополнительные темы**
   - AMOLED темная тема (чистый черный)
   - Высококонтрастная тема

## 📚 Справочная информация

### Соответствие цветов

| Семантический класс | Светлая тема | Темная тема |
|---------------------|--------------|-------------|
| `bg-bg-primary` | `#ffffff` | `#2c2c2c` |
| `bg-bg-secondary` | `#EEEEEE` | `#3A3A3A` |
| `bg-bg-elevated` | `#D7D7D7` | `#454545` |
| `text-text-primary` | `#313131` | `#E8E8E8` |
| `text-text-secondary` | `#656565` | `#909090` |
| `border-border-primary` | `#B8B8B8` | `#3A3A3A` |
| `text-accent-primary` | `#C9A86B` | `#C9A86B` |

### Полезные ссылки

- [NativeWind Documentation](https://www.nativewind.dev/)
- [Tailwind CSS Colors](https://tailwindcss.com/docs/customizing-colors)
- [React Native useColorScheme](https://reactnative.dev/docs/usecolorscheme)
