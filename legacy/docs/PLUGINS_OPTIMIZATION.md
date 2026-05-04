# Оптимизация Expo Config Plugins

## Выполненная оптимизация (19 ноября 2025)

### Проблемы до оптимизации:
1. **Дублирование кода** - логика определения Node.js пути повторялась в 3 плагинах
2. **Избыточность** - 3 отдельных плагина делали похожие вещи (Node path configuration)
3. **Конфликты** - `withAndroidGradleJvm.js` удалял `.iml` файлы, конфликтуя с основным Expo проектом
4. **Отсутствие документации** - неясно что делает каждый плагин

### Выполненные изменения:

#### 1. Объединены Node-related плагины (3 → 1)

**Удалены:**
- `withNodePath.js` - настройка gradle.properties
- `withAndroidNodePath.js` - патчинг settings.gradle  
- `withPatchExpoAutolinkingNode.js` - патчинг expo-modules-autolinking

**Создан:**
- `withAndroidNodeConfig.js` - единый плагин, выполняющий все функции выше

**Преимущества:**
- ✅ Путь к Node определяется один раз
- ✅ Все патчи применяются последовательно в одном месте
- ✅ Улучшенная читаемость и поддержка
- ✅ Меньше overhead при prebuild

#### 2. Улучшен `withAndroidGradleJvm.js`

**Изменения:**
- ❌ Удалена логика удаления `.iml` и `modules.xml` файлов
- ✅ Добавлена подробная документация
- ✅ Улучшены комментарии на русском
- ✅ Теперь не конфликтует с основным Expo проектом в IntelliJ IDEA

#### 3. Улучшен `withAndroidNotificationIcon.js`

**Изменения:**
- ✅ Добавлен optional chaining (`?.`) для безопасности
- ✅ Улучшена документация
- ✅ Более информативное console сообщение

#### 4. Создан `withAndroidSdkVersions.js`

**Назначение:**
- Автоматически добавляет `ext` блок с версиями SDK в `build.gradle`
- Решает проблему "Unresolved reference: rootProject.ext.*" в Android Studio

### Итоговый список плагинов в app.json:

```json
"plugins": [
  "./plugins/withVersionSync.js",              // Синхронизация версий iOS/Android
  "./plugins/withAndroidSdkVersions.js",       // Определение SDK версий
  "expo-router",
  "@react-native-firebase/app",
  "./plugins/withPodfileModifications.js",     // iOS Podfile
  "./plugins/withAPSEnvironment.js",           // iOS Push Notifications
  "./plugins/withYandexMaps.js",               // Yandex Maps
  "./plugins/withRussianLocalization.js",      // Русская локализация
  "./plugins/withDestinations.js",             // iOS Destinations
  "./plugins/withAppCategory.js",              // iOS App Category
  "./plugins/withBackgroundModes.js",          // iOS Background Modes
  "./plugins/withDSYM.js",                     // iOS dSYM
  "./plugins/withAndroidNotificationIcon.js",  // Android notification icon
  "./plugins/withAndroidNodeConfig.js",        // Node.js configuration (3 в 1)
  "./plugins/withAndroidGradleJvm.js",         // Gradle JVM setup
  ["./plugins/withAndroidGradlePluginVersion.js", { "version": "8.13.1" }],
  ["expo-build-properties", { 
    "android": {
      "buildToolsVersion": "35.0.0",
      "minSdkVersion": 26, // Повышено с 24 для совместимости с Yandex Maps 4.22.0
      "compileSdkVersion": 35,
      "targetSdkVersion": 35,
      "ndkVersion": "28.0.12433566",
      "kotlinVersion": "2.1.20"
    }
  }]
]
```

### Результаты:

**До:**
- 5 плагинов для Android конфигурации
- Дублирование кода определения Node path
- Конфликты с IDE настройками

**После:**
- 3 плагина для Android конфигурации
- Единая точка определения Node path
- Нет конфликтов с IDE
- Лучшая документация

### Проверка работоспособности:

```bash
# Пересборка Android проекта
rm -rf android/
npx expo prebuild --platform android --clean

# Проверка результатов
✅ Version sync: 1.0.35 (iOS build: 1, Android versionCode: 10035)
✅ settings.gradle patched with node path
✅ Set AGP version to 8.13.1 in build.gradle
✅ Firebase notification icon configured
```

### Лучшие практики:

1. **Никогда не редактируйте файлы в `/android` или `/ios` напрямую**
   - Используйте Expo Config Plugins
   - Запускайте `npx expo prebuild --clean` после изменений

2. **Группируйте похожие функции в один плагин**
   - Меньше overhead
   - Проще поддержка
   - Лучше читаемость

3. **Документируйте каждый плагин**
   - Что он делает
   - Какие файлы модифицирует
   - Какие проблемы решает

4. **Используйте идемпотентные операции**
   - Проверяйте существование перед добавлением
   - Плагины должны работать при повторном запуске

5. **Избегайте конфликтов с IDE**
   - Не удаляйте `.iml`, `modules.xml` если проект не чисто Android
   - Не создавайте `gradle.xml` если это не нужно

## Следующие шаги:

- [ ] Проверить работу в Android Studio
- [ ] Протестировать сборку на реальном устройстве
- [ ] Убедиться что IntelliJ IDEA показывает проект как Expo, а не Android
