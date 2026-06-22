import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import api from '../services/api';
import { classifyLoadError, type LoadError } from '../utils/loadError';
import { readCachedUserData, writeCachedUserData } from '../utils/userDataCache';
import type { ManagerData, OurService, UserData } from '../types/auto';

// Per-request timeout for /get-auto-list — keep in sync with
// useAutoData.GET_AUTO_LIST_TIMEOUT_MS. See rationale there.
// 90s (ADR-024) — cold-call observed up to 21s on prod accounts.
const GET_AUTO_LIST_TIMEOUT_MS = 90000;

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
   * Fetch `/get-auto-list` with `auto_list_limit: 1` (profile-only refresh)
   * and apply the shared snapshot. Concurrent callers share the same
   * in-flight Promise — no duplicate request.
   *
   * Why `1` and not `0`: the legacy handler does `auto_list_limit || 1000`,
   * so `0` (falsy in Perl) expands to a full-fleet scan (≤1000 autos) with
   * ~8–11 sub-queries each. `1` caps it at one auto. `user_data` comes from
   * the session and `auto_list_count` from `FOUND_ROWS()`, both independent
   * of LIMIT, and `syncFromAutoList` never reads `auto_list` here (ADR-030).
   *
   * Used by:
   *   - WebSidebar: mount, pathname change, visibilitychange, post-switchOrg
   *   - AutoListScreen.web: useFocusEffect on route focus
   */
  updateUserData: () => Promise<void>;

  /**
   * Register an externally-owned in-flight `/get-auto-list` (the HEAVY
   * fetch in `useAutoData.fetchAutoList` on web) into the SAME slot that
   * `updateUserData` uses. A concurrent LIGHT `updateUserData()` then
   * defers to it instead of firing a duplicate request — the HEAVY
   * response is a superset and already drives `syncFromAutoList`. The
   * passed promise's rejection is swallowed (HEAVY owns its own
   * error→loadError handling); the slot is cleared on settle via an
   * identity guard so a stale settle never clears a newer fetch. See
   * ADR-028 (cross-call dedup), building on ADR-020/024.
   */
  registerAutoListFetch: (promise: Promise<unknown>) => Promise<void>;

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

  /**
   * Last classified failure of `/get-auto-list` (timeout / network /
   * server / unknown), or `null` if the last call succeeded. Surfaced
   * so AutoListScreen.web can render the same retry banner the mobile
   * screen does. Cleared on next successful response. 401 is not
   * represented here — the axios interceptor already handles it
   * (clear token + redirect).
   */
  loadError: LoadError;
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
  const [loadError, setLoadError] = useState<LoadError>(null);

  // Dedup: concurrent updateUserData calls share the same Promise.
  // Reset to null once the fetch settles.
  const inFlightRef = useRef<Promise<void> | null>(null);
  // Abort the most recent in-flight request when the Provider unmounts.
  const abortRef = useRef<AbortController | null>(null);

  // Cleanup on unmount — abort any pending /get-auto-list. Without
  // this the response would resolve into setState on a dead Provider.
  useEffect(() => () => abortRef.current?.abort(), []);

  // Cold-start restore. Reads `ta_user_data_cache_v1` once on mount
  // (AsyncStorage transparently uses localStorage on web). Guard: only
  // write when local state is still empty (`firm === ''`) so a fast
  // /get-auto-list response that races ahead of storage.read isn't
  // overwritten with a stale snapshot.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cached = await readCachedUserData();
      if (cancelled || !cached) return;
      setUserData(prev => (prev.firm ? prev : cached));
    })();
    return () => { cancelled = true; };
  }, []);

  const syncFromAutoList = useCallback((data: AutoListResponseLike) => {
    if (data.user_data) {
      setUserData(data.user_data);
      // Persist for cold-start restore (single owner on web — see
      // useAutoData skip-guard).
      writeCachedUserData(data.user_data);
    }
    if (data.other_user_list) setOtherUserList(data.other_user_list);
    if (data.our_services_list) setOurServicesList(data.our_services_list);
    // `auto_list_count` ships as a string from backend ("14"); coerce.
    if (data.auto_list_count !== undefined && data.auto_list_count !== null) {
      setAutoListCount(Number(data.auto_list_count) || 0);
    }
    if (data.onboarding_expired !== undefined) {
      setOnboardingExpired(data.onboarding_expired);
    }
    // Any successful sync drops a stale banner.
    setLoadError(null);
  }, []);

  const updateUserData = useCallback(async (): Promise<void> => {
    // Dedup: if a refresh is already in flight, return that Promise.
    // The second caller awaits the same result without firing a new
    // request — primary purpose of this context.
    if (inFlightRef.current) return inFlightRef.current;

    const token = await AsyncStorage.getItem('token');
    if (!token) return;

    // Ordering-independent cross-call dedup (ADR-028). Defer to an
    // in-flight HEAVY fetch (useAutoData.fetchAutoList) so we don't fire a
    // duplicate /get-auto-list — the HEAVY response is a superset and
    // already drives syncFromAutoList.
    //   • First check: HEAVY's effect ran first → its marker is already
    //     in the slot.
    //   • If not, yield one microtask: when the SCREEN's loadData and the
    //     SIDEBAR's updateUserData both await `getItem` in the same commit,
    //     HEAVY registers its marker synchronously right after its own
    //     getItem resolves. The extra microtask lets that registration
    //     win regardless of which effect fired first.
    // Two concurrent LIGHT callers still collapse to one request: the
    // second re-check sees the first's inFlightRef and defers.
    if (inFlightRef.current) return inFlightRef.current;
    await Promise.resolve();
    if (inFlightRef.current) return inFlightRef.current;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const fetchPromise = (async () => {
      try {
        const res = await api.post(
          '/get-auto-list',
          // `1` (not `0`): legacy `auto_list_limit || 1000` turns `0` into a
          // full-fleet scan; profile/count come regardless of LIMIT (ADR-030).
          { token, auto_list_limit: 1 },
          { signal: controller.signal, timeout: GET_AUTO_LIST_TIMEOUT_MS },
        );
        if (controller.signal.aborted) return;
        syncFromAutoList(res.data);
      } catch (e: any) {
        // Ignore aborts (expected when a fresh trigger supersedes us).
        if (axios.isCancel(e)) return;
        console.log('UserDataContext.updateUserData error', e);
        // 401 is handled by the axios interceptor (clear token +
        // redirect). For everything else surface a classified error
        // so AutoListScreen.web can render the retry banner.
        // durationMs lets classifyLoadError disambiguate
        // ERR_NETWORK-on-timeout from real network failure (ADR-024).
        if (e?.response?.status !== 401) {
          const t0 = e?.config?.metadata?.t0;
          const durationMs = typeof t0 === 'number' ? Date.now() - t0 : undefined;
          setLoadError(classifyLoadError(e, {
            durationMs,
            timeoutMs: GET_AUTO_LIST_TIMEOUT_MS,
          }));
        }
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
        inFlightRef.current = null;
      }
    })();

    inFlightRef.current = fetchPromise;
    return fetchPromise;
  }, [syncFromAutoList]);

  const registerAutoListFetch = useCallback((promise: Promise<unknown>): Promise<void> => {
    // Normalize to Promise<void> and swallow rejection so a deferring
    // LIGHT caller's await never throws — HEAVY owns its error handling.
    const marker = promise.then(() => undefined, () => undefined);
    inFlightRef.current = marker;
    // Identity guard: only clear if this marker still owns the slot, so a
    // newer fetch that overwrote inFlightRef isn't cleared by our settle.
    void marker.finally(() => {
      if (inFlightRef.current === marker) inFlightRef.current = null;
    });
    return marker;
  }, []);

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
    registerAutoListFetch,
    syncFromAutoList,
    optimisticOrgSwap,
    setUserData,
    loadError,
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
