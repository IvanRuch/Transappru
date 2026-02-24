import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

export default function NetworkStatusBanner() {
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [visible, setVisible] = useState(false);
  const translateY = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    const handleOnline = () => {
      setIsConnected(true);
      if (visible) {
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }).start();

        setTimeout(() => {
          Animated.timing(translateY, {
            toValue: -100,
            duration: 300,
            useNativeDriver: false,
          }).start(() => setVisible(false));
        }, 2500);
      }
    };

    const handleOffline = () => {
      setIsConnected(false);
      setVisible(true);
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }).start();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check initial state
    if (!navigator.onLine) {
      handleOffline();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [visible]);

  if (!visible && isConnected) return null;

  return (
    <Animated.View style={[
      styles.banner,
      {
        transform: [{ translateY }],
        backgroundColor: isConnected ? '#4CAF50' : '#EE505A',
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
    paddingTop: 10,
    paddingBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
