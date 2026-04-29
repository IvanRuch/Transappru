// Web push notifications via Firebase Cloud Messaging.
//
// Mirrors the native pathway in `usePushNotifications.ts` but using the
// `firebase` modular SDK instead of `@react-native-firebase/messaging`,
// which only works on native. Foreground messages are routed through the
// shared `NotificationContext` so the same in-app banner UI surfaces on
// both platforms.
//
// This hook is intentionally PASSIVE: it never asks for permission. The
// soft-prompt UX (`PushPermissionPrompt` + `useWebPushPermission`)
// handles the "Включить" click; only after the user grants permission
// AND the SW is registered does this hook fetch the FCM token and sync
// it with the backend. That separation makes it impossible to surprise
// users with a native browser dialog on page load.

import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import Api from '../utils/Api';
import { getDeviceInfo } from '../utils/PushNotificationHelper';
import { useNotification } from '../contexts/NotificationContext';
import { isFirebaseWebConfigured } from '../config/firebaseWebConfig';
import { getFCMToken, onForegroundMessage } from '../services/firebaseWeb';

const SW_PATH = '/firebase-messaging-sw.js';

// Module-level set so duplicate `messageId`s don't re-show within a tab session.
const seenMessageIds = new Set<string>();

async function ensureServiceWorkerRegistered(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    // Idempotent — browsers re-use an active registration.
    return await navigator.serviceWorker.register(SW_PATH);
  } catch (err) {
    console.warn('[push.web] SW registration failed:', err);
    return null;
  }
}

async function syncTokenWithBackend(authToken: string, fcmToken: string): Promise<void> {
  try {
    const deviceInfo = getDeviceInfo();
    await Api.post('/set-fcmtoken', {
      token: authToken,
      fcmtoken: fcmToken,
      device_info: deviceInfo,
    });
    console.log('[push.web] FCM token synced with backend');
  } catch (err) {
    console.warn('[push.web] Failed to sync FCM token:', err);
  }
}

export const usePushNotifications = (authToken: string | null | undefined) => {
  const { showNotification } = useNotification();
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Hard guards — bail out before touching browser APIs in unsupported envs.
    if (Platform.OS !== 'web') return;
    if (!authToken) return;
    if (!isFirebaseWebConfigured()) return;
    if (typeof window === 'undefined') return;
    if (typeof Notification === 'undefined') return;
    if (Notification.permission !== 'granted') return;

    let cancelled = false;

    (async () => {
      const swRegistration = await ensureServiceWorkerRegistered();
      if (!swRegistration || cancelled) return;

      const fcmToken = await getFCMToken();
      if (!fcmToken || cancelled) return;

      // DEV-only: print the full FCM token so it can be pasted straight
      // into Firebase Console "Send test message" or curl. Production
      // builds skip this — token is a sensitive identifier (anyone with
      // it can trigger a push to this user / browser).
      if (__DEV__) {
        console.log('[push.web] FCM token (DEV only):', fcmToken);
      }

      await syncTokenWithBackend(authToken, fcmToken);
      if (cancelled) return;

      // Foreground messages — surface via the existing in-app banner so
      // mobile and web share the same notification UX. Background
      // messages are owned by the service worker (showNotification on
      // self.registration), see public/firebase-messaging-sw.template.js.
      const unsub = await onForegroundMessage((payload) => {
        const id = payload.messageId;
        if (id && seenMessageIds.has(id)) return;
        if (id) seenMessageIds.add(id);

        const title = payload.notification?.title ?? 'TransApp';
        const body = payload.notification?.body ?? '';
        showNotification(title, body);
      });

      if (cancelled) {
        unsub();
        return;
      }
      unsubRef.current = unsub;
    })();

    return () => {
      cancelled = true;
      unsubRef.current?.();
      unsubRef.current = null;
    };
  }, [authToken, showNotification]);
};
