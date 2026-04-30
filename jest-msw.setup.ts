/**
 * MSW lifecycle for jest. Loaded via `setupFilesAfterEnv` in jest.config.js
 * so the test framework is already initialised when these run (unlike
 * jest-setup.ts which runs before).
 *
 * Strategy:
 *   - polyfill Web Streams / fetch globals BEFORE msw is loaded (jsdom env
 *     leaves these undefined; msw v2 reads them at module init)
 *   - listen() once before all tests
 *   - resetHandlers() after each test, so per-test `server.use(...)`
 *     overrides don't leak into the next test
 *   - close() once after all tests
 *
 * `onUnhandledRequest: 'error'` makes MSW fail the test if any test
 * triggers an unmocked outbound request — keeps tests honest about
 * what they actually depend on.
 *
 * Why `require()` instead of `import`: ES `import` statements are
 * hoisted to the top of the module, so `import { server }` would
 * execute (and pull in msw) BEFORE the polyfill assignment. Using
 * `require()` lets us guarantee the order at runtime.
 */
/* eslint-disable @typescript-eslint/no-var-requires */

// Order matters here:
// 1. TextEncoder/TextDecoder must be on globalThis BEFORE undici loads,
//    because undici's own module init reads them.
// 2. Streams + BroadcastChannel are read by msw's interceptor at load time.
// 3. fetch/Request/Response/Headers/FormData come from undici and feed msw.
// 4. Only AFTER all of the above is it safe to load `msw/node` (via the
//    server.ts re-export).

const { TextEncoder, TextDecoder } = require('node:util');
const { ReadableStream, TransformStream, WritableStream } = require('node:stream/web');
const { BroadcastChannel } = require('node:worker_threads');

Object.assign(globalThis, {
  TextEncoder,
  TextDecoder,
  ReadableStream,
  TransformStream,
  WritableStream,
  BroadcastChannel,
});

const { fetch, Headers, FormData, Request, Response } = require('undici');
Object.assign(globalThis, { fetch, Headers, FormData, Request, Response });

// Now safe to load msw (it touches Request/Response/etc. at module init).
const { server } = require('./src/test-utils/server');

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
