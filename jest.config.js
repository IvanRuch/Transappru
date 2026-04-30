/** @type {import('jest').Config} */
module.exports = {
  // Minimal setup for unit-testing hooks and pure utils. Full RN component
  // tests (with render trees, gestures, etc.) are out of scope until a
  // stable jest-expo is available for the current SDK.
  testEnvironment: 'jsdom',
  // jsdom env defaults `customExportConditions` to ['browser'], which
  // makes `msw/node` resolve to `null` (msw v2 explicitly disables its
  // node entry under the "browser" condition). Override to ['node'] so
  // package subpath exports work for our server-side test setup.
  testEnvironmentOptions: {
    customExportConditions: ['node', 'node-addons'],
  },
  watchman: false,
  setupFiles: ['<rootDir>/jest-setup.ts'],
  // After test framework boot — MSW lifecycle (listen/resetHandlers/close).
  // Must run AFTER setupFiles because it uses beforeAll/afterEach which
  // require jest globals. See jest-msw.setup.ts for rationale.
  setupFilesAfterEnv: ['<rootDir>/jest-msw.setup.ts'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/Transappru/',
    '/transappweb/',
    '\\.old\\.',
    '\\.new\\.',
  ],
  transform: {
    '^.+\\.(ts|tsx|js|jsx|mjs)$': ['babel-jest', { configFile: './babel.jest.config.js' }],
  },
  // msw v2 pulls in a few ESM-only packages — transpile them via babel-jest
  // so the require() in jest-msw.setup.ts can load them.
  transformIgnorePatterns: [
    '/node_modules/(?!(msw|@mswjs|rettime|@bundled-es-modules|until-async|outvariant|strict-event-emitter|headers-polyfill|@open-draft|is-node-process|graphql)/)',
    '\\.pnp\\.[^\\/]+$',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    // Alias react-native → our web-side polyfills for utility-level tests.
    '^react-native$': '<rootDir>/jest-rn-stub.ts',
  },
  testMatch: ['**/__tests__/**/*.test.(ts|tsx)'],
};
