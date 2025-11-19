# Troubleshooting - Решение проблем

## Firebase Messaging Errors

### Ошибка: "Failed to get FIS auth token"

```
FirebaseMessaging: Failed to get FIS auth token
java.util.concurrent.ExecutionException: com.google.firebase.installations.FirebaseInstallationsException: 
Firebase Installations Service is unavailable. Please try again later.
```

**Причины:**
1. Эмулятор не имеет доступа к интернету
2. Google Play Services не установлены или не работают
3. Неправильная конфигурация Firebase

**Решения:**

#### 1. Проверьте интернет в эмуляторе

Откройте браузер Chrome в эмуляторе и попробуйте открыть google.com

Если не работает:
- **Android Studio → Tools → AVD Manager**
- Нажмите **Edit** на вашем эмуляторе
- **Show Advanced Settings**
- **Network:**
  - Speed: Full
  - Latency: None
- **Save** и перезапустите эмулятор

#### 2. Используйте эмулятор с Google Play

Эмулятор должен иметь **Google Play Store**, а не только **Google APIs**.

**Создайте новый эмулятор:**
1. Android Studio → Tools → AVD Manager → Create Virtual Device
2. Выберите устройство (рекомендуется **Pixel 6**)
3. Выберите образ системы с **Play Store** иконкой:
   - ✅ API 34 (Android 14.0) **с Play Store**
   - ❌ API 34 (Android 14.0) Google APIs (без Play Store)
4. Finish

#### 3. Проверьте google-services.json

Убедитесь, что файл существует:
```bash
ls -la android/app/google-services.json
```

Проверьте, что `package_name` совпадает с вашим:
```json
{
  "client_info": {
    "android_client_info": {
      "package_name": "com.transappru"  // ← Должно совпадать с app.json
    }
  }
}
```

#### 4. Временное решение для разработки

Если Firebase не критичен для текущей разработки, можно временно игнорировать эти ошибки. Они не блокируют работу приложения, только push-уведомления не будут работать.

---

## Yandex Maps Errors

### Ошибка: "Could not resolve host name"

```
yandex.maps: Couldn't fetch "https://proxy.mob.maps.yandex.net:443/mapkit2/init/2.x/random" 
because of: Could not resolve host name
```

**Причины:**
1. Нет интернета в эмуляторе
2. DNS не работает
3. Firewall блокирует запросы

**Решения:**

#### 1. Проверьте интернет (см. выше)

#### 2. Перезапустите эмулятор

```bash
# Остановите все эмуляторы
adb devices
adb -s <device_id> emu kill

# Запустите заново через Android Studio
```

#### 3. Очистите DNS кэш эмулятора

В эмуляторе:
- Settings → Network & Internet → Advanced → Private DNS
- Выберите "Automatic" или "Off"
- Перезапустите эмулятор

#### 4. Используйте реальное устройство

Yandex Maps лучше работает на реальных устройствах:
```bash
# Подключите телефон через USB
# Включите USB Debugging на телефоне
npm run android
```

---

## Network Errors (Axios)

### Ошибка: "[AxiosError: Network Error]"

**Причины:**
1. API сервер недоступен
2. Неправильный URL
3. CORS проблемы
4. Нет интернета

**Решения:**

#### 1. Проверьте API URL

В коде найдите конфигурацию API:
```bash
grep -r "baseURL" src/utils/
```

Для эмулятора используйте:
- ❌ `http://localhost:3000` (не работает)
- ✅ `http://10.0.2.2:3000` (Android эмулятор)
- ✅ `http://192.168.x.x:3000` (реальное устройство, ваш IP в локальной сети)

#### 2. Проверьте, что сервер запущен

```bash
# Проверьте, что ваш backend работает
curl http://localhost:3000/health
# или
curl http://localhost:3000/api/status
```

#### 3. Разрешите HTTP трафик (уже настроено)

Плагин `withAndroidManifestFixes.js` автоматически добавляет `usesCleartextTraffic="true"` для разработки.

Проверьте в `android/app/src/main/AndroidManifest.xml`:
```xml
<application
  android:usesCleartextTraffic="true"
  ...>
```

---

## Общие рекомендации

### Логирование

Смотрите логи в реальном времени:
```bash
# Все логи
npx react-native log-android

# Только ошибки
adb logcat *:E

# Фильтр по тегу
adb logcat -s ReactNativeJS
adb logcat -s FirebaseMessaging
adb logcat -s yandex.maps
```

### Очистка кэша

Если проблемы продолжаются:
```bash
# Очистить Metro bundler
npm start -- --reset-cache

# Очистить Android build
cd android
./gradlew clean
cd ..

# Пересобрать
npm run android
```

### Проверка сети в эмуляторе

Откройте терминал в эмуляторе (через adb shell):
```bash
adb shell

# Проверьте DNS
ping google.com
ping 8.8.8.8

# Проверьте интернет
curl https://google.com
```

---

## Контрольный список

Перед началом разработки убедитесь:

- [ ] Эмулятор с Google Play Store (не Google APIs)
- [ ] Интернет работает в эмуляторе (откройте браузер)
- [ ] `google-services.json` существует и настроен
- [ ] Backend сервер запущен (если используется)
- [ ] API URL правильный для эмулятора (`10.0.2.2` вместо `localhost`)
- [ ] `usesCleartextTraffic="true"` в AndroidManifest (для HTTP)
- [ ] Логи открыты для отладки (`npx react-native log-android`)

---

## Полезные команды

```bash
# Список устройств
adb devices

# Перезапуск ADB
adb kill-server && adb start-server

# Установка APK вручную
adb install -r android/app/build/outputs/apk/debug/app-debug.apk

# Очистка данных приложения
adb shell pm clear com.transappru

# Просмотр установленных пакетов
adb shell pm list packages | grep transapp

# Проверка Google Play Services
adb shell dumpsys package com.google.android.gms | grep version
```
