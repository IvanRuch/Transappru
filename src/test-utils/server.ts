import { setupServer } from 'msw/node';
import { defaultHandlers } from './handlers';

/**
 * Shared MSW server for unit tests. Lifecycle (listen / resetHandlers /
 * close) is wired in `jest-msw.setup.ts` via setupFilesAfterEach so it
 * runs once per test file and doesn't leak between files.
 *
 * To override a handler in a single test:
 *
 *   import { server } from '../../test-utils/server';
 *   import { http, HttpResponse } from 'msw';
 *
 *   it('handles 401', async () => {
 *     server.use(
 *       http.post('https://transapp.ru/api/get-auto-list', () =>
 *         new HttpResponse(null, { status: 401 }),
 *       ),
 *     );
 *     // ... act + assert
 *   });
 */
export const server = setupServer(...defaultHandlers);
