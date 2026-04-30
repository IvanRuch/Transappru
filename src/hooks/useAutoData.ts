import { useState, useRef, useCallback, useEffect } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import axios from 'axios';
import api from '../services/api';
import { redirectToAuth } from '../utils/redirectToAuth';
import { sortAutoListByPlateNumber } from '../utils/plateHelpers';
import { reportProviderResult } from '../utils/providerHealth';
import type { AutoItem, UserData, ManagerData, OurService } from '../types/auto';

const AUTO_LIST_LIMIT = 10;
const CACHE_LIFETIME_MS = 5 * 60 * 1000; // 5 минут

// Session flags to prevent onboarding redirect loop and duplicate announce.
// On web, use sessionStorage so flags survive HMR and page refreshes
// but reset on new browser session (closing tab). On native, module-level
// variables persist for the entire app lifecycle.
function getSessionFlag(key: string): boolean {
  if (Platform.OS === 'web') {
    try { return sessionStorage.getItem(key) === '1'; } catch { return false; }
  }
  return false;
}
function setSessionFlag(key: string): void {
  if (Platform.OS === 'web') {
    try { sessionStorage.setItem(key, '1'); } catch {}
  }
}
// Persistent flag (localStorage) — survives across tabs and browser restarts.
// Set by OnBoardingScreen after /get-onboarding call succeeds, cleared on logout.
function getLocalFlag(key: string): boolean {
  if (Platform.OS === 'web') {
    try { return localStorage.getItem(key) === '1'; } catch { return false; }
  }
  return false;
}

let _onboardingRedirectDone = getSessionFlag('ta_onboarding_redirect_done') || getLocalFlag('ta_onboarding_done');
let _announceShown = getSessionFlag('ta_announce_shown');

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
  const [announceOurServicesVisible, setAnnounceOurServicesVisible] = useState(false);

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

  // Latest-wins AbortController for /get-auto-list. Without it, a request
  // in flight when the user logs out (or quickly fires another filter
  // change) still resolves later — returning 401 with a null token, which
  // spams the console and used to bounce the user back to '/'. Cancelling
  // the stale one keeps state consistent and quiet.
  const fetchAbortRef = useRef<AbortController | null>(null);

  // Основная функция загрузки данных
  const fetchAutoList = useCallback(async (
    token: string,
    requestFilters = stateRef.current.filters,
    requestOffset = stateRef.current.offset,
    isBackground = false
  ) => {
    if (!isBackground) {
      if (requestOffset === 0) {
        if (stateRef.current.autoListLength === 0) setIsLoading(true);
        else {
          setIsSearching(true);
          // Очищаем текущий список при поиске, чтобы не показывать старые данные
          setAutoList([]);
        }
      } else {
        setIsLoadingMore(true);
      }
    }

    fetchAbortRef.current?.abort();
    const controller = new AbortController();
    fetchAbortRef.current = controller;

    try {
      console.log('fetchAutoList: filters =', JSON.stringify(requestFilters), 'offset =', requestOffset);
      const res = await api.post(
        '/get-auto-list',
        {
          token,
          auto_str: requestFilters.autoStr,
          auto_cancelled: requestFilters.autoCancelled ? 1 : 0,
          auto_pass_ended: requestFilters.autoPassEnded ? 1 : 0,
          auto_pass_ends: requestFilters.autoPassEnds ? 1 : 0,
          auto_pass_ends_until_date: requestFilters.autoPassEndsUntilDate,
          auto_list_from: requestOffset,
          auto_list_limit: AUTO_LIST_LIMIT,
        },
        { signal: controller.signal },
      );
      if (controller.signal.aborted) return null;
      
      const data = res.data;

      // Проверка авторизации и статуса пользователя
      if (data.user_data?.user_confirmed === 0 || data.user_data?.phone_inn_confirmed === 0) {
        redirectToAuth(router);
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
          const needsOnboarding = data.onboarding_expired === 0 || data.onboarding_expired === '0';
          console.log('📋 onboarding_expired from /get-auto-list:', data.onboarding_expired,
            needsOnboarding ? '→ onboarding NOT viewed, should show' : '→ onboarding already viewed');
          setOnboardingExpired(data.onboarding_expired);

          // Redirect to onboarding if not viewed (same as legacy web AutoList.js:640)
          // Skip if we already redirected once in this session (guard against loop)
          if (needsOnboarding && requestOffset === 0 && !_onboardingRedirectDone) {
            console.log('📋 Redirecting to onboarding from auto-list');
            _onboardingRedirectDone = true;
            setSessionFlag('ta_onboarding_redirect_done');
            router.replace('/onboarding' as any);
            return null;
          }
      }

      // Show "announce our services" modal (same as legacy web AutoList.js:646)
      // Only show once per session to avoid re-triggering on refresh
      if ((data.announce_our_services_viewed === '0' || data.announce_our_services_viewed === 0) && !_announceShown) {
        console.log('📋 announce_our_services_viewed: 0 → showing services announcement');
        _announceShown = true;
        setSessionFlag('ta_announce_shown');
        setAnnounceOurServicesVisible(true);
      }

      const newItems: AutoItem[] = data.auto_list || [];
      
      // Загрузка деталей для элементов
      loadDetailsForItems(token, newItems);

      // Обновление списка. Сортируем по основной цифровой части ГРЗ —
      // legacy backend выдаёт лексикографический порядок, а менеджеры
      // попросили сортировать по цифрам. Делаем на фронте; функция
      // идемпотентна, если бэкенд однажды начнёт сортировать сам.
      if (requestOffset === 0) {
        const sortedNewItems = sortAutoListByPlateNumber(newItems);
        setAutoList(sortedNewItems);

        // Кэширование полного списка
        const isFullList = !requestFilters.autoStr &&
                          !requestFilters.autoCancelled &&
                          !requestFilters.autoPassEnded &&
                          !requestFilters.autoPassEnds;

        if (isFullList) {
          setCachedFullList(sortedNewItems);
          setCacheTimestamp(Date.now());
        }
      } else {
        // Добавляем только уникальные элементы (на всякий случай) и
        // re-сортируем весь набор, чтобы догруженная страница встала
        // в правильное место по цифрам, а не приклеилась в конец.
        setAutoList(prev => {
            const existingIds = new Set(prev.map(i => i.id));
            const uniqueNewItems = newItems.filter((i: AutoItem) => !existingIds.has(i.id));
            return sortAutoListByPlateNumber([...prev, ...uniqueNewItems]);
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
      // Ignore aborts — a fresh fetch superseded this one, or the hook unmounted.
      if (axios.isCancel(error)) return null;
      console.log('Error fetching auto list:', error);
      if (error.response?.status === 401) {
        redirectToAuth(router);
      }
    } finally {
      if (fetchAbortRef.current === controller) fetchAbortRef.current = null;
      setIsLoading(false);
      setIsRefreshing(false);
      setIsSearching(false);
      setIsLoadingMore(false);
    }
  }, [router]);

  // Загрузка деталей (вынесена для чистоты)
  const loadDetailsForItems = (token: string, items: AutoItem[]) => {
    items.forEach(item => {
      if (item.check_passes_expared) loadPasses(token, item.id);
      if (item.check_diagnostic_card_expared) loadDiagnosticCard(token, item.id);
      if (item.check_fines_expared) loadFines(token, item.id);
      if (item.check_osago_expared) loadOsago(token, item.id);
    });
  };

  // Вспомогательные функции загрузки деталей.
  // Каждая после resolve/reject зовёт reportProviderResult(...) — это
  // питает providerHealth → DataProviderStatusBanner. Контракт успеха:
  // запрос ответил, нет `error`, и data готова (`in_progress != 1` для
  // тех endpoint-ов где есть этот флаг). Retry-итерации НЕ репортим —
  // только финальный исход (успех / exhaust / network error).
  const loadPasses = (token: string, id: string, retries = 3) => {
    api.post('/get-auto-check-passes', { token, id, intervally: 1 }).then(res => {
      if (res.data.error || res.data.in_progress != 1) {
        reportProviderResult('passes', !res.data.error);
        updateAutoItem(id, { ...res.data, check_passes_expared: 0 });
      } else if (retries > 0) {
        setTimeout(() => loadPasses(token, id, retries - 1), 5000);
      } else {
        // Retries exhausted — provider didn't finish in 15s.
        reportProviderResult('passes', false);
        updateAutoItem(id, { check_passes_expared: 0 });
      }
    }).catch(e => {
      reportProviderResult('passes', false);
      updateAutoItem(id, { check_passes_expared: 0 });
    });
  };

  const loadDiagnosticCard = (token: string, id: string, retries = 3) => {
    api.post('/get-auto-check-diagnostic-card', { token, id, intervally: 1 }).then(res => {
        if (res.data.error || res.data.in_progress != 1) {
            reportProviderResult('diagnostic_card', !res.data.error);
            updateAutoItem(id, { ...res.data, check_diagnostic_card_expared: 0 });
        } else if (retries > 0) {
            setTimeout(() => loadDiagnosticCard(token, id, retries - 1), 5000);
        } else {
            reportProviderResult('diagnostic_card', false);
            updateAutoItem(id, { check_diagnostic_card_expared: 0 });
        }
    }).catch(e => {
      reportProviderResult('diagnostic_card', false);
      updateAutoItem(id, { check_diagnostic_card_expared: 0 });
    });
  };

  const loadFines = (token: string, id: string) => {
    api.post('/get-auto-check-fines', { token, id }).then(res => {
      reportProviderResult('fines', !res.data.error);
      updateAutoItem(id, { ...res.data, check_fines_expared: 0 });
    }).catch(e => {
      reportProviderResult('fines', false);
      updateAutoItem(id, { check_fines_expared: 0 });
    });
  };

  const loadOsago = (token: string, id: string) => {
    api.post('/get-auto-check-osago', { token, id }).then(res => {
      reportProviderResult('osago', !res.data.error);
      updateAutoItem(id, { ...res.data, check_osago_expared: 0 });
    }).catch(e => {
      reportProviderResult('osago', false);
      updateAutoItem(id, { check_osago_expared: 0 });
    });
  };

  // Обновление одного элемента в списке
  const updateAutoItem = useCallback((id: string, data: Partial<AutoItem>) => {
    setAutoList(prev => prev.map(item => item.id === id ? { ...item, ...data } : item));
    setCachedFullList(prev => prev.map(item => item.id === id ? { ...item, ...data } : item));
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

  const resetData = useCallback(async () => {
    setIsLoading(true);
    setOffset(0);
    setAutoList([]);
    setAutoListCount(0);
    setCachedFullList([]);
    setCacheTimestamp(0);
    
    const token = await AsyncStorage.getItem('token');
    if (token) {
      // При полном сбросе также сбрасываем фильтры
      const emptyFilters = {
        autoStr: '',
        autoCancelled: false,
        autoPassEnded: false,
        autoPassEnds: false,
        autoPassEndsUntilDate: '',
      };
      setFilters(emptyFilters);
      stateRef.current.filters = emptyFilters;
      stateRef.current.offset = 0;
      stateRef.current.autoListLength = 0;
      
      await fetchAutoList(token, emptyFilters, 0);
    }
    setIsLoading(false);
  }, [fetchAutoList]);

  const loadMore = useCallback(async () => {
    const { isLoading, autoListLength, filters } = stateRef.current;
    // Если уже идет загрузка или загрузили все - выходим
    if (isLoading || autoListLength >= autoListCount) return;

    const newOffset = stateRef.current.offset + AUTO_LIST_LIMIT;
    stateRef.current = { ...stateRef.current, offset: newOffset };
    setOffset(newOffset);

    const token = await AsyncStorage.getItem('token');
    if (token) fetchAutoList(token, filters, newOffset);
  }, [autoListCount, fetchAutoList]);

  // Умная фильтрация
  const setFilterValue = useCallback((key: string, value: any) => {
    // Получаем актуальные фильтры из ref и обновляем их
    const currentFilters = stateRef.current.filters;
    const newFilters = { ...currentFilters, [key]: value };

    // Обновляем состояние и ref
    stateRef.current = { ...stateRef.current, filters: newFilters, offset: 0 };
    setFilters(newFilters);
    setOffset(0);

    if (filterDebounceTimer.current) clearTimeout(filterDebounceTimer.current);

    // При очистке строки поиска (< 3 символов) — мгновенно восстанавливаем полный список
    // из кэша, не обращаясь к серверу (хорошо для UX).
    // Для >= 3 символов всегда идём на сервер: кэш содержит только первую страницу
    // (AUTO_LIST_LIMIT записей), и машина может оказаться на следующих страницах.
    if (key === 'autoStr' && (!value || value.length < 3)) {
      const hasOtherFilters = newFilters.autoCancelled || newFilters.autoPassEnded || newFilters.autoPassEnds;
      if (cachedFullList.length > 0 && !hasOtherFilters) {
        setAutoList(cachedFullList);
        setAutoListCount(cachedFullList.length);
        return;
      }
    }

    filterDebounceTimer.current = setTimeout(async () => {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        setAutoList([]);
        fetchAutoList(token, newFilters, 0);
      }
    }, 500);

  }, [cachedFullList, fetchAutoList]);

  const setFilterValues = useCallback((updates: Record<string, any>) => {
    const currentFilters = stateRef.current.filters;
    const newFilters = { ...currentFilters, ...updates };
    
    stateRef.current = { ...stateRef.current, filters: newFilters, offset: 0 };
    setFilters(newFilters);
    setOffset(0);

    if (filterDebounceTimer.current) clearTimeout(filterDebounceTimer.current);

    filterDebounceTimer.current = setTimeout(async () => {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        setAutoList([]);
        fetchAutoList(token, newFilters, 0);
      }
    }, 500);
  }, [fetchAutoList]);

  const clearFilters = useCallback(async () => {
    const emptyFilters = {
      autoStr: '',
      autoCancelled: false,
      autoPassEnded: false,
      autoPassEnds: false,
      autoPassEndsUntilDate: '',
    };
    stateRef.current = { ...stateRef.current, filters: emptyFilters, offset: 0 };
    setFilters(emptyFilters);
    setOffset(0);
    setAutoList([]); // Очищаем текущий вид

    const now = Date.now();
    if (cachedFullList.length > 0 && (now - cacheTimestamp < CACHE_LIFETIME_MS)) {
      setAutoList(cachedFullList);
      setAutoListCount(cachedFullList.length);
    } else {
      const token = await AsyncStorage.getItem('token');
      if (token) fetchAutoList(token, emptyFilters, 0);
    }
  }, [cachedFullList, cacheTimestamp, fetchAutoList]);

  const decrementNotificationCount = useCallback((count: number) => {
    setUserData(prev => ({
      ...prev,
      notification_unviewed_count: Math.max(0, (prev.notification_unviewed_count || 0) - count)
    }));
  }, []);

  // Latest-wins AbortController: on web, useFocusEffect fires this on every
  // route focus. If the backend is slow (ivan.trans-konsalt.ru sometimes
  // stalls beyond the 30s axios timeout), stacking requests blocks the UI
  // for the full timeout. A new trigger cancels the old request and replaces
  // it with a fresh one. The same controller is aborted on hook unmount.
  const updateUserAbortRef = useRef<AbortController | null>(null);

  const updateUserDataOnly = useCallback(async () => {
    const token = await AsyncStorage.getItem('token');
    if (!token) return;

    updateUserAbortRef.current?.abort();
    const controller = new AbortController();
    updateUserAbortRef.current = controller;

    try {
      const res = await api.post(
        '/get-auto-list',
        { token, auto_list_limit: 0 },
        { signal: controller.signal },
      );
      if (controller.signal.aborted) return;
      if (res.data.user_data) {
        setUserData(res.data.user_data);
        if (res.data.other_user_list) setOtherUserList(res.data.other_user_list);
      }
    } catch (e) {
      if (axios.isCancel(e)) return;
      console.log('UserData update error', e);
    } finally {
      if (updateUserAbortRef.current === controller) updateUserAbortRef.current = null;
    }
  }, []);

  useEffect(() => () => updateUserAbortRef.current?.abort(), []);

  // Abort any lingering /get-auto-list on unmount (logout, route change)
  // so it doesn't resolve with 401 and noise up the console after the
  // user has already left the authenticated area.
  useEffect(() => () => fetchAbortRef.current?.abort(), []);

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
    announceOurServicesVisible,
    setAnnounceOurServicesVisible,

    isLoading,
    isRefreshing,
    isSearching,
    isLoadingMore,

    filters,
    setFilterValue,
    setFilterValues,
    clearFilters,
    
    loadData,
    refreshData,
    resetData,
    loadMore,
    updateAutoItem,
    updateUserDataOnly,
    decrementNotificationCount,
    
    invalidateCache: () => setCacheTimestamp(0)
  };
}
