# Android Studio Crash Fix (macOS)

## Проблема
Android Studio крашится с ошибкой `EXC_BAD_ACCESS (SIGABRT)` и адресом `0xaaaaaaaaaaaaaaa8`.

Это типичная проблема поврежденного кеша или конфликта плагинов.

## Решение 1: Очистка кешей (Рекомендуется)

### Через Android Studio (если запускается):
1. **File → Invalidate Caches...**
2. Выберите **все опции**:
   - ✅ Clear file system cache and Local History
   - ✅ Clear downloaded shared indexes
   - ✅ Clear VCS Log caches and indexes
   - ✅ Wipe IDE system directories
3. **Invalidate and Restart**

### Вручную (если Studio не запускается):

```bash
# Удалить все кеши Android Studio
rm -rf ~/Library/Caches/Google/AndroidStudio*
rm -rf ~/Library/Application\ Support/Google/AndroidStudio*
rm -rf ~/Library/Logs/Google/AndroidStudio*

# Удалить системные директории (настройки сохранятся)
rm -rf ~/Library/Application\ Support/Google/AndroidStudio*/system

# Удалить Gradle кеши (опционально)
rm -rf ~/.gradle/caches
rm -rf ~/.gradle/daemon
```

## Решение 2: Увеличение памяти для Android Studio

Отредактируйте `~/Library/Application Support/Google/AndroidStudio*/studio.vmoptions`:

```
-Xms2048m
-Xmx8192m
-XX:ReservedCodeCacheSize=1024m
```

Или создайте файл если его нет:

```bash
# Найдите актуальную версию
ls ~/Library/Application\ Support/Google/

# Создайте vmoptions файл
cat > ~/Library/Application\ Support/Google/AndroidStudio2025.2/studio.vmoptions << 'EOF'
-Xms2048m
-Xmx8192m
-XX:ReservedCodeCacheSize=1024m
-XX:+UseG1GC
-XX:SoftRefLRUPolicyMSPerMB=50
-XX:CICompilerCount=2
-XX:+HeapDumpOnOutOfMemoryError
-XX:-OmitStackTraceInFastThrow
-ea
-Dsun.io.useCanonCaches=false
-Djdk.http.auth.tunneling.disabledSchemes=""
-Djdk.attach.allowAttachSelf=true
-Djdk.module.illegalAccess.silent=true
-Dkotlinx.coroutines.debug=off
EOF
```

## Решение 3: Отключение проблемных плагинов

Если Studio запускается, но крашится при работе:

1. **File → Settings → Plugins**
2. Отключите недавно установленные плагины
3. Перезапустите

Или вручную:
```bash
# Переименовать папку с плагинами (временно отключить все)
mv ~/Library/Application\ Support/Google/AndroidStudio*/plugins \
   ~/Library/Application\ Support/Google/AndroidStudio*/plugins.backup
```

## Решение 4: Переустановка Android Studio

Если ничего не помогло:

```bash
# 1. Удалить приложение
rm -rf /Applications/Android\ Studio.app

# 2. Удалить все данные (ВНИМАНИЕ: удалятся настройки!)
rm -rf ~/Library/Application\ Support/Google/AndroidStudio*
rm -rf ~/Library/Caches/Google/AndroidStudio*
rm -rf ~/Library/Logs/Google/AndroidStudio*
rm -rf ~/Library/Preferences/com.google.android.studio.plist

# 3. Скачать и установить заново
# https://developer.android.com/studio
```

## Решение 5: Проверка macOS 26.1 (Sequoia 15.1)

Ваша версия macOS очень новая (`macOS 26.1 (25B78)`). Возможны проблемы совместимости.

Проверьте:
```bash
# Обновите Android Studio до последней версии
# Help → Check for Updates

# Или скачайте последнюю версию:
# https://developer.android.com/studio/preview
```

## Проверка после исправления

```bash
# Запустите Android Studio из терминала чтобы видеть логи
open -a "Android Studio"

# Или с логами:
/Applications/Android\ Studio.app/Contents/MacOS/studio
```

## Для нашего проекта

После исправления краша:
1. Создайте `~/.zshenv` (см. ANDROID_STUDIO_SETUP.md)
2. Перезапустите Android Studio
3. File → Sync Project with Gradle Files
4. Попробуйте запустить проект

## Если краш повторяется

Соберите полный crash report:
```bash
# Найдите последний crash log
ls -lt ~/Library/Logs/DiagnosticReports/studio*.crash | head -1

# Откройте его
open "$(ls -t ~/Library/Logs/DiagnosticReports/studio*.crash | head -1)"
```

Обратите внимание на секцию "Thread 0 Crashed" - там будет stack trace который покажет что именно вызвало краш.
