import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import api from '../services/api';

export function usePinConfirm() {
  const router = useRouter();

  const [modalVisible, setModalVisible] = useState(false);
  const [msg, setMsg] = useState('');
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    const checkCanGoBack = async () => {
      const savedToken = await AsyncStorage.getItem('saved_token_for_return');
      if (savedToken) setCanGoBack(true);
    };
    checkCanGoBack();
  }, []);

  const submitPin = useCallback(async (code: string) => {
    const token = await AsyncStorage.getItem('token');
    if (!token) return;

    try {
      const res = await api.post('/confirm-token', { token, code });
      const data = res.data;

      const needsOnboarding = data.onboarding_expired === 0 || data.onboarding_expired === '0';

      if (data.error === 1) {
        setMsg(data.msg);
        setModalVisible(true);
      } else {
        if (
          (data.phone_inn_bind === 1 || data.phone_inn_bind === '1') ||
          (data.is_manager === 1 || data.is_manager === '1')
        ) {
          if (needsOnboarding) {
            router.replace('/onboarding' as any);
          } else {
            router.replace('/(authenticated)/auto-list' as any);
          }
        } else {
          router.replace('/(authenticated)/inn' as any);
        }
      }
    } catch (error) {
      console.log('Error confirming PIN:', error);
    }
  }, [router]);

  const handleGoBack = useCallback(async () => {
    const savedToken = await AsyncStorage.getItem('saved_token_for_return');
    if (savedToken) {
      await AsyncStorage.setItem('token', savedToken);
      await AsyncStorage.removeItem('saved_token_for_return');
    }
    router.back();
  }, [router]);

  const handleChangeNumber = useCallback(async () => {
    await AsyncStorage.removeItem('token');
    router.replace('/');
  }, [router]);

  const closeErrorModal = useCallback(() => {
    setModalVisible(false);
    router.replace('/' as any);
  }, [router]);

  return {
    modalVisible,
    msg,
    canGoBack,
    submitPin,
    handleGoBack,
    handleChangeNumber,
    closeErrorModal,
  };
}
