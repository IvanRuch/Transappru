# 📱 Настройка физического Android устройства для разработки

## 🔌 Подключение устройства

### 1. Включите режим разработчика на телефоне

1. Откройте **Настройки** → **О телефоне**
2. Нажмите на **Номер сборки** 7 раз
3. Вернитесь в **Настройки** → **Для разработчиков**
4. Включите **Отладка по USB**

### 2. Подключите телефон к компьютеру через USB

Подключите устройство USB-кабелем и разрешите отладку при появлении запроса на телефоне.

### 3. Проверьте подключение

```bash
adb devices
```

**Вывод:**
```
List of devices attached
28J9K24319016011    device    ← Ваш телефон
emulator-5554       device    ← Эмулятор (если запущен)
```

---

## 🚀 Быстрый старт

### Автоматическая настройка (рекомендуется)

Добавьте в `package.json`:

```json
{
  "scripts": {
    "android:device": "npm run setup:device && npx expo run:android --device",
    "setup:device": "adb reverse tcp:8081 tcp:8081 && adb reverse tcp:8097 tcp:8097",
    "android:device:specific": "npm run setup:device:specific && npx expo run:android --device 28J9K24319016011",
    "setup:device:specific": "adb -s 28J9K24319016011 reverse tcp:8081 tcp:8081 && adb -s 28J9K24319016011 reverse tcp:8097 tcp:8097"
  }
}
```

**Запуск:**
```bash
npm run android:device
```

---

## 🔧 Ручная настройка портов

### Если подключено одно устройство:

```bash
# Перенаправление Metro bundler (обязательно)
adb reverse tcp:8081 tcp:8081

# Перенаправление Expo dev tools (опционально)
adb reverse tcp:8097 tcp:8097
```

### Если подключено несколько устройств:

```bash
# Сначала узнайте ID устройства
adb devices

# Затем используйте флаг -s
adb -s 28J9K24319016011 reverse tcp:8081 tcp:8081
adb -s 28J9K24319016011 reverse tcp:8097 tcp:8097
```

### Проверка настроенных портов:

```bash
adb reverse --list
```

**Вывод:**
```
tcp:8081 tcp:8081
tcp:8097 tcp:8097
```

---

## 🐛 Решение проблем

### Белый экран / "Unable to load script"

**Причина:** Устройство не может подключиться к Metro bundler.

**Решение:**

1. **Настройте adb reverse:**
   ```bash
   adb reverse tcp:8081 tcp:8081
   ```

2. **Проверьте, что Metro запущен:**
   ```bash
   lsof -i :8081 | grep LISTEN
   ```
   Если не запущен:
   ```bash
   npx expo start
   ```

3. **Перезапустите приложение:**
   - Закройте приложение на телефоне
   - Запустите снова

4. **Или используйте Dev Menu:**
   - Встряхните телефон
   - Выберите **Reload**

### Ошибка "more than one device/emulator"

**Причина:** Подключено несколько устройств (телефон + эмулятор).

**Решение:** Укажите конкретное устройство с флагом `-s`:

```bash
# Узнайте ID устройства
adb devices

# Используйте конкретный ID
adb -s 28J9K24319016011 reverse tcp:8081 tcp:8081
```

### Устройство не определяется (offline/unauthorized)

**Решение:**

1. **Отключите и подключите USB-кабель**
2. **На телефоне разрешите отладку** (появится запрос)
3. **Перезапустите adb сервер:**
   ```bash
   adb kill-server
   adb start-server
   adb devices
   ```

### Приложение крашится при старте

**Решение:**

1. **Очистите кэш приложения:**
   ```bash
   adb shell pm clear com.transappru
   ```

2. **Переустановите приложение:**
   ```bash
   npx expo run:android --device
   ```

3. **Очистите build кэш:**
   ```bash
   cd android
   ./gradlew clean
   cd ..
   npx expo run:android --device
   ```

---

## 📦 Полезные команды

### Управление приложением

```bash
# Запустить приложение
adb shell am start -n com.transappru/.MainActivity

# Остановить приложение
adb shell am force-stop com.transappru

# Очистить данные приложения
adb shell pm clear com.transappru

# Удалить приложение
adb uninstall com.transappru

# Установить APK
adb install path/to/app.apk
```

### Просмотр логов

```bash
# Все логи приложения
adb logcat -s ReactNativeJS:I ReactNative:I

# Только ошибки
adb logcat *:E

# Логи конкретного приложения
adb logcat | grep com.transappru

# Очистить логи
adb logcat -c
```

### Работа с файлами

```bash
# Скопировать файл на устройство
adb push local/file.txt /sdcard/

# Скопировать файл с устройства
adb pull /sdcard/file.txt ./

# Открыть shell на устройстве
adb shell
```

### Dev Menu на устройстве

```bash
# Открыть Dev Menu
adb shell input keyevent KEYCODE_MENU

# Или встряхните телефон физически
```

### Информация об устройстве

```bash
# Модель устройства
adb shell getprop ro.product.model

# Версия Android
adb shell getprop ro.build.version.release

# Разрешение экрана
adb shell wm size

# Плотность экрана
adb shell wm density
```

---

## 🌐 Работа по Wi-Fi (без USB)

### Настройка Wi-Fi отладки

1. **Подключите устройство по USB**
2. **Убедитесь, что телефон и компьютер в одной Wi-Fi сети**
3. **Узнайте IP адрес телефона:**
   ```bash
   adb shell ip addr show wlan0 | grep inet
   ```
   Или в настройках телефона: **Настройки** → **О телефоне** → **Состояние** → **IP-адрес**

4. **Включите TCP/IP режим:**
   ```bash
   adb tcpip 5555
   ```

5. **Отключите USB кабель**

6. **Подключитесь по Wi-Fi:**
   ```bash
   adb connect 192.168.1.100:5555
   ```
   (замените на IP вашего телефона)

7. **Проверьте подключение:**
   ```bash
   adb devices
   ```

### Вернуться к USB режиму

```bash
adb usb
```

---

## 🔐 Сборка Release APK

### Для тестирования на устройстве

```bash
# Создать release APK
cd android
./gradlew assembleRelease

# APK будет в:
# android/app/build/outputs/apk/release/app-release.apk

# Установить на устройство
adb install android/app/build/outputs/apk/release/app-release.apk
```

### Для публикации в Google Play

```bash
# Создать signed bundle
cd android
./gradlew bundleRelease

# AAB будет в:
# android/app/build/outputs/bundle/release/app-release.aab
```

---

## 📊 Мониторинг производительности

### React Native Performance Monitor

На устройстве:
1. Встряхните телефон
2. Выберите **Show Perf Monitor**

### Профилирование

```bash
# Запустить Flipper для отладки
npx expo start --dev-client

# Или используйте React DevTools
npx react-devtools
```

---

## 🎯 Чек-лист перед разработкой

- [ ] Режим разработчика включен на телефоне
- [ ] Отладка по USB включена
- [ ] Устройство определяется через `adb devices`
- [ ] Настроен `adb reverse tcp:8081 tcp:8081`
- [ ] Metro bundler запущен (`npx expo start`)
- [ ] Приложение установлено на устройстве

---

## 📚 Дополнительные ресурсы

- [React Native - Running on Device](https://reactnative.dev/docs/running-on-device)
- [Expo - Development builds](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android Debug Bridge (adb)](https://developer.android.com/studio/command-line/adb)

---

## 💡 Советы

1. **Используйте USB 3.0 порт** для более быстрой установки
2. **Держите Metro bundler запущенным** во время разработки
3. **Используйте Wi-Fi отладку** для удобства (без проводов)
4. **Очищайте кэш** при странных ошибках
5. **Проверяйте логи** через `adb logcat` при крашах

---

**Создано:** 2025-11-19  
**Проект:** TransApp  
**Платформа:** Android
