import { useEffect, useState, useRef } from 'react';
import { Stack, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { LogBox, View, Text, StyleSheet, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FirebaseService } from '@/src/services/firebase';
import { NotificationProvider, useNotification } from '@/src/contexts/NotificationContext';
import { ThemeProvider } from '@/src/contexts/ThemeContext';
import InAppNotification from '@/src/components/InAppNotification';
import NetworkStatusBanner from '@/src/components/NetworkStatusBanner';
import { DynamicTitle } from '@/src/components/web/DynamicTitle';
import { usePushNotifications } from '@/src/hooks/usePushNotifications';
import '../global.css';

// Предотвращаем автоматическое скрытие splash screen
SplashScreen.preventAutoHideAsync();

// Скрываем предупреждения в dev режиме
if (__DEV__) {
  LogBox.ignoreLogs([
    'This method is deprecated (as well as all React Native Firebase namespaced API)',
    'React Native Firebase namespaced API',
    'SafeAreaView has been deprecated',
    'Firebase already initialized',
    'Failed to open file',
    'Ime callback not found',
    'Looks like you have configured linking in multiple places',
    'Tried to access onWindowFocusChange while context is not ready'
  ]);
}

export default function RootLayout() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const segments = useSegments();

  // Следим за изменением навигации, чтобы обновить токен (простая реактивность)
  useEffect(() => {
    const updateToken = async () => {
      const token = await AsyncStorage.getItem('token');
      if (token !== authToken) {
        console.log('🔑 Auth token updated in RootLayout');
        setAuthToken(token);
      }
    };
    updateToken();
  }, [segments]);

  useEffect(() => {
    async function prepare() {
      try {
        console.log('RootLayout mounted');
        
        // Firebase инициализируем один раз
        FirebaseService.initialize();
        
        setAppIsReady(true);
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
    // Показываем простой splash с текстом пока приложение загружается.
    // DynamicTitle рендерим уже здесь, чтобы и SSR-output, и сплеш-экран
    // имели корректный <title> во вкладке (на SSR appIsReady = false).
    return (
      <>
        <DynamicTitle />
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
      </>
    );
  }

  return (
    <ThemeProvider>
      <NotificationProvider>
        <AppContent token={authToken} />
      </NotificationProvider>
    </ThemeProvider>
  );
}

// Вынесли контент в отдельный компонент, чтобы использовать хук внутри провайдера
function AppContent({ token }: { token: string | null }) {
  // Подключаем пуш-уведомления с реактивным токеном
  usePushNotifications(token);

  return (
    <>
      <DynamicTitle />
      <NetworkStatusBanner />
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
    </>
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
