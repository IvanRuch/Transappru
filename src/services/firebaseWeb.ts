// Web Firebase initialisation + FCM helpers. Wraps `firebase` modular SDK
// (web-only); RN Firebase native pathway lives in `usePushNotifications.ts`
// and is NOT touched by this file. Metro will only bundle this on
// `Platform.OS === 'web'` because every consumer guards with a `.web.ts`
// resolution or an `isFirebaseWebConfigured()` check.

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getMessaging,
  getToken,
  onMessage,
  isSupported,
  type Messaging,
  type MessagePayload,
} from 'firebase/messaging';
import { firebaseWebConfig, isFirebaseWebConfigured } from '../config/firebaseWebConfig';

let appInstance: FirebaseApp | null = null;
let messagingInstance: Messaging | null = null;

/**
 * Idempotent — repeated calls reuse the existing FirebaseApp.
 * Returns null when secrets are not configured; callers should treat
 * that as "web push disabled" and skip the rest of the pipeline.
 */
function getOrInitApp(): FirebaseApp | null {
  if (!isFirebaseWebConfigured()) return null;
  if (appInstance) return appInstance;
  // Reuse if a previous module load already initialised the default app
  // (e.g. across HMR boundaries during dev).
  const existing = getApps();
  appInstance = existing.length > 0 ? existing[0] : initializeApp(firebaseWebConfig);
  return appInstance;
}

/**
 * Lazy-init Messaging instance. Caches across calls.
 * Returns null when:
 *   - secrets are not configured
 *   - the browser doesn't support FCM web (e.g. Safari iOS without PWA install)
 */
export async function getMessagingIfSupported(): Promise<Messaging | null> {
  const app = getOrInitApp();
  if (!app) return null;
  if (messagingInstance) return messagingInstance;
  // `isSupported()` checks navigator.serviceWorker + PushManager + Notification
  // and returns false on Safari iOS (and any browser missing one of these).
  const supported = await isSupported();
  if (!supported) return null;
  messagingInstance = getMessaging(app);
  return messagingInstance;
}

/**
 * Resolves to the FCM registration token for this browser/user pair, or
 * null when push isn't available (no support, no permission, no
 * registered SW, missing secrets).
 *
 * Caller is responsible for ensuring `Notification.permission === 'granted'`
 * BEFORE calling this — `getToken` itself doesn't ask for permission, it
 * just fails silently when permission is missing.
 */
export async function getFCMToken(): Promise<string | null> {
  try {
    const messaging = await getMessagingIfSupported();
    if (!messaging) return null;

    // Wait for SW registration. The browser keeps SW registrations across
    // sessions, so this resolves immediately once the SW is installed.
    const swRegistration = await navigator.serviceWorker.ready;

    const token = await getToken(messaging, {
      vapidKey: firebaseWebConfig.vapidKey,
      serviceWorkerRegistration: swRegistration,
    });
    return token || null;
  } catch (err) {
    // Common failure modes: blocked permission, network error, SW not yet
    // registered, mismatched VAPID key. None are fatal — caller can retry
    // on next mount/reload.
    console.warn('[firebaseWeb] getFCMToken failed:', err);
    return null;
  }
}

/**
 * Subscribe to foreground messages (received while the tab is focused).
 * Background messages are handled by `firebase-messaging-sw.js` directly.
 *
 * Returns an unsubscribe function. No-op on unsupported browsers.
 */
export async function onForegroundMessage(
  handler: (payload: MessagePayload) => void,
): Promise<() => void> {
  const messaging = await getMessagingIfSupported();
  if (!messaging) return () => {};
  return onMessage(messaging, handler);
}
