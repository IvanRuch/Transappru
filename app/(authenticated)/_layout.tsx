import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Api from '../../src/utils/Api';

const AUTH_CHECK_INTERVAL = 30000; // Проверка каждые 30 секунд

export default function AuthenticatedLayout() {
  const router = useRouter();
  const segments = useSegments();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    // Проверяем авторизацию при загрузке
    checkAuth();
    
    // Запускаем периодическую проверку user_confirmed
    startPeriodicCheck();
    
    // Слушаем изменения состояния приложения (foreground/background)
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      // Очищаем интервал при размонтировании
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      subscription.remove();
    };
  }, []);

  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    // Когда приложение возвращается из фона - проверяем статус
    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      console.log('App returned to foreground, checking user_confirmed...');
      checkUserConfirmed();
    }
    appState.current = nextAppState;
  };

  const startPeriodicCheck = () => {
    // Периодическая проверка user_confirmed
    intervalRef.current = setInterval(() => {
      checkUserConfirmed();
    }, AUTH_CHECK_INTERVAL);
  };

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

  const checkUserConfirmed = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        router.replace('/');
        return;
      }

      const res = await Api.post('/get-session-data', { token });
      const data = res.data;
      
      const userConfirmed = data.session_data?.user_data?.user_confirmed;
      
      if (userConfirmed === 0 || userConfirmed === "0") {
        console.log('⚠️ User confirmation revoked! Redirecting to auth...');
        // Останавливаем интервал
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        // Удаляем токен и редиректим
        await AsyncStorage.removeItem('token');
        router.replace('/');
      }
    } catch (error: any) {
      console.log('checkUserConfirmed error:', error.message);
      // При 401 ошибке - редирект на авторизацию
      if (error.response?.status === 401) {
        await AsyncStorage.removeItem('token');
        router.replace('/');
      }
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
    </Stack>
  );
}
