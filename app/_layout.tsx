import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { LogBox, View, Text, StyleSheet } from 'react-native';
import { FirebaseService } from '@/src/services/firebase';

// Предотвращаем автоматическое скрытие splash screen
SplashScreen.preventAutoHideAsync();

// Скрываем предупреждения в dev режиме (опционально)
if (__DEV__) {
  LogBox.ignoreLogs([
    'This method is deprecated',
    'React Native Firebase namespaced API',
    'Firebase already initialized'
  ]);
}

export default function RootLayout() {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        console.log('RootLayout mounted');
        console.log('Setting up Firebase...');

        // Инициализация Firebase при запуске приложения
        FirebaseService.initialize();
        FirebaseService.requestPermission();
        FirebaseService.setupNotificationListeners();
      } catch (e) {
        console.warn('Error during app initialization:', e);
      } finally {
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
      <View style={styles.splashContainer}>
        <Text style={styles.splashTitle}>TransApp</Text>
      </View>
    );
  }

  return (
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
