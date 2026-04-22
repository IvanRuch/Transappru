/**
 * Runs before the test framework is loaded (setupFiles).
 * `jest.mock()` calls are hoisted by babel-jest, so they register here
 * before any test imports execute.
 *
 * Note: this file cannot use `expect` — the test framework isn't loaded yet.
 * Keep it limited to mock declarations and module stubs.
 */

/* ───────── expo-router ─────────
 * Stub useRouter / useLocalSearchParams / useFocusEffect so screens can
 * be rendered in isolation without a real navigation stack.
 */
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: () => true,
    setParams: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
  useNavigation: () => ({
    addListener: () => () => {},
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
  useFocusEffect: (cb: () => void | (() => void)) => { cb(); },
  Stack: { Screen: () => null },
}));

/* ───────── AsyncStorage ───────── */
jest.mock('@react-native-async-storage/async-storage', () => {
  const store: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(async (key: string) => store[key] ?? null),
      setItem: jest.fn(async (key: string, value: string) => { store[key] = value; }),
      removeItem: jest.fn(async (key: string) => { delete store[key]; }),
      clear: jest.fn(async () => { Object.keys(store).forEach(k => delete store[k]); }),
      getAllKeys: jest.fn(async () => Object.keys(store)),
      multiGet: jest.fn(async (keys: string[]) => keys.map(k => [k, store[k] ?? null])),
      multiSet: jest.fn(async (pairs: [string, string][]) => {
        pairs.forEach(([k, v]) => { store[k] = v; });
      }),
    },
  };
});

/* ───────── NativeWind ─────────
 * We disable `nativewind/babel` in test env, so className passes through
 * as a plain prop. cssInterop / verifyInstallation are harmless no-ops.
 */
jest.mock('nativewind', () => ({
  cssInterop: () => {},
  verifyInstallation: () => {},
}));

/* ───────── SafeArea — zero insets ───────── */
jest.mock('react-native-safe-area-context', () => {
  const react = jest.requireActual('react');
  return {
    SafeAreaProvider: ({ children }: any) => children,
    SafeAreaView: ({ children }: any) => react.createElement('View', null, children),
    SafeAreaInsetsContext: {
      Consumer: ({ children }: any) => children({ top: 0, bottom: 0, left: 0, right: 0 }),
    },
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});
