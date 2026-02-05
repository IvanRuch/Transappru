import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Platform, StatusBar } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function NetworkStatusBanner() {
  const [isConnected, setIsConnected] = useState<boolean | null>(true);
  const [visible, setVisible] = useState(false);
  const translateY = useRef(new Animated.Value(-100)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    // Подписываемся на изменения сети
    const unsubscribe = NetInfo.addEventListener(state => {
      // isConnected может быть null при инициализации
      const connected = state.isConnected !== false;
      console.log('🌐 Network state changed:', connected);
      
      setIsConnected(connected);
      
      if (!connected) {
        // Показываем плашку (Красная)
        setVisible(true);
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      } else if (connected && visible) {
        // Показываем плашку (Зеленая) временно, потом убираем
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();

        setTimeout(() => {
          Animated.timing(translateY, {
            toValue: -100,
            duration: 300,
            useNativeDriver: true,
          }).start(() => setVisible(false));
        }, 2500);
      }
    });

    return () => unsubscribe();
  }, [visible]);

  if (!visible && isConnected) return null;

  // Определяем безопасный отступ сверху
  // insets.top дает высоту статус-бара
  // Добавляем немного padding для красоты
  const safePaddingTop = Math.max(insets.top, StatusBar.currentHeight || 0) + 8;

  return (
    <Animated.View style={[
      styles.banner, 
      { 
        transform: [{ translateY: translateY }],
        paddingTop: safePaddingTop,
        backgroundColor: isConnected ? '#4CAF50' : '#EE505A'
      }
    ]}>
      <Text style={styles.text}>
        {isConnected ? 'Соединение восстановлено' : 'Отсутствует интернет-соединение'}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  }
});