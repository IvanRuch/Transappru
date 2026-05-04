# Android Studio Setup для NVM

## Проблема
Android Studio не видит Node.js установленный через NVM, потому что NVM добавляет Node в PATH только для интерактивных shell сессий.

## Решение 1: Настройка PATH в Android Studio (Рекомендуется)

### Для macOS:

1. **Создайте файл `~/.zshenv` (если его нет):**
```bash
touch ~/.zshenv
```

2. **Добавьте в `~/.zshenv`:**
```bash
# NVM setup for non-interactive shells (Android Studio, etc.)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
```

3. **Перезапустите Android Studio полностью** (не просто окно, а весь процесс)

4. **Проверьте в Android Studio Terminal:**
```bash
which node
node --version
```

### Почему это работает:
- `.zshenv` загружается для ВСЕХ zsh сессий (интерактивных и неинтерактивных)
- `.zshrc` загружается только для интерактивных сессий
- Android Studio запускает неинтерактивные shell сессии

## Решение 2: Запуск Android Studio из терминала

Если Решение 1 не помогло, запускайте Android Studio из терминала где NVM уже загружен:

```bash
# В терминале (где NVM работает)
open -a "Android Studio"
```

Или создайте alias в `~/.zshrc`:
```bash
alias studio='open -a "Android Studio"'
```

## Решение 3: Симлинк на активную версию NVM (Временное)

Если нужно быстро запустить проект:

```bash
# Создать симлинк на ТЕКУЩУЮ активную версию NVM
sudo ln -sf "$(which node)" /usr/local/bin/node
sudo ln -sf "$(which npm)" /usr/local/bin/npm
```

**Минусы:**
- Нужно обновлять симлинк при смене версии Node
- Требует sudo

## Проверка что сработало

В Android Studio Terminal выполните:
```bash
which node
# Должно показать путь к node

node --version
# Должно показать версию

echo $PATH
# Должен содержать путь к .nvm
```

## Наши Config Plugins

Проект уже содержит плагины которые автоматически прописывают пути к Node:

- `plugins/withAndroidNodeConfig.js` - комплексный плагин который:
  - Добавляет пути в `gradle.properties`
  - Заменяет `node` на полный путь в `settings.gradle`
  - Патчит `expo-modules-autolinking` исходники

Эти плагины работают для команд запущенных из терминала (`npx expo run:android`), но не решают проблему Android Studio IDE.

## Важные версии SDK

- **minSdkVersion: 26** (повышено с 24 для Yandex Maps 4.22.0)
- **compileSdkVersion: 35**
- **targetSdkVersion: 35**
- **buildToolsVersion: 35.0.0**

Эти версии настраиваются через `plugins/withAndroidSdkVersions.js`.

## Рекомендация

**Используйте Решение 1** - это правильный способ настроить окружение для всех приложений на macOS.

После настройки `.zshenv`:
1. Полностью закройте Android Studio (Quit)
2. Откройте снова
3. File → Invalidate Caches / Restart
4. Попробуйте Sync Project with Gradle Files
