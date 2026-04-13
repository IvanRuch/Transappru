import { useState, useRef, useCallback } from 'react';
import { Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import api from '../services/api';
import { useAutoData } from './useAutoData';
import type { AutoItem } from '../types/auto';

export function useAutoList() {
  const router = useRouter();

  // Подключаем хук данных
  const dataHook = useAutoData();
  
  // Анимация пульсации
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const pulseDuration = 800;
  const pulseFontSize = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [14, 17]
  });
  const pulseAnimation = useRef<any>(null);

  // UI State
  const [markedCnt, setMarkedCnt] = useState(0);
  
  // Отметить/снять отметку с элемента
  const markItem = useCallback((item: AutoItem, index: number) => {
    // Обновляем элемент через хук данных
    dataHook.updateAutoItem(item.id, { marked: !item.marked });
    
    // Пересчитываем количество (немного неоптимально, но надежно)
    // В идеале markedCnt должен быть вычисляемым свойством в useAutoData
    setTimeout(() => {
        const cnt = dataHook.autoList.filter(a => a.id !== item.id ? a.marked : !item.marked).length;
        setMarkedCnt(cnt);
    }, 0);
  }, [dataHook.autoList, dataHook.updateAutoItem]);

  // Сброс выделения
  const undoSelect = useCallback(() => {
    dataHook.autoList.forEach(item => {
        if (item.marked) dataHook.updateAutoItem(item.id, { marked: false });
    });
    setMarkedCnt(0);
  }, [dataHook.autoList, dataHook.updateAutoItem]);

  // Запуск анимации пульсации
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

  const stopPulseAnimation = useCallback(() => {
    if (pulseAnimation.current) {
      pulseAnimation.current.stop();
    }
  }, []);

  // Закрытие модального окна "Наши услуги"
  const closeAnnounceOurServices = useCallback(async () => {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      router.replace('/');
      return;
    }

    try {
      await api.post('/get-announce-our-services', { token });
      dataHook.setAnnounceOurServicesVisible(false);
    } catch (error: any) {
      if (error.response?.status === 401) router.replace('/');
    }
  }, [router]);

  // Обертки для совместимости с UI
  const changeAutoStr = (val: string) => dataHook.setFilterValue('autoStr', val);
  const clearAutoStr = () => dataHook.setFilterValue('autoStr', '');
  const clearAllFilters = () => dataHook.clearFilters();
  
  const toggleAutoCancelled = () => dataHook.setFilterValue('autoCancelled', !dataHook.filters.autoCancelled);
  const toggleAutoPassEnded = () => dataHook.setFilterValue('autoPassEnded', !dataHook.filters.autoPassEnded);
  const toggleAutoPassEnds = () => dataHook.setFilterValue('autoPassEnds', !dataHook.filters.autoPassEnds);

  const changeAutoPassEndsUntilDate = (val: string) => {
    // Форматирование даты
    let value_new = val.replace(/[^0-9]/g, '');
    if (value_new.length >= 3) value_new = value_new.slice(0, 2) + '.' + value_new.slice(2);
    if (value_new.length >= 6) value_new = value_new.slice(0, 5) + '.' + value_new.slice(5, 9);

    if (value_new.length === 0) {
      dataHook.setFilterValues({ autoPassEndsUntilDate: value_new, autoPassEnds: false });
    } else if (value_new.length === 10) {
      dataHook.setFilterValues({ autoPassEndsUntilDate: value_new, autoPassEnds: true });
    } else {
      dataHook.setFilterValue('autoPassEndsUntilDate', value_new);
    }
  };

  // Показать/скрыть детали (вкладки)
  const showHideTab = useCallback((tabName: string, index: number) => {
    const item = dataHook.autoList[index];
    if (!item) return;

    const updates: any = {
        check_fines_tab_show: 0,
        check_avtodor_tab_show: 0,
        check_osago_tab_show: 0,
        check_diagnostic_card_tab_show: 0,
        check_rnis_tab_show: 0,
        status_tab_show: 0
    };

    // Если вкладка была закрыта - открываем её
    const keyMap: Record<string, string> = {
        'fines': 'check_fines_tab_show',
        'avtodor': 'check_avtodor_tab_show',
        'osago': 'check_osago_tab_show',
        'diagnostic_card': 'check_diagnostic_card_tab_show',
        'rnis': 'check_rnis_tab_show',
        'status': 'status_tab_show'
    };

    const key = keyMap[tabName];
    if (key && (item as any)[key] !== 1) {
        updates[key] = 1;
    }

    dataHook.updateAutoItem(item.id, updates);
  }, [dataHook.autoList, dataHook.updateAutoItem]);

  // Проверка активности фильтров для UI
  const hasActiveFilters = () => {
    const f = dataHook.filters;
    return f.autoStr.length >= 3 || f.autoCancelled || f.autoPassEnded || f.autoPassEnds;
  };

  const getActiveFiltersText = () => {
    const f = dataHook.filters;
    const list = [];
    if (f.autoStr.length >= 3) list.push(`Номер: ${f.autoStr}`);
    if (f.autoCancelled) list.push('Аннулирован');
    if (f.autoPassEnded) list.push('Закончился');
    if (f.autoPassEnds) list.push(`До: ${f.autoPassEndsUntilDate}`);
    return list;
  };

  return {
    // Проксируем данные из dataHook
    ...dataHook,

    // UI State
    markedCnt,
    pulseAnim,
    pulseFontSize,
    
    // UI Methods
    markItem,
    undoSelect,
    startPulseAnimation,
    stopPulseAnimation,
    closeAnnounceOurServices,

    // Filter Wrappers
    changeAutoStr,
    clearAutoStr,
    clearAllFilters,
    toggleAutoCancelled,
    toggleAutoPassEnded,
    toggleAutoPassEnds,
    changeAutoPassEndsUntilDate,

    // Helpers
    hasActiveFilters,
    getActiveFiltersText,
    showHideTab,

    // Aliases for compatibility
    getAutoList: dataHook.loadData,
    refreshAutoList: dataHook.refreshData,
    reloadData: dataHook.refreshData,
    resetAutoList: dataHook.resetData,
    updateUserData: dataHook.updateUserDataOnly,
    indicator: dataHook.isLoading || dataHook.isRefreshing
  };
}
