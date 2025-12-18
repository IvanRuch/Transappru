import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Platform, StatusBar, PermissionsAndroid } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import Api from '../../utils/Api';

interface Screen {
  msg: string;
  src: any;
}

const screens: Screen[] = [
  { msg: 'Добавляйте авто', src: require('../../../assets/images/onboarding1.png') },
  { msg: 'Проверяйте штрафы, ОСАГО, диагностические карты', src: require('../../../assets/images/onboarding2.png') },
  { msg: 'Заказывайте пропуска на транспорт', src: require('../../../assets/images/onboarding3.png') },
  { msg: 'Добавляйте файлы', src: require('../../../assets/images/onboarding4.png') },
];

export default function OnBoardingScreen() {
  const router = useRouter();
  const [current, setCurrent] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    console.log('OnBoarding DidMount');
    
    // Проверяем токен
    AsyncStorage.getItem('token').then(async (token) => {
      if (!token) {
        console.log('No token, redirect to Auth');
        router.replace('/');
        return;
      }

      try {
        const res = await Api.post('/get-onboarding', { token });
        console.log('Onboarding data:', res.data);
      } catch (error: any) {
        console.log('Error getting onboarding:', error);
        if (error.response?.status === 401) {
          router.replace('/');
        }
      }
    });
  }, []);

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
          console.log('✅ Location permission granted');
        } else {
          console.log('⚠️ Location permission denied');
        }
      } catch (err) {
        console.warn('Error requesting location permission:', err);
      }
    }
  };

  const handleNext = async () => {
    if (isLoading) {
      console.log('Already processing, ignoring tap');
      return;
    }
    
    console.log('tapNext, current:', current);
    
    if (current === screens.length - 1) {
      // Последний экран - запрашиваем разрешения и помечаем онбординг как просмотренный
      setIsLoading(true);
      
      try {
        // Запрашиваем разрешение на геолокацию
        await requestLocationPermission();
        
        const token = await AsyncStorage.getItem('token');
        if (token) {
          // Вызываем API для пометки онбординга как просмотренного
          await Api.post('/get-onboarding', { token });
          console.log('✅ Onboarding marked as viewed');
        }
        
        // Переходим к списку авто
        router.replace('/(authenticated)/auto-list');
      } catch (error) {
        console.log('⚠️ Error in onboarding completion:', error);
        setIsLoading(false);
      }
    } else {
      // Следующий экран
      setCurrent(current + 1);
    }
  };

  const currentScreen = screens[current];

  return (
    <View style={styles.container}>
      {/* Изображение */}
      <View style={styles.imageContainer}>
        <Image 
          style={styles.image} 
          source={currentScreen.src} 
          resizeMode='contain'
        />
      </View>

      {/* Текст описания */}
      <Text style={styles.description}>
        {currentScreen.msg}
      </Text>

      {/* Индикаторы (точки) */}
      <View style={styles.indicatorsContainer}>
        <View style={styles.indicatorsRow}>
          {screens.map((_, index) => (
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

      {/* Кнопка "Далее" */}
      <TouchableOpacity
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={handleNext}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'Загрузка...' : (current >= screens.length - 1 ? 'Начать' : 'Далее')}
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
