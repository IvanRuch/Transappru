# Push Notifications

Firebase Cloud Messaging (FCM) on iOS, Android and web. Same backend
endpoint (`POST /set-fcmtoken`) for all three platforms — backend doesn't
care about origin platform, FCM router handles routing.

## Architecture

| Platform | SDK | Permission flow | Service worker |
|----------|-----|-----------------|----------------|
| iOS / Android | `@react-native-firebase/messaging` (native) | OS-level dialog via `messaging().requestPermission()` | N/A — FCM SDK handles background messages natively |
| Web | `firebase` modular SDK + compat SDK in SW | Soft-prompt banner → `Notification.requestPermission()` only after explicit click | `public/firebase-messaging-sw.template.js` → rendered to `public/firebase-messaging-sw.js` at Docker build time |

The two pathways are file-system-isolated via the `.web.ts` resolution:
`src/hooks/usePushNotifications.ts` (native, RN Firebase) vs
`src/hooks/usePushNotifications.web.ts` (web, modular SDK). Metro picks
the right file per platform — neither bundle leaks into the other.

## Web push: soft-prompt UX

Browsers permanently block notifications when a user clicks "Block" on
the native dialog — there is no way to ask again from JS. To avoid that
trap, the app uses the **soft-prompt** pattern:

1. **Banner** at the top of `/auto-list`, ~10 s after entry. Asks the
   question in our own UI ("Получайте уведомления о штрафах и пропусках"),
   no native dialog yet. Buttons: **Включить** / **Позже** / **✕**.
2. **Native dialog** fires only when the user clicks Включить
   (`Notification.requestPermission()` inside `useWebPushPermission`).
3. **Позже** snoozes for 14 days (localStorage `transapp:push:snoozedUntil`).
4. **✕** dismisses permanently — banner never reappears (snooze 100y);
   user can still opt in via `/notification-settings`.

State machine lives in `src/hooks/useWebPushPermission.ts`:

```
                       Notification.permission
                              │
              ┌──────────┬────┴────┬──────────┐
              ▼          ▼         ▼          ▼
          'default'   'granted'  'denied'  undefined
              │          │         │          │
        ┌─────┴─────┐    │         │          ▼
        ▼           ▼    ▼         ▼      unsupported
       idle      snoozed granted denied
   (banner ON)  (banner   (silent  (settings hint:
   (after 10s)   OFF for   FCM      "blocked, open
                 14 days)  active)  site settings")
```

`deriveState(browserPermission, snoozedUntil, now)` is a pure function —
covered by 8 unit tests in
`src/hooks/__tests__/useWebPushPermission.test.ts`.

### Settings toggle

`/notification-settings` shows `WebPushSettingsCard` at the top (web
only, hidden on native). Mirrors the same state:

- `granted` → switch ON, descriptive copy
- `denied` → disabled switch + instructions ("откройте 🔒 рядом с адресом
  и разрешите уведомления")
- `idle` / `snoozed` → switch OFF, click triggers `requestPermission()`
- `unsupported` → card hidden entirely (Safari iOS, secrets unconfigured)

## Build-time configuration (web only)

Six values, three project-private + three derivable from
`google-services.json`. All flow through GitHub Secrets and are inlined
into the JS bundle at build time via `EXPO_PUBLIC_*` env vars.

### Secrets

| Secret name | Where to find | Notes |
|-------------|---------------|-------|
| `FIREBASE_WEB_API_KEY` | Firebase Console → Project Settings → Web App → SDK setup → `apiKey` | Required. Public key (visible in any web SPA) — secret status by convention only. |
| `FIREBASE_WEB_APP_ID` | same → `appId` | Required. Web App must exist (Firebase Console → Add app → Web). |
| `FIREBASE_WEB_VAPID_KEY` | Firebase Console → Cloud Messaging → Web Push certificates → Generate key pair → **public** key | Required. Public part only — do NOT commit the private half. |
| `FIREBASE_WEB_PROJECT_ID` | `google-services.json:project_info.project_id` | Same value as mobile. |
| `FIREBASE_WEB_MESSAGING_SENDER_ID` | `google-services.json:project_info.project_number` | Same value as mobile. |
| `FIREBASE_WEB_STORAGE_BUCKET` | `google-services.json:project_info.storage_bucket` | Same value as mobile. |

`authDomain` is constructed in `firebaseWebConfig.ts` as
`<projectId>.firebaseapp.com` — no secret needed.

### Build pipeline

1. `.github/workflows/deploy-web.yml` reads the six secrets and passes
   them as `--build-arg` to the nginx Docker build.
2. `nginx/Dockerfile.prod` declares matching `ARG`s, then `ENV`s with
   `EXPO_PUBLIC_*` prefix so Metro will inline them into the JS bundle
   during `npx expo export`.
3. The same `ENV`s drive a `sed` substitution that renders
   `public/firebase-messaging-sw.template.js` → `firebase-messaging-sw.js`
   (SW context can't read `process.env`, so config is baked in at build).
4. The template uses `__PLACEHOLDER__` tokens (not `$VAR`) — harmless if
   ever shipped unsubstituted, since Firebase fails closed.

### Metro inlining gotcha

Metro substitutes only **direct** `process.env.EXPO_PUBLIC_FOO` reads.
Destructuring (`const { EXPO_PUBLIC_FOO } = process.env`) is left
intact and resolves to `undefined` on the client (browser `process.env`
is empty). All accesses in `firebaseWebConfig.ts` are direct property
reads to ensure substitution works.

### Graceful degradation

`isFirebaseWebConfigured()` returns `false` when any of the three
required secrets is empty. In that case:

- The banner never shows
- `usePushNotifications.web.ts` returns early
- `WebPushSettingsCard` returns null (state = `unsupported`)

So the app works in local dev (no secrets) and in deploys before the
secrets are populated — no errors, just no web push. Once the secrets
land, the next deploy activates the feature.

## Service worker

`public/firebase-messaging-sw.js` (built from the template):

- Loaded from CDN: `https://www.gstatic.com/firebasejs/11.4.0/firebase-{app,messaging}-compat.js`
- Initialises Firebase with the substituted config
- Handles `onBackgroundMessage` — calls `self.registration.showNotification`
  with the message's title, body, and `/icon-192.png` as the icon (re-uses
  the PWA icon set from `public/`)
- Handles `notificationclick` — focuses an existing tab if any, opens
  `payload.data.url ?? '/'` otherwise

### Nginx

Custom `location = /firebase-messaging-sw.js` block:

- `Cache-Control: no-cache, no-store, must-revalidate` — SW updates
  propagate immediately on next page load
- `Service-Worker-Allowed: /` — explicit (scope is already root)
- Standard security header set via `include`

### CSP additions

`nginx/security-headers.partial.conf` was extended:

- `script-src` adds `https://www.gstatic.com` (SW imports compat SDK)
- `connect-src` adds `https://fcmregistrations.googleapis.com`,
  `https://fcm.googleapis.com`, `https://firebaseinstallations.googleapis.com`
- New `worker-src 'self'` directive — allow workers from same origin

## Browser support

| Browser | Status |
|---------|--------|
| Chrome / Edge / Yandex Browser (desktop + Android) | ✅ Full support |
| Firefox (desktop + Android) | ✅ FCM uses Mozilla Push Service under the hood, transparent |
| Safari macOS 16+ | ⚠ Web Push standard, not FCM. `isSupported()` in firebase/messaging returns false — banner won't show |
| Safari iOS 16.4+ | ⚠ Web Push only inside an installed PWA (Add to Home Screen). Regular browser tab — no support |
| Older browsers | ❌ `isSupported()` returns false → banner hidden |

The user-stated 80%+ traffic on Chrome / Yandex / Edge means web push
covers the vast majority of users; the rest see no banner and aren't
disrupted.

## Testing locally

### Phase 1 — UI smoke (no real Firebase needed)

Goal: prove the banner / snooze / settings toggle flow before any
real credentials exist. Copy `.env.example` to `.env`, fill **fake**
values (any non-empty strings), run dev server:

```bash
cp .env.example .env
# Replace empty values with anything non-empty so isFirebaseWebConfigured() returns true
$EDITOR .env

# Render the FCM service worker from its template using the .env values.
# Required even with fake values — the SW file has to physically exist
# on disk for `expo start --web` to serve it from /firebase-messaging-sw.js;
# otherwise SW registration fails with 404 and the banner just fails silently.
npm run gen:sw

npx expo start --web --clear
```

Open `http://localhost:8081/`, sign in, land on `/auto-list`, **wait
10 s** — banner appears.

| Action | Expect |
|--------|--------|
| Click «Позже» | Banner gone; `transapp:push:snoozedUntil` in Local Storage = now + 14d |
| Reload | Banner stays hidden (snoozed) |
| Console: `__transappPushReset()` (DEV-only helper, exposed when `__DEV__` is true) | Clears localStorage markers + re-derives state. After reload + 10s banner returns |
| Click «Включить» | Native dialog → Allow → console logs `[firebaseWeb] getFCMToken failed` (expected — fake config). Banner gone (permission granted) |
| `/notification-settings` | Top card "Push-уведомления в браузере" — toggle reflects state |
| Click ✕ on banner | Banner gone forever (snooze 100y). Reset via `__transappPushReset()` |

Subscription itself doesn't work with fake config — that's fine, this
phase verifies UX paths and state transitions only.

### Phase 2 — End-to-end with real Firebase

Requires the 6 real values in `.env` from the project's Firebase
Web App and VAPID key. Once those are filled in:

```bash
npm run gen:sw                # regenerate SW with real config
npx expo start --web --clear  # OR: npm run web:fresh (does both)
```

Sign in, click «Включить» on the banner, grant permission. The
DevTools Console will print the full FCM token under `__DEV__`:

```
[push.web] FCM token (DEV only): eN4ABcDef...
```

Copy that token, then send yourself a test push.

**Easiest path** — if anyone on the team has Firebase Console access,
Cloud Messaging → "Send test message" → paste token → Send.

**Self-serve path** — service account JSON is enough, no Console
access needed. Place the JSON at `.secrets/firebase-server-account.json`
(`.secrets/` is gitignored, see ADR notes), then:

```bash
npm run test:push -- "<FCM_TOKEN>" "Hello from terminal"
# OR with a custom title:
npm run test:push -- "<FCM_TOKEN>" "Body text" "Custom title"
```

This uses `firebase-admin` (devDependency) and the HTTP v1 API under
the hood, so it stays valid after the legacy `fcm/send` endpoint
deprecation (June 2024).

**Foreground vs background**:

- Tab in foreground → in-app banner via `NotificationContext` → mirrors mobile UX.
- Tab in background / minimised → OS-level notification via
  `firebase-messaging-sw.js`. Click focuses the existing tab or opens
  `/auto-list`.

### Phase 3 — Docker smoke (full prod-like build)

Web push requires HTTPS (or `localhost` exception). Local Docker smoke:

```bash
docker build -f nginx/Dockerfile.prod \
  --build-arg FIREBASE_WEB_API_KEY=test_api_key \
  --build-arg FIREBASE_WEB_APP_ID=1:test:web:abc \
  --build-arg FIREBASE_WEB_VAPID_KEY=test_vapid_key \
  --build-arg FIREBASE_WEB_PROJECT_ID=transapp-test \
  --build-arg FIREBASE_WEB_MESSAGING_SENDER_ID=1234567890 \
  --build-arg FIREBASE_WEB_STORAGE_BUCKET=transapp-test.appspot.com \
  -t transapp-web-test .

docker run -d -p 8088:80 --network payment-service_default \
  --name transapp-web-smoke transapp-web-test

# Verify SW served correctly:
curl -sI http://localhost:8088/firebase-messaging-sw.js
# Expect: Content-Type: application/javascript, no-cache, Service-Worker-Allowed: /

# Verify config inlined into JS bundle:
JS=$(curl -sf http://localhost:8088/ | grep -oE '/_expo/static/js/web/[^"]+\.js' | head -1)
curl -sf "http://localhost:8088$JS" | grep -c "test_vapid_key"
# Expect: ≥ 1
```

To actually receive a push: open in Chrome with HTTPS (use a tunnel like
`ngrok` or deploy to staging), grant permission via the banner, then
trigger a test message from Firebase Console → Cloud Messaging → Send
test message.

## Troubleshooting

| Symptom | Likely cause |
|---------|--------------|
| Banner doesn't show | Secrets unset (`isFirebaseWebConfigured() === false`), or `isSupported()` false (Safari iOS), or already snoozed/granted/denied |
| `getToken()` returns null | VAPID key mismatch, SW not yet active, network error to FCM endpoints, or browser doesn't allow notifications on this origin |
| CSP violations in console | New endpoint added to FCM that we don't have in `connect-src`. Update `nginx/security-headers.partial.conf` |
| Background notifications not showing | Check DevTools → Application → Service Workers — `firebase-messaging-sw.js` must be active. If not registered, look at `usePushNotifications.web.ts` console warnings |
| Token not synced to backend | `POST /set-fcmtoken` failing — check `Network` tab, often auth token expired |
