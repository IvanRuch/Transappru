import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Api from '../../src/utils/Api';

export default function AuthenticatedLayout() {
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.log('🔒 [AuthenticatedLayout] No token found, redirecting to login');
        router.replace('/');
      }
    } catch (error) {
      console.log('Auth check error:', error);
      router.replace('/');
    }
  };

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="main" options={{ title: 'Главная' }} />
      <Stack.Screen name="auto-list" options={{ title: 'Автомобили' }} />
      <Stack.Screen name="charges" options={{ title: 'Начисления' }} />
      <Stack.Screen name="profile" options={{ title: 'Профиль' }} />
      <Stack.Screen name="services" options={{ title: 'Услуги' }} />
      <Stack.Screen name="auto/[id]" options={{ title: 'Автомобиль' }} />
      
      {/* Экраны оплаты */}
      <Stack.Screen name="fine-payment-confirm" options={{ title: 'Оплата штрафа' }} />
      <Stack.Screen name="fine-payment-webview" options={{ title: 'Оплата' }} />
      <Stack.Screen name="fine-payment-success" options={{ title: 'Успех' }} />
    </Stack>
  );
}