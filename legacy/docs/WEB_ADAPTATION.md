# Web-адаптация TransApp — план реализации

> Версия: 1.0 · Дата: 2026-02-24
> Текущая готовность веб-версии: базовая (авторизация, список авто отображаются, API через CORS работает)

---

## Принцип подхода

Используем платформо-специфические файлы Metro (`*.web.tsx`) и `Platform.OS === 'web'` проверки.
**Не меняем мобильный код** — только добавляем рядом веб-варианты или guard-условия.

Целевой UX веб-версии:
- Центрированный контент с `maxWidth: 1200px` на широких экранах
- Постоянная боковая панель слева (две позиции: свёрнутая / развёрнутая) вместо нижнего меню + drawera
- Сетка карточек авто (2-3 колонки) вместо одноколоночного списка
- Форма авторизации — отцентрированная карточка, не на весь экран

---

## Фазы реализации

### Фаза 1 — Глобальный лейаут и авторизация `[ВЫСОКИЙ ПРИОРИТЕТ]`

#### 1.1 Утилита responsive-хелперов
**Файл:** `src/utils/responsive.ts`

```ts
import { Platform, Dimensions } from 'react-native';

export const isWeb = Platform.OS === 'web';

// Breakpoints (web only)
export const getViewportWidth = () =>
  typeof window !== 'undefined' ? window.innerWidth : Dimensions.get('window').width;

export const isDesktop = () => isWeb && getViewportWidth() >= 1024;
export const isTablet  = () => isWeb && getViewportWidth() >= 768;

export const WEB_MAX_WIDTH = 1200;
export const WEB_SIDEBAR_WIDTH_EXPANDED = 240;
export const WEB_SIDEBAR_WIDTH_COLLAPSED = 56;
```

#### 1.2 Обёртка контента
**Файл:** `src/components/web/WebContentWrapper.tsx`
Рендерит `View` с `maxWidth` и центрированием на web, прозрачна на mobile.

#### 1.3 Форма авторизации — веб-вариант
**Файл:** `src/screens/auth/AuthScreen.web.tsx`

Изменения относительно нативного экрана:
- Экран = разделённый на два столбца: левый — брендинг, правый — форма (на ≥ 1024px)
- На < 1024px — одна колонка, карточка `maxWidth: 400` по центру
- Кнопка «Войти» — `width: '100%'` внутри карточки, не `width: 275`
- TextInput с `keyboardType` без `phone-pad` (на web всегда text)
- Ссылки на телефон через `<a href="tel:...">` вместо `Linking`
- Модалы (Пользовательское соглашение, Политика) — `position: fixed` overlay

#### 1.4 Лейаут после авторизации — веб-вариант
**Файл:** `src/components/web/WebAppLayout.tsx`

Структура (flex-row):
```
┌─────────────────────────────────────────┐
│ [Sidebar 240px]   [Main content flex:1] │
└─────────────────────────────────────────┘
```

Sidebar (две позиции переключаются кнопкой ☰):
- **Развёрнутый (240px):** иконка + подпись пункта меню
- **Свёрнутый (56px):** только иконки с tooltip при hover

Sidebar заменяет:
- Нижнее меню `AutoListScreen` (SelMenuPass, MenuUser, MenuContacts, MenuInviteUser)
- `LeftMenuModal` с его анимированным drawером

Пункты sidebar (порядок = логика нижнего меню + левого меню):
1. Пропуск (иконка pass) — `/(authenticated)/pass`
2. Профиль (иконка user) — `/user`
3. Пригласить друга — `/invite-user`
4. Контакты / обратная связь
5. --- разделитель ---
6. Наши услуги (раскрывается)
7. Проверить в РНИС
8. Добавить аккаунт
9. Список организаций
10. Список водителей
11. Начисления — `/charges`
12. Как работать в приложении

---

### Фаза 2 — Список авто `[ВЫСОКИЙ ПРИОРИТЕТ]`

#### 2.1 Сетка карточек
**Файл:** `src/screens/auto/AutoListScreen.web.tsx` (или условие внутри основного)

На web FlatList заменяется на `FlatList` с `numColumns` или на `ScrollView` + CSS grid.
Breakpoints:
- ≥ 1200px → 3 колонки
- ≥ 768px  → 2 колонки
- < 768px  → 1 колонка (как сейчас)

Хедер (строка с названием парка / кнопки):
- Перенести кнопку «добавить авто» в хедер рядом с заголовком
- Убрать нижнее меню из разметки (на web оно в sidebar)
- `paddingBottom` у FlatList не нужен (нет оверлея меню снизу)

#### 2.2 Карточка авто на web
**Файл:** `src/components/auto/AutoListItem.web.tsx`

- Убрать фиксированную высоту ячеек (29px) — перейти на `minHeight` или `paddingVertical`
- Кнопка «Заказать полис» — отображается отдельной строкой карточки, не в collapsed-детали
- Хорошо видимый hover-эффект (`cursor: pointer`)

---

### Фаза 3 — Боковая панель / LeftMenu `[ВЫСОКИЙ ПРИОРИТЕТ]`

#### 3.1 WebSidebar component
**Файл:** `src/components/web/WebSidebar.tsx`

```tsx
// Два режима через Context или prop:
type SidebarMode = 'expanded' | 'collapsed';
```

Поведение:
- Состояние (expanded/collapsed) хранится в `AsyncStorage` или локальном state
- При клике на ☰ переключается
- При ширине < 900px — автоматически коллапсируется
- При ширине < 600px — скрывается совсем (возможно нужна шапка с гамбургером)
- Нет backdrop, нет `react-native-modal` — просто `View` в flex-row лейауте

**Контекст для организаций** (множественные аккаунты):
- Список организаций отображается прямо в sidebar снизу
- Активная организация выделена
- Кнопка «+ Добавить» для добавления нового аккаунта

#### 3.2 Навигация в sidebar
Использует `useRouter()` из `expo-router`.
Активный пункт подсвечивается по `usePathname()`.

---

### Фаза 4 — Детали авто `[СРЕДНИЙ ПРИОРИТЕТ]`

**Файл:** `src/screens/auto/AutoDetailScreen`

- На web показывать вкладки горизонтально (табы вверху), не как toggle-chips
- Кнопки «Заказать полис» / «Заказать пропуск» — встроены в контент, не `position: absolute` снизу
- Поле с картой (PassYaMapScreen) — уже заглушено, ОК

---

### Фаза 5 — Остальные экраны `[СРЕДНИЙ ПРИОРИТЕТ]`

| Экран | Проблема | Решение |
|-------|----------|---------|
| `ChargesScreen` | Full-width список, нет max-width | `WebContentWrapper` |
| `NotificationListScreen` | Full-width список | `WebContentWrapper` |
| `DriverListScreen` | Full-width список | `WebContentWrapper` |
| `PassScreen` | Детали пропуска — норм, карта = заглушка | ОК |
| `UserScreen` (ProfileScreen) | Форма на весь экран | Карточка + max-width |
| `OurServicesScreen` | Full-width | `WebContentWrapper` |
| `InnScreen` | Форма на весь экран | Карточка + max-width |
| `InviteUserScreen` | Full-width | `WebContentWrapper` |
| `OnBoardingScreen` | Слайды на весь экран | Центрированный контейнер |
| `PinScreen` | Пин-пад на весь экран | Карточка по центру |

---

### Фаза 6 — UX-детали `[НИЗКИЙ ПРИОРИТЕТ]`

- **Клавиатурная навигация** в списках и формах (Enter для submit)
- **Hover-стейты** на интерактивных элементах (CSS cursor: pointer)
- **Модалы**: `FindAutoPanel`, `ContactsModal`, `AddAutoModal` — проверить что
  `react-native-modal` корректно работает на web; если нет — сделать `.web.tsx` стабы
  на обычном RN `Modal`
- **Escape для закрытия модалов** — добавить `onRequestClose` во все модалы
- **`AppState` в authenticated layout** — добавить web-вариант через
  `document.addEventListener('visibilitychange', ...)`
- **`StatusBar`** — на web не нужен, обернуть в `Platform.OS !== 'web'`
- **`SafeAreaView`** — на web заменить на обычный `View` (нет notch)

---

## Что уже сделано ✅

- `PassYaMapScreen.web.tsx` — заглушка
- `FinePaymentWebViewScreen.web.tsx` — iframe
- `NetworkStatusBanner.web.tsx` — через window events
- `DateTimePicker.web.tsx` — через `<input type="date">`
- `KeyboardAwareScrollView.web.tsx` — через обычный ScrollView
- `Api.web.ts` + `api.web.ts` — CORS-совместимые клиенты (x-www-form-urlencoded)
- `usePushNotifications.web.ts` — no-op
- `firebase.web.ts` — no-op

---

## Порядок выполнения (итерации)

```
[1] src/utils/responsive.ts                         — 30 мин
[2] src/components/web/WebSidebar.tsx               — 3-4 ч
[3] src/components/web/WebAppLayout.tsx             — 2 ч
[4] Обновить authenticated _layout.tsx.web          — 1 ч
[5] AuthScreen.web.tsx                              — 2-3 ч
[6] AutoListScreen: сетка + убрать нижнее меню      — 2-3 ч
[7] AutoListItem.web.tsx (убрать фикс. высоты)      — 1-2 ч
[8] AutoDetailScreen: табы + кнопки                 — 2 ч
[9] WebContentWrapper + применить к остальным       — 1-2 ч/экран
[10] UX-детали (hover, keyboard, modals)            — по мере
```

---

## Технические решения

### Platform-check в shared-файлах
```tsx
import { Platform } from 'react-native';

const styles = StyleSheet.create({
  container: {
    ...Platform.select({
      web: { maxWidth: 1200, alignSelf: 'center', width: '100%' },
      default: { flex: 1 },
    }),
  },
});
```

### Hook useWebLayout
```tsx
// src/hooks/useWebLayout.ts
import { Platform } from 'react-native';
import { useState, useEffect } from 'react';

export function useWebLayout() {
  const [width, setWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 375
  );

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return {
    isWeb: Platform.OS === 'web',
    isDesktop: Platform.OS === 'web' && width >= 1024,
    isTablet: Platform.OS === 'web' && width >= 768,
    isMobile: Platform.OS !== 'web' || width < 768,
    width,
    columns: width >= 1200 ? 3 : width >= 768 ? 2 : 1,
  };
}
```

### Sidebar state
```tsx
// src/hooks/useWebSidebar.ts
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'web_sidebar_mode';

export function useWebSidebar() {
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then(v => {
      if (v === 'collapsed') setExpanded(false);
    });
  }, []);

  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    AsyncStorage.setItem(KEY, next ? 'expanded' : 'collapsed');
  };

  return { expanded, toggle };
}
```

---

## Файлы к созданию

```
src/utils/responsive.ts
src/hooks/useWebLayout.ts
src/hooks/useWebSidebar.ts
src/components/web/WebSidebar.tsx
src/components/web/WebAppLayout.tsx
src/components/web/WebContentWrapper.tsx
src/screens/auth/AuthScreen.web.tsx
app/(authenticated)/_layout.web.tsx      ← заменить AppState на visibilitychange
```

## Файлы к изменению

```
src/screens/auto/AutoListScreen.tsx      ← условный рендер sidebar/bottom-menu
src/screens/auto/AutoDetailScreen.tsx    ← убрать position:absolute кнопки на web
src/components/auto/AutoListItem.tsx     ← убрать фиксированные высоты на web
src/components/auto/modals/LeftMenuModal.tsx  ← на web не показывать (sidebar его заменяет)
```
