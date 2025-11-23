import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AuthenticatedLayout() {
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    // Проверяем авторизацию при загрузке
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      
      // Если токена нет и мы в защищенной зоне - редирект на авторизацию
      if (!token) {
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
      <Stack.Screen name="profile" options={{ title: 'Профиль' }} />
      <Stack.Screen name="services" options={{ title: 'Услуги' }} />
      <Stack.Screen name="auto/[id]" options={{ title: 'Автомобиль' }} />
    </Stack>
  );
}
