# Настройка проекта на Mac M2 (Apple Silicon)

## 🚨 Проблема с TEMP папкой при запуске Android

### Симптомы:
- Ошибка доступа к временной папке (TEMP/TMP)
- `EACCES: permission denied` при запуске `npm run android`
- Ошибки при сборке Android проекта

---

## ✅ Решение 1: Права доступа к временной папке

### Шаг 1: Проверить переменные окружения
```bash
echo $TMPDIR
echo $TEMP
echo $TMP
```

### Шаг 2: Дать права на временную папку
```bash
# Для TMPDIR (обычно /var/folders/...)
sudo chmod -R 777 $TMPDIR

# Или создать свою временную папку
mkdir -p ~/tmp
export TMPDIR=~/tmp
export TEMP=~/tmp
export TMP=~/tmp
```

### Шаг 3: Добавить в ~/.zshrc (для постоянного использования)
```bash
echo 'export TMPDIR=~/tmp' >> ~/.zshrc
echo 'export TEMP=~/tmp' >> ~/.zshrc
echo 'export TMP=~/tmp' >> ~/.zshrc
source ~/.zshrc
```

---

## ✅ Решение 2: Настройка Android SDK для M2

### Шаг 1: Установить Java (если не установлена)
```bash
# Установить через Homebrew
brew install openjdk@17

# Добавить в PATH
echo 'export PATH="/opt/homebrew/opt/openjdk@17/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# Проверить
java -version
```

### Шаг 2: Настроить переменные окружения для Android
Добавить в `~/.zshrc`:
```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
```

Применить изменения:
```bash
source ~/.zshrc
```

### Шаг 3: Проверить Android SDK
```bash
# Проверить что SDK установлен
ls $ANDROID_HOME

# Проверить adb
adb --version
```

---

## ✅ Решение 3: Очистка кэша и переустановка зависимостей

### Шаг 1: Очистить всё
```bash
cd /path/to/TransApp_upd

# Удалить node_modules и lock файлы
rm -rf node_modules
rm -rf package-lock.json
rm -rf yarn.lock

# Очистить Metro bundler cache
rm -rf $TMPDIR/metro-*
rm -rf $TMPDIR/haste-map-*

# Очистить Gradle cache
cd android
./gradlew clean
cd ..

# Очистить watchman (если установлен)
watchman watch-del-all
```

### Шаг 2: Переустановить зависимости
```bash
# Установить зависимости
npm install

# Или с очисткой кэша
npm cache clean --force
npm install
```

---

## ✅ Решение 4: Настройка Gradle для M2

### Создать/изменить файл `android/gradle.properties`
```properties
# Увеличить память для Gradle
org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=512m -XX:+HeapDumpOnOutOfMemoryError

# Включить параллельную сборку
org.gradle.parallel=true
org.gradle.configureondemand=true

# Кэширование
org.gradle.caching=true

# Daemon
org.gradle.daemon=true

# Для M2 (Apple Silicon)
org.gradle.java.home=/opt/homebrew/opt/openjdk@17
```

---

## ✅ Решение 5: Использовать Rosetta для эмулятора (если нужно)

### Если эмулятор не запускается на M2:
```bash
# Открыть Android Studio через Rosetta
# 1. Найти Android Studio в Applications
# 2. Правый клик → Get Info
# 3. Поставить галочку "Open using Rosetta"
```

---

## 🔧 Полная последовательность настройки проекта

### 1. Клонировать репозиторий
```bash
git clone <repository-url>
cd TransApp_upd
```

### 2. Настроить переменные окружения
```bash
# Создать временную папку
mkdir -p ~/tmp

# Добавить в ~/.zshrc
cat >> ~/.zshrc << 'EOF'
# Temporary directories
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
EOF

# Применить
source ~/.zshrc
```

### 3. Установить зависимости
```bash
npm install
```

### 4. Настроить Android
```bash
cd android

# Создать local.properties (если нет)
echo "sdk.dir=$HOME/Library/Android/sdk" > local.properties

# Дать права на gradlew
chmod +x gradlew

cd ..
```

### 5. Запустить проект
```bash
# Запустить Metro bundler
npx expo start

# В другом терминале запустить Android
npm run android

# Или через Expo
npx expo run:android
```

---

## 🐛 Частые ошибки и решения

### Ошибка: "EACCES: permission denied, mkdir '/var/folders/...'"
**Решение:**
```bash
sudo chmod -R 777 /var/folders/
# ИЛИ
export TMPDIR=~/tmp
```

### Ошибка: "SDK location not found"
**Решение:**
```bash
cd android
echo "sdk.dir=$HOME/Library/Android/sdk" > local.properties
```

### Ошибка: "Unable to load script. Make sure you're running Metro"
**Решение:**
```bash
# Очистить кэш
rm -rf $TMPDIR/metro-*
rm -rf $TMPDIR/haste-map-*

# Перезапустить Metro
npx expo start --clear
```

### Ошибка: "Gradle build failed"
**Решение:**
```bash
cd android
./gradlew clean
./gradlew --stop
cd ..
npm run android
```

### Ошибка: "Java version not compatible"
**Решение:**
```bash
# Установить Java 17
brew install openjdk@17

# Проверить версию
java -version

# Если не помогло, указать явно в gradle.properties
echo "org.gradle.java.home=/opt/homebrew/opt/openjdk@17" >> android/gradle.properties
```

---

## 📋 Чек-лист перед запуском

- [ ] Java 17 установлена (`java -version`)
- [ ] Android SDK установлен (`ls $ANDROID_HOME`)
- [ ] Переменные окружения настроены (`echo $ANDROID_HOME`)
- [ ] Временная папка доступна (`ls $TMPDIR`)
- [ ] Node.js установлен (`node -v`)
- [ ] npm зависимости установлены (`ls node_modules`)
- [ ] `android/local.properties` создан
- [ ] Эмулятор или устройство подключено (`adb devices`)

---

## 🆘 Если ничего не помогло

### Полная переустановка окружения:

```bash
# 1. Удалить всё
rm -rf node_modules
rm -rf android/build
rm -rf android/.gradle
rm -rf ~/.gradle

# 2. Переустановить Android SDK через Android Studio
# Открыть Android Studio → Settings → Android SDK → SDK Tools
# Установить:
# - Android SDK Build-Tools
# - Android SDK Platform-Tools
# - Android Emulator
# - Intel x86 Emulator Accelerator (HAXM) - для Intel
# - Google Play services

# 3. Создать новый эмулятор
# Android Studio → Device Manager → Create Device

# 4. Переустановить зависимости
npm install

# 5. Запустить
npx expo start
```

---

## 📞 Контакты для помощи

Если проблема не решается, предоставьте:
1. Полный текст ошибки
2. Вывод команды `java -version`
3. Вывод команды `echo $ANDROID_HOME`
4. Вывод команды `adb devices`
5. Содержимое файла `android/local.properties`

---

## 🔗 Полезные ссылки

- [React Native Environment Setup](https://reactnative.dev/docs/environment-setup)
- [Expo Development Build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android Studio Download](https://developer.android.com/studio)
- [Homebrew](https://brew.sh/)
