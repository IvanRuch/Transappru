# NativeWind Setup & Migration Guide

## 📦 Установка завершена

NativeWind v4 успешно установлен и настроен в проекте TransApp_upd.

## 🎨 Цветовая палитра

В `tailwind.config.js` настроена кастомная палитра на основе темного стиля ChargesScreen:

### Dark Theme Colors
- `bg-dark-bg` → `#2c2c2c` - основной фон
- `bg-dark-surface` → `#3A3A3A` - поверхности
- `bg-dark-elevated` → `#454545` - приподнятые элементы
- `border-dark-border` → `#3A3A3A` - границы

### Light Theme Colors
- `bg-light-bg` → `#ffffff` - основной фон
- `bg-light-surface` → `#EEEEEE` - поверхности
- `bg-light-elevated` → `#D7D7D7` - приподнятые элементы
- `border-light-border` → `#B8B8B8` - границы

### Text Colors
- `text-text-primary` → `#E8E8E8` - основной текст (для темной темы)
- `text-text-secondary` → `#909090` - второстепенный текст
- `text-text-dark` → `#313131` - темный текст (для светлой темы)
- `text-text-muted` → `#656565` - приглушенный текст

### Accent Colors
- `text-accent-primary` / `bg-accent-primary` → `#C9A86B` - золотистый акцент
- `text-accent-secondary` / `bg-accent-secondary` → `#3A3A3A` - темный акцент

### Status Colors
- `text-status-success` → `#40882C` - зеленый (успех)
- `text-status-error` → `#EE505A` - красный (ошибка)
- `text-status-warning` → `#FFA500` - оранжевый (предупреждение)
- `text-status-platon` → `#EE505A` - красный ПЛАТОН

## 📁 Созданные файлы

```
TransApp_upd/
├── tailwind.config.js          # Конфигурация Tailwind с кастомными цветами
├── metro.config.js              # Metro bundler с NativeWind
├── babel.config.js              # Babel с NativeWind preset
├── global.css                   # Глобальные Tailwind директивы
├── nativewind-env.d.ts          # TypeScript типы для NativeWind
└── app/_layout.tsx              # Обновлен: импорт global.css
```

## 🚀 Использование

### Базовый синтаксис

**Было (StyleSheet):**
```tsx
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2c2c2c',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#E8E8E8',
  },
});

<View style={styles.container}>
  <Text style={styles.title}>Заголовок</Text>
</View>
```

**Стало (NativeWind):**
```tsx
<View className="flex-1 bg-dark-bg">
  <Text className="text-lg font-bold text-text-primary">Заголовок</Text>
</View>
```

### Условные стили

**Было:**
```tsx
<View style={[
  styles.button,
  disabled && styles.buttonDisabled
]}>
```

**Стало:**
```tsx
<View className={`px-4 py-2 rounded ${disabled ? 'opacity-50' : ''}`}>
```

### Динамические значения

Для динамических значений используйте `style`:
```tsx
<View 
  className="absolute bottom-0 left-0 right-0"
  style={{ paddingBottom: insets.bottom + 10 }}
>
```

## 📖 Примеры миграции

### Пример 1: Простой контейнер

**Было:**
```tsx
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2c2c2c',
    padding: 20,
  },
});
```

**Стало:**
```tsx
className="flex-1 bg-dark-bg p-5"
```

### Пример 2: Карточка

**Было:**
```tsx
const styles = StyleSheet.create({
  card: {
    backgroundColor: '#3A3A3A',
    borderRadius: 8,
    padding: 15,
    marginHorizontal: 20,
    marginBottom: 10,
  },
});
```

**Стало:**
```tsx
className="bg-dark-surface rounded-lg p-4 mx-5 mb-2.5"
```

### Пример 3: Текст

**Было:**
```tsx
const styles = StyleSheet.create({
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#E8E8E8',
    marginBottom: 10,
  },
});
```

**Стало:**
```tsx
className="text-lg font-bold text-text-primary mb-2.5"
```

## 🎯 Референсный пример

Полный пример миграции ChargesScreen:
- **Оригинал:** `src/screens/charges/ChargesScreen.tsx`
- **Мигрированный:** `src/screens/charges/ChargesScreen.nativewind.example.tsx`

Сравните эти файлы чтобы увидеть:
- Как убрать весь блок `StyleSheet.create()` (~230 строк)
- Как использовать кастомные цвета
- Как работать с условными стилями
- Как комбинировать className и style

## 📝 Чек-лист миграции экрана

- [ ] Открыть оригинальный файл экрана
- [ ] Найти все `style={styles.xxx}`
- [ ] Заменить на `className="..."`
- [ ] Использовать кастомные цвета из палитры
- [ ] Удалить блок `StyleSheet.create()`
- [ ] Проверить работу экрана
- [ ] Убедиться что динамические стили остались в `style`

## 🔄 Постепенная миграция

Не нужно мигрировать все сразу! NativeWind работает параллельно со StyleSheet:

```tsx
// Можно смешивать подходы
<View 
  className="flex-1 bg-dark-bg"  // NativeWind
  style={styles.oldStyle}         // StyleSheet
>
```

## 🎨 Tailwind классы - шпаргалка

### Layout
- `flex-1` - flex: 1
- `flex-row` - flexDirection: 'row'
- `items-center` - alignItems: 'center'
- `justify-between` - justifyContent: 'space-between'

### Spacing
- `p-4` - padding: 16px
- `px-5` - paddingHorizontal: 20px
- `py-2` - paddingVertical: 8px
- `m-4` - margin: 16px
- `gap-2` - gap: 8px

### Sizing
- `w-full` - width: '100%'
- `h-20` - height: 80px
- `min-h-screen` - minHeight: '100vh'

### Typography
- `text-sm` - fontSize: 12px
- `text-base` - fontSize: 14px
- `text-lg` - fontSize: 18px
- `font-bold` - fontWeight: 'bold'
- `text-center` - textAlign: 'center'

### Visual
- `bg-dark-bg` - backgroundColor: '#2c2c2c'
- `rounded-lg` - borderRadius: 8px
- `border` - borderWidth: 1px
- `opacity-50` - opacity: 0.5

### Position
- `absolute` - position: 'absolute'
- `top-0` - top: 0
- `bottom-0` - bottom: 0

## 🐛 Troubleshooting

### Стили не применяются

1. Убедитесь что сервер перезапущен после установки
2. Очистите кеш Metro: `npx expo start -c`
3. Проверьте что `global.css` импортирован в `app/_layout.tsx`

### TypeScript ошибки

Убедитесь что `nativewind-env.d.ts` добавлен в `tsconfig.json`:
```json
"include": [
  "nativewind-env.d.ts"
]
```

### Кастомные цвета не работают

Проверьте `tailwind.config.js`:
- Секция `extend.colors` должна содержать ваши цвета
- Используйте `presets: [require("nativewind/preset")]`

## 📚 Дополнительные ресурсы

- [NativeWind Docs](https://www.nativewind.dev/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Expo + NativeWind Guide](https://www.nativewind.dev/getting-started/expo-router)

## 🎉 Готово!

NativeWind настроен и готов к использованию. Начните с миграции одного экрана как пример, затем постепенно переводите остальные.
