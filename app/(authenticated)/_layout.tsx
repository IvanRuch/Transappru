import { useEffect, useState, useRef } from 'react';
import { AppState, AppStateStatus, View, ActivityIndicator } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Api from '../../src/utils/Api';

const AUTH_CHECK_INTERVAL = 30000;

export default function AuthenticatedLayout() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    checkAuth();
    
    // Запускаем периодическую проверку
    startPeriodicCheck();
    
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      subscription.remove();
    };
  }, []);

  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      console.log('App returned to foreground, checking user_confirmed...');
      checkUserConfirmed();
    }
    appState.current = nextAppState;
  };

  const startPeriodicCheck = () => {
    intervalRef.current = setInterval(() => {
      checkUserConfirmed();
    }, AUTH_CHECK_INTERVAL);
  };

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.log('🔒 [AuthenticatedLayout] No token found, redirecting to login');
        router.replace('/');
        return;
      }

      // Проверяем статус подтверждения
      console.log('🔒 [AuthenticatedLayout] Checking user status...');
      const res = await Api.post('/get-session-data', { token });
      const data = res.data;
      
      const userConfirmed = data.session_data?.user_data?.user_confirmed;
      const phoneInnConfirmed = data.session_data?.user_data?.phone_inn_confirmed;

      if ((userConfirmed === 0 || userConfirmed === "0") || 
          (phoneInnConfirmed === 0 || phoneInnConfirmed === "0")) {
        console.log('⚠️ [AuthenticatedLayout] User not confirmed, redirecting to Auth');
        router.replace('/');
      } else {
        console.log('✅ [AuthenticatedLayout] User confirmed, allowing access');
        setIsChecking(false);
      }

    } catch (error: any) {
      console.log('Auth check error:', error);
      if (error.response?.status === 401) {
         router.replace('/');
      } else {
         // Если ошибка сети, пускаем (или показываем экран ошибки, но пока пускаем, чтобы не блокировать оффлайн)
         // Но лучше проверить, есть ли кэш
         setIsChecking(false);
      }
    }
  };

  const checkUserConfirmed = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const res = await Api.post('/get-session-data', { token });
      const data = res.data;
      
      const userConfirmed = data.session_data?.user_data?.user_confirmed;
      
      if (userConfirmed === 0 || userConfirmed === "0") {
        console.log('⚠️ User confirmation revoked! Redirecting to auth...');
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        // Не удаляем токен здесь, пусть AuthScreen сам разберется или Api интерсептор
        router.replace('/');
      }
    } catch (error: any) {
      console.log('checkUserConfirmed error:', error.message);
      if (error.response?.status === 401) {
        router.replace('/');
      }
    }
  };

  if (isChecking) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#3A3A3A" />
      </View>
    );
  }

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
