import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { FirebaseService } from '@/src/services/firebase';

export default function RootLayout() {
  useEffect(() => {
    console.log('RootLayout mounted');
    console.log('Setting up Firebase...');

    // Инициализация Firebase при запуске приложения
    FirebaseService.initialize(); // Инициализируем Firebase сначала
    FirebaseService.requestPermission();
    FirebaseService.setupNotificationListeners();
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
