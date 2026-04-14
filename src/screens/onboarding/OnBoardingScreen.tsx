import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Platform, StatusBar, PermissionsAndroid } from 'react-native';

import { useOnboardingFlow } from '../../hooks/useOnboardingFlow';

export default function OnBoardingScreen() {
  const {
    slides,
    current,
    isLast,
    isLoading,
    markViewedAndNavigate,
    handleNext: hookHandleNext,
  } = useOnboardingFlow();

  const requestLocationPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Разрешение на доступ к местоположению',
            message: 'Приложению требуется доступ к вашему местоположению для работы с картой и заказа пропусков',
            buttonNeutral: 'Спросить позже',
            buttonNegative: 'Отмена',
            buttonPositive: 'OK',
          }
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          console.log('Location permission granted');
        } else {
          console.log('Location permission denied');
        }
      } catch (err) {
        console.warn('Error requesting location permission:', err);
      }
    }
  };

  const handleNext = async () => {
    if (isLast) {
      // Mobile-specific: request location permission before completing
      await requestLocationPermission();
      markViewedAndNavigate();
    } else {
      hookHandleNext();
    }
  };

  const slide = slides[current];

  return (
    <View style={styles.container}>
      <View style={styles.imageContainer}>
        <Image style={styles.image} source={slide.src} resizeMode="contain" />
      </View>

      <Text style={styles.description}>{slide.msg}</Text>

      <View style={styles.indicatorsContainer}>
        <View style={styles.indicatorsRow}>
          {slides.map((_, index) => (
            <Image
              key={index}
              style={styles.indicator}
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
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={handleNext}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'Загрузка...' : isLast ? 'Начать' : 'Далее'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageContainer: {
    position: 'absolute',
    backgroundColor: '#EEEEEE',
    borderRadius: 5,
    left: 20,
    right: 20,
    top: Platform.OS === 'ios' ? 70 : (StatusBar.currentHeight || 0) + 70,
    bottom: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    margin: 5,
    height: '90%',
  },
  description: {
    position: 'absolute',
    textAlign: 'center',
    bottom: 150,
    left: 20,
    right: 20,
    fontSize: 20,
    fontWeight: '600',
    color: '#313131',
  },
  indicatorsContainer: {
    position: 'absolute',
    bottom: 120,
    height: 10,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  indicatorsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  indicator: {
    margin: 5,
  },
  button: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
    height: 50,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3A3A3A',
  },
  buttonDisabled: {
    backgroundColor: '#7A7A7A',
    opacity: 0.6,
  },
  buttonText: {
    paddingLeft: 20,
    paddingRight: 20,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
