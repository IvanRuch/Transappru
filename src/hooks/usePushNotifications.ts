import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useRootNavigationState } from 'expo-router';
import Api from '../utils/Api';
import { getDeviceInfo } from '../utils/PushNotificationHelper';
import { useNotification } from '../contexts/NotificationContext';

const STORAGE_KEYS = {
  LAST_SENT_HASH: 'push_last_sent_hash',
};

export const usePushNotifications = (authToken: string | null | undefined) => {
  const { showNotification } = useNotification();
  const navigationState = useRootNavigationState(); // Отслеживаем состояние навигации
  
  const isMounted = useRef(false);
  const initialNotificationProcessed = useRef(false);

  // Флаг готовности навигации (Expo Router)
  const isNavigationReady = navigationState?.key != null;

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // 1. Авторизация и синхронизация токена (Зависит от authToken)
  useEffect(() => {
    if (!authToken) return;

    const init = async () => {
      // В v23.5.0+ метод requestPermission сам обрабатывает Android 13+ (API 33+)
      const authStatus = await messaging().requestPermission();
      const enabled = 
        authStatus === messaging.AuthorizationStatus.AUTHORIZED || 
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (!enabled || !isMounted.current) {
        console.log('🔕 [Push] Notifications disabled or hook unmounted');
        return;
      }

      const fcmToken = await getFCMToken();
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

  // 2. Слушатели сообщений и Cold Start (Ждем готовности навигации)
  useEffect(() => {
    // Ждем, пока Expo Router будет готов к переходам
    if (!isNavigationReady) {
      console.log('⏳ [Push] Waiting for navigation to be ready...');
      return;
    }

    console.log('🚀 [Push] Navigation is ready, setting up listeners');

    // A. Foreground: приложение открыто
    const unsubOnMessage = messaging().onMessage(async (remoteMessage) => {
      console.log('📲 [Push] Foreground Message:', remoteMessage);
      if (remoteMessage.notification) {
        showNotification(
          remoteMessage.notification.title || 'Уведомление',
          remoteMessage.notification.body || ''
        );
      }
    });

    // B. Background: клик по уведомлению из фона
    const unsubOnNotificationOpened = messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('📲 [Push] Background Click:', remoteMessage);
      handleNotificationNavigation(remoteMessage);
    });

    // C. Quit State (Cold Start): открытие закрытого приложения
    if (!initialNotificationProcessed.current) {
      messaging().getInitialNotification().then(remoteMessage => {
        if (remoteMessage) {
          console.log('📲 [Push] Quit State Click:', remoteMessage);
          initialNotificationProcessed.current = true;
          handleNotificationNavigation(remoteMessage);
        }
      });
    }

    return () => {
      unsubOnMessage();
      unsubOnNotificationOpened();
    };
  }, [isNavigationReady]); // Эффект перезапустится один раз, когда навигация станет готова
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
