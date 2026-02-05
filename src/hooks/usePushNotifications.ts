import { useEffect } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';
import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceInfo from 'react-native-device-info';
import Api from '../utils/Api';
import packageJson from '../../package.json';
import { useNotification } from '../contexts/NotificationContext';

const STORAGE_KEYS = {
  LAST_SENT_HASH: 'push_last_sent_hash',
};

const Version = packageJson.version;

export const usePushNotifications = (authToken: string | null | undefined) => {
  const { showNotification } = useNotification();
  
  useEffect(() => {
    // Флаг: жив ли компонент?
    let isMounted = true; 
    
    // Массив для хранения всех функций отписки
    const unsubscribes: Array<() => void> = [];

    const init = async () => {
      // 1. Guard Clause
      if (!authToken) {
        console.log('🔕 [Push] No auth token, skipping init');
        return;
      }

      // Если пока ждали, компонент умер - выходим
      if (!isMounted) return;

      // 2. Permissions
      const hasPermission = await requestUserPermission();
      if (!hasPermission || !isMounted) {
        if (!hasPermission) console.log('🔕 [Push] Permission denied');
        return;
      }

      // 3. Get Token
      const fcmToken = await getFCMToken();
      if (!fcmToken || !isMounted) return;

      // 4. Sync with Server
      // Sync может быть долгим, но он не вешает слушатели, так что тут ок
      await syncTokenWithServer(fcmToken, authToken);
      
      // ВАЖНО: Еще раз проверяем перед тем, как вешать слушатели
      if (!isMounted) return;

      // 5. Register Listeners & Collect Unsubscribes

      // A. Foreground Message
      const unsubOnMessage = messaging().onMessage(async (remoteMessage) => {
        console.log('📲 [Push] Foreground:', remoteMessage);
        if (remoteMessage.notification) {
          showNotification(
            remoteMessage.notification.title || 'Уведомление',
            remoteMessage.notification.body || ''
          );
        }
      });
      unsubscribes.push(unsubOnMessage);

      // B. Background App Open (Click)
      const unsubOnNotificationOpened = messaging().onNotificationOpenedApp(remoteMessage => {
        console.log('📲 [Push] Opened from background:', remoteMessage.notification);
        // Здесь можно добавить навигацию, например: router.push(...)
      });
      unsubscribes.push(unsubOnNotificationOpened);

      // C. Token Refresh (Auto)
      const unsubTokenRefresh = messaging().onTokenRefresh(async (newToken) => {
        console.log('🔄 [Push] Token refreshed automatically');
        // Тут isMounted уже не так важен, так как слушатель будет убит при unmount
        // Но для надежности можно проверить
        await syncTokenWithServer(newToken, authToken);
      });
      unsubscribes.push(unsubTokenRefresh);

      // D. Quit State (Cold Start) - это Promise, отписки не требует
      messaging().getInitialNotification().then(remoteMessage => {
        if (remoteMessage && isMounted) {
          console.log('📲 [Push] Opened from quit state:', remoteMessage.notification);
          // Здесь тоже логика навигации
        }
      });
    };

    init();

    // CLEANUP FUNCTION (Идеальная очистка)
    return () => {
      console.log('🧹 [Push] Cleaning up listeners');
      isMounted = false; // Отменяем все будущие действия в init
      unsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }, [authToken]); // Перезапуск только при смене юзера
};

// --- Helpers ---

const requestUserPermission = async () => {
  if (Platform.OS === 'android') {
    try {
      if (Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
      return true;
    } catch (error) {
      console.warn('[Push] Permission Error:', error);
      return false;
    }
  }
  
  const authStatus = await messaging().requestPermission();
  return (
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL
  );
};

const getFCMToken = async () => {
  try {
    return await messaging().getToken();
  } catch (error) {
    console.warn('[Push] GetToken Error:', error);
    return null;
  }
};

const syncTokenWithServer = async (fcmToken: string, authToken: string) => {
  try {
    const identityString = `${fcmToken}|${authToken}`; 
    const lastSentIdentity = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SENT_HASH);

    if (identityString === lastSentIdentity) {
      console.log('🔒 [Push] Token up-to-date. Skipping API.');
      return;
    }

    console.log('🔄 [Push] Syncing token with server...');
    
    // Формируем строку device_info
    const deviceInfo = `Version: ${Version}, Device Id: ${DeviceInfo.getDeviceId()}, Device Model: ${DeviceInfo.getModel()}, OS: ${DeviceInfo.getSystemName()} ${DeviceInfo.getSystemVersion()}`;

    await Api.post('/set-fcmtoken', {
      token: authToken,
      fcmtoken: fcmToken,
      device_info: deviceInfo
    });

    await AsyncStorage.setItem(STORAGE_KEYS.LAST_SENT_HASH, identityString);
    console.log('✅ [Push] Token synced successfully');

  } catch (error) {
    console.error('❌ [Push] Sync failed:', error);
  }
};