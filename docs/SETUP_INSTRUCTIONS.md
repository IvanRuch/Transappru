# 🚀 Инструкция по настройке проекта TransApp

## Для Mac M2 (Apple Silicon)

### ⚡ Быстрый старт (автоматическая настройка)

```bash
# 1. Клонировать репозиторий
git clone <repository-url>
cd TransApp_upd

# 2. Запустить скрипт автоматической настройки
bash scripts/setup-mac-m2.sh

# 3. Перезапустить терминал или выполнить
source ~/.zshrc

# 4. Запустить проект
npx expo start
npm run android
```

---

## 🔧 Ручная настройка (если автоматическая не сработала)

### 1️⃣ Установить необходимые инструменты

#### Homebrew (если не установлен)
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

#### Node.js
```bash
brew install node
```

#### Java 17
```bash
brew install openjdk@17
```

#### Watchman (опционально, для лучшей производительности)
```bash
brew install watchman
```

### 2️⃣ Установить Android Studio

1. Скачать с https://developer.android.com/studio
2. Установить Android Studio
3. Открыть Android Studio → Settings → Android SDK
4. Установить:
   - Android SDK Platform (последняя версия)
   - Android SDK Build-Tools
   - Android SDK Platform-Tools
   - Android Emulator

### 3️⃣ Настроить переменные окружения

Добавить в `~/.zshrc`:

```bash
# Временные папки (ВАЖНО для Mac M2!)
export TMPDIR=~/tmp
export TEMP=~/tmp
export TMP=~/tmp

# Android SDK
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin

# Java
export PATH="/opt/homebrew/opt/openjdk@17/bin:$PATH"
```

Применить изменения:
```bash
source ~/.zshrc
```

### 4️⃣ Создать временную папку

```bash
mkdir -p ~/tmp
chmod -R 777 ~/tmp
```

### 5️⃣ Установить зависимости проекта

```bash
cd TransApp_upd
npm install
```

### 6️⃣ Настроить Android

```bash
cd android
echo "sdk.dir=$HOME/Library/Android/sdk" > local.properties
chmod +x gradlew
cd ..
```

### 7️⃣ Принять лицензии Android SDK (ВАЖНО!)

```bash
# Принять все лицензии
yes | $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --licenses

# Если команда не работает, см. QUICK_FIX_ANDROID_LICENSE.md
```

### 8️⃣ Запустить проект

```bash
# Запустить Metro bundler
npx expo start

# В другом терминале запустить Android
npm run android
```

---

## 🐛 Решение проблемы с TEMP папкой

### Проблема:
```
EACCES: permission denied, mkdir '/var/folders/...'
```

### Решение:

#### Вариант 1 (Рекомендуется):
```bash
# Создать свою временную папку
mkdir -p ~/tmp

# Добавить в ~/.zshrc
echo 'export TMPDIR=~/tmp' >> ~/.zshrc
echo 'export TEMP=~/tmp' >> ~/.zshrc
echo 'export TMP=~/tmp' >> ~/.zshrc

# Применить
source ~/.zshrc

# Перезапустить проект
npm run android
```

#### Вариант 2:
```bash
# Дать права на системную временную папку (не рекомендуется)
sudo chmod -R 777 /var/folders/
```

---

## 🔍 Проверка настроек

Выполните эти команды для проверки:

```bash
# Проверить Node.js
node -v
# Должно быть: v18.x.x или выше

# Проверить npm
npm -v

# Проверить Java
java -version
# Должно быть: openjdk version "17.x.x"

# Проверить Android SDK
echo $ANDROID_HOME
# Должно быть: /Users/<username>/Library/Android/sdk

# Проверить adb
adb --version

# Проверить временную папку
echo $TMPDIR
# Должно быть: /Users/<username>/tmp

# Проверить подключенные устройства
adb devices
```

---

## 📱 Запуск на эмуляторе

### Создать эмулятор:
1. Открыть Android Studio
2. Tools → Device Manager
3. Create Device
4. Выбрать устройство (например, Pixel 5)
5. Выбрать System Image (например, Android 13)
6. Finish

### Запустить эмулятор:
```bash
# Список доступных эмуляторов
emulator -list-avds

# Запустить эмулятор
emulator -avd <имя_эмулятора>

# Или через Android Studio:
# Device Manager → Play button
```

---

## 🆘 Частые ошибки

### 1. "SDK location not found"
```bash
cd android
echo "sdk.dir=$HOME/Library/Android/sdk" > local.properties
```

### 2. "Unable to load script"
```bash
# Очистить кэш
rm -rf $TMPDIR/metro-*
npx expo start --clear
```

### 3. "Gradle build failed"
```bash
cd android
./gradlew clean
./gradlew --stop
cd ..
npm run android
```

### 4. "EACCES: permission denied"
```bash
# Использовать свою временную папку
export TMPDIR=~/tmp
export TEMP=~/tmp
export TMP=~/tmp
```

### 5. "Java version not compatible"
```bash
# Установить Java 17
brew install openjdk@17

# Добавить в gradle.properties
echo "org.gradle.java.home=/opt/homebrew/opt/openjdk@17" >> android/gradle.properties
```

---

## 🧹 Полная очистка (если ничего не помогает)

```bash
# Удалить всё
rm -rf node_modules
rm -rf package-lock.json
rm -rf android/build
rm -rf android/.gradle
rm -rf ~/.gradle
rm -rf $TMPDIR/metro-*
rm -rf $TMPDIR/haste-map-*

# Переустановить
npm cache clean --force
npm install

# Очистить Gradle
cd android
./gradlew clean
cd ..

# Запустить заново
npx expo start --clear
npm run android
```

---

## 📚 Дополнительная документация

- **Подробная инструкция для Mac M2**: `docs/SETUP_MAC_M2.md`
- **Интеграция оплаты штрафов**: `docs/FINE_PAYMENT_INTEGRATION.md`

---

## 💡 Полезные команды

```bash
# Очистить Metro cache
npx expo start --clear

# Очистить Gradle cache
cd android && ./gradlew clean && cd ..

# Перезапустить adb
adb kill-server && adb start-server

# Посмотреть логи Android
npx react-native log-android

# Собрать APK
cd android && ./gradlew assembleRelease && cd ..
```

---

## 📞 Нужна помощь?

Если проблема не решается, предоставьте:

1. **Полный текст ошибки**
2. **Вывод команд:**
   ```bash
   node -v
   java -version
   echo $ANDROID_HOME
   echo $TMPDIR
   adb devices
   cat android/local.properties
   ```
3. **Скриншот ошибки**

---

## ✅ Чек-лист готовности

- [ ] Node.js установлен (v18+)
- [ ] Java 17 установлена
- [ ] Android Studio установлена
- [ ] Android SDK настроен
- [ ] Переменные окружения добавлены в ~/.zshrc
- [ ] Временная папка ~/tmp создана
- [ ] npm install выполнен успешно
- [ ] android/local.properties создан
- [ ] Эмулятор создан и запущен
- [ ] adb devices показывает устройство

**Готово к запуску!** 🎉
