import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { LogBox } from 'react-native';
import { FirebaseService } from '@/src/services/firebase';

// Предотвращаем автоматическое скрытие splash screen
SplashScreen.preventAutoHideAsync();

// Скрываем предупреждения Expo в dev режиме (опционально)
if (__DEV__) {
  LogBox.ignoreAllLogs(false); // Можно установить true чтобы скрыть все логи
}

export default function RootLayout() {
  useEffect(() => {
    console.log('RootLayout mounted');
    console.log('Setting up Firebase...');

    // Инициализация Firebase при запуске приложения
    FirebaseService.initialize(); // Инициализируем Firebase сначала
    FirebaseService.requestPermission();
    FirebaseService.setupNotificationListeners();

    // Скрываем splash screen сразу после инициализации
    SplashScreen.hideAsync();
  }, []);

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
