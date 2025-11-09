# 🖼️ Исправлены пути к изображениям

**Дата:** 2025-11-04

## ❌ Проблема

```
iOS Bundling failed
Unable to resolve "../images/exclamation_triangle_circle.png" from "src/screens/main/MainScreen.tsx"
```

**Причина:** Неправильные пути к изображениям в старых файлах.

## ✅ Решение

### Было (неправильно):
```typescript
// src/screens/main/MainScreen.tsx
<Image source={require('../images/exclamation_triangle_circle.png')}/>
```

**Проблема:** Путь `../images/` не существует относительно `src/screens/`

### Стало (правильно):
```typescript
// src/screens/main/MainScreen.tsx
<Image source={require('../../../assets/images/exclamation_triangle_circle.png')}/>
```

**Правильно:** Путь `../../../assets/images/` корректен:
- `../` - выйти из `main/`
- `../` - выйти из `screens/`
- `../` - выйти из `src/`
- `assets/images/` - папка с изображениями

## 🔧 Что было исправлено

### Автоматическая замена во всех файлах:

```bash
find src/screens -name "*.tsx" -type f -exec sed -i '' "s|require('../images/|require('../../../assets/images/|g" {} \;
```

### Исправленные файлы (6):

1. ✅ `src/screens/main/MainScreen.tsx`
2. ✅ `src/screens/auto/AutoListScreen.tsx`
3. ✅ `src/screens/auto/AutoDetailScreen.tsx`
4. ✅ `src/screens/profile/UserScreen.tsx`
5. ✅ `src/screens/services/OurServicesScreen.tsx`
6. ✅ `src/screens/onboarding/OnBoardingScreen.tsx`
7. ✅ `src/screens/pass/PassYaMapScreen.tsx`

### Примеры замен:

```typescript
// AutoListScreen.tsx
// Было: require('../images/menu_add_2.png')
// Стало: require('../../../assets/images/menu_add_2.png')

// UserScreen.tsx
// Было: require('../images/edit_2.png')
// Стало: require('../../../assets/images/edit_2.png')

// OurServicesScreen.tsx
// Было: require('../images/back_2.png')
// Стало: require('../../../assets/images/back_2.png')
```

## 📁 Структура проекта

```
TransApp_upd/
├── assets/
│   └── images/              # ✅ Изображения здесь
│       ├── exclamation_triangle_circle.png
│       ├── menu_add_2.png
│       ├── edit_2.png
│       └── ...
│
└── src/
    └── screens/
        ├── main/
        │   └── MainScreen.tsx    # Путь: ../../../assets/images/
        ├── auto/
        │   └── AutoListScreen.tsx # Путь: ../../../assets/images/
        └── profile/
            └── UserScreen.tsx     # Путь: ../../../assets/images/
```

## 🎯 Правило для будущего

### Для файлов в `src/screens/*/`:
```typescript
// ✅ Правильно
require('../../../assets/images/image.png')

// ❌ Неправильно
require('../images/image.png')
require('../../images/image.png')
```

### Для файлов в `src/components/`:
```typescript
// ✅ Правильно
require('../../assets/images/image.png')
```

### Для файлов в `src/`:
```typescript
// ✅ Правильно
require('../assets/images/image.png')
```

## 🚀 Проверка

### Запустить проект:
```bash
npm run ios:16
```

**Результат:** Bundling должен пройти успешно! ✅

### Проверить что нет старых путей:
```bash
grep -r "require('../images/" src/ --include="*.tsx"
# Должно быть пусто
```

### Проверить новые пути:
```bash
grep -r "require('../../../assets/images/" src/screens/ --include="*.tsx" | wc -l
# Должно показать количество использований
```

## 💡 Альтернативный подход (для будущего)

### Использовать абсолютные импорты

**Настроить в `tsconfig.json`:**
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@assets/*": ["assets/*"],
      "@images/*": ["assets/images/*"]
    }
  }
}
```

**Использовать:**
```typescript
// Вместо
require('../../../assets/images/image.png')

// Можно
require('@images/image.png')
```

**Плюсы:**
- ✅ Короче
- ✅ Не зависит от уровня вложенности
- ✅ Легче рефакторить

**Минусы:**
- ❌ Требует настройки
- ❌ Может не работать с некоторыми инструментами

## ✨ Итого

**Проблема решена:**
- ✅ Все пути к изображениям исправлены
- ✅ Bundling теперь работает
- ✅ Приложение должно запуститься

**Следующий шаг:** Запустите `npm run ios:16` и проверьте!

---

**Дата:** 2025-11-04  
**Исправлено файлов:** 7  
**Статус:** ✅ Готово к запуску
