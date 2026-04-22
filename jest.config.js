/** @type {import('jest').Config} */
module.exports = {
  // Minimal setup for unit-testing hooks and pure utils. Full RN component
  // tests (with render trees, gestures, etc.) are out of scope until a
  // stable jest-expo is available for the current SDK.
  testEnvironment: 'jsdom',
  watchman: false,
  setupFiles: ['<rootDir>/jest-setup.ts'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/Transappru/',
    '/transappweb/',
    '\\.old\\.',
    '\\.new\\.',
  ],
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': ['babel-jest', { configFile: './babel.jest.config.js' }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    // Alias react-native → our web-side polyfills for utility-level tests.
    '^react-native$': '<rootDir>/jest-rn-stub.ts',
  },
  testMatch: ['**/__tests__/**/*.test.(ts|tsx)'],
};
