import { useState, useRef, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import api from '../services/api';
import type { AutoItem, UserData, ManagerData, OurService } from '../types/auto';

const AUTO_LIST_LIMIT = 10;
const CACHE_LIFETIME_MS = 5 * 60 * 1000; // 5 минут

export function useAutoData() {
  const router = useRouter();
  
  // Данные пользователя и сервисов
  const [userData, setUserData] = useState<UserData>({ id: '', firm: '', inn: '', phone: '' });
  const [managerData, setManagerData] = useState<ManagerData>({});
  const [techSupportData, setTechSupportData] = useState<ManagerData>({});
  const [techSupportName, setTechSupportName] = useState('');
  const [userList, setUserList] = useState<UserData[]>([]);
  const [otherUserList, setOtherUserList] = useState<UserData[]>([]);
  const [ourServicesList, setOurServicesList] = useState<OurService[]>([]);
  const [onboardingExpired, setOnboardingExpired] = useState(1);
  
  // Состояние списка авто
  const [autoList, setAutoList] = useState<AutoItem[]>([]);
  const [autoListCount, setAutoListCount] = useState(0);
  
  // Флаги загрузки
  const [isLoading, setIsLoading] = useState(false); // Глобальная загрузка (первый вход)
  const [isRefreshing, setIsRefreshing] = useState(false); // Обновление списка (pull-to-refresh)
  const [isSearching, setIsSearching] = useState(false); // Поиск/фильтрация
  const [isLoadingMore, setIsLoadingMore] = useState(false); // Дозагрузка (пагинация)
  
  // Фильтры
  const [filters, setFilters] = useState({
    autoStr: '',
    autoCancelled: false,
    autoPassEnded: false,
    autoPassEnds: false,
    autoPassEndsUntilDate: '',
  });

  // Пагинация
  const [offset, setOffset] = useState(0);
  
  // Кэш
  const [cachedFullList, setCachedFullList] = useState<AutoItem[]>([]);
  const [cacheTimestamp, setCacheTimestamp] = useState<number>(0);

  // Refs для избежания замыканий в асинхронных функциях
  const stateRef = useRef({
    filters,
    offset,
    autoListLength: 0,
    isLoading: false
  });

  // Синхронизация ref
  useEffect(() => {
    stateRef.current = { 
      filters, 
      offset, 
      autoListLength: autoList.length,
      isLoading: isLoading || isRefreshing || isSearching || isLoadingMore
    };
  }, [filters, offset, autoList.length, isLoading, isRefreshing, isSearching, isLoadingMore]);

  // Таймер для debounce
  const filterDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Основная функция загрузки данных
  const fetchAutoList = useCallback(async (
    token: string, 
    requestFilters = stateRef.current.filters, 
    requestOffset = stateRef.current.offset,
    isBackground = false
  ) => {
    if (!isBackground) {
      if (requestOffset === 0) {
        if (autoList.length === 0) setIsLoading(true);
        else setIsSearching(true);
      } else {
        setIsLoadingMore(true);
      }
    }

    try {
      const res = await api.post('/get-auto-list', { 
        token,
        auto_str: requestFilters.autoStr,
        auto_cancelled: requestFilters.autoCancelled ? 1 : 0,
        auto_pass_ended: requestFilters.autoPassEnded ? 1 : 0,
        auto_pass_ends: requestFilters.autoPassEnds ? 1 : 0,
        auto_pass_ends_until_date: requestFilters.autoPassEndsUntilDate,
        auto_list_from: requestOffset,
        auto_list_limit: AUTO_LIST_LIMIT
      });
      
      const data = res.data;

      // Проверка авторизации и статуса пользователя
      if (data.user_data?.user_confirmed === 0 || data.user_data?.phone_inn_confirmed === 0) {
        router.replace('/');
        return null;
      }

      // Обновление данных пользователя (только при первой загрузке или обновлении)
      if (data.user_data) {
        setUserData(data.user_data);
        setManagerData(data.user_data.manager_data || data.manager_data || {});
        
        const tsData = data.user_data.tech_support_data || {};
        setTechSupportData(tsData);
        setTechSupportName(tsData.name || '');

        setUserList(data.user_list || []);
        setOtherUserList(data.other_user_list || []);
        setOurServicesList(data.our_services_list || []);
      }
      
      if (data.onboarding_expired !== undefined) {
          setOnboardingExpired(data.onboarding_expired);
      }

      const newItems = data.auto_list || [];
      
      // Загрузка деталей для элементов
      loadDetailsForItems(token, newItems);

      // Обновление списка
      if (requestOffset === 0) {
        setAutoList(newItems);
        
        // Кэширование полного списка
        const isFullList = !requestFilters.autoStr && 
                          !requestFilters.autoCancelled && 
                          !requestFilters.autoPassEnded && 
                          !requestFilters.autoPassEnds;
        
        if (isFullList) {
          setCachedFullList(newItems);
          setCacheTimestamp(Date.now());
        }
      } else {
        // Добавляем только уникальные элементы (на всякий случай)
        setAutoList(prev => {
            const existingIds = new Set(prev.map(i => i.id));
            const uniqueNewItems = newItems.filter((i: AutoItem) => !existingIds.has(i.id));
            return [...prev, ...uniqueNewItems];
        });
      }

      // Обновление счетчика
      const serverCount = data.auto_list_count || 0;
      const hasActiveFilters = Object.values(requestFilters).some(v => !!v);
      if (hasActiveFilters && requestOffset === 0 && newItems.length < serverCount) {
        setAutoListCount(newItems.length);
      } else {
        setAutoListCount(serverCount);
      }

      return data;
    } catch (error: any) {
      console.log('Error fetching auto list:', error);
      if (error.response?.status === 401) {
        router.replace('/');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setIsSearching(false);
      setIsLoadingMore(false);
    }
  }, [router, autoList.length]);

  // Загрузка деталей (вынесена для чистоты)
  const loadDetailsForItems = (token: string, items: AutoItem[]) => {
    items.forEach(item => {
      if (item.check_passes_expared) loadPasses(token, item.id);
      if (item.check_diagnostic_card_expared) loadDiagnosticCard(token, item.id);
      if (item.check_fines_expared) loadFines(token, item.id);
      if (item.check_osago_expared) loadOsago(token, item.id);
    });
  };

  // Вспомогательные функции загрузки деталей
  const loadPasses = (token: string, id: string) => {
    api.post('/get-auto-check-passes', { token, id }).then(res => {
      updateAutoItem(id, { 
        ...res.data, 
        check_passes_expared: 0 
      });
    }).catch(e => console.log('Pass load error', e));
  };

  const loadDiagnosticCard = (token: string, id: string) => {
    api.post('/get-auto-check-diagnostic-card', { token, id, intervally: 1 }).then(res => {
        if (res.data.error || res.data.in_progress == 0) {
            updateAutoItem(id, { ...res.data, check_diagnostic_card_expared: 0 });
        }
    }).catch(e => updateAutoItem(id, { check_diagnostic_card_expared: 0 }));
  };

  const loadFines = (token: string, id: string) => {
    api.post('/get-auto-check-fines', { token, id }).then(res => {
      updateAutoItem(id, { ...res.data, check_fines_expared: 0 });
    }).catch(e => updateAutoItem(id, { check_fines_expared: 0 }));
  };

  const loadOsago = (token: string, id: string) => {
    api.post('/get-auto-check-osago', { token, id }).then(res => {
      updateAutoItem(id, { ...res.data, check_osago_expared: 0 });
    }).catch(e => updateAutoItem(id, { check_osago_expared: 0 }));
  };

  // Обновление одного элемента в списке
  const updateAutoItem = useCallback((id: string, data: Partial<AutoItem>) => {
    setAutoList(prev => prev.map(item => item.id === id ? { ...item, ...data } : item));
  }, []);

  // Публичные методы

  const loadData = useCallback(async () => {
    const token = await AsyncStorage.getItem('token');
    if (token) fetchAutoList(token, stateRef.current.filters, 0);
  }, [fetchAutoList]);

  const refreshData = useCallback(async () => {
    setIsRefreshing(true);
    setOffset(0);
    const token = await AsyncStorage.getItem('token');
    
    const hasFilters = Object.values(stateRef.current.filters).some(v => !!v);
    if (!hasFilters) setCacheTimestamp(0);

    if (token) fetchAutoList(token, stateRef.current.filters, 0);
  }, [fetchAutoList]);

  const loadMore = useCallback(async () => {
    const { isLoading, autoListLength, filters } = stateRef.current;
    // Если уже идет загрузка или загрузили все - выходим
    if (isLoading || autoListLength >= autoListCount) return;

    const newOffset = stateRef.current.offset + AUTO_LIST_LIMIT;
    setOffset(newOffset);
    
    const token = await AsyncStorage.getItem('token');
    if (token) fetchAutoList(token, filters, newOffset);
  }, [autoListCount, fetchAutoList]);

  // Умная фильтрация
  const setFilterValue = useCallback((key: string, value: any) => {
    const newFilters = { ...stateRef.current.filters, [key]: value };
    setFilters(newFilters);
    setOffset(0);

    if (key === 'autoStr') {
      const hasOtherFilters = newFilters.autoCancelled || newFilters.autoPassEnded || newFilters.autoPassEnds;
      
      if (cachedFullList.length > 0 && !hasOtherFilters) {
        if (filterDebounceTimer.current) clearTimeout(filterDebounceTimer.current);
        
        filterDebounceTimer.current = setTimeout(() => {
          if (!value || value.length < 3) {
            setAutoList(cachedFullList);
            setAutoListCount(cachedFullList.length);
          } else {
            const filtered = cachedFullList.filter(item => 
              item.auto_number.toLowerCase().includes(value.toLowerCase())
            );
            setAutoList(filtered);
            setAutoListCount(filtered.length);
          }
        }, 200);
        return;
      }
    }

    if (filterDebounceTimer.current) clearTimeout(filterDebounceTimer.current);
    
    filterDebounceTimer.current = setTimeout(async () => {
      const token = await AsyncStorage.getItem('token');
      if (token) fetchAutoList(token, newFilters, 0);
    }, 500);

  }, [cachedFullList, fetchAutoList]);

  const clearFilters = useCallback(async () => {
    const emptyFilters = {
      autoStr: '',
      autoCancelled: false,
      autoPassEnded: false,
      autoPassEnds: false,
      autoPassEndsUntilDate: '',
    };
    setFilters(emptyFilters);
    setOffset(0);

    const now = Date.now();
    if (cachedFullList.length > 0 && (now - cacheTimestamp < CACHE_LIFETIME_MS)) {
      setAutoList(cachedFullList);
      setAutoListCount(cachedFullList.length);
    } else {
      const token = await AsyncStorage.getItem('token');
      if (token) fetchAutoList(token, emptyFilters, 0);
    }
  }, [cachedFullList, cacheTimestamp, fetchAutoList]);

  const updateUserDataOnly = useCallback(async () => {
    const token = await AsyncStorage.getItem('token');
    if (!token) return;
    
    api.post('/get-auto-list', { token, auto_list_limit: 0 }).then(res => {
        if (res.data.user_data) {
            setUserData(res.data.user_data);
            if (res.data.other_user_list) setOtherUserList(res.data.other_user_list);
        }
    }).catch(e => console.log('UserData update error', e));
  }, []);

  return {
    autoList,
    autoListCount,
    userData,
    managerData,
    techSupportData,
    techSupportName,
    userList,
    otherUserList,
    ourServicesList,
    onboardingExpired,
    
    isLoading,
    isRefreshing,
    isSearching,
    isLoadingMore,

    filters,
    setFilterValue,
    clearFilters,
    
    loadData,
    refreshData,
    loadMore,
    updateAutoItem,
    updateUserDataOnly,
    
    invalidateCache: () => setCacheTimestamp(0)
  };
}
