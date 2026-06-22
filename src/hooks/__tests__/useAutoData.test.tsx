/**
 * Tests for useAutoData — the central hook of the authenticated area.
 * ~530 LOC of state machines: load / cache / filter / pagination /
 * latest-wins AbortController / org-switch reload. Covers the highest
 * traffic + highest regression-risk paths via MSW-mocked /get-auto-list.
 *
 * Out of scope (deferred — see .claude/plans/2026-04-30-test-coverage-improvement.md):
 *   - Latest-wins AbortController (two concurrent fetches; jsdom
 *     adapter for axios doesn't expose abort controller behaviour
 *     in a way that lets us assert ordering reliably).
 *   - 5-minute cache lifetime (requires fake timers + careful
 *     interaction with debounce; separate test file when worth it).
 *   - Org switch (lives in switchOrganization util, already covered
 *     by switchOrganization.test.ts).
 */
import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { http, HttpResponse } from 'msw';

import { useAutoData } from '../useAutoData';
import { UserDataProvider, useUserData } from '../../contexts/UserDataContext';
import api from '../../services/api';
import {
  server,
  makeGetAutoListResponse,
  makeAutoList,
  makeUserData,
} from '../../test-utils';

const GET_AUTO_LIST = 'https://transapp.ru/api/get-auto-list';

// Synthetic axios-shaped errors. classifyLoadError checks specific
// fields (`code === 'ECONNABORTED'`, `response`, `request`), so we
// reproduce them rather than relying on MSW (real timeouts are too
// slow for unit tests).
function makeTimeoutError() {
  return Object.assign(new Error('timeout of 60000ms exceeded'), {
    code: 'ECONNABORTED',
    isAxiosError: true,
  });
}
function makeNetworkError() {
  return Object.assign(new Error('Network Error'), {
    isAxiosError: true,
    request: {},
  });
}
function makeServerError(status = 500) {
  return Object.assign(new Error(`Request failed with status code ${status}`), {
    isAxiosError: true,
    response: { status, data: {} },
    request: {},
  });
}

beforeEach(async () => {
  await AsyncStorage.clear();
  await AsyncStorage.setItem('token', 'test-token');
});

describe('useAutoData', () => {
  it('loadData fills autoList, userData, autoListCount from /get-auto-list', async () => {
    const { result } = renderHook(() => useAutoData());

    await act(async () => {
      await result.current.loadData();
    });
    await waitFor(() => expect(result.current.autoList).toHaveLength(3));

    expect(result.current.userData.firm).toBe('ООО Тест');
    expect(result.current.userData.inn).toBe('7700000001');
    // Backend ships counts as strings; useAutoData coerces them to number
    // at the assignment site (ADR-020 normalisation point) so downstream
    // numeric comparisons in loadMore / count rendering work without
    // ad-hoc `Number(...)` coercion at every read site.
    expect(result.current.autoListCount).toBe(3);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isRefreshing).toBe(false);
  });

  it('updateAutoItem merges partial fields without losing others', async () => {
    const { result } = renderHook(() => useAutoData());
    await act(async () => { await result.current.loadData(); });
    await waitFor(() => expect(result.current.autoList).toHaveLength(3));

    const before = result.current.autoList.find(i => i.id === '1')!;
    expect(before.auto_number).toBe('А100АА77');

    act(() => {
      result.current.updateAutoItem('1', {
        check_fines_count: 5,
        check_fines_sum: '500',
      });
    });

    const after = result.current.autoList.find(i => i.id === '1')!;
    expect(after.auto_number).toBe('А100АА77');             // preserved
    expect(after.auto_number_base).toBe('А100АА');           // preserved
    expect(after.check_fines_count).toBe(5);                 // merged
    expect(after.check_fines_sum).toBe('500');               // merged
  });

  it('updateAutoItem leaves other items untouched', async () => {
    const { result } = renderHook(() => useAutoData());
    await act(async () => { await result.current.loadData(); });
    await waitFor(() => expect(result.current.autoList).toHaveLength(3));

    const otherBefore = result.current.autoList.find(i => i.id === '2')!;

    act(() => {
      result.current.updateAutoItem('1', { check_fines_count: 99 });
    });

    const otherAfter = result.current.autoList.find(i => i.id === '2')!;
    expect(otherAfter).toEqual(otherBefore);
    expect(otherAfter.check_fines_count).not.toBe(99);
  });

  it('plate_digits mode loads the entire fleet in one request and sorts by digits', async () => {
    // ADR-018: in plate_digits mode loadMore is a no-op (see test below),
    // because the whole fleet is fetched in one big request. Coverage for
    // the lexicographic-mode pagination path lives in
    // "loadMore paginates in lexicographic mode".
    // Backend returns cars in lex order; client should re-sort by digit
    // run so consumers see plate-digit ordering.
    const lexCars = [
      { id: '5', auto_number: 'А500АА77', auto_number_base: 'А500АА' },
      { id: '1', auto_number: 'А100АА77', auto_number_base: 'А100АА' },
      { id: '9', auto_number: 'А900АА77', auto_number_base: 'А900АА' },
    ];
    server.use(
      http.post(GET_AUTO_LIST, () =>
        HttpResponse.json(makeGetAutoListResponse({
          auto_list: lexCars as any,
          auto_list_count: '3',
        })),
      ),
    );

    const { result } = renderHook(() => useAutoData());
    // Default is lexicographic; opt into plate_digits explicitly.
    await act(async () => { await result.current.setSortMode('plate_digits'); });
    await waitFor(() => expect(result.current.autoList).toHaveLength(3));

    expect(result.current.autoList.map(a => a.auto_number)).toEqual([
      'А100АА77', 'А500АА77', 'А900АА77',
    ]);
  });

  it('on 401 — token is cleared by api interceptor', async () => {
    server.use(
      http.post(GET_AUTO_LIST, () => new HttpResponse(null, { status: 401 })),
    );

    expect(await AsyncStorage.getItem('token')).toBe('test-token');

    const { result } = renderHook(() => useAutoData());
    await act(async () => { await result.current.loadData(); });

    await waitFor(async () => {
      expect(await AsyncStorage.getItem('token')).toBeNull();
    });
    expect(result.current.isLoading).toBe(false);
  });

  it('resetData clears autoList, count, and filters before refetching', async () => {
    const { result } = renderHook(() => useAutoData());

    await act(async () => { await result.current.loadData(); });
    await waitFor(() => expect(result.current.autoList).toHaveLength(3));

    // Set a filter, then resetData should clear it.
    act(() => { result.current.setFilterValue('autoCancelled', true); });
    expect(result.current.filters.autoCancelled).toBe(true);

    await act(async () => { await result.current.resetData(); });
    // resetData re-fetches with empty filters; await the new list.
    await waitFor(() => expect(result.current.autoList).toHaveLength(3));

    expect(result.current.filters.autoStr).toBe('');
    expect(result.current.filters.autoCancelled).toBe(false);
    expect(result.current.filters.autoPassEnded).toBe(false);
    expect(result.current.filters.autoPassEnds).toBe(false);
  });

  it('loadData also surfaces other_user_list and our_services_list', async () => {
    server.use(
      http.post(GET_AUTO_LIST, () => HttpResponse.json(
        makeGetAutoListResponse({
          other_user_list: [
            makeUserData({ inn: '7700000002', firm: 'Org B', user_auto_count: '74' }),
            makeUserData({ inn: '7700000003', firm: 'Org C', user_auto_count: '54' }),
          ],
          our_services_list: [
            { id: 's1', name: 'svc-a', header: 'Service A' },
          ],
        }),
      )),
    );

    const { result } = renderHook(() => useAutoData());
    await act(async () => { await result.current.loadData(); });
    await waitFor(() => expect(result.current.otherUserList).toHaveLength(2));

    expect(result.current.otherUserList[0].firm).toBe('Org B');
    expect(result.current.otherUserList[0].user_auto_count).toBe('74');
    expect(result.current.otherUserList[1].user_auto_count).toBe('54');
    expect(result.current.ourServicesList).toHaveLength(1);
    expect(result.current.ourServicesList[0].header).toBe('Service A');
  });

  // ───────── Sort mode (plate_digits / lexicographic) — ADR-018 ─────────

  it('defaults sortMode to lexicographic and requests with AUTO_LIST_LIMIT (10)', async () => {
    // Server returns vehicles in non-numeric lex order; client should preserve it
    // in lexicographic mode (no client-side re-sort by plate digits).
    const lexOrderCars = [
      { id: '1', auto_number: 'А900АА77', auto_number_base: 'А900АА' },
      { id: '2', auto_number: 'А100АА77', auto_number_base: 'А100АА' },
      { id: '3', auto_number: 'А500АА77', auto_number_base: 'А500АА' },
    ];
    let lastBody: any = null;
    server.use(
      http.post(GET_AUTO_LIST, async ({ request }) => {
        lastBody = await request.json();
        return HttpResponse.json(makeGetAutoListResponse({
          auto_list: lexOrderCars as any,
          auto_list_count: '3',
        }));
      }),
    );

    const { result } = renderHook(() => useAutoData());
    await act(async () => { await result.current.loadData(); });
    await waitFor(() => expect(result.current.autoList).toHaveLength(3));

    expect(result.current.sortMode).toBe('lexicographic');
    expect(lastBody.auto_list_limit).toBe(10);
    expect(lastBody.auto_list_from).toBe(0);
    // Order from server preserved — no client-side numeric re-sort.
    expect(result.current.autoList.map(a => a.auto_number)).toEqual([
      'А900АА77', 'А100АА77', 'А500АА77',
    ]);
  });

  it('plate_digits mode requests with LOAD_ALL_LIMIT and offset 0', async () => {
    let lastBody: any = null;
    server.use(
      http.post(GET_AUTO_LIST, async ({ request }) => {
        lastBody = await request.json();
        return HttpResponse.json(makeGetAutoListResponse());
      }),
    );

    const { result } = renderHook(() => useAutoData());
    await act(async () => { await result.current.setSortMode('plate_digits'); });
    await waitFor(() => expect(result.current.autoList).toHaveLength(3));

    expect(result.current.sortMode).toBe('plate_digits');
    // Load-all limit is 2000 (see useAutoData.ts LOAD_ALL_LIMIT). Offset
    // is always 0 in plate_digits mode regardless of caller's request.
    expect(lastBody.auto_list_limit).toBe(2000);
    expect(lastBody.auto_list_from).toBe(0);
  });

  it('setSortMode persists the choice to AsyncStorage', async () => {
    const { result } = renderHook(() => useAutoData());
    await act(async () => { await result.current.loadData(); });
    await waitFor(() => expect(result.current.autoList).toHaveLength(3));

    // Default is lexicographic — switch to plate_digits first, then back.
    await act(async () => { await result.current.setSortMode('plate_digits'); });
    expect(await AsyncStorage.getItem('ta_sort_mode')).toBe('plate_digits');

    await act(async () => { await result.current.setSortMode('lexicographic'); });
    expect(await AsyncStorage.getItem('ta_sort_mode')).toBe('lexicographic');
  });

  it('hydrates sortMode from AsyncStorage on mount (native path)', async () => {
    // Default is lexicographic; verify hydrate by storing the non-default
    // value and asserting the hook picks it up after mount.
    await AsyncStorage.setItem('ta_sort_mode', 'plate_digits');

    const { result } = renderHook(() => useAutoData());

    // Effect runs AsyncStorage.getItem then sets state; wait for it.
    await waitFor(() => expect(result.current.sortMode).toBe('plate_digits'));
  });

  it('loadMore is a no-op in plate_digits mode', async () => {
    let callCount = 0;
    server.use(
      http.post(GET_AUTO_LIST, () => {
        callCount += 1;
        return HttpResponse.json(makeGetAutoListResponse());
      }),
    );

    const { result } = renderHook(() => useAutoData());
    // Default is lexicographic; opt into plate_digits to exercise load-all.
    await act(async () => { await result.current.setSortMode('plate_digits'); });
    await waitFor(() => expect(result.current.autoList).toHaveLength(3));
    expect(result.current.sortMode).toBe('plate_digits');

    const callsBefore = callCount;
    await act(async () => { await result.current.loadMore(); });
    // No extra fetch — load-all mode considers the list already complete.
    expect(callCount).toBe(callsBefore);
  });

  it('loadMore paginates in lexicographic mode with limit=10', async () => {
    const observed: { from: number; limit: number }[] = [];
    server.use(
      http.post(GET_AUTO_LIST, async ({ request }) => {
        const body: any = await request.json();
        observed.push({
          from: body.auto_list_from || 0,
          limit: body.auto_list_limit,
        });
        const offset: number = body.auto_list_from || 0;
        const cars = offset === 0
          ? makeAutoList(10)
          : makeAutoList(5).map((it, i) => ({
              ...it,
              id: String(11 + i),
              auto_number: `А${200 + i}АА77`,
              auto_number_base: `А${200 + i}АА`,
            }));
        return HttpResponse.json(makeGetAutoListResponse({
          auto_list: cars,
          auto_list_count: '15',
        }));
      }),
    );

    const { result } = renderHook(() => useAutoData());
    // Default is lexicographic already; just kick off the load.
    await act(async () => { await result.current.loadData(); });
    await waitFor(() => expect(result.current.autoList).toHaveLength(10));

    await act(async () => { await result.current.loadMore(); });
    await waitFor(() => expect(result.current.autoList).toHaveLength(15));

    // Both pagination requests used limit=10; second request used offset=10.
    const lexRequests = observed.filter(r => r.limit === 10);
    expect(lexRequests.length).toBeGreaterThanOrEqual(2);
    expect(lexRequests[lexRequests.length - 1].from).toBe(10);
  });

  it('dismissSortBanner persists and updates state', async () => {
    const { result } = renderHook(() => useAutoData());
    expect(result.current.sortBannerDismissed).toBe(false);

    await act(async () => { await result.current.dismissSortBanner(); });
    expect(result.current.sortBannerDismissed).toBe(true);
    expect(await AsyncStorage.getItem('ta_sort_banner_dismissed')).toBe('1');
  });

  // ───────── ADR-019: trust server auto_list_count for filtered lists ─────────

  it('filter with partial result on first page does not block loadMore', async () => {
    // Regression test for ADR-018 follow-up #1, fixed in ADR-019.
    //
    // Before ADR-019 useAutoData overwrote `autoListCount` to the current
    // page size whenever `hasActiveFilters && requestOffset === 0 &&
    // newItems.length < serverCount`. That made `loadMore` exit early on
    // its `autoListLength >= autoListCount` guard, silently leaving the
    // user with only the first page of filtered results — the extra
    // matches on the next page were unreachable.
    //
    // Fix: trust the server's `auto_list_count` (which already accounts
    // for active filters) unconditionally.
    server.use(
      http.post(GET_AUTO_LIST, async ({ request }) => {
        const body: any = await request.json();
        const offset: number = body.auto_list_from || 0;
        // First page: 8 items, second page: 4 items, filtered total = 12.
        const page = offset === 0
          ? makeAutoList(8)
          : makeAutoList(4).map((it, i) => ({
              ...it,
              id: String(9 + i),
              auto_number: `А${800 + i}АА77`,
              auto_number_base: `А${800 + i}АА`,
            }));
        return HttpResponse.json(makeGetAutoListResponse({
          auto_list: page,
          auto_list_count: '12',
        }));
      }),
    );

    const { result } = renderHook(() => useAutoData());

    // Applying a filter triggers a fresh fetch with offset=0 (debounced
    // inside setFilterValue, so we wait for the resulting list).
    act(() => { result.current.setFilterValue('autoStr', 'А8'); });
    await waitFor(() => expect(result.current.autoList).toHaveLength(8));

    // Critical: server's filtered total is preserved, NOT overwritten to
    // the page size. Otherwise loadMore below would no-op. Backend ships
    // as string; useAutoData coerces to number (ADR-020).
    expect(result.current.autoListCount).toBe(12);

    await act(async () => { await result.current.loadMore(); });
    await waitFor(() => expect(result.current.autoList).toHaveLength(12));
  });

  // ───────── loadError classification + persisted userData (2026-05-20) ─────────

  it('timeout error sets loadError.kind = timeout and does not blank userData', async () => {
    // Seed a successful first load so userData is populated, then make
    // the next call time out — userData must survive the failure so
    // the chrome (drawer toggle, filter button) stays usable.
    const { result } = renderHook(() => useAutoData());
    await act(async () => { await result.current.loadData(); });
    await waitFor(() => expect(result.current.userData.firm).toBe('ООО Тест'));

    const spy = jest.spyOn(api, 'post').mockRejectedValueOnce(makeTimeoutError());

    await act(async () => { await result.current.refreshData(); });
    await waitFor(() => expect(result.current.loadError).not.toBeNull());

    expect(result.current.loadError?.kind).toBe('timeout');
    expect(result.current.userData.firm).toBe('ООО Тест');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isRefreshing).toBe(false);

    spy.mockRestore();
  });

  it('network error sets loadError.kind = network', async () => {
    const { result } = renderHook(() => useAutoData());
    await act(async () => { await result.current.loadData(); });
    await waitFor(() => expect(result.current.userData.firm).toBe('ООО Тест'));

    const spy = jest.spyOn(api, 'post').mockRejectedValueOnce(makeNetworkError());

    await act(async () => { await result.current.refreshData(); });
    await waitFor(() => expect(result.current.loadError?.kind).toBe('network'));

    spy.mockRestore();
  });

  it('5xx error sets loadError.kind = server with status', async () => {
    const { result } = renderHook(() => useAutoData());
    await act(async () => { await result.current.loadData(); });
    await waitFor(() => expect(result.current.userData.firm).toBe('ООО Тест'));

    const spy = jest.spyOn(api, 'post').mockRejectedValueOnce(makeServerError(503));

    await act(async () => { await result.current.refreshData(); });
    await waitFor(() => expect(result.current.loadError?.kind).toBe('server'));

    expect(result.current.loadError?.status).toBe(503);
    spy.mockRestore();
  });

  it('successful refetch clears a previous loadError', async () => {
    const { result } = renderHook(() => useAutoData());
    await act(async () => { await result.current.loadData(); });
    await waitFor(() => expect(result.current.userData.firm).toBe('ООО Тест'));

    const spy = jest.spyOn(api, 'post').mockRejectedValueOnce(makeTimeoutError());
    await act(async () => { await result.current.refreshData(); });
    await waitFor(() => expect(result.current.loadError?.kind).toBe('timeout'));
    spy.mockRestore();

    // Default MSW handler responds with the normal payload — retry succeeds.
    await act(async () => { await result.current.refreshData(); });
    await waitFor(() => expect(result.current.loadError).toBeNull());
  });

  it('restores cached userData from AsyncStorage on mount when local state is empty', async () => {
    // Seed cache BEFORE the hook mounts. The restore effect reads it
    // and applies it as the initial paint so the screen has chrome
    // before /get-auto-list returns.
    const cached = {
      id: '42',
      firm: 'CachedFirm',
      inn: '7700099999',
      phone: '+71112223344',
    };
    await AsyncStorage.setItem('ta_user_data_cache_v1', JSON.stringify(cached));

    const { result } = renderHook(() => useAutoData());

    await waitFor(() => expect(result.current.userData.firm).toBe('CachedFirm'));
    expect(result.current.userData.inn).toBe('7700099999');
  });

  it('successful /get-auto-list persists userData to AsyncStorage', async () => {
    const { result } = renderHook(() => useAutoData());
    await act(async () => { await result.current.loadData(); });
    await waitFor(() => expect(result.current.userData.firm).toBe('ООО Тест'));

    const raw = await AsyncStorage.getItem('ta_user_data_cache_v1');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.firm).toBe('ООО Тест');
  });

  // ───────── ADR-024: native updateUserDataOnly in-flight dedup ─────────

  it('updateUserDataOnly dedupes concurrent callers via module-level promise (native)', async () => {
    // Symmetric to the web-side test in UserDataContext.test.tsx
    // ('updateUserData dedupes concurrent callers via in-flight promise').
    // Two parallel calls while the request is still in flight must
    // share the same axios call — no double load on the backend.
    let callCount = 0;
    let lastBody: any = null;
    server.use(
      http.post(GET_AUTO_LIST, async ({ request }) => {
        callCount += 1;
        lastBody = await request.json();
        await new Promise(r => setTimeout(r, 20));
        return HttpResponse.json(makeGetAutoListResponse());
      }),
    );

    const { result } = renderHook(() => useAutoData());

    await act(async () => {
      await Promise.all([
        result.current.updateUserDataOnly(),
        result.current.updateUserDataOnly(),
      ]);
    });

    expect(callCount).toBe(1);
    // ADR-030: light refresh sends `1`, not `0` (which legacy expands to
    // a full-fleet scan via `auto_list_limit || 1000`).
    expect(lastBody.auto_list_limit).toBe(1);
  });

  // ───────── ADR-028: web cross-call dedup (HEAVY fetchAutoList ↔ LIGHT updateUserData) ─────────

  describe('cross-call dedup under UserDataProvider (web)', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <UserDataProvider>{children}</UserDataProvider>
    );

    it('HEAVY loadData + LIGHT updateUserData concurrently → single /get-auto-list', async () => {
      let callCount = 0;
      server.use(
        http.post(GET_AUTO_LIST, async () => {
          callCount += 1;
          // Overlap window so both callers are "in flight" together.
          await new Promise(r => setTimeout(r, 20));
          return HttpResponse.json(makeGetAutoListResponse());
        }),
      );

      const { result } = renderHook(
        () => ({ auto: useAutoData(), user: useUserData() }),
        { wrapper },
      );

      await act(async () => {
        await Promise.all([
          result.current.auto.loadData(),       // HEAVY → registers in-flight marker
          result.current.user.updateUserData(), // LIGHT → must defer to HEAVY
        ]);
      });

      expect(callCount).toBe(1);
      await waitFor(() => expect(result.current.user.userData.firm).toBe('ООО Тест'));
    });

    it('order-independent: LIGHT fired before HEAVY still collapses to one request', async () => {
      let callCount = 0;
      server.use(
        http.post(GET_AUTO_LIST, async () => {
          callCount += 1;
          await new Promise(r => setTimeout(r, 20));
          return HttpResponse.json(makeGetAutoListResponse());
        }),
      );

      const { result } = renderHook(
        () => ({ auto: useAutoData(), user: useUserData() }),
        { wrapper },
      );

      await act(async () => {
        await Promise.all([
          result.current.user.updateUserData(), // LIGHT first
          result.current.auto.loadData(),        // HEAVY registers synchronously after
        ]);
      });

      expect(callCount).toBe(1);
    });
  });
});
