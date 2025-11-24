import { useState, useRef, useCallback, useEffect } from 'react';
import { Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import api from '../services/api';
import type { AutoItem, UserData, ManagerData, OurService } from '../types/auto';

const auto_list_limit = 10;

export function useAutoList() {
  const router = useRouter();
  
  // Debounce timer для фильтра по номеру (number в React Native)
  const filterDebounceTimer = useRef<number | null>(null);
  
  // Refs
  const intervals = useRef<any>(null);
  const isLoadingMore = useRef(false); // Флаг для предотвращения множественных вызовов onEndReached
  const lastEndReachedTime = useRef(0); // Timestamp последнего вызова onEndReached
  
  // Анимация пульсации
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const pulseDuration = 800;
  const pulseFontSize = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [14, 17]
  });
  const pulseAnimation = useRef<any>(null);
  
  // State
  const [managerName, setManagerName] = useState('');
  const [techSupportName, setTechSupportName] = useState('');
  const [managerData, setManagerData] = useState<ManagerData>({});
  const [techSupportData, setTechSupportData] = useState<ManagerData>({});
  const [userData, setUserData] = useState<UserData>({ id: '', firm: '', inn: '', phone: '' });
  const [userStr, setUserStr] = useState('');
  const [userList, setUserList] = useState<UserData[]>([]);
  const [userListEmptyStr, setUserListEmptyStr] = useState('');
  const [ourServicesList, setOurServicesList] = useState<OurService[]>([]);
  const [ourServicesVisible, setOurServicesVisible] = useState(false);
  const [otherUserList, setOtherUserList] = useState<UserData[]>([]);
  
  const [autoStr, setAutoStr] = useState('');
  const [autoCancelled, setAutoCancelled] = useState(false);
  const [autoPassEnded, setAutoPassEnded] = useState(false);
  const [autoPassEnds, setAutoPassEnds] = useState(false);
  const [autoPassEndsUntilDate, setAutoPassEndsUntilDate] = useState('');
  const [autoList, setAutoList] = useState<AutoItem[]>([]);
  const [autoListCount, setAutoListCount] = useState(0);
  const [autoListFrom, setAutoListFrom] = useState(0);
  const [indicator, setIndicator] = useState(false);
  const [markedCnt, setMarkedCnt] = useState(0);
  
  // Кэш полного списка без фильтров
  const [cachedFullList, setCachedFullList] = useState<AutoItem[]>([]);
  const [cacheTimestamp, setCacheTimestamp] = useState<number>(0);
  const CACHE_LIFETIME_MS = 5 * 60 * 1000; // 5 минут
  
  // Флаг для клиентской фильтрации
  const [useClientFiltering, setUseClientFiltering] = useState(false);
  
  // Получение списка авто
  const getAutoList = useCallback(async (
    token: string | null,
    filters?: {
      autoStr?: string;
      autoCancelled?: boolean;
      autoPassEnded?: boolean;
      autoPassEnds?: boolean;
      autoPassEndsUntilDate?: string;
      autoListFrom?: number;
    }
  ) => {
    if (!token) {
      console.log('empty token');
      router.replace('/');
      return;
    }

    // Используем переданные фильтры или текущие значения
    const currentFilters = {
      autoStr: filters?.autoStr ?? autoStr,
      autoCancelled: filters?.autoCancelled ?? autoCancelled,
      autoPassEnded: filters?.autoPassEnded ?? autoPassEnded,
      autoPassEnds: filters?.autoPassEnds ?? autoPassEnds,
      autoPassEndsUntilDate: filters?.autoPassEndsUntilDate ?? autoPassEndsUntilDate,
      autoListFrom: filters?.autoListFrom ?? autoListFrom,
    };

    console.log('getAutoList called with filters:', {
      autoStr: currentFilters.autoStr,
      autoCancelled: currentFilters.autoCancelled,
      autoPassEnded: currentFilters.autoPassEnded,
      autoPassEnds: currentFilters.autoPassEnds,
      autoListFrom: currentFilters.autoListFrom,
    });
    
    // Показываем индикатор загрузки
    setIndicator(true);
    
    // Если это новая загрузка (from = 0), сбрасываем offset
    if (currentFilters.autoListFrom === 0) {
      setAutoListFrom(0);
      setMarkedCnt(0);
      // Список НЕ очищаем - он будет заменен после получения данных
    }

    try {
      const res = await api.post('/get-auto-list', { 
        token,
        auto_str: currentFilters.autoStr,
        auto_cancelled: currentFilters.autoCancelled ? 1 : 0,
        auto_pass_ended: currentFilters.autoPassEnded ? 1 : 0,
        auto_pass_ends: currentFilters.autoPassEnds ? 1 : 0,
        auto_pass_ends_until_date: currentFilters.autoPassEndsUntilDate,
        auto_list_from: currentFilters.autoListFrom,
        auto_list_limit: auto_list_limit
      });
      
      const data = res.data;

      console.log('========================================');
      console.log('AUTO LIST - get-auto-list response:');
      console.log('onboarding_viewed:', data.onboarding_viewed);
      console.log('announce_our_services_viewed:', data.announce_our_services_viewed);
      console.log('onboarding_expired:', data.onboarding_expired);
      console.log('========================================');

      // Проверяем нужно ли показать OnBoarding
      if (data.onboarding_viewed === 0 || data.onboarding_viewed === '0') {
        console.log('✅ Showing onboarding (first time user)');
        setOnboardingViewed(0);
        router.push('/onboarding');
      } else {
        console.log('⏭️ Onboarding already viewed, value:', data.onboarding_viewed);
        setOnboardingViewed(1);
      }

      // Данные приходят на верхнем уровне (как в старом проекте)
      if (data.user_data) {
        setUserData(data.user_data);
        setUserStr(data.user_str || '');
        setUserList(data.user_list || []);
        setUserListEmptyStr(data.user_list_empty_str || '');
        setOtherUserList(data.other_user_list || []);
        setOurServicesList(data.our_services_list || []);
      }

      // Данные менеджера из user_data
      if (data.user_data?.manager_data) {
        setManagerData(data.user_data.manager_data);
        setManagerName(data.user_data.manager_data.name || '');
      } else if (data.manager_data) {
        setManagerData(data.manager_data);
        setManagerName(data.manager_data.name || '');
      }

      // Данные техподдержки из user_data
      if (data.user_data?.tech_support_data) {
        setTechSupportData(data.user_data.tech_support_data);
        setTechSupportName(data.user_data.tech_support_data.name || '');
      }

      const onboardingExpiredValue = data.onboarding_expired !== undefined ? data.onboarding_expired : 1;
      setOnboardingExpired(onboardingExpiredValue);
      
      // Проверяем нужно ли показать модальное окно "Наши услуги"
      if (data.announce_our_services_viewed === 0 || data.announce_our_services_viewed === '0') {
        console.log('✅ Showing "Our Services" modal');
        setAnnounceOurServicesVisible(true);
      } else {
        console.log('⏭️ "Our Services" already viewed, value:', data.announce_our_services_viewed);
      }

      // Список авто на верхнем уровне
      const newAutoList = data.auto_list || [];
      
      // Загружаем данные для авто с флагами expared == 1
      for (let i = 0; i < newAutoList.length; i++) {
        const autoId = newAutoList[i].id;
        
        // Пропуска
        if (newAutoList[i].check_passes_expared == 1) {
          api.post('/get-auto-check-passes', { token, id: autoId })
            .then(res => {
              const passData = res.data;
              setAutoList(prev => prev.map(auto => 
                auto.id === autoId ? {
                  ...auto,
                  check_passes_string: passData.check_passes_string,
                  check_passes_year_period_color: passData.check_passes_year_period_color,
                  check_passes_expared: 0
                } : auto
              ));
            })
            .catch(err => {
              console.log('Error loading passes for auto:', autoId, err);
            });
        }
        
        // Диагностическая карта
        if (newAutoList[i].check_diagnostic_card_expared == 1) {
          api.post('/get-auto-check-diagnostic-card', { token, id: autoId, intervally: 1 })
            .then(res => {
              const data = res.data;
              if (data.error || data.in_progress == 0) {
                setAutoList(prev => prev.map(auto => 
                  auto.id === autoId ? {
                    ...auto,
                    check_diagnostic_card_string: data.check_diagnostic_card_string || '',
                    check_diagnostic_card_period_color: data.check_diagnostic_card_period_color || '',
                    check_diagnostic_card_date_to_left: data.check_diagnostic_card_date_to_left || '',
                    check_diagnostic_card_date_to_str: data.check_diagnostic_card_date_to_str || '',
                    check_diagnostic_card_expared: 0
                  } : auto
                ));
              }
            })
            .catch(err => {
              console.log('Error loading diagnostic card for auto:', autoId, err);
              // При ошибке тоже сбрасываем флаг
              setAutoList(prev => prev.map(auto => 
                auto.id === autoId ? { ...auto, check_diagnostic_card_expared: 0 } : auto
              ));
            });
        }
        
        // Штрафы
        if (newAutoList[i].check_fines_expared == 1) {
          api.post('/get-auto-check-fines', { token, id: autoId })
            .then(res => {
              const data = res.data;
              setAutoList(prev => prev.map(auto => 
                auto.id === autoId ? {
                  ...auto,
                  check_fines_string: data.check_fines_string || '',
                  check_fines_sum: data.check_fines_sum || '',
                  check_fines_expared: 0
                } : auto
              ));
            })
            .catch(err => {
              console.log('Error loading fines for auto:', autoId, err);
              setAutoList(prev => prev.map(auto => 
                auto.id === autoId ? { ...auto, check_fines_expared: 0 } : auto
              ));
            });
        }
        
        // ОСАГО
        if (newAutoList[i].check_osago_expared == 1) {
          api.post('/get-auto-check-osago', { token, id: autoId })
            .then(res => {
              const data = res.data;
              setAutoList(prev => prev.map(auto => 
                auto.id === autoId ? {
                  ...auto,
                  check_osago_string: data.check_osago_string || '',
                  check_osago_period_color: data.check_osago_period_color || '',
                  check_osago_date_to_left: data.check_osago_date_to_left || '',
                  check_osago_date_to_str: data.check_osago_date_to_str || '',
                  check_osago_expared: 0
                } : auto
              ));
            })
            .catch(err => {
              console.log('Error loading osago for auto:', autoId, err);
              setAutoList(prev => prev.map(auto => 
                auto.id === autoId ? { ...auto, check_osago_expared: 0 } : auto
              ));
            });
        }
      }
      
      if (currentFilters.autoListFrom === 0) {
        console.log('Setting auto list with', newAutoList.length, 'items');
        setAutoList(newAutoList);
        
        // Кэшируем полный список (без фильтров)
        const isFullList = !currentFilters.autoStr && 
                          !currentFilters.autoCancelled && 
                          !currentFilters.autoPassEnded && 
                          !currentFilters.autoPassEnds;
        
        if (isFullList) {
          console.log('Caching full auto list:', newAutoList.length, 'items');
          setCachedFullList(newAutoList);
          setCacheTimestamp(Date.now());
        }
      } else {
        console.log('Appending', newAutoList.length, 'items to existing list');
        setAutoList(prev => [...prev, ...newAutoList]);
      }
      
      // Используем значение с сервера, но проверяем корректность
      const serverCount = data.auto_list_count || 0;
      const hasActiveFilters = currentFilters.autoStr || 
                               currentFilters.autoCancelled || 
                               currentFilters.autoPassEnded || 
                               currentFilters.autoPassEnds;
      
      // Если есть фильтры и это первая загрузка - используем длину списка
      // (на случай если сервер возвращает общее количество вместо отфильтрованного)
      if (hasActiveFilters && currentFilters.autoListFrom === 0 && newAutoList.length < serverCount) {
        console.log('Using list length as count (filtered):', newAutoList.length);
        setAutoListCount(newAutoList.length);
      } else {
        setAutoListCount(serverCount);
      }
      
      setAutoListFrom(currentFilters.autoListFrom + auto_list_limit);

      setIndicator(false);
    } catch (error: any) {
      console.log('error in getAutoList:', error);
      if (error.response?.status === 401) {
        router.replace('/');
      }
      setIndicator(false);
    }
  }, [router, autoListFrom, autoStr, autoCancelled, autoPassEnded, autoPassEnds, autoPassEndsUntilDate]);

  // Обновление списка (сброс)
  const refreshAutoList = useCallback(async () => {
    console.log('refreshAutoList called');
    
    // Инвалидируем кэш только если нет активных фильтров
    const hasFilters = autoStr.length > 0 || autoCancelled || autoPassEnded || autoPassEnds;
    if (!hasFilters) {
      console.log('Invalidating cache on refresh (no filters)');
      setCacheTimestamp(0);
    } else {
      console.log('Refresh with active filters, keeping cache');
    }
    
    // Сбрасываем offset и счетчик отмеченных
    setAutoListFrom(0);
    setMarkedCnt(0);
    // НЕ очищаем список - пусть показывается во время загрузки
    
    const token = await AsyncStorage.getItem('token');
    // Передаем текущие фильтры
    getAutoList(token, {
      autoStr,
      autoCancelled,
      autoPassEnded,
      autoPassEnds,
      autoPassEndsUntilDate,
      autoListFrom: 0
    });
  }, [getAutoList, autoStr, autoCancelled, autoPassEnded, autoPassEnds, autoPassEndsUntilDate]);
  
  // Инвалидация кэша (для использования после добавления/удаления авто)
  const invalidateCache = useCallback(() => {
    console.log('Cache invalidated');
    setCacheTimestamp(0);
  }, []);

  // Пагинация
  const onEndReached = useCallback(() => {
    const now = Date.now();
    
    // Debounce: игнорировать вызовы чаще чем раз в 500ms
    if (now - lastEndReachedTime.current < 500) {
      console.log('onEndReached: debounced, skipping');
      return;
    }
    
    // Проверяем флаг загрузки
    if (isLoadingMore.current) {
      console.log('onEndReached: already loading more, skipping');
      return;
    }
    
    // Проверяем что не идет загрузка
    if (indicator) {
      console.log('onEndReached: already loading, skipping');
      return;
    }
    
    // Проверяем что есть еще данные для загрузки
    if (autoList.length >= autoListCount) {
      console.log('onEndReached: all data loaded', autoList.length, '/', autoListCount);
      return;
    }
    
    // Защита от ложных срабатываний: не загружать если autoListFrom = 0
    // (это значит что список только что был сброшен/отфильтрован)
    if (autoListFrom === 0) {
      console.log('onEndReached: skipping, list was just reset (autoListFrom = 0)');
      return;
    }
    
    // Устанавливаем флаги
    lastEndReachedTime.current = now;
    isLoadingMore.current = true;
    
    console.log('onEndReached: loading more data from', autoListFrom);
    AsyncStorage.getItem('token').then(token => {
      getAutoList(token, { autoListFrom }).finally(() => {
        // Сбрасываем флаг после завершения загрузки
        isLoadingMore.current = false;
      });
    });
  }, [indicator, autoList.length, autoListCount, autoListFrom, getAutoList]);

  // Отметить/снять отметку с элемента
  const markItem = useCallback((item: AutoItem, index: number) => {
    const updatedList = [...autoList];
    updatedList[index] = { ...item, marked: !item.marked };
    setAutoList(updatedList);
    
    const newMarkedCnt = updatedList.filter(auto => auto.marked).length;
    setMarkedCnt(newMarkedCnt);
  }, [autoList]);

  // Сброс выделения
  const undoSelect = useCallback(() => {
    const updatedList = autoList.map(item => ({ ...item, marked: false }));
    setAutoList(updatedList);
    setMarkedCnt(0);
  }, [autoList]);

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

  // Остановка анимации пульсации
  const stopPulseAnimation = useCallback(() => {
    if (pulseAnimation.current) {
      pulseAnimation.current.stop();
    }
  }, []);

  const [onboardingExpired, setOnboardingExpired] = useState(1);
  const [onboardingViewed, setOnboardingViewed] = useState(1);
  const [announceOurServicesVisible, setAnnounceOurServicesVisible] = useState(false);

  // Закрытие модального окна "Наши услуги"
  const closeAnnounceOurServices = useCallback(async () => {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      router.replace('/');
      return;
    }

    try {
      await api.post('/get-announce-our-services', { token });
      setAnnounceOurServicesVisible(false);
    } catch (error: any) {
      console.log('Error in closeAnnounceOurServices:', error);
      if (error.response?.status === 401) {
        router.replace('/');
      }
    }
  }, [router]);

  // Очистка таймера при размонтировании
  useEffect(() => {
    return () => {
      if (filterDebounceTimer.current) {
        clearTimeout(filterDebounceTimer.current);
      }
    };
  }, []);
  
  // Клиентская фильтрация по номеру
  const applyClientFilter = useCallback((searchStr: string) => {
    if (!cachedFullList.length) {
      console.log('No cached list for client filtering');
      return;
    }
    
    console.log('Applying client-side filter:', searchStr);
    
    if (!searchStr || searchStr.length < 3) {
      // Показываем полный список
      setAutoList(cachedFullList);
      setAutoListCount(cachedFullList.length || 0);
      return;
    }
    
    // Фильтруем на клиенте
    const filtered = cachedFullList.filter(auto => {
      const autoNumber = auto.auto_number?.toLowerCase() || '';
      const search = searchStr.toLowerCase();
      return autoNumber.includes(search);
    });
    
    console.log('Client filter result:', filtered.length, 'items');
    setAutoList(filtered);
    setAutoListCount(filtered.length || 0);
  }, [cachedFullList]);

  // Проверка активности фильтров
  const hasActiveFilters = useCallback(() => {
    return autoStr.length >= 3 ||  // Только если >= 3 символа
           autoCancelled || 
           autoPassEnded || 
           autoPassEnds || 
           autoPassEndsUntilDate.length > 0;
  }, [autoStr, autoCancelled, autoPassEnded, autoPassEnds, autoPassEndsUntilDate]);

  // Получение списка активных фильтров для отображения
  const getActiveFiltersText = useCallback(() => {
    const filters: string[] = [];
    
    if (autoStr.length >= 3) {  // Только если >= 3 символа
      filters.push(`Номер: ${autoStr}`);
    }
    if (autoCancelled) {
      filters.push('Аннулирован');
    }
    if (autoPassEnded) {
      filters.push('Закончился');
    }
    if (autoPassEnds && autoPassEndsUntilDate.length > 0) {
      filters.push(`До: ${autoPassEndsUntilDate}`);
    }
    
    return filters;
  }, [autoStr, autoCancelled, autoPassEnded, autoPassEnds, autoPassEndsUntilDate]);

  // Filter handlers
  const changeAutoStr = useCallback((value: string) => {
    console.log('changeAutoStr called. New value:', value, 'Length:', value.length);
    
    // Очищаем предыдущий таймер
    if (filterDebounceTimer.current) {
      console.log('Clearing previous debounce timer');
      clearTimeout(filterDebounceTimer.current);
    }
    
    // Обновляем состояние (UI обновляется всегда)
    setAutoStr(value);
    
    // Проверяем, есть ли другие активные фильтры
    const hasOtherFilters = autoCancelled || autoPassEnded || autoPassEnds;
    
    // Если есть кэш и нет других фильтров - используем клиентскую фильтрацию
    if (cachedFullList.length > 0 && !hasOtherFilters) {
      console.log('Using client-side filtering (cached list available)');
      
      // Сохраняем значение для замыкания
      const filterValue = value;
      
      // Debounce для плавности UI (меньше задержка)
      filterDebounceTimer.current = setTimeout(() => {
        applyClientFilter(filterValue);
      }, 200); // Быстрее, чем серверный запрос
      
      return;
    }
    
    // Иначе используем серверную фильтрацию
    if (value.length >= 3 || value.length === 0) {
      console.log('Using server-side filtering');
      
      // Сохраняем значение для замыкания
      const filterValue = value;
      
      // Устанавливаем новый таймер (debounce 500ms)
      filterDebounceTimer.current = setTimeout(() => {
        console.log('Debounce timer fired. Applying filter with value:', filterValue);
        AsyncStorage.getItem('token').then(token => 
          getAutoList(token, { autoStr: filterValue, autoListFrom: 0 })
        );
      }, 500);
    } else {
      console.log('Value too short (< 3 chars), not applying filter');
    }
  }, [getAutoList, applyClientFilter, cachedFullList, autoCancelled, autoPassEnded, autoPassEnds]);

  const clearAutoStr = useCallback(() => {
    console.log('clearAutoStr');
    setAutoStr('');
    
    // Очищаем таймер debounce
    if (filterDebounceTimer.current) {
      clearTimeout(filterDebounceTimer.current);
    }
    
    // Проверяем, есть ли другие активные фильтры
    const hasOtherFilters = autoCancelled || autoPassEnded || autoPassEnds;
    
    // Если есть кэш и нет других фильтров - используем клиентскую фильтрацию
    if (cachedFullList.length > 0 && !hasOtherFilters) {
      console.log('Clearing filter using cached list');
      applyClientFilter('');
    } else {
      // Немедленно применяем очистку фильтра через сервер
      AsyncStorage.getItem('token').then(token => 
        getAutoList(token, { autoStr: '', autoListFrom: 0 })
      );
    }
  }, [getAutoList, applyClientFilter, cachedFullList, autoCancelled, autoPassEnded, autoPassEnds]);

  // Сброс всех фильтров
  const clearAllFilters = useCallback(() => {
    console.log('clearAllFilters');
    
    // Сбрасываем флаг загрузки пагинации
    isLoadingMore.current = false;
    
    // Сбрасываем фильтры
    setAutoStr('');
    setAutoCancelled(false);
    setAutoPassEnded(false);
    setAutoPassEnds(false);
    setAutoPassEndsUntilDate('');
    
    const now = Date.now();
    const cacheAge = now - cacheTimestamp;
    const isCacheValid = cachedFullList.length > 0 && cacheAge < CACHE_LIFETIME_MS;
    
    if (isCacheValid) {
      // ✅ Кэш свежий - используем мгновенно
      console.log('Using cached full list (age:', Math.round(cacheAge / 1000), 'seconds)');
      setAutoList(cachedFullList);
      setAutoListCount(cachedFullList.length);
      setAutoListFrom(0);
      setMarkedCnt(0);
      
      // Обновляем в фоне если кэш старше 1 минуты
      if (cacheAge > 60 * 1000) {
        console.log('Refreshing cache in background...');
        AsyncStorage.getItem('token').then(token => 
          getAutoList(token, { 
            autoStr: '', 
            autoCancelled: false,
            autoPassEnded: false,
            autoPassEnds: false,
            autoPassEndsUntilDate: '',
            autoListFrom: 0 
          })
        );
      }
    } else {
      // ❌ Кэш устарел или отсутствует - загружаем с сервера
      console.log('Cache expired or empty, loading from server...');
      
      // Если есть старый кэш - показываем его временно
      if (cachedFullList.length > 0) {
        setAutoList(cachedFullList);
        setAutoListCount(cachedFullList.length);
        setAutoListFrom(0);
        setMarkedCnt(0);
      }
      
      AsyncStorage.getItem('token').then(token => 
        getAutoList(token, { 
          autoStr: '', 
          autoCancelled: false,
          autoPassEnded: false,
          autoPassEnds: false,
          autoPassEndsUntilDate: '',
          autoListFrom: 0 
        })
      );
    }
  }, [getAutoList, cachedFullList, cacheTimestamp, CACHE_LIFETIME_MS]);

  const toggleAutoCancelled = useCallback(() => {
    // Сбрасываем флаг загрузки пагинации
    isLoadingMore.current = false;
    
    setAutoCancelled(prev => {
      const newValue = !prev;
      
      // Передаем новое значение фильтра напрямую
      AsyncStorage.getItem('token').then(token => 
        getAutoList(token, { autoCancelled: newValue, autoListFrom: 0 })
      );
      
      return newValue;
    });
  }, [getAutoList]);

  const toggleAutoPassEnded = useCallback(() => {
    // Сбрасываем флаг загрузки пагинации
    isLoadingMore.current = false;
    
    setAutoPassEnded(prev => {
      const newValue = !prev;
      
      AsyncStorage.getItem('token').then(token => 
        getAutoList(token, { autoPassEnded: newValue, autoListFrom: 0 })
      );
      
      return newValue;
    });
  }, [getAutoList]);

  const toggleAutoPassEnds = useCallback(() => {
    // Сбрасываем флаг загрузки пагинации
    isLoadingMore.current = false;
    
    setAutoPassEnds(prev => {
      const newValue = !prev;
      
      AsyncStorage.getItem('token').then(token => 
        getAutoList(token, { autoPassEnds: newValue, autoListFrom: 0 })
      );
      
      return newValue;
    });
  }, [getAutoList]);

  const changeAutoPassEndsUntilDate = useCallback((value: string) => {
    console.log('changeAutoPassEndsUntilDate. value = ' + value);
    
    // Форматирование даты
    let value_new = value.replace(/[^0-9]/g, '');
    if (value_new.length >= 3) {
      value_new = value_new.slice(0, 2) + '.' + value_new.slice(2);
    }
    if (value_new.length >= 6) {
      value_new = value_new.slice(0, 5) + '.' + value_new.slice(5, 9);
    }
    
    setAutoPassEndsUntilDate(value_new);
    
    if (value_new.length === 0) {
      setAutoPassEnds(false);
      
      AsyncStorage.getItem('token').then(token => 
        getAutoList(token, { autoPassEnds: false, autoPassEndsUntilDate: value_new, autoListFrom: 0 })
      );
    } else if (value_new.length === 10) {
      setAutoPassEnds(true);
      
      AsyncStorage.getItem('token').then(token => 
        getAutoList(token, { autoPassEnds: true, autoPassEndsUntilDate: value_new, autoListFrom: 0 })
      );
    }
  }, [getAutoList]);

  // Показать/скрыть детали проверки
  const showHideTab = useCallback((tabName: string, index: number) => {
    console.log(`showHideTab: ${tabName}, index: ${index}`);
    const updatedList = [...autoList];
    const item = updatedList[index];
    
    // Проверяем, открыта ли уже эта вкладка
    let isCurrentlyOpen = false;
    switch (tabName) {
      case 'fines':
        isCurrentlyOpen = item.check_fines_tab_show === 1;
        break;
      case 'avtodor':
        isCurrentlyOpen = item.check_avtodor_tab_show === 1;
        break;
      case 'osago':
        isCurrentlyOpen = item.check_osago_tab_show === 1;
        break;
      case 'diagnostic_card':
        isCurrentlyOpen = item.check_diagnostic_card_tab_show === 1;
        break;
      case 'rnis':
        isCurrentlyOpen = item.check_rnis_tab_show === 1;
        break;
      case 'status':
        isCurrentlyOpen = item.status_tab_show === 1;
        break;
    }
    
    // Закрываем все вкладки
    item.check_fines_tab_show = 0;
    item.check_avtodor_tab_show = 0;
    item.check_osago_tab_show = 0;
    item.check_diagnostic_card_tab_show = 0;
    item.check_rnis_tab_show = 0;
    item.status_tab_show = 0;
    
    // Если вкладка была закрыта - открываем её
    if (!isCurrentlyOpen) {
      switch (tabName) {
        case 'fines':
          item.check_fines_tab_show = 1;
          break;
        case 'avtodor':
          item.check_avtodor_tab_show = 1;
          break;
        case 'osago':
          item.check_osago_tab_show = 1;
          break;
        case 'diagnostic_card':
          item.check_diagnostic_card_tab_show = 1;
          break;
        case 'rnis':
          item.check_rnis_tab_show = 1;
          break;
        case 'status':
          item.status_tab_show = 1;
          break;
      }
    }
    
    setAutoList(updatedList);
  }, [autoList]);

  // Функция для перезагрузки всех данных (например, после смены организации)
  const reloadData = useCallback(async () => {
    console.log('reloadData - resetting state and fetching data');
    
    // Сбрасываем состояние
    setMarkedCnt(0);
    setAutoList([]);
    setAutoListCount(0);
    setAutoListFrom(0);
    
    // Загружаем данные заново
    const token = await AsyncStorage.getItem('token');
    if (token) {
      await getAutoList(token);
    }
  }, [getAutoList]);

  return {
    // State
    managerName,
    techSupportName,
    managerData,
    techSupportData,
    userData,
    userStr,
    userList,
    userListEmptyStr,
    ourServicesList,
    ourServicesVisible,
    setOurServicesVisible,
    otherUserList,
    autoStr,
    autoCancelled,
    autoPassEnded,
    autoPassEnds,
    autoPassEndsUntilDate,
    autoList,
    autoListCount,
    autoListFrom,
    indicator,
    markedCnt,
    onboardingExpired,
    onboardingViewed,
    announceOurServicesVisible,
    closeAnnounceOurServices,
    
    // Refs
    intervals,
    
    // Animation
    pulseAnim,
    pulseFontSize,
    
    // Methods
    getAutoList,
    refreshAutoList,
    reloadData,
    invalidateCache,
    onEndReached,
    markItem,
    undoSelect,
    startPulseAnimation,
    stopPulseAnimation,
    hasActiveFilters,
    getActiveFiltersText,
    changeAutoStr,
    clearAutoStr,
    clearAllFilters,
    toggleAutoCancelled,
    toggleAutoPassEnded,
    toggleAutoPassEnds,
    changeAutoPassEndsUntilDate,
    showHideTab,
  };
}
