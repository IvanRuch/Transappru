# Исправление ошибки "Compilation is not supported for the following modules"

## Проблема

Android Studio показывает ошибку:
```
Compilation is not supported for the following modules: TransApp_upd.

Unfortunately, you can't have non-Gradle Java modules and Android-Gradle modules in one project.
```

Это происходит когда Android Studio создает Java модуль для корневой папки проекта, что конфликтует с Android Gradle модулями.

## Решение

### 1. Закройте Android Studio полностью
Нажмите `Cmd+Q` или выберите `Android Studio → Quit Android Studio`

### 2. Удалите конфликтующие файлы
```bash
cd /Volumes/HP_P800/grizodubov/IdeaProjects/TransApp_upd
rm -f .idea/TransApp_upd.iml .idea/modules.xml
```

### 3. Очистите кэш Android Studio (опционально)
```bash
rm -rf .idea/caches .idea/libraries .idea/shelf .idea/workspace.xml
```

### 4. Откройте проект правильно

**Важно:** Открывайте именно папку `android`, а не корневую папку проекта!

#### Вариант A: Через терминал (рекомендуется)
```bash
cd /Volumes/HP_P800/grizodubov/IdeaProjects/TransApp_upd
~/start-android-studio.sh
```

Затем в Android Studio: `File → Open → Выберите папку android`

#### Вариант B: Через меню
1. Запустите Android Studio
2. `File → Open`
3. Выберите папку `/Volumes/HP_P800/grizodubov/IdeaProjects/TransApp_upd/android`
4. Нажмите `Open`

### 5. Дождитесь Gradle Sync

Android Studio автоматически выполнит Gradle Sync. Если этого не произошло:
- `File → Sync Project with Gradle Files`

## Автоматическое исправление

Плагин `withAndroidGradleJvm.js` теперь автоматически удаляет конфликтующие файлы при каждом `expo prebuild`.

Если проблема возникнет снова, просто выполните:
```bash
npx expo prebuild --platform android
```

## Проверка

После открытия проекта убедитесь что:
1. В `Project` панели слева видна структура Android проекта (app, gradle и т.д.)
2. Нет ошибок о несовместимых модулях
3. Gradle Sync завершился успешно

## Почему это происходит?

React Native/Expo проекты имеют корневую папку с JavaScript кодом и подпапку `android` с нативным Android кодом. 

Android Studio должна открывать **только папку android**, а не корневую папку проекта. Если открыть корневую папку, Android Studio может создать Java модуль для неё, что конфликтует с Android Gradle модулями.
