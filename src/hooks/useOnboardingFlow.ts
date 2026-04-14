import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import api from '../services/api';

export interface Slide {
  msg: string;
  src: any;
}

const slides: Slide[] = [
  { msg: 'Добавляйте авто', src: require('../../assets/images/onboarding1.png') },
  { msg: 'Проверяйте штрафы, ОСАГО, диагностические карты', src: require('../../assets/images/onboarding2.png') },
  { msg: 'Заказывайте пропуска на транспорт', src: require('../../assets/images/onboarding3.png') },
  { msg: 'Добавляйте файлы', src: require('../../assets/images/onboarding4.png') },
];

/**
 * Shared onboarding logic for mobile and web.
 * @param onComplete — optional callback invoked after the API call (e.g. localStorage flag for web)
 */
export function useOnboardingFlow(onComplete?: () => void) {
  const router = useRouter();
  const [current, setCurrent] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const isLast = current === slides.length - 1;

  /** Mark onboarding as viewed via API, run onComplete, navigate to auto-list. */
  const markViewedAndNavigate = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) { router.replace('/'); return; }

      await api.post('/get-onboarding', { token });
      console.log('Onboarding: marked as viewed');
      if (onComplete) onComplete();
    } catch (error: any) {
      console.log('Error marking onboarding:', error);
      if (error.response?.status === 401) { router.replace('/'); return; }
      // Even if API fails, complete to avoid infinite loop
      if (onComplete) onComplete();
    }
    router.replace('/(authenticated)/auto-list');
  }, [isLoading, router, onComplete]);

  /** Go to next slide, or mark viewed + navigate on last slide. */
  const handleNext = useCallback(() => {
    if (isLast) {
      markViewedAndNavigate();
    } else {
      setCurrent(prev => prev + 1);
    }
  }, [isLast, markViewedAndNavigate]);

  /** Skip all slides — mark viewed + navigate immediately. */
  const handleSkip = useCallback(() => {
    markViewedAndNavigate();
  }, [markViewedAndNavigate]);

  return {
    slides,
    current,
    setCurrent,
    isLast,
    isLoading,
    handleNext,
    handleSkip,
    markViewedAndNavigate,
  };
}
