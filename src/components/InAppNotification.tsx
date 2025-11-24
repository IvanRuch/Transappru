import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Dimensions, Image, Platform, Vibration } from 'react-native';
import * as Haptics from 'expo-haptics';

interface InAppNotificationProps {
  title: string;
  body: string;
  visible: boolean;
  onDismiss: () => void;
}

const { width } = Dimensions.get('window');

export default function InAppNotification({ title, body, visible, onDismiss }: InAppNotificationProps) {
  const slideAnim = useRef(new Animated.Value(-150)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Тактильная обратная связь при появлении уведомления
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Vibration.vibrate(100);
      }

      // Показать уведомление с анимацией
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 8,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Автоматически скрыть через 5 секунд
      const timer = setTimeout(() => {
        hideNotification();
      }, 5000);

      return () => clearTimeout(timer);
    } else {
      hideNotification();
    }
  }, [visible]);

  const hideNotification = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -150,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.95}
        onPress={hideNotification}
        style={styles.notification}
      >
        {/* Иконка приложения */}
        <View style={styles.iconContainer}>
          <View style={styles.iconBackground}>
            <Image 
              source={require('../../assets/images/icon.png')} 
              style={styles.icon}
              resizeMode="contain"
              defaultSource={require('../../assets/images/icon.png')}
            />
          </View>
        </View>

        {/* Контент уведомления */}
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.appName}>TransApp</Text>
            <Text style={styles.time}>сейчас</Text>
          </View>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.body} numberOfLines={2}>
            {body}
          </Text>
        </View>

        {/* Индикатор закрытия */}
        <View style={styles.closeIndicator}>
          <View style={styles.closeLine} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 10,
    left: 12,
    right: 12,
    zIndex: 9999,
  },
  notification: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    paddingRight: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 12,
    // Добавляем тонкую границу для iOS-стиля
    borderWidth: Platform.OS === 'ios' ? 0.5 : 0,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  iconContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  iconBackground: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  icon: {
    width: 32,
    height: 32,
  },
  content: {
    flex: 1,
    paddingRight: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  appName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#656565',
    letterSpacing: -0.2,
  },
  time: {
    fontSize: 12,
    color: '#999999',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 3,
    letterSpacing: -0.3,
  },
  body: {
    fontSize: 14,
    color: '#3C3C43',
    lineHeight: 18,
    letterSpacing: -0.2,
  },
  closeIndicator: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 20,
    paddingTop: 4,
  },
  closeLine: {
    width: 3,
    height: 20,
    borderRadius: 2,
    backgroundColor: '#E5E5EA',
  },
});
