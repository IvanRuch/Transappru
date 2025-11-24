import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { LogBox, View, Text, StyleSheet, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FirebaseService } from '@/src/services/firebase';
import { NotificationProvider, useNotification } from '@/src/contexts/NotificationContext';
import InAppNotification from '@/src/components/InAppNotification';

// Предотвращаем автоматическое скрытие splash screen
SplashScreen.preventAutoHideAsync();

// Скрываем предупреждения в dev режиме (опционально)
if (__DEV__) {
  LogBox.ignoreLogs([
    'This method is deprecated',
    'React Native Firebase namespaced API',
    'Firebase already initialized',
    'Failed to open file',
    'Ime callback not found',
    'Looks like you have configured linking in multiple places',
    'SafeAreaView has been deprecated',
    'Tried to access onWindowFocusChange while context is not ready'
  ]);
}

export default function RootLayout() {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        console.log('RootLayout mounted');
        
        // Быстро помечаем приложение готовым, чтобы не задерживать UI
        setAppIsReady(true);
        
        // Firebase инициализируем асинхронно в фоне
        console.log('Setting up Firebase in background...');
        setTimeout(() => {
          try {
            FirebaseService.initialize();
            FirebaseService.requestPermission();
            FirebaseService.setupNotificationListeners();
          } catch (e) {
            console.warn('Error during Firebase initialization:', e);
          }
        }, 100);
      } catch (e) {
        console.warn('Error during app initialization:', e);
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  useEffect(() => {
    if (appIsReady) {
      // Скрываем splash screen сразу
      SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    // Показываем простой splash с текстом пока приложение загружается
    return (
      <SafeAreaView style={styles.splashContainer}>
        <View style={{ 
          flex: 1, 
          alignItems: 'center', 
          justifyContent: 'center',
          paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0
        }}>
          <Text style={styles.splashTitle}>TransApp</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <NotificationProvider>
      <NotificationOverlay />
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Авторизация' }} />
        <Stack.Screen name="pin" options={{ title: 'Ввод PIN' }} />
        <Stack.Screen name="onboarding" options={{ title: 'Обучение' }} />
        <Stack.Screen name="user" options={{ title: 'Профиль' }} />
        <Stack.Screen name="(authenticated)" options={{ headerShown: false }} />
      </Stack>
    </NotificationProvider>
  );
}

// Компонент для отображения уведомлений поверх всего
function NotificationOverlay() {
  const { notification, visible, hideNotification, showNotification } = useNotification();
  
  // Регистрируем глобальный обработчик для показа уведомлений
  useEffect(() => {
    (global as any).showInAppNotification = showNotification;
    
    return () => {
      delete (global as any).showInAppNotification;
    };
  }, [showNotification]);
  
  if (!notification) return null;
  
  return (
    <InAppNotification
      title={notification.title}
      body={notification.body}
      visible={visible}
      onDismiss={hideNotification}
    />
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashTitle: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#000000',
    letterSpacing: 2,
  },
});
