/**
 * Web version of OnBoardingScreen.
 *
 * Desktop (≥768px): image on the left, text + navigation on the right.
 * Mobile web (<768px): stacked — image above, text + nav below.
 * No location permission request on web (browser handles geolocation on demand).
 */
import React from 'react';
import { View, Text, Image, Pressable, useWindowDimensions } from 'react-native';

import { useOnboardingFlow } from '../../hooks/useOnboardingFlow';

export default function OnBoardingScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const {
    slides, current, setCurrent, isLast, isLoading,
    handleNext, handleSkip,
  } = useOnboardingFlow(() => {
    // Web-only: backup flag in localStorage so other tabs won't redirect.
    try { localStorage.setItem('ta_onboarding_done', '1'); } catch { /* ignore */ }
  });

  const slide = slides[current];

  const dots = (
    <View className="flex-row items-center justify-center mb-8">
      {slides.map((_, i) => (
        <Pressable key={i} onPress={() => setCurrent(i)} accessibilityRole="button" accessibilityLabel={`Перейти к слайду ${i + 1}`}>
          <View
            className={`mx-1.5 rounded-full ${
              i === current ? 'w-3 h-3 bg-accent-secondary' : 'w-2.5 h-2.5 bg-[#C0C0C0]'
            }`}
          />
        </Pressable>
      ))}
    </View>
  );

  const textPanel = (
    <View className="items-center w-full max-w-[400px] self-center">
      <Text className="text-2xl font-bold text-text-primary text-center mb-8 leading-8 select-none">
        {slide.msg}
      </Text>

      {dots}

      <Pressable
        className={`w-full h-[50px] rounded-lg items-center justify-center mb-4 cursor-pointer ${
          isLoading ? 'bg-[#7A7A7A] opacity-60' : 'bg-accent-secondary'
        }`}
        onPress={handleNext}
        disabled={isLoading}
        accessibilityRole="button"
        accessibilityLabel={isLast ? 'Начать' : 'Далее'}
        accessibilityState={{ disabled: isLoading, busy: isLoading }}
      >
        <Text className="text-base font-semibold text-white select-none">
          {isLoading ? 'Загрузка...' : isLast ? 'Начать' : 'Далее'}
        </Text>
      </Pressable>

      {!isLast && (
        <Pressable
          onPress={handleSkip}
          className="p-2 cursor-pointer"
          accessibilityRole="button"
          accessibilityLabel="Пропустить"
        >
          <Text className="text-sm text-text-muted underline select-none">Пропустить</Text>
        </Pressable>
      )}
    </View>
  );

  return (
    <View className="flex-1 bg-[#F0F2F5]">
      {isDesktop ? (
        <View className="flex-1 flex-row">
          <View className="flex-1 bg-bg-secondary items-center justify-center p-10">
            <Image
              source={slide.src}
              resizeMode="contain"
              style={{ width: '90%', height: '90%', maxWidth: 700, maxHeight: 800 }}
            />
          </View>
          <View className="flex-1 items-center justify-center px-12 py-10">
            {textPanel}
          </View>
        </View>
      ) : (
        <View className="flex-1 px-5 py-10">
          <View className="flex-1 bg-bg-secondary rounded-2xl items-center justify-center p-5 mb-6">
            <Image
              source={slide.src}
              resizeMode="contain"
              style={{ width: '90%', height: '90%' }}
            />
          </View>
          {textPanel}
        </View>
      )}
    </View>
  );
}
