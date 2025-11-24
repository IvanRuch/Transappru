# ⚡ Быстрое решение: Android SDK License

## ❌ Ошибка
```
License for package NDK (Side by side) 28.0.12433566 not accepted.
Failed to install the following Android SDK packages as some licences have not been accepted.
```

## ✅ Решение (1 команда)

```bash
# Принять все лицензии Android SDK
yes | $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --licenses
```

### Если команда не работает, попробуйте:

```bash
# Вариант 1: Через tools/bin
yes | $ANDROID_HOME/tools/bin/sdkmanager --licenses

# Вариант 2: Через cmdline-tools/latest/bin
yes | ~/Library/Android/sdk/cmdline-tools/latest/bin/sdkmanager --licenses

# Вариант 3: Если cmdline-tools не установлен
# Открыть Android Studio → Settings → Android SDK → SDK Tools
# Установить "Android SDK Command-line Tools"
# Затем выполнить команду выше
```

---

## 🔧 Полная последовательность для коллеги

```bash
# 1. Проверить что ANDROID_HOME установлен
echo $ANDROID_HOME
# Должно быть: /Users/ivan/Library/Android/sdk

# 2. Если не установлен, добавить в ~/.zshrc:
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin
export PATH=$PATH:$ANDROID_HOME/platform-tools

# 3. Применить
source ~/.zshrc

# 4. Принять лицензии
yes | $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --licenses

# 5. Запустить проект
cd /Users/ivan/Dev/Transappru
npm run android
```

---

## 📋 Если sdkmanager не найден

### Установить Command-line Tools через Android Studio:

1. Открыть **Android Studio**
2. **Settings** (⌘,) → **Android SDK**
3. Вкладка **SDK Tools**
4. Поставить галочку на **Android SDK Command-line Tools (latest)**
5. Нажать **Apply** → **OK**
6. После установки выполнить:
   ```bash
   yes | $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --licenses
   ```

---

## 🎯 Альтернатива: Принять лицензии через Android Studio

1. Открыть **Android Studio**
2. **Settings** → **Android SDK**
3. Вкладка **SDK Platforms**
4. Поставить галочку на нужную версию Android (например, Android 14)
5. Вкладка **SDK Tools**
6. Поставить галочку на **NDK (Side by side)**
7. Нажать **Apply**
8. Принять лицензии в появившемся окне
9. Нажать **OK**

---

## ✅ Проверка

После принятия лицензий проверьте:

```bash
# Проверить что лицензии приняты
ls $ANDROID_HOME/licenses/
# Должны быть файлы: android-sdk-license, android-sdk-preview-license

# Запустить проект
cd /Users/ivan/Dev/Transappru
npm run android
```

---

## 💡 Почему это происходит?

При клонировании проекта на новую машину Android SDK требует принятия лицензий.
Это нужно сделать один раз, после чего проблема не повторится.

---

## 🚀 После решения проблемы

Если всё ещё есть ошибки с Yandex Maps, выполните:

```bash
# Очистить и пересобрать
cd android
./gradlew clean
cd ..
npx expo prebuild --clean
npm run android
```

---

## 📞 Если не помогло

Предоставьте вывод команд:
```bash
echo $ANDROID_HOME
ls $ANDROID_HOME/cmdline-tools/
$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --version
```
