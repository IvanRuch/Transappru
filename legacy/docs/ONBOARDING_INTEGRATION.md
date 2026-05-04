# 🎓 OnBoarding Integration

**Дата:** 2025-11-04  
**Статус:** ✅ Готово

## 📋 Описание

OnBoarding экран показывает инструкцию для новых пользователей при первом входе в приложение.

## 🎯 Логика работы

### Когда показывается OnBoarding

OnBoarding автоматически показывается когда:
1. Пользователь авторизован (есть токен)
2. Сервер возвращает `onboarding_viewed: 0` в ответе `/get-auto-list`
3. Это первый запуск приложения для пользователя

### Поток навигации

#### Первый запуск:
```
Auth → Pin → AutoList → (проверка onboarding_viewed) → OnBoarding → AutoList
```

#### Повторный запуск:
```
Auth → Pin → AutoList (onboarding_viewed: 1, пропускаем OnBoarding)
```

## 📁 Структура файлов

```
src/
├── screens/onboarding/
│   ├── OnBoardingScreen.tsx      ✅ Функциональный компонент
│   └── OnBoardingScreen.old.tsx  📦 Backup (класс-компонент)
│
app/
└── onboarding.tsx                ✅ Роут Expo Router
```

## 🎨 Экраны OnBoarding

### 4 слайда с инструкциями:

1. **Добавляйте авто**
   - Изображение: `onboarding1.png`
   - Описание функции добавления автомобилей

2. **Проверяйте штрафы, ОСАГО, диагностические карты**
   - Изображение: `onboarding2.png`
   - Описание функций проверки

3. **Заказывайте пропуска на транспорт**
   - Изображение: `onboarding3.png`
   - Описание функции заказа пропусков

4. **Добавляйте файлы**
   - Изображение: `onboarding4.png`
   - Описание функции работы с файлами

## 🔧 Техническая реализация

### 1. Компонент OnBoardingScreen

```typescript
export default function OnBoardingScreen() {
  const router = useRouter();
  const [current, setCurrent] = useState(0);

  // При монтировании проверяем токен
  useEffect(() => {
    AsyncStorage.getItem('token').then(async (token) => {
      if (!token) {
        router.replace('/');
        return;
      }
      // Вызываем API для логирования
      await Api.post('/get-onboarding', { token });
    });
  }, []);

  // Переход к следующему экрану
  const handleNext = () => {
    if (current >= screens.length - 1) {
      router.replace('/(authenticated)/auto-list');
    } else {
      setCurrent(current + 1);
    }
  };

  // Рендер экрана...
}
```

### 2. Проверка в useAutoList

```typescript
// В функции getAutoList после получения данных:
if (data.onboarding_viewed === 0) {
  console.log('OnBoarding not viewed, redirecting...');
  setOnboardingViewed(0);
  router.push('/onboarding');
} else {
  setOnboardingViewed(1);
}
```

### 3. API Endpoint

**Запрос:** `POST /get-auto-list`
```json
{
  "token": "user_token",
  "from": 0,
  "limit": 10
}
```

**Ответ:**
```json
{
  "onboarding_viewed": 0,  // 0 = не просмотрен, 1 = просмотрен
  "onboarding_expired": 1,
  "session_data": { ... },
  "auto_data": { ... }
}
```

## 🎮 UI/UX

### Элементы интерфейса:

1. **Изображение** - большое изображение с инструкцией
2. **Описание** - текст под изображением
3. **Индикаторы** - точки внизу (активная/неактивная)
4. **Кнопка** - "Далее" (1-3 экраны) / "Начать" (4 экран)

### Стили:

```typescript
{
  imageContainer: {
    backgroundColor: '#EEEEEE',
    borderRadius: 5,
    // Занимает большую часть экрана
  },
  description: {
    fontSize: 20,
    fontWeight: '600',
    color: '#313131',
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#3A3A3A',
    borderRadius: 5,
    height: 50,
  }
}
```

## 🧪 Тестирование

### Ручное тестирование:

1. **Раскомментировать кнопку в AutoListScreen:**
   ```typescript
   // В src/screens/auto/AutoListScreen.tsx
   // Найти закомментированную кнопку "📚 Инструкция (OnBoarding)"
   // Раскомментировать для тестирования
   ```

2. **Запустить приложение:**
   ```bash
   npm run ios:16
   ```

3. **Нажать на кнопку** "📚 Инструкция (OnBoarding)"

4. **Проверить:**
   - ✅ Показываются 4 экрана
   - ✅ Индикаторы работают
   - ✅ Кнопка "Далее" переключает экраны
   - ✅ Кнопка "Начать" возвращает к списку авто

### Автоматическое тестирование:

Для тестирования автоматического показа нужно:
1. Сервер должен вернуть `onboarding_viewed: 0`
2. При первом входе OnBoarding откроется автоматически

## 📝 Важные заметки

### Для продакшена:

- ✅ Кнопка ручного запуска **закомментирована**
- ✅ OnBoarding показывается **только при `onboarding_viewed: 0`**
- ✅ После просмотра пользователь переходит к списку авто
- ✅ Повторно не показывается (пока сервер не вернет `onboarding_viewed: 0`)

### Для разработки/тестирования:

- Раскомментировать кнопку в `AutoListScreen.tsx` (строка ~96)
- Кнопка позволяет открыть OnBoarding в любой момент

## 🔄 Сравнение со старым проектом

| Аспект | Старый проект | Новый проект |
|--------|---------------|--------------|
| Тип компонента | Class | Function |
| Навигация | React Navigation | Expo Router |
| State | this.state | useState |
| Lifecycle | componentDidMount | useEffect |
| Props | this.props | useRouter |
| Проверка | AutoList.js:669 | useAutoList.ts:69 |
| API | /get-onboarding | /get-onboarding |

## ✅ Checklist готовности

- ✅ Компонент создан и работает
- ✅ Роут настроен
- ✅ Логика проверки реализована
- ✅ Изображения на месте
- ✅ Навигация работает
- ✅ Кнопка для тестирования закомментирована
- ✅ Логи добавлены
- ✅ Документация создана

## 🎉 Результат

OnBoarding полностью интегрирован и работает идентично старому проекту!

---

**Автор:** AI Assistant  
**Дата:** 2025-11-04  
**Версия:** 1.0
