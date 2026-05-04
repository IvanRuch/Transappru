# Интеграция оплаты штрафов

## 📋 Обзор

Функционал оплаты штрафов реализован через WebView с интеграцией стороннего платёжного сервиса.

## 🔄 Flow оплаты

```
AutoFineScreen (детали штрафа)
         ↓
   [Кнопка "Оплатить"]
         ↓
FinePaymentConfirmScreen (подтверждение суммы)
         ↓
FinePaymentWebViewScreen (платёжная страница)
         ↓
    ┌─────┴─────┐
    ↓           ↓
Success      Cancel/Error
    ↓           ↓
FinePaymentSuccessScreen
```

## 📁 Структура файлов

```
src/screens/fine-payment/
├── FinePaymentConfirmScreen.tsx    # Экран подтверждения оплаты
├── FinePaymentWebViewScreen.tsx    # WebView с платёжной страницей
├── FinePaymentSuccessScreen.tsx    # Экран успешной оплаты
└── index.ts                        # Экспорты

app/(authenticated)/
├── fine-payment-confirm.tsx        # Роут подтверждения
├── fine-payment-webview.tsx        # Роут WebView
└── fine-payment-success.tsx        # Роут успеха
```

## 🔧 Интеграция с платёжным API

### 1. Получение ссылки на оплату

В файле `FinePaymentConfirmScreen.tsx` (строка 50-60) нужно добавить реальный API запрос:

```typescript
const handlePayment = async () => {
  setLoading(true);
  
  try {
    // TODO: Заменить на реальный endpoint
    const response = await Api.post('/get-payment-url', {
      token: await AsyncStorage.getItem('token'),
      uin: fineData.uin,           // Номер постановления
      amount: paymentAmount,        // Сумма к оплате
      // Дополнительные параметры по необходимости
    });
    
    const paymentUrl = response.data.payment_url;
    
    // Переход на WebView
    router.push({
      pathname: '/(authenticated)/fine-payment-webview' as any,
      params: { 
        payment_url: paymentUrl,
        fine_data: JSON.stringify(fineData)
      }
    });
  } catch (error) {
    console.error('Error getting payment URL:', error);
    alert('Ошибка при получении ссылки на оплату');
  } finally {
    setLoading(false);
  }
};
```

### 2. Обработка callback URL

В файле `FinePaymentWebViewScreen.tsx` (строка 55-75) настроить обработку URL:

```typescript
const handleNavigationStateChange = (navState: any) => {
  const { url } = navState;
  
  // TODO: Настроить под реальные URL callback'ов платёжной системы
  // Примеры:
  // - https://your-domain.com/payment/success?order_id=123
  // - https://your-domain.com/payment/cancel
  // - https://your-domain.com/payment/error?code=500
  
  if (url.includes('success') || url.includes('payment-success')) {
    handlePaymentSuccess();
  } else if (url.includes('cancel') || url.includes('payment-cancel')) {
    handlePaymentCancel();
  } else if (url.includes('fail') || url.includes('error')) {
    handlePaymentError();
  }
};
```

## 📊 Данные штрафа (FineData)

```typescript
interface FineData {
  is_paid: string | number;        // Статус оплаты (0/1)
  discount_time_left?: string;     // Время до окончания скидки
  discount_date_end?: string;      // Дата окончания скидки
  discount_percent?: string;       // Процент скидки
  dat: string;                     // Дата нарушения
  code: string;                    // Статья КОАП
  description: string;             // Описание нарушения
  uin: string;                     // Номер постановления (УИН)
  sum: string;                     // Сумма со скидкой
  full_sum: string;                // Полная сумма
  vendor: string;                  // Орган выписавший штраф
  comment?: string;                // Комментарий
}
```

## 🎨 UI компоненты

### Кнопка оплаты на AutoFineScreen

- Показывается только для неоплаченных штрафов (`is_paid === 0`)
- Отображает информацию о скидке если она доступна
- При клике переходит на экран подтверждения

### FinePaymentConfirmScreen

- Показывает детали штрафа
- Вычисляет сумму с учётом скидки
- Отображает предупреждение о переходе на платёжную страницу
- Кнопки: "Оплатить" и "Отменить"

### FinePaymentWebViewScreen

- Загружает платёжную страницу в WebView
- Отслеживает навигацию для определения результата оплаты
- Показывает индикатор загрузки
- Обрабатывает ошибки загрузки
- Кнопка "Назад" с подтверждением отмены

### FinePaymentSuccessScreen

- Показывает иконку успеха
- Отображает информацию об оплаченном штрафе
- Информирует о времени обновления статуса
- Кнопки: "Вернуться к списку" и "К деталям штрафа"

## 🔒 Безопасность

1. **HTTPS**: Все запросы к платёжному API должны использовать HTTPS
2. **Токен**: Передавайте токен авторизации в каждом запросе
3. **Валидация**: Проверяйте callback URL на стороне сервера
4. **Timeout**: Установите таймауты для WebView запросов

## 🧪 Тестирование

### Тестовые сценарии:

1. **Успешная оплата**
   - Открыть неоплаченный штраф
   - Нажать "Оплатить штраф"
   - Подтвердить оплату
   - Завершить оплату в WebView
   - Проверить экран успеха

2. **Отмена оплаты**
   - Начать процесс оплаты
   - Нажать "Назад" в WebView
   - Подтвердить отмену

3. **Ошибка оплаты**
   - Начать процесс оплаты
   - Симулировать ошибку платёжной системы
   - Проверить отображение ошибки

4. **Оплата со скидкой**
   - Открыть штраф с активной скидкой
   - Проверить корректность расчёта суммы
   - Завершить оплату

## 📝 TODO

- [ ] Добавить реальный endpoint для получения payment URL
- [ ] Настроить callback URL под конкретную платёжную систему
- [ ] Добавить логирование платежей
- [ ] Добавить retry механизм при ошибках
- [ ] Добавить аналитику (успешные/неуспешные платежи)
- [ ] Добавить поддержку различных платёжных методов
- [ ] Добавить историю платежей
- [ ] Добавить email/push уведомления об успешной оплате

## 🐛 Известные ограничения

1. WebView может не работать на некоторых старых устройствах
2. Требуется интернет соединение
3. Время обновления статуса штрафа зависит от платёжной системы
4. Не все платёжные системы поддерживают WebView интеграцию

## 📞 Поддержка

При возникновении проблем с интеграцией:
1. Проверьте логи в консоли
2. Убедитесь что WebView установлен (`react-native-webview`)
3. Проверьте правильность callback URL
4. Свяжитесь с технической поддержкой платёжной системы
