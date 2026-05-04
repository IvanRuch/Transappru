# 🧹 Очистка данных приложения

## Проблема
Приложение сразу показывает экран PIN-кода вместо экрана ввода телефона.

## Причина
В AsyncStorage сохранены данные с предыдущего запуска (токен, телефон).

---

## ✅ Решение 1: Очистка через adb (быстро)

```bash
# Очистить все данные приложения
adb shell pm clear com.transappru

# Перезапустить приложение
npm run android
```

---

## ✅ Решение 2: Через настройки эмулятора

1. Открыть **Settings** на эмуляторе
2. **Apps** → **TransApp**
3. **Storage & cache**
4. **Clear storage** или **Clear data**
5. Перезапустить приложение

---

## ✅ Решение 3: Удалить и переустановить

```bash
# Удалить приложение
adb uninstall com.transappru

# Установить заново
npm run android
```

---

## ✅ Решение 4: Программная очистка (для разработки)

### Добавить кнопку очистки в приложение:

В файл `app/index.tsx` добавить кнопку для разработки:

```typescript
import { TouchableOpacity } from 'react-native';

// В компоненте, перед return:
const clearStorage = async () => {
  await AsyncStorage.clear();
  console.log('✅ Storage cleared');
  setIsChecking(false);
};

// В JSX добавить кнопку (только для dev):
{__DEV__ && (
  <TouchableOpacity 
    onPress={clearStorage}
    style={{ position: 'absolute', top: 50, right: 20, padding: 10, backgroundColor: 'red' }}
  >
    <Text style={{ color: 'white' }}>Clear Data</Text>
  </TouchableOpacity>
)}
```

---

## 🔍 Проверка сохранённых данных

Посмотреть что сохранено в AsyncStorage:

```bash
# Через adb
adb shell run-as com.transappru ls /data/data/com.transappru/databases/

# Или добавить в код:
AsyncStorage.getAllKeys().then(keys => {
  console.log('Saved keys:', keys);
  AsyncStorage.multiGet(keys).then(data => {
    console.log('Saved data:', data);
  });
});
```

---

## 📋 Что хранится в AsyncStorage

Приложение сохраняет:
- `token` - токен авторизации
- `phone` - номер телефона (возможно)
- Другие данные пользователя

---

## 🎯 Для коллеги - быстрое решение:

```bash
# 1. Очистить данные приложения
adb shell pm clear com.transappru

# 2. Перезапустить
npm run android
```

**Теперь должен показаться экран ввода телефона!** 📱

---

## 💡 Полезные команды для разработки

```bash
# Очистить данные приложения
adb shell pm clear com.transappru

# Удалить приложение
adb uninstall com.transappru

# Посмотреть логи приложения
adb logcat | grep -i transapp

# Перезапустить приложение
adb shell am start -n com.transappru/.MainActivity
```

---

## 🔧 Автоматизация

Добавить в `package.json`:

```json
{
  "scripts": {
    "android:clear": "adb shell pm clear com.transappru && npm run android",
    "android:fresh": "adb uninstall com.transappru; npm run android"
  }
}
```

Использование:
```bash
# Очистить и запустить
npm run android:clear

# Удалить и установить заново
npm run android:fresh
```
