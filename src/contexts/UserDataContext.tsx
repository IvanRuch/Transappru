import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import api from '../services/api';
import type { ManagerData, OurService, UserData } from '../types/auto';

/**
 * Shape of `/get-auto-list` response fields that consumers of this
 * context care about. Defined as a permissive type so callers can pass
 * the raw response object (e.g. from useAutoData) without massaging it.
 */
export interface AutoListResponseLike {
  user_data?: UserData & { manager_data?: ManagerData; tech_support_data?: ManagerData };
  other_user_list?: UserData[];
  our_services_list?: OurService[];
  auto_list_count?: number | string;
  onboarding_expired?: number | string;
}

export interface UserDataContextValue {
  // Shared snapshot — single source of truth on web for fields that
  // both WebSidebar and AutoListScreen.web render.
  userData: UserData;
  otherUserList: UserData[];
  autoListCount: number;
  ourServicesList: OurService[];
  onboardingExpired: number | string;

  /**
   * Fetch `/get-auto-list` with `auto_list_limit: 0` and apply the
   * shared snapshot. Concurrent callers share the same in-flight
   * Promise — no duplicate request.
   *
   * Used by:
   *   - WebSidebar: mount, pathname change, visibilitychange, post-switchOrg
   *   - AutoListScreen.web: useFocusEffect on route focus
   */
  updateUserData: () => Promise<void>;

  /**
   * Apply a `/get-auto-list` response received elsewhere (e.g. from
   * useAutoData's main `fetchAutoList`) without firing a new request.
   * Lets useAutoData drive the shared snapshot when it already has
   * fresh data in hand. Partial responses are tolerated — missing
   * keys leave the existing snapshot untouched.
   */
  syncFromAutoList: (data: AutoListResponseLike) => void;

  /**
   * Optimistic-swap helper used by WebSidebar.switchOrg. Moves the
   * target org from `otherUserList` into `userData` and demotes the
   * previous current org into `otherUserList` — before the background
   * refresh lands. Mirrors the logic that used to live inline in
   * WebSidebar.
   */
  optimisticOrgSwap: (targetInn: string) => void;

  /**
   * Functional update of `userData`. Exposed so consumers can patch
   * a single field (e.g. `notification_unviewed_count` decrement)
   * without re-fetching. Keeps the Context as the single source of
   * truth on web — any field change on userData must go through this
   * setter or `syncFromAutoList`, so drift between Context and
   * consumers is impossible.
   */
  setUserData: React.Dispatch<React.SetStateAction<UserData>>;
}

const UserDataContext = createContext<UserDataContextValue | null>(null);

const EMPTY_USER_DATA: UserData = { id: '', firm: '', inn: '', phone: '' };

interface UserDataProviderProps {
  children: React.ReactNode;
}

/**
 * Mounts in `app/(authenticated)/_layout.web.tsx` so both WebSidebar
 * (inside the layout chrome) and the authenticated screens (children)
 * read the same snapshot. Not mounted on native — there is no sidebar
 * to deduplicate against, and `useAutoData` carries the local state
 * on its own (see `useSharedAutoListState`).
 *
 * Lifecycle:
 *   - In-flight dedup via `inFlightRef` so concurrent updateUserData
 *     callers share one Promise.
 *   - AbortController per refresh; on unmount the latest controller
 *     is aborted so we don't touch state on a dead component.
 *   - On 401 the axios interceptor clears the token (matches the
 *     existing useAutoData / WebSidebar behaviour).
 */
export function UserDataProvider({ children }: UserDataProviderProps) {
  const [userData, setUserData] = useState<UserData>(EMPTY_USER_DATA);
  const [otherUserList, setOtherUserList] = useState<UserData[]>([]);
  const [autoListCount, setAutoListCount] = useState<number>(0);
  const [ourServicesList, setOurServicesList] = useState<OurService[]>([]);
  const [onboardingExpired, setOnboardingExpired] = useState<number | string>(1);

  // Dedup: concurrent updateUserData calls share the same Promise.
  // Reset to null once the fetch settles.
  const inFlightRef = useRef<Promise<void> | null>(null);
  // Abort the most recent in-flight request when the Provider unmounts.
  const abortRef = useRef<AbortController | null>(null);

  // Cleanup on unmount — abort any pending /get-auto-list. Without
  // this the response would resolve into setState on a dead Provider.
  useEffect(() => () => abortRef.current?.abort(), []);

  const syncFromAutoList = useCallback((data: AutoListResponseLike) => {
    if (data.user_data) setUserData(data.user_data);
    if (data.other_user_list) setOtherUserList(data.other_user_list);
    if (data.our_services_list) setOurServicesList(data.our_services_list);
    // `auto_list_count` ships as a string from backend ("14"); coerce.
    if (data.auto_list_count !== undefined && data.auto_list_count !== null) {
      setAutoListCount(Number(data.auto_list_count) || 0);
    }
    if (data.onboarding_expired !== undefined) {
      setOnboardingExpired(data.onboarding_expired);
    }
  }, []);

  const updateUserData = useCallback(async (): Promise<void> => {
    // Dedup: if a refresh is already in flight, return that Promise.
    // The second caller awaits the same result without firing a new
    // request — primary purpose of this context.
    if (inFlightRef.current) return inFlightRef.current;

    const token = await AsyncStorage.getItem('token');
    if (!token) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const fetchPromise = (async () => {
      try {
        const res = await api.post(
          '/get-auto-list',
          { token, auto_list_limit: 0 },
          { signal: controller.signal },
        );
        if (controller.signal.aborted) return;
        syncFromAutoList(res.data);
      } catch (e) {
        // Ignore aborts (expected when a fresh trigger supersedes us).
        // Other errors are silent — sidebar is non-critical, axios
        // interceptor handles 401 by clearing the token.
        if (axios.isCancel(e)) return;
        console.log('UserDataContext.updateUserData error', e);
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
        inFlightRef.current = null;
      }
    })();

    inFlightRef.current = fetchPromise;
    return fetchPromise;
  }, [syncFromAutoList]);

  const optimisticOrgSwap = useCallback((targetInn: string) => {
    // Find the target org in otherUserList. If missing — no-op (the
    // background refresh will reconcile anyway).
    setOtherUserList(prevList => {
      const target = prevList.find(o => o.inn === targetInn);
      if (!target) return prevList;

      // Swap: target → active, previous active → first in otherUserList.
      // The previous current org is by definition confirmed (you can
      // only switch from a confirmed org), so we mark both flags.
      const demoted: UserData = {
        ...userData,
        // Backend asymmetry: user_auto_count is absent on `user_data`.
        // The trustworthy count for the previous active org is the
        // top-level `auto_list_count` we already have in state.
        user_auto_count: String(autoListCount),
        user_confirmed: 1,
        phone_inn_confirmed: 1,
      };

      // New active org gets promoted; its user_auto_count becomes the
      // new top-level autoListCount.
      setUserData(target);
      if (target.user_auto_count !== undefined) {
        setAutoListCount(Number(target.user_auto_count) || 0);
      }

      return [demoted, ...prevList.filter(o => o.inn !== targetInn)];
    });
  }, [userData, autoListCount]);

  const value: UserDataContextValue = {
    userData,
    otherUserList,
    autoListCount,
    ourServicesList,
    onboardingExpired,
    updateUserData,
    syncFromAutoList,
    optimisticOrgSwap,
    setUserData,
  };

  return (
    <UserDataContext.Provider value={value}>
      {children}
    </UserDataContext.Provider>
  );
}

/**
 * Throws if called outside Provider. Use in components that are
 * unambiguously inside the authenticated web layout (WebSidebar,
 * AutoListScreen.web). For components that may be rendered both
 * inside and outside the Provider (useAutoData), see
 * `useOptionalUserData`.
 */
export function useUserData(): UserDataContextValue {
  const ctx = useContext(UserDataContext);
  if (!ctx) {
    throw new Error('useUserData must be used within a UserDataProvider');
  }
  return ctx;
}

/**
 * Returns null if no Provider is mounted (native, auth screens).
 * Used by `useAutoData` so the same hook works on both platforms:
 * with Provider → reads/writes through context, without Provider →
 * falls back to its own local state.
 */
export function useOptionalUserData(): UserDataContextValue | null {
  return useContext(UserDataContext);
}
