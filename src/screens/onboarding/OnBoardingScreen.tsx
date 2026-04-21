import React from 'react';
import { View, Text, Image, TouchableOpacity, Platform, StatusBar, PermissionsAndroid } from 'react-native';

import { useOnboardingFlow } from '../../hooks/useOnboardingFlow';

export default function OnBoardingScreen() {
  const {
    slides, current, isLast, isLoading,
    markViewedAndNavigate, handleNext: hookHandleNext,
  } = useOnboardingFlow();

  const requestLocationPermission = async () => {
    if (Platform.OS !== 'android') return;
    try {
      await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Разрешение на доступ к местоположению',
          message: 'Приложению требуется доступ к вашему местоположению для работы с картой и заказа пропусков',
          buttonNeutral: 'Спросить позже',
          buttonNegative: 'Отмена',
          buttonPositive: 'OK',
        },
      );
    } catch { /* ignore — onboarding still completes */ }
  };

  const handleNext = async () => {
    if (isLast) {
      await requestLocationPermission();
      markViewedAndNavigate();
    } else {
      hookHandleNext();
    }
  };

  const slide = slides[current];
  const imageTop = Platform.OS === 'ios' ? 70 : (StatusBar.currentHeight || 0) + 70;

  return (
    <View className="flex-1 bg-white items-center justify-center">
      <View
        className="absolute left-5 right-5 bottom-[220px] bg-bg-secondary rounded items-center justify-center"
        style={{ top: imageTop }}
      >
        <Image source={slide.src} resizeMode="contain" style={{ margin: 5, height: '90%' }} />
      </View>

      <Text className="absolute bottom-[150px] left-5 right-5 text-center text-xl font-semibold text-text-primary">
        {slide.msg}
      </Text>

      <View className="absolute bottom-[120px] left-5 right-5 h-2.5 items-center">
        <View className="flex-1 flex-row items-center">
          {slides.map((_, index) => (
            <Image
              key={index}
              style={{ margin: 5 }}
              source={
                index === current
                  ? require('../../../assets/images/ellipse_active_2.png')
                  : require('../../../assets/images/ellipse_2.png')
              }
            />
          ))}
        </View>
      </View>

      <TouchableOpacity
        className={`absolute bottom-[50px] left-5 right-5 h-[50px] rounded items-center justify-center ${
          isLoading ? 'bg-[#7A7A7A] opacity-60' : 'bg-accent-secondary'
        }`}
        onPress={handleNext}
        disabled={isLoading}
        accessibilityRole="button"
        accessibilityLabel={isLast ? 'Начать' : 'Далее'}
        accessibilityState={{ disabled: isLoading, busy: isLoading }}
      >
        <Text className="px-5 text-sm font-bold text-white">
          {isLoading ? 'Загрузка...' : isLast ? 'Начать' : 'Далее'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
