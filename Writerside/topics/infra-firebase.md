# Firebase Setup

Firebase используется **только** под FCM (Firebase Cloud Messaging) для
push-уведомлений. Auth, Firestore, Realtime DB, Analytics, Crashlytics —
**НЕ** используются (storage и identity лежат в legacy backend
`transapp.ru` + payment-service Postgres).

## Two pathways

| Платформа | Стек | Конфиг |
|-----------|------|--------|
| **Native (iOS/Android)** | `@react-native-firebase/{app,messaging}` v23.5 — Expo config plugins подключают нативные SDK напрямую | `GoogleService-Info.plist` (iOS), `google-services.json` (Android) |
| **Web** | `firebase` v12 modular SDK (`firebase/app` + `firebase/messaging`) + Service Worker | `firebaseWebConfig.ts` (env-driven), `public/firebase-messaging-sw.js` (генерируется из `.template`) |

Их пути разделены: native не дёргает web SDK, web не дёргает native.
Заводится через `.web.ts(x)` Metro-резолюцию + явный
`isFirebaseWebConfigured()` guard на web.

## Configuration files

### Native

| Файл | Платформа | Где |
|------|-----------|-----|
| `GoogleService-Info.plist` | iOS | gitignored, в корне проекта на разработческой машине |
| `google-services.json` | Android | gitignored, в корне проекта на разработческой машине |

Получить — у project owner. EAS Build подтягивает их через Expo Secrets.

### Web

`src/config/firebaseWebConfig.ts` читает env-переменные (`EXPO_PUBLIC_FIREBASE_*`):
`apiKey`, `authDomain`, `projectId`, `messagingSenderId`, `appId`,
`vapidKey`. Если не сконфигурированы — `isFirebaseWebConfigured() === false`,
push на web отключается gracefully (см. ADR-009).

Service Worker `public/firebase-messaging-sw.js` рендерится из
`.template` через `npm run gen:sw` (вызывается перед `npm run web:fresh`)
— подставляет config-значения в shipped JS.

## Plugin layer (Expo config plugins)

Подключение FCM в нативные сборки — через `app.json → plugins`:

```
"@react-native-firebase/app",
"@react-native-firebase/messaging",
"./plugins/withAPSEnvironment.js",         // iOS Push capability
"./plugins/withAndroidNotificationIcon.js" // Android notification icon assets
```

Дополнительные iOS-настройки (background modes для silent push, dSYM
для crash reports) — в `plugins/withBackgroundModes.js` и `plugins/withDSYM.js`.

## Code paths

| Файл | Роль |
|------|------|
| `src/services/firebase.ts` | Native init — `getApps()` healthcheck, no-op-ish (нативный layer стартует автоматически) |
| `src/services/firebase.web.ts` | Web `.web.ts` override — no-op stub (см. `firebaseWeb.ts` для реального web init) |
| `src/services/firebaseWeb.ts` | Реальная web-инициализация: `initializeApp` + `getMessaging` + `getToken`/`onMessage`. Idempotent. |
| `src/hooks/usePushNotifications.ts` | Native hook — FCM token retrieval, foreground/background handlers |
| `src/hooks/usePushNotifications.web.ts` | Web hook — VAPID + Service Worker registration |
| `src/hooks/useWebPushPermission.ts` | Soft-prompt UX (см. ADR-009) перед нативным `Notification.requestPermission` |

## Push payload contract

Полный матричный список типов уведомлений (charge / pass / OSAGO /
diagcard / driver / generic), payload-форматы, deeplinks, deduplication
правила — в [dev-push-notifications.md](dev-push-notifications.md).

Background handler на native (тогда когда приложение убито) — там же.

## References

- [dev-push-notifications.md](dev-push-notifications.md) — payload contract, типы, deeplinks
- [dev-mobile.md](dev-mobile.md) — push в составе общего mobile dev workflow
- [ADR-009](decision-log.md) — Web push restored via hybrid soft-prompt + GitHub Secrets config
- `scripts/send-test-push.js` — отправка тестового push-уведомления через `firebase-admin` (`npm run test:push`)
