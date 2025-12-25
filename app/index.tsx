import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Platform, StatusBar, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Api from '../src/utils/Api';
import AuthScreen from '../src/screens/auth/AuthScreen';
import { getFCMToken } from '../src/utils/PushNotificationHelper';

export default function IndexScreen() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkInitialAuth = async () => {
      console.log('===========================================');
      console.log('IndexScreen: Starting initial auth check');
      console.log('===========================================');
      
      try {
        // Проверяем флаг "показать экран авторизации" (установлен при "Выйти")
        const showAuthScreen = await AsyncStorage.getItem('show_auth_screen');
        if (showAuthScreen === 'true') {
          console.log('🚪 User requested logout, showing AuthScreen');
          await AsyncStorage.removeItem('show_auth_screen');
          setIsChecking(false);
          return;
        }

        const token = await AsyncStorage.getItem('token');
        console.log('Token from storage:', token ? 'EXISTS' : 'NULL');
        
        if (!token) {
          // Нет токена - показываем AuthScreen
          console.log('✅ No token found, showing AuthScreen');
          setIsChecking(false);
          return;
        }

        // Токен есть - проверяем его статус
        console.log('📡 Token found, checking status with API...');
        const res = await Api.post('/get-session-data', { token });
        const data = res.data;
        
        console.log('========================================');
        console.log('INDEX SCREEN - Session data check:');
        console.log('data.session_data:', data.session_data);
        console.log('phone_inn_confirmed:', data.session_data?.user_data?.phone_inn_confirmed);
        console.log('user_confirmed:', data.session_data?.user_data?.user_confirmed);
        console.log('========================================');

        // Проверяем статус (значения могут быть строками или числами)
        const phoneInnConfirmed = data.session_data?.user_data?.phone_inn_confirmed;
        const userConfirmed = data.session_data?.user_data?.user_confirmed;
        
        if ((phoneInnConfirmed === 1 || phoneInnConfirmed === "1") &&
            (userConfirmed === 1 || userConfirmed === "1")) {
          // Пользователь полностью подтвержден - получаем FCM токен и переходим на главный экран
          console.log('✅ User confirmed, getting FCM token...');
          getFCMToken();
          console.log('✅ Navigating to AutoList');
          router.replace('/(authenticated)/auto-list' as any);
        } else if ((phoneInnConfirmed === 0 || phoneInnConfirmed === "0") ||
                   (userConfirmed === 0 || userConfirmed === "0")) {
          // Подтверждение телефона/ИНН или менеджера отозвано или ещё не получено
          // Показываем AuthScreen с модалкой ожидания подтверждения
          console.log('⚠️ User/Phone confirmation revoked/pending, showing AuthScreen with wait modal');
          console.log('Reason: phone_inn_confirmed =', phoneInnConfirmed, 'user_confirmed =', userConfirmed);
          // НЕ удаляем токен - он нужен AuthScreen для показа модалки ожидания
          setIsChecking(false);
        } else {
          // Другие случаи - редирект на AutoList
          console.log('✅ Navigating to AutoList (fallback)');
          router.replace('/(authenticated)/auto-list' as any);
        }
      } catch (error: any) {
        console.log('❌ Error checking auth state:', error);
        console.log('Error details:', error.message);
        setError(error.message);
        // При ошибке показываем AuthScreen
        setIsChecking(false);
      }
    };

    checkInitialAuth();
  }, []);

  // Функция очистки данных (только для разработки)
  const clearAppData = async () => {
    try {
      await AsyncStorage.clear();
      console.log('✅ App data cleared!');
      setIsChecking(false);
      setError(null);
    } catch (e) {
      console.log('❌ Error clearing app data:', e);
    }
  };

  // Пока проверяем - показываем загрузку или AuthScreen
  if (isChecking) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <View style={{ 
          flex: 1, 
          justifyContent: 'center', 
          alignItems: 'center', 
          backgroundColor: '#fff',
          paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0
        }}>
          <ActivityIndicator size="large" color="#3A8FD9" />
          {error && (
            <View style={{ marginTop: 20, padding: 20 }}>
              <Text style={{ color: 'red', fontSize: 14 }}>Error: {error}</Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // Если проверка завершилась и мы здесь - показываем AuthScreen
  console.log('✅ Rendering AuthScreen');
  return <AuthScreen />;
}
