import {PermissionsAndroid, Platform} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';

import Api from "./Api";
import packageJson from '../../package.json';

const Version = packageJson.version;

export const getDeviceInfo = () => {

  // Get the device's model (e.g., iPhone X, Samsung Galaxy S10)
  let getDeviceId = DeviceInfo.getDeviceId();
  console.log('Device Id:', getDeviceId);

  // Get the device's model (e.g., iPhone X, Samsung Galaxy S10)
  let deviceModel = DeviceInfo.getModel();
  console.log('Device Model:', deviceModel);

  // Get the device's system name (e.g., iOS, Android)
  let systemName = DeviceInfo.getSystemName();
  console.log('System Name:', systemName);

  // Get the device's system version (e.g., 14.5, 11)
  let systemVersion = DeviceInfo.getSystemVersion();
  console.log('System Version:', systemVersion);

  let device_info = 'Version: ' + Version + ', Device Id: ' + getDeviceId + ', Device Model: ' + deviceModel + ', OS: ' + systemName + systemVersion;

  console.log('device_info = ' + device_info)

  return device_info;
}

export const requestAndroidPermission = () => {
  console.log('requestAndroidPermission')
  PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
}

export const requestUserPermission = async () => {

  console.log('requestUserPermission')

  if(Platform.OS === 'android')
  {
    //console.log('Platform.OS is android')
    //requestAndroidPermission();
  }
  else
  {
    console.log('Platform.OS is ' + Platform.OS)

    try
    {
      let authorizationStatus = await messaging().requestPermission();
  
      if (authorizationStatus) {
        console.log('authorizationStatus:', authorizationStatus);
      }
      else
      {
        console.log("empty authorizationStatus")
      }
    }
    catch(error)
    {
      console.log(error, "error in requestUserPermission")
    } 
  }
}

export const setFCMToken = async (fcmtoken) => {

  console.log('📤 setFCMToken - Sending token to server...')

  let token = await AsyncStorage.getItem("token");
  console.log('🔑 Auth token:', token ? 'EXISTS' : 'NOT FOUND')

  if(token)
  {
    let device_info = getDeviceInfo();

    console.log('📱 Device info:', device_info)
    console.log('🔔 FCM token to send:', fcmtoken)

    Api.post('/set-fcmtoken', { token: token, fcmtoken: fcmtoken, device_info: device_info })
       .then(res => {

          const data = res.data;
          console.log('✅ FCM token sent successfully to server')
          console.log('Server response:', data);

        })
        .catch(error => {
          console.log('❌ Error sending FCM token to server:', error.response?.status || error.message);
          if(error.response?.data) {
            console.log('Error details:', error.response.data);
          }
        });
  }
  else
  {
    console.log('⚠️ Cannot send FCM token: no auth token found')
  }

}

export const getFCMToken = async () => {

  console.log('========================================')
  console.log('🔔 getFCMToken - Starting...')
  console.log('========================================')

  let fcmtoken = await AsyncStorage.getItem("fcmtoken");

  console.log('📱 Cached FCM token:', fcmtoken || 'NOT FOUND')

  if(!fcmtoken)
  {
    console.log('⚠️ No cached token, requesting new one from Firebase...')

    try
    {
      let fcmtoken = await messaging().getToken();

      if(fcmtoken)
      {
        console.log('========================================')
        console.log('✅ NEW FCM TOKEN RECEIVED:')
        console.log(fcmtoken)
        console.log('========================================')
        await AsyncStorage.setItem("fcmtoken",fcmtoken);

        setFCMToken(fcmtoken);
      }
      else
      {
          console.log("❌ Empty token received from Firebase")
      }
    }
    catch(error)
    {
      console.log('❌ Error getting FCM token:', error)
    }
  }
  else
  {
    console.log('========================================')
    console.log('✅ USING CACHED FCM TOKEN:')
    console.log(fcmtoken)
    console.log('========================================')
  }
  
  if(fcmtoken)
  {
    setFCMToken(fcmtoken);
  }
}

let listenersInitialized = false;

export const NotificationListener = () => {
  if (listenersInitialized) {
    console.log('⚠️ NotificationListener already initialized, skipping...');
    return;
  }

  listenersInitialized = true;

  console.log('========================================')
  console.log('🔔 NotificationListener - Registering...')
  console.log('========================================')

  try {
    // Когда приложение в фоне и пользователь нажимает на уведомление
    const unsubscribeOnNotificationOpenedApp = messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('========================================')
      console.log('📲 NOTIFICATION OPENED (Background)')
      console.log('Title:', remoteMessage.notification?.title)
      console.log('Body:', remoteMessage.notification?.body)
      console.log('Data:', remoteMessage.data)
      console.log('========================================')
    });

    // Когда приложение открывается из закрытого состояния через уведомление
    messaging().getInitialNotification().then(remoteMessage => {
      if(remoteMessage)
      {
        console.log('========================================')
        console.log('📲 NOTIFICATION OPENED (Quit State)')
        console.log('Title:', remoteMessage.notification?.title)
        console.log('Body:', remoteMessage.notification?.body)
        console.log('Data:', remoteMessage.data)
        console.log('========================================')
      }
    });

    // Когда приложение открыто и приходит уведомление
    const unsubscribeOnMessage = messaging().onMessage(async remoteMessage => {
      console.log('========================================')
      console.log('📲 NOTIFICATION RECEIVED (Foreground)')
      console.log('Title:', remoteMessage.notification?.title)
      console.log('Body:', remoteMessage.notification?.body)
      console.log('Data:', remoteMessage.data)
      console.log('========================================')
      
      // Показываем уведомление через глобальный обработчик
      if (remoteMessage.notification && global.showInAppNotification) {
        global.showInAppNotification(
          remoteMessage.notification.title || 'Уведомление',
          remoteMessage.notification.body || ''
        );
      }
    });
    
    console.log('✅ Notification listeners registered successfully');
    
    // Возвращаем функцию для отписки (опционально)
    return () => {
      unsubscribeOnNotificationOpenedApp();
      unsubscribeOnMessage();
    };
  } catch (error) {
    console.log('❌ Error registering notification listeners:', error);
  }
}
