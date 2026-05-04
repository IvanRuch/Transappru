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
 *
 * Payment-service URLs: `src/services/api.ts` resolves to the prod URL
 * when `__DEV__=false` (Jest sets it false in `jest-setup.ts`); we
 * register both prod and dev URLs so handlers match regardless of the
 * platform/dev-flag combination at module load time.
 */
const PAYMENT_BASE_PROD = 'https://payment.transapp.ru/api';
const PAYMENT_BASE_DEV = 'http://localhost:8001/api';

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

  // Data-quality endpoints (ADR-012). Defaults: empty notice list +
  // success on report. Tests that exercise these surfaces override
  // via `server.use(...)`.
  http.get(`${PAYMENT_BASE_PROD}/system-notice`, () =>
    HttpResponse.json({ notices: [] }),
  ),
  http.get(`${PAYMENT_BASE_DEV}/system-notice`, () =>
    HttpResponse.json({ notices: [] }),
  ),
  http.post(`${PAYMENT_BASE_PROD}/data-issues/report`, () =>
    HttpResponse.json({ id: 1, notice_triggered: false }, { status: 201 }),
  ),
  http.post(`${PAYMENT_BASE_DEV}/data-issues/report`, () =>
    HttpResponse.json({ id: 1, notice_triggered: false }, { status: 201 }),
  ),
];
