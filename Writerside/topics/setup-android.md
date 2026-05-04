# Android Setup

Локальный setup для разработки. Production-сборка делается через EAS —
см. [infra-eas-build.md](infra-eas-build.md).

## Prerequisites

| Компонент | Версия / источник |
|-----------|------------------|
| Android Studio | current LTS (Iguana / Jellyfish / Koala — любая, поддерживающая JBR-21) |
| JDK | **JBR-21** (поставляется с Android Studio). НЕ ставить отдельный OpenJDK 17 — `expo-build-properties` ожидает 21. |
| Android SDK | API 34+ (через Android Studio SDK Manager) |
| Gradle / AGP | 8.14.3 / 8.13.2 — пиннятся в `app.json` через `expo-build-properties` и `withAndroidGradlePluginVersion.js`, не нужно ставить отдельно |
| Node.js | ≥ 20 (рекомендуется системный `/usr/local/bin/node` или абсолютный путь — см. ниже) |
| `adb` | в PATH (приходит с Android SDK Platform-Tools) |

## First-time setup

### 1. Install dependencies

```bash
npm install
```

`postinstall: patch-package` автоматически применит 10 патчей в `node_modules/`
(см. ADR-010), которые добавляют `System.getProperty("expo.node.path", "node")`
в Gradle-вызовы node-исполняемого. Без этих патчей GUI-запуск Android Studio
падает на codegen-фазе с `Cannot run program "node": error=2`.

### 2. Настройка node-PATH для Android Studio (только если запускаешь из GUI)

При запуске Android Studio из Dock / Finder / JetBrains Toolbox / Spotlight
shell PATH **не** наследуется (macOS launchd quirk). Один раз на машину:

```bash
which node                    # узнать абсолютный путь
# или: readlink -f $(which node)  если используется nvm/Volta/fnm
```

Добавить в `~/.gradle/gradle.properties` (создать файл, если не существует):

```properties
systemProp.expo.node.path=/usr/local/bin/node
```

(подставить свой путь). Это user-level файл, **не** в репо — каждый
разработчик настраивает локально. Из терминала (`./gradlew assembleDebug`,
EAS Build, GitHub Actions) — fallback `"node"` через PATH работает без
этой настройки. Полный разбор — [ADR-010](decision-log.md).

### 3. Open in Android Studio + sync

Открыть проект в Android Studio → **File → Sync Project with Gradle Files**.
Первый sync скачивает Gradle 8.14.3 + AGP 8.13.2 + dependencies (~5–10 минут).

## Run

### Эмулятор

```bash
npm run android              # expo run:android (cold install + Metro)
npm run android:clear        # clear app data + run
npm run android:fresh        # uninstall + run (clean APK install)
```

### Физическое устройство

1. Включить **Developer Options + USB Debugging** на телефоне.
2. Подключить USB → `npm run device:list` (должен показать один device).
3. ```bash
   npm run android:device              # generic — первое подключённое устройство
   npm run android:device:specific     # конкретный device-id (захардкожен 28J9K24319016011)
   ```

`adb reverse tcp:8081 tcp:8081 && adb reverse tcp:8097 tcp:8097` (проброс
Metro + dev-tools на устройство) — выполняется автоматически в
`setup:device` script. Для DEV-mode payment-service дополнительно нужен
`adb reverse tcp:8001 tcp:8001` (см. [manual-qa-checklist.md](manual-qa-checklist.md) §F11).

### Logs

```bash
npm run device:logs          # adb logcat -s ReactNativeJS:I ReactNative:I
```

## Common pitfalls

| Симптом | Причина | Фикс |
|---------|---------|------|
| Gradle sync падает на `Cannot run program "node"` | GUI launch не наследует PATH | См. шаг 2 выше (ADR-010) |
| `Cleartext HTTP traffic to 10.0.2.2 not permitted` (DEV) | RN 0.81 cleartext disabled by default | Уже разрешено в `withAndroidManifestFixes.js` для LAN-IP / 10.0.2.2 в DEV-builds |
| Codegen падает на `react-native-yamap-plus` | Старый кэш Gradle | `cd android && ./gradlew clean && cd ..` (только если папка `android/` сгенерирована — после `expo prebuild`) |
| После `expo prebuild` Android Studio просит «Open as project» | папка `android/` не управляется кодом | **Не запускать `expo prebuild`** в обычной разработке. Папка `android/` regenerates автоматически при EAS Build / Expo Go. Все custom-tweaks делаются через config-plugins в `plugins/`. |

## References

- [ADR-010](decision-log.md) — patch-package + JVM system property
- [dev-mobile.md](dev-mobile.md) → раздел «Android Studio setup для разработчиков»
- [infra-eas-build.md](infra-eas-build.md) — production build pipeline
- [manual-qa-checklist.md](manual-qa-checklist.md) §F11 — real-device caveats
