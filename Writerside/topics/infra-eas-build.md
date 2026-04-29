# Mobile Release Pipeline — Research

> Status: **research only** (2026-04-29). Не выбран ни один путь к реализации; этот документ — основание для будущего решения. Когда выбор будет сделан, оформляется ADR-009.

## Постановка задачи

Перед Phase 2 cohabitation надо иметь воспроизводимый способ собирать **production-бинарники** мобильного приложения (`.ipa` для App Store / TestFlight, `.aab` для Google Play). Триггер — необходимость переключить `src/services/api.ts:18` (`PROD_PAYMENT_API_URL`) с несуществующего `payment.transapp.ru/api` на боевой prod-URL и выпустить новую версию.

Главное ограничение пользователя: **не платить за EAS Build подпиской** ($99/мес после free tier-а).

## Состояние проекта на 2026-04-29

Что **уже** настроено для мобильных сборок:

| Артефакт | Где | Что значит |
|----------|-----|-------------|
| `ios/TransApp.xcworkspace` + `Podfile` + `Pods/` | committed в repo | Native iOS-проект сгенерирован (`expo prebuild` уже сделан и закоммичен). Не нужен ремоут prebuild через EAS. |
| `android/` (gradle, manifests) | committed | То же для Android. |
| `app.json` с 14 config plugins | committed | Кастомизация native-кода через config plugins (`withYandexMaps.js`, `withDSYM.js`, etc.). При локальной сборке плагины перезапускаются автоматически Expo CLI. |
| `eas.json` с 3 profiles | committed | Готов для EAS Build, но также служит документацией target-конфигов. |
| Apple Team ID `XRF3344MB3` | `app.json:20` | Apple Developer аккаунт уже привязан. |
| Bundle identifier `org.reactjs.native.example.Transappru` | `app.json:19` | **placeholder**, default Expo template — **обязательно сменить перед prod-релизом** (см. §Side findings ниже). |
| `GoogleService-Info.plist` + `google-services.json` | committed | Firebase настроен. |
| `runtimeVersion: { policy: "appVersion" }` | `app.json:6-8` | OTA через Expo Updates возможна между билдами с одинаковым app version, но при смене version нужен полный rebuild. |
| `newArchEnabled: true` | `app.json:15` | Fabric/TurboModules включены. |

**Промежуточный вывод:** проект *не* зависит от EAS Build структурно. Сборки можно делать локально или в любой CI-системе с macOS-runner-ом для iOS и любым Linux-runner-ом для Android.

## Развенчание мифа «EAS — платный»

EAS Build pricing на момент 2026-04 (см. [expo.dev/pricing](https://expo.dev/pricing)):

| Tier | Цена | Builds/month | Concurrency | Queue priority |
|------|------|--------------|-------------|----------------|
| Free | $0 | 30 | 1 | low (10-30 мин ожидания на macOS) |
| Production | $99/мес | unlimited | 1-2 | normal |
| Enterprise | $$$ | unlimited | 5+ | high |

**Для текущего профиля проекта (single dev / редкие prod-релизы / 1-2 теста в месяц) free tier хватит.** Платить $99/мес имеет смысл только если:
- 3+ разработчика пушат каждый день в master
- Preview-сборка нужна на каждый PR (т.е. 30+ билдов/мес)
- Невозможно ждать 10-30 мин в очереди

Если **принципиальная позиция** «не хочу облако Expo» (vendor lock-in, российский периметр, контроль сертификатов у себя) — это валидно само по себе, безотносительно цены. Тогда ниже — анализ альтернатив.

## Альтернативы EAS Build

### A. Локальная сборка на Mac разработчика

**Что:** `npx expo run:ios --configuration Release` + Xcode Archive → Distribute → App Store Connect; `cd android && ./gradlew bundleRelease` → upload через Play Console UI.

**Плюсы:**
- 0₽ стоимости.
- Setup ~1-2 часа (Apple Developer membership подтвердить, certificates сгенерить через Xcode, App Store Connect API key создать для автоматизации, `keystore.jks` для Android создать локально).
- Полный контроль и наблюдаемость процесса.

**Минусы:**
- Нужен живой Mac у разработчика (это требование Apple для production iOS-сборок не обходится никаким образом — EAS просто арендует macOS-машину в облаке).
- Code signing certs хранятся в локальном Keychain — при потере Mac или его переустановке возни с восстановлением.
- Не воспроизводимо: если сборка упала, причина может быть в локальном состоянии (Xcode version, Cocoapods cache, Java version). Дебаг занимает время.
- Не интегрируется в Pull-Request flow.

**Best for:** первая prod-сборка, чтобы убедиться, что вообще всё провязывается; solo dev, релизит раз в месяц.

### B. GitHub Actions + Fastlane *(рекомендуется как целевое состояние)*

**Что:** `.github/workflows/release-mobile.yml` триггерится на git tag `v*`. iOS job на `macos-latest`, Android на `ubuntu-latest`. Фактическая сборка делегирована Fastlane (`Fastfile` с lanes `ios_beta`, `android_beta`).

**Plus:**
- `fastlane match` для управления code signing certs — сертификаты хранятся в **отдельном приватном git-репозитории**, зашифрованные AES-паролем. Перенос на новую машину = `match` clone + decrypt password = всё. Никаких "потерял .p12 — час разбираюсь как переподписать всё".
- `fastlane pilot` (iOS) / `fastlane supply` (Android) для автоматического upload в TestFlight / Play Internal Testing.
- 2000 минут/мес бесплатно для приватного репо. macOS-минуты тарифицируются 10× → 200 macOS-минут = **~13 iOS-сборок** в free tier (одна iOS-сборка ~15 минут). Android на ubuntu-latest идёт 1× → **~65 Android-сборок** в free tier.
- Воспроизводимо: contained runner с фиксированной версией Xcode, Java, Node.
- Полный аудит-trail: каждая сборка = запись в Actions tab с логами.
- Vendor neutrality: завтра можно переехать на GitLab CI / self-hosted Jenkins / Bitbucket Pipelines, всё работает с тем же Fastfile.

**Минусы:**
- Setup time ~1-2 дня в первый раз. Code signing — самая хитрая часть iOS-релизов; первые 3-5 сборок будут падать с ошибками signing-а, придётся читать stack-trace-ы Fastlane и Apple Developer portal.
- `fastlane match` требует **отдельного приватного git-репо** (или `s3` бакета) для сертификатов — это новая зависимость.
- Apple Developer Program — $99/год (но это нужно в **любом** случае для App Store, хоть EAS, хоть локалка, хоть GH Actions; эти $99 не относятся к выбору build-pipeline).

**Best for:** small-to-medium team, регулярные релизы, желание PR-driven процесса, отсутствие готовности платить $99/мес Expo.

### C. Self-hosted GitHub Actions runner (Mac mini)

**Что:** свой Mac mini (~$700 разово) подключается как self-hosted runner к GH Actions. На нём же стоит Xcode. Workflow `release-mobile.yml` использует `runs-on: self-hosted` для iOS jobs.

**Плюсы:**
- Снимает лимит macOS-минут (бесплатно неограниченно).
- Полный контроль — версия Xcode, плагины, кэш Cocoapods.
- Подходит когда нужно много sandbox/preview-сборок (i.e. PR-based preview build для каждого PR).

**Минусы:**
- Капитальные затраты ~$700 единоразово + ~$10/мес электричества + поддержка (обновления Xcode, дисковая чистка, network reliability, питание UPS).
- Single point of failure. Падёт Mac mini — релизы стопаются до починки.
- Overkill для текущего объёма (несколько релизов в месяц).

**Best for:** enterprise или команды 5+ разработчиков с ежедневными релизами.

### D. Codemagic / Bitrise

**Что:** managed CI specifically для mobile. Codemagic free tier: 500 build minutes/мес для public/private. Bitrise free tier: 200 build minutes/мес (после изменений 2024 года).

**Плюсы:**
- Setup проще GH Actions — UI-driven, есть templates для React Native + Expo.
- Хорошо документированы обходы code-signing-граблей.
- Codemagic поддерживает Expo official-но.

**Минусы:**
- Vendor lock-in лёгкий: workflow yml-ы Codemagic не работают в других CI без переписывания.
- Free tier меньше, чем у GH Actions.
- Ещё одна сторонняя система, в которую надо логиниться, добавлять команду, хранить secrets.

**Best for:** команды без существующего GH Actions setup-а, кто не хочет настраивать CI на голом GitHub.

### E. ~~Microsoft App Center~~ (deprecated)

**Microsoft закрыл App Center в марте 2025.** Не вариант. Если кто-то ссылается на старые туториалы — игнорировать.

## Сравнительная таблица

| Критерий | EAS Build (free) | EAS Build (Production) | Local Mac | GH Actions+Fastlane | Self-hosted Mac mini | Codemagic |
|----------|------------------|-------------------------|-----------|----------------------|----------------------|-----------|
| Стоимость/мес | $0 | $99 | $0 | $0 (free tier) | ~$10 (электр.) + $700 разово | $0 (free tier) |
| Setup time | 5 мин | 5 мин | 1-2 ч | 1-2 дня | 2-3 дня | 30 мин |
| Лимит сборок/мес | 30 | unlimited | unlimited | ~13 iOS / 65 Android | unlimited | 500 минут |
| macOS concurrency | 1 (low priority) | 1-2 | 1 | 1 (но дёшево) | 1 | 1 |
| Воспроизводимость | High | High | Low | High | High | High |
| Vendor lock-in | Yes | Yes | No | No | No | Light |
| Cert backup | Хранит Expo | Хранит Expo | На локальном Keychain | Encrypted git repo | Локальный Keychain | Хранит Codemagic |
| PR-driven preview | Да | Да | Нет | Да | Да | Да |
| Подходит для team 1 | ✅ | overkill | ✅ | ✅ | overkill | ✅ |
| Подходит для team 5+ | разве что временно | ✅ | сложно | ✅ | ✅ | ✅ |

## Рекомендация для TransApp

**Целевое состояние: GitHub Actions + Fastlane (вариант B).**

**Путь к нему — три этапа, не один:**

### Этап 1 — Local Mac build (день 0, для разблокировки Phase 2)

Цель: единожды убедиться, что prod-сборка вообще выпекается на текущем Mac. Это валидирует:
- Apple Developer membership активна
- Code signing работает с Team ID `XRF3344MB3`
- Все 14 config plugins корректно отрабатывают (это **именно та сложность**, которая делает Expo проект отличающимся от голого RN — каждый plugin может сломаться при native build-е)
- Firebase certs валидны
- Android keystore сгенерирован и сохранён в надёжном месте

Команды (после сброса bundle identifier-а — см. Side findings):
```bash
# iOS Release
npx expo run:ios --configuration Release --no-install
# или Xcode → Product → Archive → Distribute App → App Store Connect

# Android AAB
cd android && ./gradlew bundleRelease
# Артефакт: android/app/build/outputs/bundle/release/app-release.aab
# Загрузка: Play Console → Internal Testing → Upload AAB
```

### Этап 2 — Fastlane локально (день 1, после первого успеха этапа 1)

Файлы:
- `fastlane/Fastfile` — две lanes: `ios_beta` (build + upload в TestFlight), `android_beta` (build + upload в Play Internal)
- `fastlane/Matchfile` — конфиг где хранить сертификаты (рекомендуется `git_url` к приватному репо `TransKonsalt/transapp-fastlane-match`)
- `fastlane/Appfile` — `apple_id`, `team_id` (XRF3344MB3), Play Store package name

Setup `match` разово (~1 ч): один раз `fastlane match init` + `fastlane match appstore` создаёт сертификаты, шифрует и пушит в match-репо. Дальше `match` lazy-восстанавливает их при каждой сборке.

После этого сборка = `bundle exec fastlane ios_beta` или `android_beta` с любого Mac (после `match` decrypt). Human ошибки ("забыл сделать что-то в Xcode") невозможны.

### Этап 3 — GitHub Actions (день 2-3, после стабильного Этапа 2)

`.github/workflows/release-mobile.yml`:
```yaml
on:
  push:
    tags: ['v*']

jobs:
  ios:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'npm' }
      - uses: ruby/setup-ruby@v1
        with: { ruby-version: '3.3', bundler-cache: true }
      - run: npm ci
      - run: bundle exec fastlane ios_beta
        env:
          MATCH_PASSWORD: ${{ secrets.MATCH_PASSWORD }}
          APP_STORE_CONNECT_API_KEY_KEY_ID: ${{ secrets.APP_STORE_CONNECT_API_KEY_KEY_ID }}
          APP_STORE_CONNECT_API_KEY_ISSUER_ID: ${{ secrets.APP_STORE_CONNECT_API_KEY_ISSUER_ID }}
          APP_STORE_CONNECT_API_KEY_KEY: ${{ secrets.APP_STORE_CONNECT_API_KEY_KEY }}

  android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'npm' }
      - uses: actions/setup-java@v4
        with: { distribution: 'temurin', java-version: '17' }
      - uses: ruby/setup-ruby@v1
        with: { ruby-version: '3.3', bundler-cache: true }
      - run: npm ci
      - run: bundle exec fastlane android_beta
        env:
          PLAY_STORE_CREDENTIALS_JSON: ${{ secrets.PLAY_STORE_CREDENTIALS_JSON }}
          ANDROID_KEYSTORE_BASE64: ${{ secrets.ANDROID_KEYSTORE_BASE64 }}
          ANDROID_KEYSTORE_PASSWORD: ${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
```

С этого момента: `git tag v2.0.18 && git push --tags` → ~25 минут → бинарник в TestFlight + Play Internal.

**Почему именно три этапа, а не сразу CI:** при первой настройке code signing-а 80% времени уходит на отладку ошибок Apple developer portal + Xcode. Делать это в CI = слепо, по логам, в 10× медленнее обратной связи. Сначала научиться на Mac в реальном времени, потом перенести known-working процесс в CI.

## Side findings (вне рамок выбора, но критично перед prod)

### 1. Bundle identifier — placeholder

`app.json:19` и `eas.json` оба содержат `org.reactjs.native.example.Transappru`. Это **default Expo template placeholder**, не реальный prod-bundle-id. Перед первым релизом в App Store надо сменить на:
- `ru.transapp.mobile` (рекомендую — соответствует домену + страновой namespace)
- или `com.transkonsalt.transapp` (по имени организации)

**Это breaking change для существующих установок.** Apple/Google трактуют новый bundle id как **новое приложение** — у пользователей не будет миграции, они должны переустановить. Если в prod уже что-то стояло раньше под старым именем (надо проверить App Store Connect / Play Console) — нужна стратегия миграции (transition дата, in-app уведомление, etc.). Если ничего раньше не публиковалось — просто меняем сейчас, без последствий.

Проверка: `gh api '/apps/transapp.ru'` (если связан) или вручную в App Store Connect / Play Console под TransKonsalt-аккаунтом.

### 2. OTA через Expo Updates для Phase 2 — не сработает

Я ранее в плане упоминал «EAS rebuild» для Phase 2. Это правильно. Альтернативный путь "не делать rebuild, только OTA через `eas update`" **не работает в этом случае**, потому что:
- `Constants.expoConfig` и значения из JS-кода (вроде `PROD_PAYMENT_API_URL` в `api.ts:18`) попадают в JS-bundle при `metro bundle`.
- Expo Updates **может** обновить bundle через OTA, но **только** если `runtimeVersion` совпадает у текущего бинарника и нового update.
- У вас `runtimeVersion: { policy: "appVersion" }` (`app.json:6-8`) — значит при смене `version` (`2.0.17 → 2.0.18`) `runtimeVersion` тоже меняется, OTA не применится, нужен rebuild.

**Что можно сделать (отдельный мини-PR, не сейчас):** переписать `api.ts:18` на чтение из `expo-constants` extra-поля, который задаётся через `app.json:expo.extra.paymentApiUrl`. Тогда URL можно будет менять через `eas update` (платно) **или** через self-hosted Expo Updates server (бесплатно, но геморрой настройки) **без** новой бинарной сборки. Это рефакторинг с trade-off: добавляет уровень indirection ради возможности OTA.

### 3. `react-native-fs` unmaintained

`npx expo doctor` (запущено 2026-04-29) flag-ает `react-native-fs` как unmaintained и без metadata в RN Directory. На New Architecture (которая у вас включена через `newArchEnabled: true`) может ломаться через 1-2 квартала. Стоит запланировать миграцию на `expo-file-system`. Не блокирует ни Phase 2, ни выбор build-pipeline, но через несколько обновлений Expo SDK станет блокером.

### 4. `@expo/config-plugins` direct install

`npx expo doctor` flag-ает `@expo/config-plugins` как direct dependency, что Expo не рекомендует — должен использоваться через `expo/config-plugins` (sub-export пакета `expo`). Косметический фикс: убрать из `package.json` direct deps, обновить imports в `plugins/*.js`. Отдельный PR.

## Open questions для будущего ADR-009

1. **Какой bundle identifier выбираем?** `ru.transapp.mobile` vs `com.transkonsalt.transapp` vs другое.
2. **Где хранить `match` git-repo?** Отдельный приватный repo в `TransKonsalt` org, или внутри основного как submodule?
3. **Tag-driven vs branch-driven release?** GitHub Actions может триггериться на `push tags: v*` (semver tag) или `push branches: release/*`. Tag-driven чище.
4. **Single workflow vs separate iOS/Android workflows?** Single — общая линия времени, легче читать. Separate — можно ретраить только iOS если Android упал.
5. **Хранить ли App Store Connect API key в GH Secrets, или использовать Apple-managed CI?** Apple App Store Connect Workflows (бесплатно, в beta с 2024) — отдельная альтернатива, но новая и не зрелая.

## Решение

**Не принято** на 2026-04-29. Когда станет актуально (Phase 2 cohabitation готова, нужен реальный prod-релиз):
1. Перечитать этот документ.
2. Решить open questions выше.
3. Оформить выбранный путь как ADR-009 в `decision-log.md`.
4. Реализовать Этап 1 → Этап 2 → Этап 3 как описано в §Рекомендация.

Этот документ — input в decision-making, не decision сам по себе.
