/**
 * Smoke test for the MSW + factories infrastructure. Confirms that:
 *   - server.listen() ran and intercepts axios requests
 *   - default handler for /get-auto-list returns the factory shape
 *   - per-test server.use() override actually overrides the default
 *
 * If these three pass, the rest of the test-utils package is wired
 * correctly and individual hook tests can rely on it.
 */
import { http, HttpResponse } from 'msw';
import { server } from '../server';
import { makeGetAutoListResponse, makeAutoList, makeUserData } from '../index';
import api from '../../services/api';

describe('test-utils MSW smoke', () => {
  it('intercepts /get-auto-list and returns the default factory payload', async () => {
    const res = await api.post('/get-auto-list', { token: 'x' });
    expect(res.data.user_data).toBeDefined();
    expect(res.data.user_data.firm).toBe('ООО Тест');
    // Default factory ships 3 cars and a string count.
    expect(res.data.auto_list).toHaveLength(3);
    expect(res.data.auto_list_count).toBe('3');
  });

  it('per-test server.use() override wins over the default', async () => {
    server.use(
      http.post('https://transapp.ru/api/get-auto-list', () =>
        HttpResponse.json(
          makeGetAutoListResponse({
            user_data: makeUserData({ firm: 'Override Org', user_auto_count: '99' }),
            auto_list: makeAutoList(7),
            auto_list_count: '7',
          }),
        ),
      ),
    );
    const res = await api.post('/get-auto-list', { token: 'x' });
    expect(res.data.user_data.firm).toBe('Override Org');
    expect(res.data.auto_list).toHaveLength(7);
    expect(res.data.auto_list_count).toBe('7');
  });

  it('resetHandlers restores defaults between tests', async () => {
    // Previous test set an override; afterEach should have reset it.
    const res = await api.post('/get-auto-list', { token: 'x' });
    expect(res.data.user_data.firm).toBe('ООО Тест');
    expect(res.data.auto_list_count).toBe('3');
  });
});
