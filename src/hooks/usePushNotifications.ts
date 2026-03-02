import { useEffect, useRef } from 'react';
import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useRootNavigationState } from 'expo-router';
import Api from '../utils/Api';
import { getDeviceInfo } from '../utils/PushNotificationHelper';
import { useNotification } from '../contexts/NotificationContext';

const STORAGE_KEYS = {
  LAST_SENT_HASH: 'push_last_sent_hash',
};

// ── Дедупликация foreground-сообщений ────────────────────────────────────
// Firebase SDK может доставить одно сообщение повторно (retry, Strict Mode).
// Set на уровне модуля — переживает ремаунты компонентов.
const recentMessageIds = new Set<string>();
const MAX_RECENT_IDS = 50;

function isDuplicateMessage(messageId: string | undefined): boolean {
  if (!messageId) return false;
  if (recentMessageIds.has(messageId)) return true;
  recentMessageIds.add(messageId);
  if (recentMessageIds.size > MAX_RECENT_IDS) {
    const oldest = recentMessageIds.values().next().value;
    if (oldest) recentMessageIds.delete(oldest);
  }
  return false;
}

export const usePushNotifications = (authToken: string | null | undefined) => {
  const { showNotification } = useNotification();
  const navigationState = useRootNavigationState();

  const isMounted = useRef(false);
  const initialNotificationProcessed = useRef(false);
  const listenersSetUp = useRef(false);

  const isNavigationReady = navigationState?.key != null;

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // 1. Авторизация и синхронизация токена
  useEffect(() => {
    if (!authToken) return;

    const init = async () => {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (!enabled || !isMounted.current) {
        console.log('🔕 [Push] Notifications disabled or hook unmounted');
        return;
      }

      const fcmToken = await getFCMToken();
      console.log('📲 [Push] FCM Token:', fcmToken);
      if (!fcmToken || !isMounted.current) return;

      await syncTokenWithServer(fcmToken, authToken);
    };

    init();

    const unsubTokenRefresh = messaging().onTokenRefresh(async (newToken) => {
      if (isMounted.current && authToken) {
        await syncTokenWithServer(newToken, authToken);
      }
    });

    return () => unsubTokenRefresh();
  }, [authToken]);

  // 2. Слушатели сообщений (ждём готовности навигации)
  useEffect(() => {
    if (!isNavigationReady) return;

    // Защита от двойной подписки (React Strict Mode, пересоздание компонентов)
    if (listenersSetUp.current) {
      console.log('⚠️ [Push] Listeners already active, skipping');
      return;
    }
    listenersSetUp.current = true;
    console.log('🚀 [Push] Setting up message listeners');

    // A. Foreground: приложение открыто
    const unsubOnMessage = messaging().onMessage(async (remoteMessage) => {
      console.log('📲 [Push] Foreground:', remoteMessage.messageId);

      // Дедупликация по messageId
      if (isDuplicateMessage(remoteMessage.messageId)) {
        console.log('⚠️ [Push] Duplicate foreground message skipped:', remoteMessage.messageId);
        return;
      }

      // Поддержка обоих форматов: data-only (новый сервер) и notification (текущий)
      const title = (remoteMessage.data?.title as string)
                 || remoteMessage.notification?.title
                 || 'Уведомление';
      const body  = (remoteMessage.data?.body as string)
                 || remoteMessage.notification?.body
                 || '';

      showNotification(title, body);
    });

    // B. Background: клик по уведомлению из фона
    const unsubOnNotificationOpened = messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('📲 [Push] Background tap:', remoteMessage.messageId);
      handleNotificationNavigation(remoteMessage);
    });

    // C. Quit State (Cold Start)
    if (!initialNotificationProcessed.current) {
      messaging().getInitialNotification().then(remoteMessage => {
        if (remoteMessage) {
          console.log('📲 [Push] Cold start tap:', remoteMessage.messageId);
          initialNotificationProcessed.current = true;
          handleNotificationNavigation(remoteMessage);
        }
      });
    }

    return () => {
      listenersSetUp.current = false;
      unsubOnMessage();
      unsubOnNotificationOpened();
    };
  }, [isNavigationReady]);
};

// --- Вспомогательные функции ---

const getFCMToken = async () => {
  try {
    return await messaging().getToken();
  } catch (e) {
    console.warn('⚠️ [Push] Failed to get FCM token', e);
    return null;
  }
};

const syncTokenWithServer = async (fcmToken: string, authToken: string) => {
  try {
    const identityString = `${fcmToken}|${authToken}`;
    const lastSentIdentity = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SENT_HASH);

    if (identityString === lastSentIdentity) {
      console.log('🔒 [Push] Token up-to-date (hash match).');
      return;
    }

    console.log('🔄 [Push] Syncing token with server...');
    const deviceInfo = getDeviceInfo();

    await Api.post('/set-fcmtoken', {
      token: authToken,
      fcmtoken: fcmToken,
      device_info: deviceInfo
    });

    await AsyncStorage.setItem(STORAGE_KEYS.LAST_SENT_HASH, identityString);
    console.log('✅ [Push] Token synced');
  } catch (error) {
    console.error('❌ [Push] Sync failed', error);
  }
};

const handleNotificationNavigation = (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
  if (!remoteMessage) return;

  try {
    const data = remoteMessage.data;
    console.log('🚀 [Push] Navigating with data:', data);

    if (data?.screen) {
      router.push(data.screen as any);
    } else {
      router.push('/(authenticated)/notifications');
    }
  } catch (e) {
    console.error('❌ [Push] Navigation error:', e);
  }
};
