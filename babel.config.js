module.exports = function (api) {
  api.cache(true);
  const isTest = process.env.NODE_ENV === 'test';
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      // NativeWind's babel preset injects `_ReactNativeCSSInterop` references
      // into every file it transforms. Under Jest that trips
      // `jest.mock()`'s hoisting guard (only `mock*`-prefixed vars are allowed
      // in mock factories). Skip it in tests — `className` just passes through
      // as a string prop, which is fine because tests assert on content, not
      // resolved styles.
      !isTest && 'nativewind/babel',
    ].filter(Boolean),
  };
};
