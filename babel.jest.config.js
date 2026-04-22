/**
 * Test-only babel config. Does NOT include nativewind/babel (which injects
 * module-level `_ReactNativeCSSInterop` references that trip jest.mock's
 * hoisting guard). Kept minimal — just the TS/JSX transforms needed for
 * unit tests.
 */
module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    '@babel/preset-typescript',
    ['@babel/preset-react', { runtime: 'automatic' }],
  ],
};
