import { http, HttpResponse } from 'msw';
import { makeGetAutoListResponse } from './factories/getAutoListResponse';

/**
 * MSW request handlers shared across every test that mounts a hook
 * which calls `/get-auto-list`. Tests can override per-case via
 * `server.use(...)` to simulate 401, slow responses, custom payloads,
 * etc. — see `useAutoData.test.tsx` for examples.
 *
 * Why URL hardcoded as `https://transapp.ru/api/get-auto-list`:
 * `src/services/api.ts` builds it as `MAIN_API_URL ('https://transapp.ru/api/')
 * + '/get-auto-list'`. Same string the prod app sends.
 */
export const defaultHandlers = [
  // The non-detail endpoints that loadDetailsForItems may fire as a
  // side-effect after the main fetch — return empty/in-progress so
  // tests don't hit `onUnhandledRequest: 'error'`.
  http.post('https://transapp.ru/api/get-auto-check-passes', () =>
    HttpResponse.json({ in_progress: 0 }),
  ),
  http.post('https://transapp.ru/api/get-auto-check-diagnostic-card', () =>
    HttpResponse.json({ in_progress: 0 }),
  ),
  http.post('https://transapp.ru/api/get-auto-check-fines', () =>
    HttpResponse.json({}),
  ),
  http.post('https://transapp.ru/api/get-auto-check-osago', () =>
    HttpResponse.json({}),
  ),

  // Main endpoint. Tests typically override this via server.use(...) to
  // return scenario-specific data (filters, pagination pages, 401, etc.).
  http.post('https://transapp.ru/api/get-auto-list', () =>
    HttpResponse.json(makeGetAutoListResponse()),
  ),
];
