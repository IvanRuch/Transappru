import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Api from '../../src/utils/Api';
import WebAppLayout from '../../src/components/web/WebAppLayout';

export default function AuthenticatedLayoutWeb() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkAuth();

    // На вебе нет AppState — слушаем visibilitychange вместо него
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkUserConfirmed();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        router.replace('/');
        return;
      }

      const res  = await Api.post('/get-session-data', { token });
      const data = res.data;

      const userConfirmed    = data.session_data?.user_data?.user_confirmed;
      const phoneInnConfirmed = data.session_data?.user_data?.phone_inn_confirmed;

      if (
        userConfirmed    === 0 || userConfirmed    === '0' ||
        phoneInnConfirmed === 0 || phoneInnConfirmed === '0'
      ) {
        router.replace('/');
      } else {
        setIsChecking(false);
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        router.replace('/');
      } else {
        // Ошибка сети — пускаем, экраны сами разберутся
        setIsChecking(false);
      }
    }
  };

  const checkUserConfirmed = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const res  = await Api.post('/get-session-data', { token });
      const data = res.data;

      const userConfirmed    = data.session_data?.user_data?.user_confirmed;
      const phoneInnConfirmed = data.session_data?.user_data?.phone_inn_confirmed;

      if (
        userConfirmed    === 0 || userConfirmed    === '0' ||
        phoneInnConfirmed === 0 || phoneInnConfirmed === '0'
      ) {
        router.replace('/');
      }
    } catch (error: any) {
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
    <WebAppLayout>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="main"                 options={{ title: 'Главная' }} />
        <Stack.Screen name="auto-list"            options={{ title: 'Автомобили' }} />
        <Stack.Screen name="charges"              options={{ title: 'Начисления' }} />
        <Stack.Screen name="profile"              options={{ title: 'Профиль' }} />
        <Stack.Screen name="services"             options={{ title: 'Услуги' }} />
        <Stack.Screen name="auto/[id]"            options={{ title: 'Автомобиль' }} />
        <Stack.Screen name="notification-settings" options={{ title: 'Настройки уведомлений' }} />
        <Stack.Screen name="fine-payment-confirm" options={{ title: 'Оплата штрафа' }} />
        <Stack.Screen name="fine-payment-webview" options={{ title: 'Оплата' }} />
        <Stack.Screen name="fine-payment-success" options={{ title: 'Успех' }} />
      </Stack>
    </WebAppLayout>
  );
}
