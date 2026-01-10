import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import Api from '../services/api';
import { ChargeItem, ChargesByAuto } from '../types/charges';
import type { AutoItem } from '../types/auto';

// Кэш для данных начислений (на всю сессию)
let cachedAutoCharges: ChargesByAuto = {};
let cachedOtherCharges: ChargeItem[] = [];
let cachedAutoList: AutoItem[] = [];
let cacheTimestamp: number = 0;
let lastRefreshTimestamp: number = 0;
let isBackgroundLoadingInProgress: boolean = false; // Флаг для предотвращения множественных запусков
let cachedCompanyInn: string = ''; // ИНН компании для которой закэшированы данные
const MIN_REFRESH_INTERVAL = 10 * 1000; // Минимум 10 секунд между обновлениями (защита от спама)

export const useCharges = (autoListFromParent?: AutoItem[]) => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoCharges, setAutoCharges] = useState<ChargesByAuto>({});
  const [otherCharges, setOtherCharges] = useState<ChargeItem[]>([]);
  const [userId, setUserId] = useState<string>('');
  const [autoList, setAutoList] = useState<AutoItem[]>([]);
  const [loadingAutoFines, setLoadingAutoFines] = useState<Record<string, boolean>>({});
  const [backgroundLoading, setBackgroundLoading] = useState(false);
  
  // Флаг для отмены фоновой загрузки при размонтировании
  const isMountedRef = useRef(true);

  // Загрузка всех начислений
  const loadCharges = useCallback(async (forceRefresh: boolean = false) => {
    try {
      console.log('loadCharges: Starting to load charges...');
      
      // Получаем текущий ИНН компании
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        router.replace('/');
        return;
      }
      
      const sessionRes = await Api.post('/get-session-data', { token });
      const userData = sessionRes.data.session_data?.user_data;
      const currentInn = userData?.inn || '';
      
      console.log(`loadCharges: Current company INN: ${currentInn}, Cached INN: ${cachedCompanyInn}`);
      
      // Если компания изменилась - инвалидируем кэш
      if (cachedCompanyInn && currentInn !== cachedCompanyInn) {
        console.log('loadCharges: ⚠️ Company changed! Invalidating cache...');
        cachedAutoCharges = {};
        cachedOtherCharges = [];
        cachedAutoList = [];
        cacheTimestamp = 0;
        lastRefreshTimestamp = 0;
        isBackgroundLoadingInProgress = false;
        forceRefresh = true;
      }
      
      // Сохраняем текущий ИНН
      cachedCompanyInn = currentInn;
      
      // Проверяем кэш ПЕРЕД setLoading
      const now = Date.now();
      const cacheAge = cacheTimestamp > 0 ? Math.round((now - cacheTimestamp) / 1000) : -1;
      const hasCachedData = cachedAutoList.length > 0 || cachedOtherCharges.length > 0;
      
      console.log(`loadCharges: Cache check - timestamp: ${cacheTimestamp}, age: ${cacheAge}s, hasCachedData: ${hasCachedData}, forceRefresh: ${forceRefresh}`);
      
      // Используем кэш если он есть и не форсируем обновление
      if (!forceRefresh && hasCachedData) {
        console.log(`loadCharges: ✅ Using cached data (age: ${cacheAge}s)`);
        console.log(`loadCharges: Cached auto charges count: ${Object.keys(cachedAutoCharges).length}`);
        
        setAutoList(cachedAutoList);
        setAutoCharges(cachedAutoCharges); // Восстанавливаем ВСЕ загруженные штрафы из кэша
        setOtherCharges(cachedOtherCharges);
        setLoading(false);
        setRefreshing(false);
        
        // Если в кэше нет загруженных штрафов - запускаем фоновую загрузку
        if (Object.keys(cachedAutoCharges).length === 0) {
          const token = await AsyncStorage.getItem('token');
          if (token) {
            console.log('loadCharges: Cache has no fines data, starting background loading...');
            loadFinesInBackground(cachedAutoList, token);
          }
        }
        
        return;
      }
      
      console.log('loadCharges: ❌ Cache miss or expired, fetching fresh data...');
      setLoading(true);
      
      // Используем уже полученные данные сессии
      const currentUserId = userData?.id;
      console.log('loadCharges: userId from session =', currentUserId);
      
      if (currentUserId) {
        setUserId(currentUserId);
      }

      // 2. Получаем список авто (используем переданный или загружаем новый)
      let fetchedAutoList: AutoItem[] = [];
      
      if (autoListFromParent && autoListFromParent.length > 0) {
        console.log('loadCharges: Using auto list from parent, count =', autoListFromParent.length);
        fetchedAutoList = autoListFromParent;
      } else {
        console.log('loadCharges: Fetching auto list...');
        const autoListRes = await Api.post('/get-auto-list', { 
          token,
          auto_str: '',
          auto_cancelled: false,
          auto_pass_ended: false,
          auto_pass_ends: false,
          auto_pass_ends_until_date: '',
          auto_list_from: 0,
          auto_list_limit: 1000
        });
        fetchedAutoList = autoListRes.data.auto_list || [];
        console.log('loadCharges: Auto list received, count =', fetchedAutoList.length);
      }
      
      // Сохраняем список авто в state
      setAutoList(fetchedAutoList);
      
      // 3. НЕ загружаем детали штрафов сразу - используем сводную информацию из autoList
      // Детали будут загружены в фоне
      console.log('loadCharges: Using summary info from auto list, details will be loaded in background');
      
      // Логируем первые 5 авто для проверки check_fines_count
      console.log('loadCharges: Sample autos with check_fines_count:');
      fetchedAutoList.slice(0, 5).forEach(auto => {
        console.log(`  ${auto.auto_number}: check_fines_count=${auto.check_fines_count}, check_fines_sum=${auto.check_fines_sum}`);
      });

      // Сохраняем в кэш (пока без других начислений)
      cachedAutoList = fetchedAutoList;
      cacheTimestamp = Date.now();
      
      // autoCharges будет пустым - детали загрузятся в фоне
      setAutoCharges({});
      setOtherCharges([]); // Пока пустые, загрузим после штрафов
      
      // 4. Запускаем фоновую загрузку штрафов для авто с check_fines_sum > 0
      // После завершения загрузим другие начисления
      loadFinesInBackground(fetchedAutoList, token, currentUserId);

    } catch (error: any) {
      console.error('Error loading charges:', error);
      if (error.response?.status === 401) {
        await AsyncStorage.removeItem('token');
        router.replace('/');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router, autoListFromParent]);

  // Фоновая загрузка штрафов для авто с check_fines_sum > 0
  const loadFinesInBackground = useCallback(async (autosList: AutoItem[], token: string, userId?: string) => {
    // Проверяем, не идет ли уже фоновая загрузка
    if (isBackgroundLoadingInProgress) {
      console.log('loadFinesInBackground: Already in progress, skipping');
      return;
    }
    
    console.log('loadFinesInBackground: Checking autos...', autosList.length);
    
    const autosWithPotentialFines = autosList.filter(auto => {
      const finesSum = parseFloat(String(auto.check_fines_sum || '0'));
      if (finesSum > 0) {
        console.log(`Auto ${auto.auto_number}: check_fines_sum = ${auto.check_fines_sum} (${finesSum})`);
      }
      return finesSum > 0;
    });
    
    console.log(`loadFinesInBackground: Found ${autosWithPotentialFines.length} autos with potential fines`);
    
    if (autosWithPotentialFines.length === 0) {
      console.log('loadFinesInBackground: No autos with potential fines, loading other charges immediately');
      // Если нет авто со штрафами, сразу загружаем другие начисления
      await loadOtherCharges(userId);
      return;
    }
    
    console.log(`loadFinesInBackground: Loading fines for ${autosWithPotentialFines.length} autos in background...`);
    isBackgroundLoadingInProgress = true;
    cachedAutoCharges = {}; // Очищаем кэш перед новой загрузкой
    setBackgroundLoading(true);
    
    // Загружаем штрафы последовательно, чтобы не перегрузить сервер
    for (const auto of autosWithPotentialFines) {
      try {
        const res = await Api.post('/get-auto-fines', { token, id: auto.id });
        const allFines = res.data.auto_fine_data?.unpaid_list || [];
        
        // Фильтруем только реально неоплаченные штрафы
        const unpaidList = allFines.filter((fine: any) => fine.is_paid === '0' || fine.is_paid === 0);
        
        console.log(`loadFinesInBackground: Auto ${auto.auto_number} - ${unpaidList.length} unpaid (${allFines.length} total)`);
        
        // Сохраняем только если есть реальные штрафы
        if (unpaidList.length > 0) {
          const newChargeData = {
            autoId: auto.id,
            grz: auto.auto_number,
            charges: unpaidList
          };
          
          // Обновляем кэш (всегда)
          cachedAutoCharges = {
            ...cachedAutoCharges,
            [auto.auto_number]: newChargeData
          };
          
          // Обновляем state (всегда - React сам проигнорирует если компонент размонтирован)
          setAutoCharges(prev => ({
            ...prev,
            [auto.auto_number]: newChargeData
          }));
        }
      } catch (error) {
        console.error(`Error loading fines for auto ${auto.id}:`, error);
      }
    }
    
    console.log('loadFinesInBackground: Fines loading completed, loading other charges...');
    
    // После завершения загрузки штрафов загружаем другие начисления
    await loadOtherCharges(userId);
    
    // Сбрасываем флаги только после загрузки других начислений
    isBackgroundLoadingInProgress = false;
    setBackgroundLoading(false);
    console.log('loadFinesInBackground: All background loading completed');
  }, []);

  // Загрузка других начислений
  const loadOtherCharges = useCallback(async (userId?: string) => {
    if (!userId) {
      console.log('loadOtherCharges: No userId, skipping');
      return;
    }
    
    try {
      console.log('loadOtherCharges: Fetching other charges...');
      const res = await Api.get(`/undefined?user_id=${userId}`);
      const allCharges = res.data || [];
      
      // Фильтруем только неоплаченные начисления
      const otherChargesData = allCharges.filter((charge: any) => charge.is_paid === '0' || charge.is_paid === 0);
      
      console.log(`loadOtherCharges: Other charges loaded: ${otherChargesData.length} unpaid (${allCharges.length} total)`);
      
      // Сохраняем в кэш
      cachedOtherCharges = otherChargesData;
      
      // Обновляем state (всегда, даже если компонент размонтирован - React сам обработает)
      setOtherCharges(otherChargesData);
    } catch (error) {
      console.error('Error loading other charges:', error);
      cachedOtherCharges = [];
      setOtherCharges([]);
    }
  }, []);

  // Загрузка деталей штрафов для конкретного авто
  const loadAutoFines = useCallback(async (autoId: string) => {
    try {
      setLoadingAutoFines(prev => ({ ...prev, [autoId]: true }));
      
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      console.log(`loadAutoFines: Loading fines for auto ${autoId}...`);
      
      const res = await Api.post('/get-auto-fines', { token, id: autoId });
      const allFines = res.data.auto_fine_data?.unpaid_list || [];
      
      // Фильтруем только реально неоплаченные штрафы
      const unpaidList = allFines.filter((fine: any) => fine.is_paid === '0' || fine.is_paid === 0);
      
      console.log(`loadAutoFines: Loaded ${unpaidList.length} unpaid fines (${allFines.length} total) for auto ${autoId}`);
      
      // Находим авто в списке
      const auto = autoList.find(a => a.id === autoId);
      if (auto) {
        // Сохраняем данные даже если штрафов нет (для корректного отображения)
        setAutoCharges(prev => ({
          ...prev,
          [auto.auto_number]: {
            autoId: auto.id,
            grz: auto.auto_number,
            charges: unpaidList
          }
        }));
      }
    } catch (error) {
      console.error(`Error loading fines for auto ${autoId}:`, error);
    } finally {
      setLoadingAutoFines(prev => ({ ...prev, [autoId]: false }));
    }
  }, [autoList]);

  // Обновление данных (pull-to-refresh или кнопка)
  const refresh = useCallback(async () => {
    const now = Date.now();
    const timeSinceLastRefresh = now - lastRefreshTimestamp;
    
    // Защита от спама - минимум 10 секунд между обновлениями
    if (timeSinceLastRefresh < MIN_REFRESH_INTERVAL) {
      const remainingSeconds = Math.ceil((MIN_REFRESH_INTERVAL - timeSinceLastRefresh) / 1000);
      console.log(`refresh: Too soon! Wait ${remainingSeconds} more seconds`);
      return { blocked: true, remainingSeconds };
    }
    
    console.log('refresh: Starting manual refresh...');
    lastRefreshTimestamp = now;
    setRefreshing(true);
    await loadCharges(true);
    setRefreshing(false);
    return { blocked: false };
  }, [loadCharges]);

  // Подсчет общей суммы начислений
  const getTotalAmount = useCallback(() => {
    let total = 0;

    // Суммируем начисления по авто
    Object.values(autoCharges).forEach(group => {
      group.charges.forEach(charge => {
        total += parseFloat(charge.sum) || 0;
      });
    });

    // Суммируем другие начисления
    otherCharges.forEach(charge => {
      total += parseFloat(charge.sum) || 0;
    });

    return total;
  }, [autoCharges, otherCharges]);

  // Подсчет количества начислений
  const getTotalCount = useCallback(() => {
    let count = 0;

    Object.values(autoCharges).forEach(group => {
      count += group.charges.length;
    });

    count += otherCharges.length;

    return count;
  }, [autoCharges, otherCharges]);

  // Получить все начисления единым списком с сортировкой по дате
  const getAllCharges = useCallback(() => {
    const allCharges: ChargeItem[] = [];

    // Добавляем начисления по авто
    Object.values(autoCharges).forEach(group => {
      allCharges.push(...group.charges);
    });

    // Добавляем другие начисления
    allCharges.push(...otherCharges);

    // Сортируем по дате (новые первыми)
    allCharges.sort((a, b) => {
      const dateA = new Date(a.dat || a.offense_at || '').getTime();
      const dateB = new Date(b.dat || b.offense_at || '').getTime();
      return dateB - dateA; // Сортировка по убыванию (новые первыми)
    });

    return allCharges;
  }, [autoCharges, otherCharges]);

  // Получить только авто с реально загруженными штрафами
  const getAutosWithFines = useCallback(() => {
    return autoList.filter(auto => {
      const charges = autoCharges[auto.auto_number];
      return charges && charges.charges.length > 0;
    });
  }, [autoList, autoCharges]);

  // Получить статистику по типам штрафов для конкретного авто
  const getFineTypeStats = useCallback((autoNumber: string) => {
    const charges = autoCharges[autoNumber];
    if (!charges || charges.charges.length === 0) {
      return null;
    }

    const stats = {
      platon: { count: 0, sum: 0 },
      gibdd: { count: 0, sum: 0 },
      total: { count: charges.charges.length, sum: 0 }
    };

    charges.charges.forEach(charge => {
      const sum = parseFloat(charge.sum) || 0;
      stats.total.sum += sum;

      if (charge.is_platon === '1' || charge.is_platon === 1) {
        stats.platon.count++;
        stats.platon.sum += sum;
      } else {
        stats.gibdd.count++;
        stats.gibdd.sum += sum;
      }
    });

    return stats;
  }, [autoCharges]);

  // Функция для инвалидации кэша (например, при смене организации)
  const invalidateCache = useCallback(() => {
    console.log('useCharges: Invalidating cache...');
    cachedAutoCharges = {};
    cachedOtherCharges = [];
    cachedAutoList = [];
    cacheTimestamp = 0;
    lastRefreshTimestamp = 0;
    isBackgroundLoadingInProgress = false;
    cachedCompanyInn = ''; // Очищаем ИНН чтобы форсировать проверку
    
    // Перезагружаем данные
    loadCharges(true);
  }, [loadCharges]);

  // Загрузка при монтировании и cleanup при размонтировании
  useEffect(() => {
    isMountedRef.current = true;
    loadCharges();
    
    return () => {
      isMountedRef.current = false;
      console.log('useCharges: Component unmounted, background loading will continue but state updates will be skipped');
    };
  }, [loadCharges]);

  // Синхронизация state с кэшем во время фоновой загрузки
  useEffect(() => {
    // Проверяем глобальный флаг, а не локальный state
    if (!isBackgroundLoadingInProgress && !backgroundLoading) return;
    
    console.log('useCharges: Starting cache sync interval during background loading');
    const interval = setInterval(() => {
      // Синхронизируем autoCharges
      setAutoCharges(prev => {
        const currentCacheSize = Object.keys(cachedAutoCharges).length;
        const currentStateSize = Object.keys(prev).length;
        
        if (currentCacheSize > currentStateSize) {
          console.log(`useCharges: Syncing state with cache (${currentStateSize} -> ${currentCacheSize})`);
          return { ...cachedAutoCharges };
        }
        return prev;
      });
      
      // Синхронизируем otherCharges
      setOtherCharges(prev => {
        if (cachedOtherCharges.length > 0 && prev.length === 0) {
          console.log(`useCharges: Syncing other charges (${prev.length} -> ${cachedOtherCharges.length})`);
          return [...cachedOtherCharges];
        }
        return prev;
      });
      
      // Проверяем глобальный флаг ПОСЛЕ синхронизации
      if (!isBackgroundLoadingInProgress) {
        console.log('useCharges: Background loading completed, stopping sync after final sync');
        clearInterval(interval);
      }
    }, 500); // Проверяем каждые 500ms
    
    return () => {
      console.log('useCharges: Stopping cache sync interval');
      clearInterval(interval);
    };
  }, [backgroundLoading]);

  return {
    loading,
    refreshing,
    autoCharges,
    otherCharges,
    autoList,
    userId,
    refresh,
    invalidateCache,
    getTotalAmount,
    getTotalCount,
    getAllCharges,
    getAutosWithFines,
    getFineTypeStats,
    loadAutoFines,
    loadingAutoFines,
    backgroundLoading,
    lastUpdateTime: cacheTimestamp,
  };
};
