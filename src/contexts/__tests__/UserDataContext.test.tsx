/**
 * Tests for UserDataContext — the shared snapshot Provider that
 * deduplicates `/get-auto-list` between WebSidebar and AutoListScreen
 * on web. Covers initial state, fetch + dedup, AbortController on
 * unmount, partial sync, optimistic org-swap, and the throw-on-missing
 * -Provider behaviour of useUserData.
 *
 * Out of scope (deferred):
 *   - End-to-end render tests of WebSidebar + AutoListScreen under one
 *     Provider (component-level rendering is awaiting stable jest-expo
 *     for SDK 54; jest config note).
 */
import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { http, HttpResponse } from 'msw';

import {
  UserDataProvider,
  useUserData,
  useOptionalUserData,
} from '../UserDataContext';
import api from '../../services/api';
import {
  server,
  makeGetAutoListResponse,
  makeUserData,
} from '../../test-utils';

const GET_AUTO_LIST = 'https://transapp.ru/api/get-auto-list';

function makeTimeoutError() {
  return Object.assign(new Error('timeout of 60000ms exceeded'), {
    code: 'ECONNABORTED',
    isAxiosError: true,
  });
}

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <UserDataProvider>{children}</UserDataProvider>
);

beforeEach(async () => {
  await AsyncStorage.clear();
  await AsyncStorage.setItem('token', 'test-token');
});

describe('UserDataContext', () => {
  it('initial snapshot is empty', () => {
    const { result } = renderHook(() => useUserData(), { wrapper });

    expect(result.current.userData).toEqual({ id: '', firm: '', inn: '', phone: '' });
    expect(result.current.otherUserList).toEqual([]);
    expect(result.current.autoListCount).toBe(0);
    expect(result.current.ourServicesList).toEqual([]);
    expect(result.current.onboardingExpired).toBe(1);
  });

  it('updateUserData fetches /get-auto-list and applies the snapshot', async () => {
    let lastBody: any = null;
    server.use(
      http.post(GET_AUTO_LIST, async ({ request }) => {
        lastBody = await request.json();
        return HttpResponse.json(makeGetAutoListResponse({
          other_user_list: [
            makeUserData({ inn: '7700000002', firm: 'Org B', user_auto_count: '74' }),
          ],
        }));
      }),
    );

    const { result } = renderHook(() => useUserData(), { wrapper });

    await act(async () => {
      await result.current.updateUserData();
    });

    expect(lastBody.auto_list_limit).toBe(0);
    await waitFor(() => expect(result.current.userData.firm).toBe('ООО Тест'));
    expect(result.current.otherUserList).toHaveLength(1);
    expect(result.current.otherUserList[0].firm).toBe('Org B');
    expect(result.current.autoListCount).toBe(3); // makeGetAutoListResponse default
  });

  it('updateUserData dedupes concurrent callers via in-flight promise', async () => {
    let callCount = 0;
    server.use(
      http.post(GET_AUTO_LIST, async () => {
        callCount += 1;
        // Add tiny delay so two parallel calls overlap.
        await new Promise(r => setTimeout(r, 20));
        return HttpResponse.json(makeGetAutoListResponse());
      }),
    );

    const { result } = renderHook(() => useUserData(), { wrapper });

    // Fire two updateUserData() calls back-to-back; they should share
    // the same in-flight promise and result in only one server call.
    await act(async () => {
      await Promise.all([
        result.current.updateUserData(),
        result.current.updateUserData(),
      ]);
    });

    expect(callCount).toBe(1);
  });

  it('syncFromAutoList applies an externally-fetched response (partial OK)', async () => {
    const { result } = renderHook(() => useUserData(), { wrapper });

    act(() => {
      result.current.syncFromAutoList({
        user_data: makeUserData({ firm: 'External Org', inn: '9999999999' }),
        auto_list_count: '42',
        // Note: no other_user_list / our_services_list / onboarding_expired;
        // partial response should leave those fields untouched.
      });
    });

    await waitFor(() => expect(result.current.userData.firm).toBe('External Org'));
    expect(result.current.userData.inn).toBe('9999999999');
    expect(result.current.autoListCount).toBe(42); // coerced from string
    expect(result.current.otherUserList).toEqual([]); // unchanged
    expect(result.current.onboardingExpired).toBe(1); // unchanged
  });

  it('optimisticOrgSwap moves the target org from otherUserList to userData', async () => {
    const { result } = renderHook(() => useUserData(), { wrapper });

    // Seed the snapshot: current org A, other = [B, C].
    act(() => {
      result.current.syncFromAutoList({
        user_data: makeUserData({ inn: '7700000001', firm: 'Org A' }),
        other_user_list: [
          makeUserData({ inn: '7700000002', firm: 'Org B', user_auto_count: '74' }),
          makeUserData({ inn: '7700000003', firm: 'Org C', user_auto_count: '54' }),
        ],
        auto_list_count: '14',
      });
    });
    await waitFor(() => expect(result.current.userData.inn).toBe('7700000001'));

    // Swap to B.
    act(() => { result.current.optimisticOrgSwap('7700000002'); });

    await waitFor(() => expect(result.current.userData.inn).toBe('7700000002'));
    expect(result.current.userData.firm).toBe('Org B');
    // New active count comes from target's user_auto_count.
    expect(result.current.autoListCount).toBe(74);

    // Other list — previous current (A) is now first, C still present, B gone.
    expect(result.current.otherUserList).toHaveLength(2);
    expect(result.current.otherUserList[0].inn).toBe('7700000001');
    expect(result.current.otherUserList[0].firm).toBe('Org A');
    // Demoted A inherits the *old* top-level autoListCount as its
    // user_auto_count (string-typed) — backend asymmetry workaround.
    expect(result.current.otherUserList[0].user_auto_count).toBe('14');
    expect(result.current.otherUserList[1].inn).toBe('7700000003');
  });

  it('optimisticOrgSwap is a no-op when target inn not in otherUserList', () => {
    const { result } = renderHook(() => useUserData(), { wrapper });

    act(() => {
      result.current.syncFromAutoList({
        user_data: makeUserData({ inn: '7700000001', firm: 'Org A' }),
        other_user_list: [
          makeUserData({ inn: '7700000002', firm: 'Org B' }),
        ],
      });
    });

    act(() => { result.current.optimisticOrgSwap('9999999999'); });

    // userData unchanged, otherUserList unchanged.
    expect(result.current.userData.inn).toBe('7700000001');
    expect(result.current.otherUserList).toHaveLength(1);
    expect(result.current.otherUserList[0].inn).toBe('7700000002');
  });

  it('setUserData supports functional updates (badge-decrement use case)', async () => {
    const { result } = renderHook(() => useUserData(), { wrapper });

    act(() => {
      result.current.syncFromAutoList({
        user_data: makeUserData({ inn: '7700000001', firm: 'A', notification_unviewed_count: 5 }),
      });
    });
    await waitFor(() => expect(result.current.userData.notification_unviewed_count).toBe(5));

    act(() => {
      result.current.setUserData(prev => ({
        ...prev,
        notification_unviewed_count: Math.max(0, (prev.notification_unviewed_count || 0) - 2),
      }));
    });

    expect(result.current.userData.notification_unviewed_count).toBe(3);
    // Other fields preserved.
    expect(result.current.userData.firm).toBe('A');
  });

  it('useUserData throws outside a Provider', () => {
    // Suppress React's error logging for the expected throw.
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useUserData())).toThrow(
      /useUserData must be used within a UserDataProvider/,
    );
    consoleError.mockRestore();
  });

  it('useOptionalUserData returns null outside a Provider', () => {
    const { result } = renderHook(() => useOptionalUserData());
    expect(result.current).toBeNull();
  });

  it('useOptionalUserData returns the value when inside a Provider', () => {
    const { result } = renderHook(() => useOptionalUserData(), { wrapper });
    expect(result.current).not.toBeNull();
    expect(result.current?.userData).toEqual({ id: '', firm: '', inn: '', phone: '' });
  });

  it('autoListCount coerces backend string values to number', async () => {
    server.use(
      http.post(GET_AUTO_LIST, () =>
        HttpResponse.json(makeGetAutoListResponse({ auto_list_count: '157' })),
      ),
    );

    const { result } = renderHook(() => useUserData(), { wrapper });
    await act(async () => { await result.current.updateUserData(); });
    await waitFor(() => expect(result.current.autoListCount).toBe(157));
    // Strictly number, not "157".
    expect(typeof result.current.autoListCount).toBe('number');
  });

  // ───────── loadError + persisted userData (2026-05-20) ─────────

  it('timeout on updateUserData sets loadError but preserves userData', async () => {
    const { result } = renderHook(() => useUserData(), { wrapper });

    // Seed a known-good snapshot first.
    await act(async () => { await result.current.updateUserData(); });
    await waitFor(() => expect(result.current.userData.firm).toBe('ООО Тест'));
    expect(result.current.loadError).toBeNull();

    const spy = jest.spyOn(api, 'post').mockRejectedValueOnce(makeTimeoutError());
    await act(async () => { await result.current.updateUserData(); });
    await waitFor(() => expect(result.current.loadError?.kind).toBe('timeout'));

    // Critical: previous snapshot must survive the failure. Otherwise
    // sidebar / chrome on AutoListScreen.web would blank out.
    expect(result.current.userData.firm).toBe('ООО Тест');
    spy.mockRestore();
  });

  it('successful updateUserData clears a previous loadError', async () => {
    const { result } = renderHook(() => useUserData(), { wrapper });

    const spy = jest.spyOn(api, 'post').mockRejectedValueOnce(makeTimeoutError());
    await act(async () => { await result.current.updateUserData(); });
    await waitFor(() => expect(result.current.loadError?.kind).toBe('timeout'));
    spy.mockRestore();

    await act(async () => { await result.current.updateUserData(); });
    await waitFor(() => expect(result.current.loadError).toBeNull());
  });

  it('restores cached userData from AsyncStorage on Provider mount', async () => {
    const cached = {
      id: '7',
      firm: 'CachedWebFirm',
      inn: '7700088888',
      phone: '+79991234567',
    };
    await AsyncStorage.setItem('ta_user_data_cache_v1', JSON.stringify(cached));

    const { result } = renderHook(() => useUserData(), { wrapper });
    await waitFor(() => expect(result.current.userData.firm).toBe('CachedWebFirm'));
  });

  it('syncFromAutoList persists userData to AsyncStorage', async () => {
    const { result } = renderHook(() => useUserData(), { wrapper });
    act(() => {
      result.current.syncFromAutoList({
        user_data: makeUserData({ firm: 'Persisted Firm', inn: '7700011111' }),
      });
    });

    await waitFor(async () => {
      const raw = await AsyncStorage.getItem('ta_user_data_cache_v1');
      expect(raw).not.toBeNull();
    });
    const raw = await AsyncStorage.getItem('ta_user_data_cache_v1');
    const parsed = JSON.parse(raw!);
    expect(parsed.firm).toBe('Persisted Firm');
    expect(parsed.inn).toBe('7700011111');
  });
});
