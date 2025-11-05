import { PermissionsAndroid, Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Api from './Api';
import packageJson from '../../package.json';

const Version = packageJson.version;

// ———————————————————————————————————————
// Получение информации об устройстве
// ———————————————————————————————————————
export const getDeviceInfo = () => {
  const getDeviceId = DeviceInfo.getDeviceId();
  const deviceModel = DeviceInfo.getModel();
  const systemName = DeviceInfo.getSystemName();
  const systemVersion = DeviceInfo.getSystemVersion();

  const device_info = `Version: ${Version}, Device Id: ${getDeviceId}, Device Model: ${deviceModel}, OS: ${systemName}${systemVersion}`;
  console.log('device_info =', device_info);
  return device_info;
};

// ———————————————————————————————————————
// Разрешения на уведомления
// ———————————————————————————————————————
export const requestAndroidPermission = async () => {
  console.log('requestAndroidPermission');
  try {
    await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
    );
  } catch (err) {
    console.log('Error requesting Android permission:', err);
  }
};

export const requestUserPermission = async () => {
  console.log('requestUserPermission');
  try {
    if (Platform.OS === 'ios') {
      const authorizationStatus = await messaging().requestPermission();
      console.log('authorizationStatus:', authorizationStatus);
    } else {
      await requestAndroidPermission();
    }
  } catch (error) {
    console.log('Error in requestUserPermission:', error);
  }
};

// ———————————————————————————————————————
// Отправка токена на сервер
// ———————————————————————————————————————
export const setFCMToken = async (fcmtoken) => {
  console.log('setFCMToken');
  const token = await AsyncStorage.getItem('token');
  console.log('auth token:', token);
  console.log('fcmtoken:', fcmtoken);

  if (token && fcmtoken) {
    const device_info = getDeviceInfo();
    console.log('device_info:', device_info);

    try {
      const res = await Api.post('/set-fcmtoken', {
        token,
        fcmtoken,
        device_info,
      });
      console.log('set-fcmtoken response:', res.data);
    } catch (error) {
      console.log('Error setting fcmtoken:', error?.response?.status || error);
    }
  }
};

// ———————————————————————————————————————
// Получение и сохранение FCM токена (однократно)
// ———————————————————————————————————————
export const getFCMToken = async () => {
  console.log('getFCMToken');
  try {
    const storedToken = await AsyncStorage.getItem('fcmtoken');
    const newToken = await messaging().getToken();

    if (!storedToken || storedToken !== newToken) {
      console.log('Updating FCM token:', newToken);
      await AsyncStorage.setItem('fcmtoken', newToken);
      await setFCMToken(newToken);
    } else {
      console.log('FCM token unchanged');
    }

    // Обновление при изменении токена Firebase
    messaging().onTokenRefresh(async (token) => {
      console.log('FCM token refreshed:', token);
      await AsyncStorage.setItem('fcmtoken', token);
      await setFCMToken(token);
    });
  } catch (error) {
    console.log('Error in getFCMToken:', error);
  }
};

// ———————————————————————————————————————
// Слушатель уведомлений (инициализация один раз)
// ———————————————————————————————————————
let listenersInitialized = false;

export const NotificationListener = () => {
  if (listenersInitialized) return;
  listenersInitialized = true;

  console.log('NotificationListener initialized');

  // Обработка фоновых сообщений
  messaging().setBackgroundMessageHandler(async (remoteMessage) => {
    console.log('Background message handled:', remoteMessage);
  });

  // Когда приложение в фоне и пользователь нажал уведомление
  messaging().onNotificationOpenedApp((remoteMessage) => {
    console.log('Opened from background:', remoteMessage?.notification);
  });

  // Когда приложение было полностью закрыто и открыто через уведомление
  messaging()
    .getInitialNotification()
    .then((remoteMessage) => {
      if (remoteMessage) {
        console.log('Opened from quit state:', remoteMessage?.notification);
      }
    });

  // Когда приложение активно (foreground)
  messaging().onMessage(async (remoteMessage) => {
    console.log('Foreground message:', remoteMessage);
  });
};
