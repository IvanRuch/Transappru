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
import { renderHook, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { http, HttpResponse } from 'msw';

import { useAutoData } from '../useAutoData';
import {
  server,
  makeGetAutoListResponse,
  makeAutoList,
  makeUserData,
} from '../../test-utils';

const GET_AUTO_LIST = 'https://transapp.ru/api/get-auto-list';

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
    // Backend ships counts as strings; useAutoData passes through verbatim.
    expect(result.current.autoListCount).toBe('3');
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

  it('loadMore appends the next page in correct numeric order', async () => {
    // Custom handler: page 1 = cars 100..109 (10 cars), page 2 = 200..204 (5).
    server.use(
      http.post(GET_AUTO_LIST, async ({ request }) => {
        const body: any = await request.json();
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
    await act(async () => { await result.current.loadData(); });
    await waitFor(() => expect(result.current.autoList).toHaveLength(10));
    expect(result.current.autoListCount).toBe('15');

    await act(async () => { await result.current.loadMore(); });
    await waitFor(() => expect(result.current.autoList).toHaveLength(15));

    // Order: first-page cars (А100..А109), then second-page (А200..А204).
    // useAutoData re-sorts the merged set by plate digits (PR #12), so:
    expect(result.current.autoList[0].auto_number).toBe('А100АА77');
    expect(result.current.autoList[14].auto_number).toBe('А204АА77');
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
});
