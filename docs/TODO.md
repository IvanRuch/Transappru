# ✅ TODO - Следующие шаги

## 🚀 Немедленные действия

### 1. Запустить проект (5 минут)
```bash
cd /Volumes/HP_P800/grizodubov/IdeaProjects/TransApp_upd
npm install
npx expo start
```

**Цель:** Убедиться что базовая инфраструктура работает

---

## 🔥 Критичные задачи

### 2. Доработать MainScreen (30-60 минут)
**Приоритет:** ВЫСОКИЙ  
**Файлы:**
- Старый: `Transappru/src/Main.js`
- Новый: `TransApp_upd/src/screens/main/MainScreen.tsx`

**Что делать:**
```typescript
// 1. Добавить типы
type MainScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Main'>;

interface MainScreenProps {
  navigation: MainScreenNavigationProp;
}

interface MainScreenState {
  // Скопировать из старого state
}

// 2. Обновить класс
class MainScreen extends Component<MainScreenProps, MainScreenState> {
  // ...
}

// 3. Заменить импорты
import api from '../../services/api';

// 4. Заменить Api.post на api.post
// 5. Заменить .then() на async/await
// 6. Заменить == на ===
```

**Проверка:**
```bash
npx tsc --noEmit
npx expo start
```

---

### 3. Доработать AutoListScreen (1-2 часа)
**Приоритет:** ВЫСОКИЙ  
**Файлы:**
- Старый: `Transappru/src/AutoList.js` (126KB!)
- Новый: `TransApp_upd/src/screens/auto/AutoListScreen.tsx`

**Внимание:** Файл очень большой, рекомендую разбить на компоненты

**Что делать:**
1. Создать компоненты:
   - `src/components/auto/AutoListItem.tsx`
   - `src/components/auto/AutoFilter.tsx`
2. Применить конвертацию по `CONVERSION_CHEATSHEET.md`
3. Использовать FlatList для оптимизации

---

## 📝 Важные задачи

### 4. Доработать UserScreen (30 минут)
**Приоритет:** СРЕДНИЙ  
**Файлы:**
- Старый: `Transappru/src/User.js`
- Новый: `TransApp_upd/src/screens/profile/UserScreen.tsx`

### 5. Доработать OurServicesScreen (30 минут)
**Приоритет:** СРЕДНИЙ  
**Файлы:**
- Старый: `Transappru/src/OurServices.js`
- Новый: `TransApp_upd/src/screens/services/OurServicesScreen.tsx`

---

## 🔄 Дополнительные задачи

### 6. Мигрировать оставшиеся экраны

По мере необходимости:

- [ ] **AutoScreen** (Auto.js → AutoScreen.tsx)
- [ ] **AutoDriverScreen** (AutoDriver.js → AutoDriverScreen.tsx)
- [ ] **AutoFineScreen** (AutoFine.js → AutoFineScreen.tsx)
- [ ] **PassScreen** (Pass.js → PassScreen.tsx)
- [ ] **InnScreen** (Inn.js → InnScreen.tsx)
- [ ] **DriverListScreen** (DriverList.js → DriverListScreen.tsx)
- [ ] **NotificationListScreen** (NotificationList.js → NotificationListScreen.tsx)
- [ ] **InviteUserScreen** (InviteUser.js → InviteUserScreen.tsx)
- [ ] **DelUserScreen** (DelUser.js → DelUserScreen.tsx)

**Для каждого экрана:**
1. Создать файл в нужной папке
2. Применить конвертацию по `CONVERSION_CHEATSHEET.md`
3. Добавить в `src/navigation/AppNavigator.tsx`
4. Протестировать

---

## 🛠️ Технические задачи

### 7. Оптимизация
- [ ] Разбить большие файлы на компоненты
- [ ] Добавить мемоизацию для списков
- [ ] Оптимизировать изображения

### 8. Тестирование
- [ ] Протестировать все экраны
- [ ] Проверить навигацию
- [ ] Проверить API запросы
- [ ] Проверить Firebase уведомления

### 9. Документация
- [ ] Обновить README при необходимости
- [ ] Добавить комментарии к сложным местам
- [ ] Создать CHANGELOG

---

## 📋 Чеклист готовности

### Базовая инфраструктура
- [x] API сервис настроен
- [x] Firebase настроен
- [x] Навигация работает
- [x] Entry point обновлен
- [x] Типы определены

### Экраны
- [x] AuthScreen готов
- [x] PinScreen готов
- [ ] MainScreen доработан
- [ ] AutoListScreen доработан
- [ ] UserScreen доработан
- [ ] OurServicesScreen доработан
- [ ] Остальные экраны мигрированы

### Тестирование
- [ ] Приложение запускается
- [ ] Авторизация работает
- [ ] Навигация работает
- [ ] API запросы работают
- [ ] Push уведомления работают

---

## 🎯 Рекомендуемый порядок

1. ✅ **Запустить проект** (убедиться что работает)
2. 🔥 **MainScreen** (критично для работы приложения)
3. 🔥 **AutoListScreen** (основной функционал)
4. 📝 **UserScreen** (профиль пользователя)
5. 📝 **OurServicesScreen** (дополнительный функционал)
6. 🔄 **Остальные экраны** (по мере необходимости)

---

## 💡 Полезные команды

```bash
# Запуск
npx expo start

# Проверка TypeScript
npx tsc --noEmit

# Очистка кэша
npx expo start -c

# iOS
npx expo run:ios

# Android
npx expo run:android
```

---

## 📚 Документация

- `QUICK_START.md` - быстрый старт
- `CURRENT_STATE.md` - текущее состояние
- `MIGRATION_STATUS.md` - статус миграции
- `CONVERSION_CHEATSHEET.md` - шпаргалка по конвертации
- `MIGRATION_GUIDE.md` - полное руководство

---

**Обновлено:** 2025-11-04  
**Следующий шаг:** Запустить проект и доработать MainScreen
