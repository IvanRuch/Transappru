import { useState, useRef, useCallback } from 'react';
import { Animated } from 'react-native';

export function useAutoUI() {
  // Анимация пульсации
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const pulseDuration = 800;
  const pulseFontSize = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [14, 17]
  });
  const pulseAnimation = useRef<any>(null);

  // Состояние модальных окон
  const [ourServicesVisible, setOurServicesVisible] = useState(false);
  const [announceOurServicesVisible, setAnnounceOurServicesVisible] = useState(false);
  const [menuLeftVisible, setMenuLeftVisible] = useState(false);
  const [findAutoVisible, setFindAutoVisible] = useState(false);
  
  // Запуск анимации
  const startPulseAnimation = useCallback(() => {
    pulseAnimation.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: pulseDuration,
          useNativeDriver: false,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: pulseDuration,
          useNativeDriver: false,
        }),
      ])
    );
    pulseAnimation.current.start();
  }, [pulseAnim, pulseDuration]);

  // Остановка анимации
  const stopPulseAnimation = useCallback(() => {
    if (pulseAnimation.current) {
      pulseAnimation.current.stop();
    }
  }, []);

  return {
    // UI State
    ourServicesVisible,
    setOurServicesVisible,
    announceOurServicesVisible,
    setAnnounceOurServicesVisible,
    menuLeftVisible,
    setMenuLeftVisible,
    findAutoVisible,
    setFindAutoVisible,
    
    // Animation
    pulseAnim,
    pulseFontSize,
    startPulseAnimation,
    stopPulseAnimation,
  };
}
