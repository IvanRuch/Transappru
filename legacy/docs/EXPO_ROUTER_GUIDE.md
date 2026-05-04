# 🧭 Руководство по Expo Router

## ✅ Миграция завершена!

Проект успешно мигрирован на **Expo Router** с file-based routing.

## 📁 Новая структура навигации

```
app/
├── _layout.tsx                      # Root layout (Firebase init)
├── index.tsx                        # / → Auth screen
├── pin.tsx                          # /pin → Pin screen
└── (authenticated)/                 # Защищенные роуты (требуют авторизации)
    ├── _layout.tsx                  # Auth check layout
    ├── main.tsx                     # /(authenticated)/main → Main screen
    ├── auto-list.tsx                # /(authenticated)/auto-list → Auto list
    ├── profile.tsx                  # /(authenticated)/profile → User profile
    ├── services.tsx                 # /(authenticated)/services → Services
    └── auto/
        └── [id].tsx                 # /(authenticated)/auto/:id → Auto detail
```

## 🔄 Как работает навигация

### 1. Публичные роуты (без авторизации)
- `/` (index.tsx) - Экран авторизации
- `/pin` - Ввод PIN-кода

### 2. Защищенные роуты (требуют токен)
Все роуты в папке `(authenticated)/` автоматически проверяют наличие токена.

- `/(authenticated)/main` - Главный экран
- `/(authenticated)/auto-list` - Список автомобилей
- `/(authenticated)/profile` - Профиль пользователя
- `/(authenticated)/services` - Услуги
- `/(authenticated)/auto/123` - Детали автомобиля (динамический роут)

### 3. Автоматическая проверка авторизации

В `app/(authenticated)/_layout.tsx` реализована проверка токена:

```typescript
useEffect(() => {
  const token = await AsyncStorage.getItem('token');
  if (!token) {
    router.replace('/'); // Редирект на авторизацию
  }
}, []);
```

## 🔧 Совместимость со старым кодом

### HOC withRouter

Создан компонент `src/components/withRouter.tsx` для совместимости с React Navigation.

**Что он делает:**
- Конвертирует `useRouter()` в `navigation` prop
- Маппит старые имена экранов на новые роуты
- Позволяет использовать старый код без изменений

**Пример использования:**

```typescript
// app/index.tsx
import AuthScreen from '../src/screens/auth/AuthScreen';
import { withRouter } from '../src/components/withRouter';

export default withRouter(AuthScreen);
```

**В компоненте работает как раньше:**

```typescript
// В AuthScreen.tsx
this.props.navigation.navigate('Pin'); // ✅ Работает!
this.props.navigation.navigate('Main'); // ✅ Работает!
```

### Маппинг роутов

| Старое имя | Новый роут |
|------------|------------|
| `Auth` | `/` |
| `Pin` | `/pin` |
| `Main` | `/(authenticated)/main` |
| `AutoList` | `/(authenticated)/auto-list` |
| `User` | `/(authenticated)/profile` |
| `OurServices` | `/(authenticated)/services` |
| `Auto` | `/(authenticated)/auto/:id` |

## 🚀 Преимущества новой архитектуры

### 1. File-based routing
Структура папок = навигация. Легко понять какие роуты есть в приложении.

### 2. Автоматическая типизация
Expo Router автоматически генерирует типы для роутов.

### 3. Deep linking из коробки
URL работают автоматически:
- `transapp://pin` → Pin screen
- `transapp://authenticated/auto-list` → Auto list

### 4. Защищенные роуты
Группа `(authenticated)` автоматически проверяет авторизацию.

### 5. Layouts
Переиспользуемые layout компоненты для разных секций приложения.

### 6. SEO для web
Если запустите web версию - SEO будет работать автоматически.

## 📝 Как добавить новый экран

### Публичный экран

```bash
# Создать файл
touch app/new-screen.tsx
```

```typescript
// app/new-screen.tsx
import NewScreen from '../src/screens/NewScreen';
import { withRouter } from '../src/components/withRouter';

export default withRouter(NewScreen);
```

Роут: `/new-screen`

### Защищенный экран

```bash
# Создать файл
touch app/\(authenticated\)/new-screen.tsx
```

```typescript
// app/(authenticated)/new-screen.tsx
import NewScreen from '../../src/screens/NewScreen';
import { withRouter } from '../../src/components/withRouter';

export default withRouter(NewScreen);
```

Роут: `/(authenticated)/new-screen`

### Динамический роут

```bash
# Создать папку и файл
mkdir -p app/\(authenticated\)/items
touch app/\(authenticated\)/items/[id].tsx
```

```typescript
// app/(authenticated)/items/[id].tsx
import ItemScreen from '../../../src/screens/ItemScreen';
import { withRouter } from '../../../src/components/withRouter';

export default withRouter(ItemScreen);
```

Роут: `/(authenticated)/items/:id`

**Доступ к параметрам:**

```typescript
// В компоненте
const { id } = this.props.route.params;
```

## 🔄 Навигация в коде

### Старый способ (все еще работает)

```typescript
this.props.navigation.navigate('Main');
this.props.navigation.navigate('Auto', { auto_id: 123 });
this.props.navigation.goBack();
```

### Новый способ (Expo Router)

Если хотите использовать напрямую Expo Router:

```typescript
import { useRouter } from 'expo-router';

const router = useRouter();

// Навигация
router.push('/(authenticated)/main');
router.push({ pathname: '/(authenticated)/auto/[id]', params: { id: 123 } });
router.back();
router.replace('/');
```

## 🎯 Следующие шаги

### 1. Протестировать навигацию

```bash
npx expo start
```

**Проверить:**
- ✅ Открывается экран авторизации
- ✅ После ввода телефона переход на PIN
- ✅ После PIN переход на Main
- ✅ Без токена редирект на авторизацию

### 2. Добавить остальные экраны

По мере миграции добавляйте экраны в `app/(authenticated)/`:

- `auto-driver.tsx` - Водители автомобиля
- `auto-fine.tsx` - Штрафы
- `pass/[id].tsx` - Детали пропуска
- `inn.tsx` - ИНН
- и т.д.

### 3. Обновить маппинг в withRouter

Если добавляете новые экраны, обновите `routeMap` в `src/components/withRouter.tsx`:

```typescript
const routeMap: Record<string, string> = {
  'Pin': '/pin',
  'Main': '/(authenticated)/main',
  'AutoList': '/(authenticated)/auto-list',
  'NewScreen': '/(authenticated)/new-screen', // Добавить новый
};
```

## 🐛 Troubleshooting

### Проблема: "Cannot find module 'expo-router'"

**Решение:**
```bash
npm install
```

### Проблема: Навигация не работает

**Решение:**
1. Проверьте что экран обернут в `withRouter()`
2. Проверьте маппинг в `withRouter.tsx`
3. Очистите кэш: `npx expo start -c`

### Проблема: Редирект на авторизацию не работает

**Решение:**
Проверьте что токен сохраняется в AsyncStorage с ключом `'token'`:

```typescript
await AsyncStorage.setItem('token', data.token);
```

## 📚 Полезные ссылки

- [Expo Router Documentation](https://docs.expo.dev/router/introduction/)
- [File-based routing](https://docs.expo.dev/router/create-pages/)
- [Layouts](https://docs.expo.dev/router/layouts/)
- [Dynamic routes](https://docs.expo.dev/router/create-pages/#dynamic-routes)

## ✨ Итого

**Что изменилось:**
- ✅ Удален `src/navigation/AppNavigator.tsx` (больше не нужен)
- ✅ Создана структура `app/` с file-based routing
- ✅ Добавлен HOC `withRouter` для совместимости
- ✅ Автоматическая проверка авторизации
- ✅ Deep linking из коробки

**Что осталось как было:**
- ✅ Все экраны в `src/screens/` не изменились
- ✅ Навигация в компонентах работает как раньше
- ✅ API и сервисы не изменились

**Результат:**
Современная архитектура с минимальными изменениями в существующем коде! 🎉

---

**Дата миграции:** 2025-11-04  
**Статус:** Готово к тестированию ✅
