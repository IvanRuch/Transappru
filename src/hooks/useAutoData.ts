import { useState, useRef, useCallback, useEffect } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { isCancel } from 'axios';
import api from '../services/api';
import { redirectToAuth } from '../utils/redirectToAuth';
import { sortAutoListByPlateNumber } from '../utils/plateHelpers';
import { setCachedUserId } from '../utils/userIdCache';
import { classifyLoadError, type LoadError } from '../utils/loadError';
import { readCachedUserData, writeCachedUserData } from '../utils/userDataCache';
import { useOptionalUserData } from '../contexts/UserDataContext';
import type { AutoItem, UserData, ManagerData, OurService } from '../types/auto';
import type { SortMode } from '../components/auto/SortToggle';

// Per-request timeout for /get-auto-list. The global axios timeout is
// 30s (see src/services/api.ts), which is fine for most endpoints, but
// /get-auto-list does heavy server-side aggregation (user_data + auto
// list + counts) and on cold sessions for some accounts blows past 30s.
// A real prod cold-call observed in adb logcat took 21s; subsequent
// calls dropped to ~3s. 90s gives the backend full headroom for the
// first hit (incl. slow mobile networks) without an auto-retry storm;
// users see a clear error UI with manual Retry only when this expires
// (see AutoListLoadError). Keep in sync with UserDataContext.
// See ADR-023 (introduced 60s) and ADR-024 (bumped to 90s).
export const GET_AUTO_LIST_TIMEOUT_MS = 90000;

const AUTO_LIST_LIMIT = 10;
// Generous upper bound for the load-all strategy used in `plate_digits`
// sort mode. The current max fleet size is 150 vehicles (3 customers
// above 100), so 2000 covers ~13× headroom — backend will trim to the
// real `auto_list_count` anyway. If a future customer ever exceeds this,
// the random-shuffle bug returns (see Phase 1 risk table in
// `.claude/plans/2026-05-14-auto-list-sort-toggle.md`) — fix is Phase 2.
const LOAD_ALL_LIMIT = 2000;
const CACHE_LIFETIME_MS = 5 * 60 * 1000; // 5 минут
const SORT_MODE_STORAGE_KEY = 'ta_sort_mode';
const SORT_BANNER_DISMISSED_STORAGE_KEY = 'ta_sort_banner_dismissed';
// Default to lexicographic (server's natural ordering). Users who want
// numeric plate sort opt in via the toggle — that triggers load-all and
// shows the info banner. See ADR-018.
const DEFAULT_SORT_MODE: SortMode = 'lexicographic';

// Synchronously read the persisted sort mode from web localStorage so the
// first render already uses the user's choice. On native we can't read
// AsyncStorage synchronously, so we fall back to DEFAULT_SORT_MODE and
// rehydrate from AsyncStorage in a mount effect (one extra refetch if the
// stored value differs from the default — acceptable, fires once per
// session).
function readInitialSortMode(): SortMode {
  if (Platform.OS === 'web') {
    try {
      const stored = localStorage.getItem(SORT_MODE_STORAGE_KEY);
      if (stored === 'plate_digits' || stored === 'lexicographic') return stored;
    } catch {}
  }
  return DEFAULT_SORT_MODE;
}

function readInitialSortBannerDismissed(): boolean {
  if (Platform.OS === 'web') {
    try {
      return localStorage.getItem(SORT_BANNER_DISMISSED_STORAGE_KEY) === '1';
    } catch {}
  }
  return false;
}

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

// Module-level in-flight Promise for `updateUserDataOnly` on native.
// Mirrors the web-side dedup in UserDataContext.inFlightRef (ADR-020):
// any concurrent caller while a request is in flight gets the existing
// Promise instead of starting a second parallel /get-auto-list. Module
// scope rather than useRef because hook unmount/remount must not lose
// the guard — same pattern as `_onboardingRedirectDone` /
// `_announceShown` above. Cleared in the finally block. See ADR-024.
let _inFlightUpdateUserData: Promise<void> | null = null;

export function useAutoData() {
  const router = useRouter();

  // Shared snapshot context (web only, mounted by app/(authenticated)/_layout.web.tsx).
  // `null` on native and on auth screens — code below transparently
  // falls back to the local state in that case. See ADR-020.
  const userDataCtx = useOptionalUserData();

  // Данные пользователя и сервисов
  // On web (under Provider) these local cells are kept in sync from the
  // context via the reflection effect below, so AutoListScreen / sidebar
  // consumers that read `autoListHook.userData` keep working unchanged
  // while the canonical state lives in the Context (single source).
  // On native they are the primary source as before.
  const [userData, setUserData] = useState<UserData>({ id: '', firm: '', inn: '', phone: '' });
  const [managerData, setManagerData] = useState<ManagerData>({});
  const [techSupportData, setTechSupportData] = useState<ManagerData>({});
  const [techSupportName, setTechSupportName] = useState('');
  const [userList, setUserList] = useState<UserData[]>([]);
  const [otherUserList, setOtherUserList] = useState<UserData[]>([]);
  const [ourServicesList, setOurServicesList] = useState<OurService[]>([]);
  const [onboardingExpired, setOnboardingExpired] = useState<number | string>(1);
  const [announceOurServicesVisible, setAnnounceOurServicesVisible] = useState(false);

  // Reflection from Context → local mirror (web only). Mirrors shared
  // fields whenever the Context's snapshot changes (e.g. WebSidebar
  // triggered `updateUserData()`), so AutoListScreen.web sees the same
  // user data even if useAutoData itself did not fetch.
  // No-op on native (userDataCtx is null there).
  // Состояние списка авто
  const [autoList, setAutoList] = useState<AutoItem[]>([]);
  // `autoListCount` is a shared field — kept in local mirror on web and
  // as primary state on native. Backend ships it as a string ("14");
  // normalisation to number happens in UserDataContext.syncFromAutoList
  // on web (single point) and at the assignment site on native (see
  // `Number(data.auto_list_count) || 0` below).
  const [autoListCount, setAutoListCount] = useState<number>(0);

  // Reflection from Context → local mirror (web only). Mirrors shared
  // fields whenever the Context's snapshot changes (e.g. WebSidebar
  // triggered `updateUserData()`), so AutoListScreen.web sees the same
  // user data even if useAutoData itself did not fetch.
  // No-op on native (userDataCtx is null there).
  useEffect(() => {
    if (!userDataCtx) return;
    setUserData(userDataCtx.userData);
    setOtherUserList(userDataCtx.otherUserList);
    setOurServicesList(userDataCtx.ourServicesList);
    setOnboardingExpired(userDataCtx.onboardingExpired);
    setAutoListCount(userDataCtx.autoListCount);
  }, [
    userDataCtx?.userData,
    userDataCtx?.otherUserList,
    userDataCtx?.ourServicesList,
    userDataCtx?.onboardingExpired,
    userDataCtx?.autoListCount,
    userDataCtx,
  ]);
  
  // Флаги загрузки
  const [isLoading, setIsLoading] = useState(false); // Глобальная загрузка (первый вход)
  const [isRefreshing, setIsRefreshing] = useState(false); // Обновление списка (pull-to-refresh)
  const [isSearching, setIsSearching] = useState(false); // Поиск/фильтрация
  const [isLoadingMore, setIsLoadingMore] = useState(false); // Дозагрузка (пагинация)

  // Last classified failure of /get-auto-list (timeout / network / 5xx /
  // unknown). Cleared on every successful response. Surfaced through
  // useAutoList so AutoListScreen can render AutoListLoadError with a
  // retry button instead of an empty list + missing chrome. 401 does
  // NOT land here — the axios interceptor handles it (clear token +
  // redirect to auth).
  const [loadError, setLoadError] = useState<LoadError>(null);
  
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

  // Сортировка
  // `plate_digits` — клиентская сортировка по числовому сегменту ГРЗ + load-all
  // стратегия (один запрос со всем парком, дозагрузка отключена). Это решает
  // проблему "шевеления" списка при дозагрузке (см. ADR-018 и план
  // `.claude/plans/2026-05-14-auto-list-sort-toggle.md`).
  //
  // `lexicographic` — серверный порядок (backend сортирует по `auto_number`
  // лексикографически), обычная постраничная пагинация. Стабильный порядок
  // при дозагрузке без клиентской сортировки.
  //
  // Phase 2: когда backend поддержит `sort_by` параметр, оба режима будут
  // использовать обычную пагинацию, разница только в значении параметра.
  const [sortMode, setSortModeState] = useState<SortMode>(readInitialSortMode);
  const [sortBannerDismissed, setSortBannerDismissed] = useState<boolean>(
    readInitialSortBannerDismissed,
  );

  // Кэш
  const [cachedFullList, setCachedFullList] = useState<AutoItem[]>([]);
  const [cacheTimestamp, setCacheTimestamp] = useState<number>(0);

  // Refs для избежания замыканий в асинхронных функциях
  const stateRef = useRef({
    filters,
    offset,
    sortMode,
    autoListLength: 0,
    isLoading: false
  });

  // Синхронизация ref
  useEffect(() => {
    stateRef.current = {
      filters,
      offset,
      sortMode,
      autoListLength: autoList.length,
      isLoading: isLoading || isRefreshing || isSearching || isLoadingMore
    };
  }, [filters, offset, sortMode, autoList.length, isLoading, isRefreshing, isSearching, isLoadingMore]);

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
    // Web cross-call dedup (ADR-028): publish an in-flight marker into the
    // shared UserDataContext slot SYNCHRONOUSLY — before any await — so a
    // concurrent LIGHT updateUserData() in the same render commit defers to
    // this HEAVY fetch instead of firing a duplicate /get-auto-list. The
    // HEAVY response is a superset and already feeds syncFromAutoList below.
    // Native (userDataCtx === null) skips this. Resolved in `finally`.
    let settleMarker: (() => void) | undefined;
    if (userDataCtx) {
      const marker = new Promise<void>(res => { settleMarker = res; });
      userDataCtx.registerAutoListFetch(marker);
    }

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

    // Режим сортировки на момент запроса определяет стратегию загрузки:
    //   plate_digits  → один запрос со всем парком, дозагрузка отключена
    //   lexicographic → обычная постраничная пагинация (10 на страницу)
    const activeSortMode = stateRef.current.sortMode;
    const requestLimit = activeSortMode === 'plate_digits' ? LOAD_ALL_LIMIT : AUTO_LIST_LIMIT;
    // В режиме plate_digits offset всегда 0 (мы грузим всё разом). Защита от
    // случайного вызова loadMore'ом с другого пути.
    const effectiveOffset = activeSortMode === 'plate_digits' ? 0 : requestOffset;

    try {
      console.log(
        'fetchAutoList: filters =', JSON.stringify(requestFilters),
        'offset =', effectiveOffset, 'limit =', requestLimit, 'sortMode =', activeSortMode,
      );
      const res = await api.post(
        '/get-auto-list',
        {
          token,
          auto_str: requestFilters.autoStr,
          auto_cancelled: requestFilters.autoCancelled ? 1 : 0,
          auto_pass_ended: requestFilters.autoPassEnded ? 1 : 0,
          auto_pass_ends: requestFilters.autoPassEnds ? 1 : 0,
          auto_pass_ends_until_date: requestFilters.autoPassEndsUntilDate,
          auto_list_from: effectiveOffset,
          auto_list_limit: requestLimit,
        },
        { signal: controller.signal, timeout: GET_AUTO_LIST_TIMEOUT_MS },
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
        // Cache the legacy user.id for cross-screen access (e.g. the
        // DataIssueReportButton on the auto detail screen — see ADR-012,
        // src/utils/userIdCache.ts). Best-effort, never throws.
        void setCachedUserId(data.user_data.id);
        // Persist for cold-start restore on native. On web the
        // UserDataContext.syncFromAutoList call below owns persistence,
        // so we skip here to avoid double writes.
        if (!userDataCtx) writeCachedUserData(data.user_data);
        setManagerData(data.user_data.manager_data || data.manager_data || {});

        const tsData = data.user_data.tech_support_data || {};
        setTechSupportData(tsData);
        setTechSupportName(tsData.name || '');

        setUserList(data.user_list || []);
        setOtherUserList(data.other_user_list || []);
        setOurServicesList(data.our_services_list || []);
      }

      // Success — drop any stale error banner the user might still see.
      setLoadError(null);
      
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

      // Обновление списка. Стратегия зависит от sortMode:
      //   plate_digits  → пришёл полный набор (load-all), сортируем клиентски
      //                   по числовому сегменту ГРЗ. requestOffset всегда 0.
      //   lexicographic → серверный лексикографический порядок, клиентская
      //                   сортировка НЕ применяется. Дозагрузка приклеивается
      //                   в конец списка (порядок остаётся стабильным).
      const applyPlateSort = activeSortMode === 'plate_digits';

      if (effectiveOffset === 0) {
        const processedItems = applyPlateSort
          ? sortAutoListByPlateNumber(newItems)
          : newItems;
        setAutoList(processedItems);

        // Кэширование полного списка (только в режиме plate_digits — там
        // действительно загружен весь парк одним запросом). В режиме
        // lexicographic кэшировать первую страницу из 10 авто не имеет
        // смысла: при возврате после поиска нужно всё равно идти на сервер.
        const isFullList = applyPlateSort &&
                          !requestFilters.autoStr &&
                          !requestFilters.autoCancelled &&
                          !requestFilters.autoPassEnded &&
                          !requestFilters.autoPassEnds;

        if (isFullList) {
          setCachedFullList(processedItems);
          setCacheTimestamp(Date.now());
        }
      } else {
        // Дозагрузка приходит только в режиме lexicographic
        // (loadMore — no-op для plate_digits). Просто приклеиваем уникальные
        // элементы в конец, серверный порядок уже корректен.
        setAutoList(prev => {
            const existingIds = new Set(prev.map(i => i.id));
            const uniqueNewItems = newItems.filter((i: AutoItem) => !existingIds.has(i.id));
            return [...prev, ...uniqueNewItems];
        });
      }

      // Обновление счётчика. Backend возвращает `auto_list_count` с учётом
      // активных фильтров (отфильтрованный total), поэтому используем это
      // значение напрямую и в первой странице, и в дозагрузке. Это
      // согласовано с `loadMore` проверкой `autoListLength >= autoListCount`
      // — она корректно остановится только когда мы реально догрузили всё
      // отфильтрованное множество. См. ADR-019. Backend ships counts as
      // strings ("14") — coerce explicitly so downstream numeric comparisons
      // do not get a string back.
      setAutoListCount(Number(data.auto_list_count) || 0);

      // Web only: also publish shared fields to the UserDataContext so
      // WebSidebar (which reads exclusively from Context) sees the same
      // snapshot as the screen. Drift between Context and local state
      // is impossible because both writes originate from the same
      // response object. The reflection effect at the top of this hook
      // mirrors Context → local for updates that originate from the
      // sidebar (e.g. its visibilitychange / pathname triggers).
      // No-op on native (userDataCtx === null). See ADR-020.
      if (userDataCtx) {
        userDataCtx.syncFromAutoList(data);
      }

      return data;
    } catch (error: any) {
      // Ignore aborts — a fresh fetch superseded this one, or the hook unmounted.
      if (isCancel(error)) return null;
      console.log('Error fetching auto list:', error);
      if (error.response?.status === 401) {
        redirectToAuth(router);
      } else {
        // Classify so the UI can show a meaningful retry banner instead
        // of an empty list with hidden chrome. 401 is intentionally
        // excluded — the interceptor already cleared the token and
        // we're redirecting to auth, so a banner would never paint.
        // durationMs lets the classifier disambiguate native
        // ERR_NETWORK-on-timeout from real network failure (ADR-024).
        const t0 = error.config?.metadata?.t0;
        const durationMs = typeof t0 === 'number' ? Date.now() - t0 : undefined;
        setLoadError(classifyLoadError(error, {
          durationMs,
          timeoutMs: GET_AUTO_LIST_TIMEOUT_MS,
        }));
      }
    } finally {
      // Release the cross-call dedup slot (ADR-028). A deferring LIGHT
      // caller resolves here; if this fetch was aborted/failed before
      // syncFromAutoList, a superseding HEAVY has already re-registered.
      settleMarker?.();
      if (fetchAbortRef.current === controller) fetchAbortRef.current = null;
      setIsLoading(false);
      setIsRefreshing(false);
      setIsSearching(false);
      setIsLoadingMore(false);
    }
  }, [router, userDataCtx]);

  // Загрузка деталей (вынесена для чистоты)
  const loadDetailsForItems = (token: string, items: AutoItem[]) => {
    items.forEach(item => {
      if (item.check_passes_expared) loadPasses(token, item.id);
      if (item.check_diagnostic_card_expared) loadDiagnosticCard(token, item.id);
      if (item.check_fines_expared) loadFines(token, item.id);
      if (item.check_osago_expared) loadOsago(token, item.id);
    });
  };

  // Вспомогательные функции загрузки деталей. До PR-2 здесь жили вызовы
  // `reportProviderResult(...)` которые питали Phase 1 баннер
  // (PR #18, ADR-012 заменил подход); теперь источник баннера —
  // backend `/payment-api/system-notice`, см. `useSystemNotice`.
  const loadPasses = (token: string, id: string, retries = 3) => {
    api.post('/get-auto-check-passes', { token, id, intervally: 1 }).then(res => {
      if (res.data.error || res.data.in_progress != 1) {
        updateAutoItem(id, { ...res.data, check_passes_expared: 0 });
      } else if (retries > 0) {
        setTimeout(() => loadPasses(token, id, retries - 1), 5000);
      } else {
        // Retries exhausted — provider didn't finish in 15s.
        updateAutoItem(id, { check_passes_expared: 0 });
      }
    }).catch(_ => {
      updateAutoItem(id, { check_passes_expared: 0 });
    });
  };

  const loadDiagnosticCard = (token: string, id: string, retries = 3) => {
    api.post('/get-auto-check-diagnostic-card', { token, id, intervally: 1 }).then(res => {
        if (res.data.error || res.data.in_progress != 1) {
            updateAutoItem(id, { ...res.data, check_diagnostic_card_expared: 0 });
        } else if (retries > 0) {
            setTimeout(() => loadDiagnosticCard(token, id, retries - 1), 5000);
        } else {
            updateAutoItem(id, { check_diagnostic_card_expared: 0 });
        }
    }).catch(_ => {
      updateAutoItem(id, { check_diagnostic_card_expared: 0 });
    });
  };

  const loadFines = (token: string, id: string) => {
    api.post('/get-auto-check-fines', { token, id }).then(res => {
      updateAutoItem(id, { ...res.data, check_fines_expared: 0 });
    }).catch(_ => {
      updateAutoItem(id, { check_fines_expared: 0 });
    });
  };

  const loadOsago = (token: string, id: string) => {
    api.post('/get-auto-check-osago', { token, id }).then(res => {
      updateAutoItem(id, { ...res.data, check_osago_expared: 0 });
    }).catch(_ => {
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
    // Clear stale banner immediately so retry feels responsive.
    // If the new fetch also fails, the catch in fetchAutoList will set it again.
    setLoadError(null);
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
    const { isLoading, autoListLength, filters, sortMode } = stateRef.current;
    // В режиме plate_digits весь парк уже загружен одним запросом — дозагрузка
    // не нужна и не должна срабатывать (см. ADR-018). Защита от случайного
    // вызова из FlatList onEndReached.
    if (sortMode === 'plate_digits') return;
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
        // Web: publish the count change to Context so WebSidebar stays
        // in sync without an extra /get-auto-list fetch (cache-restore
        // path bypasses the network entirely).
        if (userDataCtx) {
          userDataCtx.syncFromAutoList({ auto_list_count: cachedFullList.length });
        }
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
      if (userDataCtx) {
        userDataCtx.syncFromAutoList({ auto_list_count: cachedFullList.length });
      }
    } else {
      const token = await AsyncStorage.getItem('token');
      if (token) fetchAutoList(token, emptyFilters, 0);
    }
  }, [cachedFullList, cacheTimestamp, fetchAutoList, userDataCtx]);

  const decrementNotificationCount = useCallback((count: number) => {
    const updater = (prev: UserData): UserData => ({
      ...prev,
      notification_unviewed_count: Math.max(0, (prev.notification_unviewed_count || 0) - count),
    });
    // Web: route through Context so WebSidebar's badge updates too.
    // Native: local state only (no sidebar to sync with).
    if (userDataCtx) {
      userDataCtx.setUserData(updater);
    } else {
      setUserData(updater);
    }
  }, [userDataCtx]);

  // Переключение режима сортировки. Persist'им выбор в AsyncStorage
  // (одинаково на mobile и web — на web AsyncStorage прозрачно работает
  // через localStorage). Запускаем перезагрузку списка с правильной
  // стратегией для нового режима (load-all для plate_digits, постраничный
  // для lexicographic).
  const setSortMode = useCallback(async (mode: SortMode) => {
    if (mode === stateRef.current.sortMode) return;

    stateRef.current = { ...stateRef.current, sortMode: mode, offset: 0 };
    setSortModeState(mode);
    setOffset(0);
    // Очищаем кэш — в каждом режиме у нас разный source-of-truth: в
    // plate_digits это полный список, в lexicographic — текущая страница.
    setCachedFullList([]);
    setCacheTimestamp(0);
    setAutoList([]);

    try {
      await AsyncStorage.setItem(SORT_MODE_STORAGE_KEY, mode);
    } catch (e) {
      console.log('Failed to persist sort mode', e);
    }

    const token = await AsyncStorage.getItem('token');
    if (token) fetchAutoList(token, stateRef.current.filters, 0);
  }, [fetchAutoList]);

  const dismissSortBanner = useCallback(async () => {
    setSortBannerDismissed(true);
    try {
      await AsyncStorage.setItem(SORT_BANNER_DISMISSED_STORAGE_KEY, '1');
    } catch (e) {
      console.log('Failed to persist sort banner dismissal', e);
    }
  }, []);

  // Native hydrate: на web `readInitialSortMode` уже синхронно поднял
  // сохранённое значение из localStorage при первом render'е. На native
  // AsyncStorage асинхронный, поэтому первый render использует
  // DEFAULT_SORT_MODE, а здесь мы догоняем реальное значение и при
  // необходимости пересохраняем через `setSortMode` (что запустит перезагрузку
  // списка с правильной стратегией).
  useEffect(() => {
    if (Platform.OS === 'web') return;
    let cancelled = false;
    (async () => {
      try {
        const [storedMode, storedDismissed] = await Promise.all([
          AsyncStorage.getItem(SORT_MODE_STORAGE_KEY),
          AsyncStorage.getItem(SORT_BANNER_DISMISSED_STORAGE_KEY),
        ]);
        if (cancelled) return;
        if (
          (storedMode === 'plate_digits' || storedMode === 'lexicographic') &&
          storedMode !== stateRef.current.sortMode
        ) {
          setSortMode(storedMode);
        }
        if (storedDismissed === '1') setSortBannerDismissed(true);
      } catch (e) {
        console.log('Failed to hydrate sort mode', e);
      }
    })();
    return () => { cancelled = true; };
  }, [setSortMode]);

  // Latest-wins AbortController: on web, useFocusEffect fires this on every
  // route focus. If the backend is slow (ivan.trans-konsalt.ru sometimes
  // stalls beyond the 30s axios timeout), stacking requests blocks the UI
  // for the full timeout. A new trigger cancels the old request and replaces
  // it with a fresh one. The same controller is aborted on hook unmount.
  const updateUserAbortRef = useRef<AbortController | null>(null);

  const updateUserDataOnly = useCallback(async (): Promise<void> => {
    // Web: delegate to the shared UserDataContext (single source on web,
    // in-flight dedup, one /get-auto-list across sidebar+screen). Older
    // call sites that still invoke this method via `autoListHook` won't
    // produce a duplicate request.
    if (userDataCtx) {
      await userDataCtx.updateUserData();
      return;
    }

    // Native path: own fetch (no Context, no sidebar). Dedup any
    // concurrent caller via the module-level in-flight Promise
    // (ADR-024) — symmetric to UserDataContext.inFlightRef on web.
    if (_inFlightUpdateUserData) return _inFlightUpdateUserData;

    const promise = (async () => {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      updateUserAbortRef.current?.abort();
      const controller = new AbortController();
      updateUserAbortRef.current = controller;

      try {
        const res = await api.post(
          '/get-auto-list',
          { token, auto_list_limit: 0 },
          { signal: controller.signal, timeout: GET_AUTO_LIST_TIMEOUT_MS },
        );
        if (controller.signal.aborted) return;
        if (res.data.user_data) {
          setUserData(res.data.user_data);
          void setCachedUserId(res.data.user_data.id);
          writeCachedUserData(res.data.user_data);
          if (res.data.other_user_list) setOtherUserList(res.data.other_user_list);
        }
      } catch (e) {
        if (isCancel(e)) return;
        console.log('UserData update error', e);
      } finally {
        if (updateUserAbortRef.current === controller) updateUserAbortRef.current = null;
      }
    })();

    _inFlightUpdateUserData = promise;
    try {
      await promise;
    } finally {
      _inFlightUpdateUserData = null;
    }
  }, [userDataCtx]);

  useEffect(() => () => updateUserAbortRef.current?.abort(), []);

  // Abort any lingering /get-auto-list on unmount (logout, route change)
  // so it doesn't resolve with 401 and noise up the console after the
  // user has already left the authenticated area.
  useEffect(() => () => fetchAbortRef.current?.abort(), []);

  // Cold-start restore of userData on native. On web the
  // UserDataProvider owns persistence/restore (single source — see
  // ADR-020), and the reflection effect above mirrors it into local
  // state, so we skip here.
  //
  // Guard: only write if the local state is still empty (firm === '').
  // A fresh /get-auto-list response can race ahead of AsyncStorage.read
  // and we must not overwrite it with a stale snapshot.
  useEffect(() => {
    if (userDataCtx) return;
    let cancelled = false;
    (async () => {
      const cached = await readCachedUserData();
      if (cancelled || !cached) return;
      setUserData(prev => (prev.firm ? prev : cached));
    })();
    return () => { cancelled = true; };
  }, [userDataCtx]);

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
    loadError,

    filters,
    setFilterValue,
    setFilterValues,
    clearFilters,

    sortMode,
    setSortMode,
    sortBannerDismissed,
    dismissSortBanner,

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
