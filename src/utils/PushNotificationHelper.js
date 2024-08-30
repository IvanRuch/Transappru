import {PermissionsAndroid, Platform} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import firebase from '@react-native-firebase/app';
import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';

import Api from "./Api";

const Version = '1.0.20';

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

  console.log('setFCMToken')

  let token = await AsyncStorage.getItem("token");
  console.log('token: ', token)

  if(token)
  {
    let device_info = getDeviceInfo();

    Api.post('/set-fcmtoken', { token: token, fcmtoken: fcmtoken, device_info: device_info })
       .then(res => {

          const data = res.data;
          console.log('data')
          console.log(data);

        })
        .catch(error => {
          console.log('error.response.status = ' + error.response.status);
        });
  }

}

export const getFCMToken = async () => {

  console.log('getFCMToken')

  let fcmtoken = await AsyncStorage.getItem("fcmtoken");

  console.log('old fcmtoken: ', fcmtoken)

  if(!fcmtoken)
  {
    console.log('no fcmtoken')

    try
    {
      let fcmtoken = await messaging().getToken();

      if(fcmtoken)
      {
        console.log('new fcmtoken: ', fcmtoken)
        await AsyncStorage.setItem("fcmtoken",fcmtoken);

        setFCMToken(fcmtoken);
      }
      else
      {
          console.log("empty token")
      }
    }
    catch(error)
    {
      console.log(error, "error in fcmtoken")
    }
  }
  
  if(fcmtoken)
  {
    setFCMToken(fcmtoken);
  }
}

export const NotificationListener = () => {

  console.log('NotificationListener')

  //
  messaging().setBackgroundMessageHandler(async (remoteMessage) => {
    console.log('setBackgroundMessageHandler: Message handled in the background', remoteMessage);
  });

  //
  messaging().onNotificationOpenedApp(remoteMessage => {
    console.log('onNotificationOpenedApp: When the application is running, but in the background.', remoteMessage.notification )
  });

  //
  messaging().getInitialNotification().then(remoteMessage => {
    if(remoteMessage)
    {
      console.log('getInitialNotification: When the application is opened from a quit state.', remoteMessage.notification )
    }
  });

  //
  messaging().onMessage(async remoteMessage => {
    console.log('notification on foreground state...', remoteMessage )
  });
}
