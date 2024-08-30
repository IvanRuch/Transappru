import 'react-native-gesture-handler';
import React, {useEffect} from 'react';
import { StyleSheet, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import Auth from './Auth';
import Pin from './Pin';
import Inn from './Inn';
import Main from './Main';
import AutoList from './AutoList';
import Auto from './Auto';
import AutoFine from './AutoFine';
import User from './User';
import DelUser from './DelUser';
import InviteUser from './InviteUser';
import AutoDriver from './AutoDriver';
import Pass from './Pass';
import PassYaMap from './PassYaMap';
import DriverList from './DriverList';
import OnBoarding from './OnBoarding';
import NotificationList from './NotificationList';
import { requestAndroidPermission, requestUserPermission, NotificationListener } from './utils/PushNotificationHelper';

const Stack = createStackNavigator();

//function App() {
class App extends React.Component {

  componentDidMount() {
    console.log('App DidMount')

    if(Platform.OS === 'android')
    {
      console.log('Platform.OS is android')
      requestAndroidPermission();
    }
    else
    {
      console.log('Platform.OS is ' + Platform.OS)
      requestUserPermission();
    }

    /*
    const setUpCloudMessaging = async () => {
      requestUserPermission();
    };

    setUpCloudMessaging();
    */

    //GetFCMToken();
    NotificationListener();
  }

  render() {
    return (
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerShown: false
          }}
        >
          <Stack.Screen
            name="AutoList"
            component={AutoList}
          />
          <Stack.Screen
            name="Main"
            component={Main}
          />
          <Stack.Screen
            name="Auto"
            component={Auto}
          />
          <Stack.Screen
            name="AutoFine"
            component={AutoFine}
          />
          <Stack.Screen
            name="User"
            component={User}
          />
          <Stack.Screen
            name="DelUser"
            component={DelUser}
          />
          <Stack.Screen
            name="InviteUser"
            component={InviteUser}
          />
          <Stack.Screen
            name="AutoDriver"
            component={AutoDriver}
          />
          <Stack.Screen
            name="Pass"
            component={Pass}
          />
          <Stack.Screen
            name="PassYaMap"
            component={PassYaMap}
          />
          <Stack.Screen
            name="DriverList"
            component={DriverList}
          />

          <Stack.Screen
            name="Auth"
            component={Auth}
          />
          <Stack.Screen
            name="Pin"
            component={Pin}
          />
          <Stack.Screen
            name="Inn"
            component={Inn}
          />

          <Stack.Screen
            name="OnBoarding"
            component={OnBoarding}
          />
          <Stack.Screen
            name="NotificationList"
            component={NotificationList}
          />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }
}

export default App;